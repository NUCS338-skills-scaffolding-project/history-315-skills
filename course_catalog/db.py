"""SQLite wrapper for the catalog.

Schema (see top-level plan for rationale):
    nodes                 — id, parent_id, label, description, kind, year, ...
    edges                 — from_node, to_node, label, kind
    node_search           — FTS5 virtual table (label, description, breadcrumb)
    meta                  — key/value config (catalog version, build timestamps)
    build_log             — phase tracking for the builder

All writes happen inside transactions. The FTS table is kept in sync
explicitly in `upsert_node` / `delete_node` rather than via triggers — gives
us simpler rollback semantics and one fewer thing to debug.
"""

from __future__ import annotations

import json
import logging
import sqlite3
import threading
import time
from collections.abc import Iterable
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

CATALOG_VERSION = "v1"

# Allowed kind values — kept loose; we mostly trust whatever the LLM emits but
# at least surface unfamiliar kinds in logs.
NODE_KINDS = {
    "era", "theme", "topic", "event", "sub_event",
    "person", "group", "policy", "law", "court_case",
    "idea", "concept", "term", "movement",
    "reading", "lecture", "source", "document",
}
EDGE_KINDS = {
    # Causal kinds
    "precondition", "trigger", "amplifier", "consequence",
    # Associative kinds (added so subagents can be more generous about edges)
    "related",     # general relationship
    "context",     # provides historical setting
    "compare",     # similar pattern / parallel
    "contrast",    # counter-example / opposing case
    "temporal",    # close in time, no explicit causation
    "thematic",    # shares an idea / motif
}


# ---------------------------------------------------------------------------
# Connection helpers
# ---------------------------------------------------------------------------

_lock = threading.Lock()


def _connect(db_path: Path) -> sqlite3.Connection:
    """Open a connection with sane defaults (WAL, foreign keys, row factory)."""
    conn = sqlite3.connect(str(db_path), check_same_thread=False, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn


# ---------------------------------------------------------------------------
# Schema init
# ---------------------------------------------------------------------------

_SCHEMA = """
CREATE TABLE IF NOT EXISTS nodes (
    id               TEXT PRIMARY KEY,
    parent_id        TEXT REFERENCES nodes(id) ON DELETE CASCADE,
    label            TEXT NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    kind             TEXT NOT NULL DEFAULT 'topic',
    year             INTEGER,
    year_range_start INTEGER,
    year_range_end   INTEGER,
    level            INTEGER NOT NULL,
    source_refs      TEXT,
    is_leaf          INTEGER NOT NULL DEFAULT 0,
    built            INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_nodes_level  ON nodes(level);

CREATE TABLE IF NOT EXISTS edges (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    from_node   TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    to_node     TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    label       TEXT,
    kind        TEXT,
    description TEXT,
    UNIQUE(from_node, to_node)
);
CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_node);
CREATE INDEX IF NOT EXISTS idx_edges_to   ON edges(to_node);

CREATE VIRTUAL TABLE IF NOT EXISTS node_search USING fts5(
    id UNINDEXED,
    label,
    description,
    breadcrumb,
    kind UNINDEXED,
    tokenize='porter unicode61'
);

CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS build_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    phase      TEXT NOT NULL,
    status     TEXT NOT NULL,
    target     TEXT,
    message    TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at   TIMESTAMP
);
"""


def init_db(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with _lock:
        conn = _connect(db_path)
        try:
            conn.executescript(_SCHEMA)
            conn.execute(
                "INSERT OR IGNORE INTO meta (key, value) VALUES (?, ?)",
                ("catalog_version", CATALOG_VERSION),
            )
            conn.commit()
        finally:
            conn.close()


# ---------------------------------------------------------------------------
# Node + edge upserts
# ---------------------------------------------------------------------------

def _normalize_node(node: dict[str, Any]) -> dict[str, Any]:
    """Coerce loose LLM output into our column shape."""
    yr = node.get("year")
    yr_int = int(yr) if isinstance(yr, (int, float)) else None
    rng = node.get("year_range")
    rs, re_ = (None, None)
    if isinstance(rng, (list, tuple)) and len(rng) == 2:
        try:
            rs, re_ = int(rng[0]), int(rng[1])
        except (TypeError, ValueError):
            rs, re_ = None, None
    refs = node.get("source_refs") or []
    if isinstance(refs, list):
        refs_json = json.dumps(refs, ensure_ascii=False)
    elif isinstance(refs, str):
        refs_json = refs
    else:
        refs_json = "[]"
    kind = str(node.get("kind") or "topic").strip().lower()
    if kind not in NODE_KINDS:
        log.debug("unfamiliar node kind %r — keeping as-is", kind)
    return {
        "id": str(node["id"]).strip(),
        "parent_id": (str(node["parent_id"]).strip() if node.get("parent_id") else None),
        "label": str(node.get("label") or "").strip()[:200],
        "description": str(node.get("description") or "").strip(),
        "kind": kind,
        "year": yr_int,
        "year_range_start": rs,
        "year_range_end": re_,
        "level": int(node.get("level") or 1),
        "source_refs": refs_json,
        "is_leaf": 1 if node.get("is_leaf") else 0,
        "built": 1 if node.get("built") else 0,
    }


def _breadcrumb(conn: sqlite3.Connection, node_id: str) -> str:
    """Compute the ' › '-joined path of labels from root to this node."""
    rows = conn.execute(
        """
        WITH RECURSIVE chain(id, parent_id, label, depth) AS (
            SELECT id, parent_id, label, 0 FROM nodes WHERE id = ?
            UNION ALL
            SELECT n.id, n.parent_id, n.label, c.depth + 1
              FROM nodes n JOIN chain c ON n.id = c.parent_id
        )
        SELECT label FROM chain ORDER BY depth DESC
        """,
        (node_id,),
    ).fetchall()
    return " › ".join(r["label"] for r in rows if r["label"])


def upsert_node(db_path: Path, node: dict[str, Any]) -> None:
    n = _normalize_node(node)
    if not n["id"] or not n["label"]:
        return
    with _lock:
        conn = _connect(db_path)
        try:
            conn.execute(
                """
                INSERT INTO nodes (
                    id, parent_id, label, description, kind, year,
                    year_range_start, year_range_end, level, source_refs,
                    is_leaf, built, updated_at
                ) VALUES (
                    :id, :parent_id, :label, :description, :kind, :year,
                    :year_range_start, :year_range_end, :level, :source_refs,
                    :is_leaf, :built, CURRENT_TIMESTAMP
                )
                ON CONFLICT(id) DO UPDATE SET
                    parent_id        = excluded.parent_id,
                    label            = excluded.label,
                    description      = excluded.description,
                    kind             = excluded.kind,
                    year             = excluded.year,
                    year_range_start = excluded.year_range_start,
                    year_range_end   = excluded.year_range_end,
                    level            = excluded.level,
                    source_refs      = excluded.source_refs,
                    is_leaf          = excluded.is_leaf,
                    built            = excluded.built,
                    updated_at       = CURRENT_TIMESTAMP
                """,
                n,
            )
            crumb = _breadcrumb(conn, n["id"])
            conn.execute("DELETE FROM node_search WHERE id = ?", (n["id"],))
            conn.execute(
                "INSERT INTO node_search (id, label, description, breadcrumb, kind) "
                "VALUES (?, ?, ?, ?, ?)",
                (n["id"], n["label"], n["description"], crumb, n["kind"]),
            )
            conn.commit()
        finally:
            conn.close()


def upsert_edge(db_path: Path, edge: dict[str, Any]) -> None:
    src = str(edge.get("from") or "").strip()
    dst = str(edge.get("to") or "").strip()
    if not src or not dst:
        return
    kind = (edge.get("kind") or "").strip().lower() or None
    with _lock:
        conn = _connect(db_path)
        try:
            # Skip if either endpoint is missing; foreign key would error and
            # dump the whole transaction otherwise.
            row = conn.execute(
                "SELECT (SELECT 1 FROM nodes WHERE id=?) AND (SELECT 1 FROM nodes WHERE id=?)",
                (src, dst),
            ).fetchone()
            if not row or not row[0]:
                log.debug("dropping edge %s->%s: endpoint missing", src, dst)
                return
            conn.execute(
                """
                INSERT INTO edges (from_node, to_node, label, kind, description)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(from_node, to_node) DO UPDATE SET
                    label = excluded.label,
                    kind = excluded.kind,
                    description = excluded.description
                """,
                (src, dst, edge.get("label"), kind, edge.get("description")),
            )
            conn.commit()
        finally:
            conn.close()


def bulk_upsert(db_path: Path, nodes: Iterable[dict], edges: Iterable[dict]) -> tuple[int, int]:
    """Insert many nodes + edges in two passes (nodes first so edges' FKs resolve)."""
    n_count = e_count = 0
    nodes_list = list(nodes)
    edges_list = list(edges)
    for n in nodes_list:
        try:
            upsert_node(db_path, n)
            n_count += 1
        except Exception as exc:  # pragma: no cover — defensive
            log.warning("upsert_node failed for %r: %s", n.get("id"), exc)
    for e in edges_list:
        try:
            upsert_edge(db_path, e)
            e_count += 1
        except Exception as exc:
            log.warning("upsert_edge failed for %r->%r: %s", e.get("from"), e.get("to"), exc)
    return n_count, e_count


# ---------------------------------------------------------------------------
# Reads
# ---------------------------------------------------------------------------

def _row_to_node(r: sqlite3.Row, child_count: int = 0) -> dict[str, Any]:
    refs = []
    try:
        refs = json.loads(r["source_refs"] or "[]")
    except json.JSONDecodeError:
        refs = []
    yr_range: list[int] | None = None
    if r["year_range_start"] is not None and r["year_range_end"] is not None:
        yr_range = [int(r["year_range_start"]), int(r["year_range_end"])]
    return {
        "id": r["id"],
        "parent_id": r["parent_id"],
        "label": r["label"],
        "description": r["description"] or "",
        "kind": r["kind"],
        "year": r["year"],
        "year_range": yr_range,
        "level": r["level"],
        "source_refs": refs,
        "is_leaf": bool(r["is_leaf"]),
        "built": bool(r["built"]),
        "child_count": child_count,
    }


def get_node(db_path: Path, node_id: str) -> dict[str, Any] | None:
    with _lock:
        conn = _connect(db_path)
        try:
            row = conn.execute(
                "SELECT * FROM nodes WHERE id = ?", (node_id,)
            ).fetchone()
            if not row:
                return None
            cc = conn.execute(
                "SELECT COUNT(*) AS c FROM nodes WHERE parent_id = ?", (node_id,)
            ).fetchone()
            return _row_to_node(row, child_count=int(cc["c"]))
        finally:
            conn.close()


def get_ancestors(db_path: Path, node_id: str) -> list[dict[str, Any]]:
    with _lock:
        conn = _connect(db_path)
        try:
            rows = conn.execute(
                """
                WITH RECURSIVE chain(id, parent_id, depth) AS (
                    SELECT id, parent_id, 0 FROM nodes WHERE id = ?
                    UNION ALL
                    SELECT n.id, n.parent_id, c.depth + 1
                      FROM nodes n JOIN chain c ON n.id = c.parent_id
                )
                SELECT n.*
                  FROM chain c JOIN nodes n ON n.id = c.id
                 WHERE c.id != ?
                 ORDER BY c.depth DESC
                """,
                (node_id, node_id),
            ).fetchall()
            return [_row_to_node(r) for r in rows]
        finally:
            conn.close()


def get_subgraph(db_path: Path, parent_id: str | None) -> dict[str, Any]:
    """Direct children of `parent_id` (or top level if None) + edges between them."""
    with _lock:
        conn = _connect(db_path)
        try:
            if parent_id is None:
                child_rows = conn.execute(
                    "SELECT * FROM nodes WHERE parent_id IS NULL ORDER BY label"
                ).fetchall()
                parent_node = None
            else:
                parent_row = conn.execute(
                    "SELECT * FROM nodes WHERE id = ?", (parent_id,)
                ).fetchone()
                if not parent_row:
                    return {"parent": None, "ancestors": [], "nodes": [], "edges": []}
                parent_node = _row_to_node(parent_row)
                child_rows = conn.execute(
                    "SELECT * FROM nodes WHERE parent_id = ? ORDER BY label",
                    (parent_id,),
                ).fetchall()
            child_ids = [r["id"] for r in child_rows]
            # Annotate each child with its own child_count so the UI can show "drillable" hint.
            child_counts: dict[str, int] = {}
            if child_ids:
                placeholders = ",".join("?" * len(child_ids))
                rows = conn.execute(
                    f"SELECT parent_id, COUNT(*) AS c FROM nodes "
                    f"WHERE parent_id IN ({placeholders}) GROUP BY parent_id",
                    child_ids,
                ).fetchall()
                child_counts = {r["parent_id"]: int(r["c"]) for r in rows}
            nodes = [
                _row_to_node(r, child_count=child_counts.get(r["id"], 0))
                for r in child_rows
            ]
            # Edges between visible siblings only.
            if child_ids:
                placeholders = ",".join("?" * len(child_ids))
                edges = conn.execute(
                    f"SELECT from_node, to_node, label, kind, description "
                    f"FROM edges "
                    f"WHERE from_node IN ({placeholders}) "
                    f"  AND to_node   IN ({placeholders})",
                    [*child_ids, *child_ids],
                ).fetchall()
            else:
                edges = []
        finally:
            conn.close()
    ancestors = get_ancestors(db_path, parent_id) if parent_id else []
    return {
        "parent": parent_node,
        "ancestors": ancestors,
        "nodes": nodes,
        "edges": [
            {
                "from": e["from_node"],
                "to": e["to_node"],
                "label": e["label"],
                "kind": e["kind"],
                "description": e["description"],
            }
            for e in edges
        ],
    }


def search(db_path: Path, query: str, limit: int = 20) -> list[dict[str, Any]]:
    q = (query or "").strip()
    if not q:
        return []
    # FTS5 wants quoted tokens with prefix wildcards. Build a MATCH expression.
    tokens = [t for t in q.split() if t]
    if not tokens:
        return []
    fts_q = " ".join(f'"{t}"*' for t in tokens)
    with _lock:
        conn = _connect(db_path)
        try:
            try:
                rows = conn.execute(
                    """
                    SELECT id, label, description, breadcrumb, kind
                      FROM node_search
                     WHERE node_search MATCH ?
                     ORDER BY rank
                     LIMIT ?
                    """,
                    (fts_q, int(limit)),
                ).fetchall()
            except sqlite3.OperationalError as exc:
                log.debug("FTS query failed (%s) — falling back to LIKE", exc)
                like = f"%{q}%"
                rows = conn.execute(
                    """
                    SELECT id, label, description, breadcrumb, kind
                      FROM node_search
                     WHERE label LIKE ? OR description LIKE ?
                     LIMIT ?
                    """,
                    (like, like, int(limit)),
                ).fetchall()
        finally:
            conn.close()
    return [
        {
            "id": r["id"],
            "label": r["label"],
            "description": (r["description"] or "")[:240],
            "breadcrumb": r["breadcrumb"],
            "kind": r["kind"],
        }
        for r in rows
    ]


def get_all_nodes_flat(db_path: Path) -> list[dict[str, Any]]:
    """Flat list of every node, with child_count, for the tree-view sidebar.

    One round trip; for ~1500 nodes the result is ~150 KB JSON. Frontend
    fetches once on Catalog open and caches client-side.
    """
    with _lock:
        conn = _connect(db_path)
        try:
            rows = conn.execute(
                """
                SELECT n.id, n.parent_id, n.label, n.kind, n.level,
                       n.year, n.is_leaf,
                       (SELECT COUNT(*) FROM nodes c WHERE c.parent_id = n.id) AS child_count
                  FROM nodes n
                 ORDER BY n.level, n.label
                """
            ).fetchall()
        finally:
            conn.close()
    return [
        {
            "id": r["id"],
            "parent_id": r["parent_id"],
            "label": r["label"],
            "kind": r["kind"],
            "level": int(r["level"]),
            "year": r["year"],
            "is_leaf": bool(r["is_leaf"]),
            "child_count": int(r["child_count"] or 0),
        }
        for r in rows
    ]


def count_edges(db_path: Path) -> int:
    """Cheap aggregate for the densify-phase before/after counter."""
    with _lock:
        conn = _connect(db_path)
        try:
            row = conn.execute("SELECT COUNT(*) AS c FROM edges").fetchone()
        finally:
            conn.close()
    return int(row["c"] or 0)


def descendants_of(db_path: Path, node_id: str) -> list[dict[str, Any]]:
    """Every node in the subtree rooted at ``node_id`` (excluding the root).

    Used by the densify phase to assemble the per-domain node listing
    that goes into the prompt.
    """
    with _lock:
        conn = _connect(db_path)
        try:
            rows = conn.execute(
                """
                WITH RECURSIVE sub(id) AS (
                    SELECT id FROM nodes WHERE parent_id = ?
                    UNION ALL
                    SELECT n.id FROM nodes n JOIN sub s ON n.parent_id = s.id
                )
                SELECT n.* FROM nodes n JOIN sub s ON n.id = s.id
                ORDER BY n.level, n.label
                """,
                (node_id,),
            ).fetchall()
        finally:
            conn.close()
    return [_row_to_node(r) for r in rows]


def get_status(db_path: Path) -> dict[str, Any]:
    with _lock:
        conn = _connect(db_path)
        try:
            counts = conn.execute(
                "SELECT COUNT(*) AS total, "
                "       SUM(CASE WHEN is_leaf=1 THEN 1 ELSE 0 END) AS leaves, "
                "       MAX(level) AS max_level "
                "  FROM nodes"
            ).fetchone()
            top_count = conn.execute(
                "SELECT COUNT(*) AS c FROM nodes WHERE parent_id IS NULL"
            ).fetchone()
            # Parent-child structural links live implicitly via nodes.parent_id
            # — every non-root node has exactly one parent edge, which we
            # count here because the user's notion of "relationships"
            # includes both structural and sibling edges.
            parent_links = conn.execute(
                "SELECT COUNT(*) AS c FROM nodes WHERE parent_id IS NOT NULL"
            ).fetchone()
            edge_count = conn.execute(
                "SELECT COUNT(*) AS c FROM edges"
            ).fetchone()
            last_log = conn.execute(
                "SELECT phase, status, message, started_at, ended_at "
                "  FROM build_log ORDER BY id DESC LIMIT 1"
            ).fetchone()
        finally:
            conn.close()
    parent_links_total = int(parent_links["c"] or 0)
    edges_total = int(edge_count["c"] or 0)
    return {
        "nodes_total": int(counts["total"] or 0),
        "leaves_total": int(counts["leaves"] or 0),
        "top_level_count": int(top_count["c"] or 0),
        "max_level": int(counts["max_level"] or 0),
        "edges_total": edges_total,
        "parent_links_total": parent_links_total,
        "relationships_total": parent_links_total + edges_total,
        "last_log": dict(last_log) if last_log else None,
    }


def is_empty(db_path: Path) -> bool:
    return get_status(db_path)["nodes_total"] == 0


# ---------------------------------------------------------------------------
# Build log
# ---------------------------------------------------------------------------

def log_phase(db_path: Path, phase: str, status: str,
              target: str | None = None, message: str | None = None) -> int:
    with _lock:
        conn = _connect(db_path)
        try:
            cur = conn.execute(
                "INSERT INTO build_log (phase, status, target, message) "
                "VALUES (?, ?, ?, ?)",
                (phase, status, target, message),
            )
            conn.commit()
            return int(cur.lastrowid)
        finally:
            conn.close()


def finish_phase(db_path: Path, log_id: int, status: str,
                 message: str | None = None) -> None:
    with _lock:
        conn = _connect(db_path)
        try:
            conn.execute(
                "UPDATE build_log SET status = ?, message = COALESCE(?, message), "
                "       ended_at = CURRENT_TIMESTAMP WHERE id = ?",
                (status, message, log_id),
            )
            conn.commit()
        finally:
            conn.close()


def recent_log(db_path: Path, limit: int = 20) -> list[dict[str, Any]]:
    with _lock:
        conn = _connect(db_path)
        try:
            rows = conn.execute(
                "SELECT id, phase, status, target, message, started_at, ended_at "
                "  FROM build_log ORDER BY id DESC LIMIT ?",
                (int(limit),),
            ).fetchall()
        finally:
            conn.close()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Dedupe support
# ---------------------------------------------------------------------------

def _normalize_label(label: str) -> str:
    return " ".join(label.lower().split())


def list_dedupe_candidates(db_path: Path, min_cluster_size: int = 2) -> list[list[dict[str, Any]]]:
    """Group nodes by normalized label and return clusters of size >= 2.

    Cheap heuristic: anything with the same case-folded whitespace-normalized
    label is a candidate. Phase-4 dedupe uses Claude to make the actual merge
    decisions on these clusters — we only need to surface plausible groups.
    """
    with _lock:
        conn = _connect(db_path)
        try:
            rows = conn.execute("SELECT * FROM nodes").fetchall()
        finally:
            conn.close()
    groups: dict[str, list[dict[str, Any]]] = {}
    for r in rows:
        key = _normalize_label(r["label"])
        groups.setdefault(key, []).append(_row_to_node(r))
    return [g for g in groups.values() if len(g) >= min_cluster_size]


def merge_nodes(db_path: Path, canonical_id: str, dup_ids: list[str]) -> None:
    """Re-point edges to `canonical_id`, re-parent children, then delete dups."""
    if not dup_ids:
        return
    with _lock:
        conn = _connect(db_path)
        try:
            placeholders = ",".join("?" * len(dup_ids))
            args = [*dup_ids]
            # Re-point edges (skip self-loops created by the merge)
            conn.execute(
                f"UPDATE OR IGNORE edges SET from_node = ? "
                f" WHERE from_node IN ({placeholders})",
                [canonical_id, *args],
            )
            conn.execute(
                f"UPDATE OR IGNORE edges SET to_node = ? "
                f" WHERE to_node IN ({placeholders})",
                [canonical_id, *args],
            )
            conn.execute(
                f"DELETE FROM edges WHERE from_node = to_node "
                f"   AND from_node = ?", (canonical_id,),
            )
            # Re-parent children of dups onto canonical
            conn.execute(
                f"UPDATE nodes SET parent_id = ? "
                f" WHERE parent_id IN ({placeholders})",
                [canonical_id, *args],
            )
            # Drop the duplicates
            conn.execute(
                f"DELETE FROM nodes WHERE id IN ({placeholders})", args
            )
            conn.execute(
                f"DELETE FROM node_search WHERE id IN ({placeholders})", args
            )
            conn.commit()
        finally:
            conn.close()


# ---------------------------------------------------------------------------
# Wipe (admin)
# ---------------------------------------------------------------------------

def wipe(db_path: Path) -> None:
    with _lock:
        conn = _connect(db_path)
        try:
            conn.executescript(
                "DELETE FROM edges; DELETE FROM nodes; DELETE FROM node_search; "
                "DELETE FROM build_log;"
            )
            conn.commit()
        finally:
            conn.close()


# ---------------------------------------------------------------------------
# Module self-test (run once at app startup; cheap)
# ---------------------------------------------------------------------------

def quick_self_test(db_path: Path) -> None:
    """Fail-loud sanity check on schema. No-ops if data already exists."""
    init_db(db_path)
    s = get_status(db_path)
    log.info(
        "catalog db: %d nodes (max_level=%d, leaves=%d, top_level=%d)",
        s["nodes_total"], s["max_level"], s["leaves_total"], s["top_level_count"],
    )
    return None


__all__ = [
    "CATALOG_VERSION",
    "init_db", "quick_self_test", "wipe",
    "upsert_node", "upsert_edge", "bulk_upsert",
    "get_node", "get_ancestors", "get_subgraph", "search", "get_status",
    "is_empty",
    "log_phase", "finish_phase", "recent_log",
    "list_dedupe_candidates", "merge_nodes",
]

# Silence unused-import warnings — the time module is here for future timing.
_ = time
