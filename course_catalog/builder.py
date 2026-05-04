"""Build pipeline for the catalog.

Four phases (see plan):
  1. plan     — Claude reads syllabus + Reading History + Gerstle TOC,
                writes catalog/build/extraction_plan.json
  2. extract  — One Claude session uses Task to fan out subagents (one per
                domain). Each subagent writes catalog/build/extraction/<id>.json.
                A directory watcher in this module ingests files into SQLite
                as they appear so the frontend renders progressively.
  3. review   — Claude re-reads sources with full DB summary, writes
                catalog/build/review.json (additions + expansions). Backend
                applies them.
  4. dedupe   — Backend computes candidate clusters from the DB; Claude
                decides which clusters are actually duplicates; backend
                merges.

The whole pipeline runs as a single managed background thread spawned by
``Builder.start()``. Each phase is one ``claude -p`` subprocess. Status is
mirrored into ``build_log`` (SQLite) so a backend restart can read where
we left off.
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import signal
import subprocess
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from . import db
from . import prompts

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Build event log (live tail for the UI)
# ---------------------------------------------------------------------------

LOG_BUFFER_SIZE = 500
"""How many recent events to keep in memory for /api/catalog/build/log."""

# Event "kind" values surfaced to the frontend. The UI uses these for icons
# and color, so adding a new kind needs a corresponding case there.
LOG_KINDS = (
    "info",         # human-written status line from the orchestrator
    "phase",        # phase transition
    "tool_use",     # claude called a tool (Read/Glob/Write/Task/...)
    "tool_result",  # tool call returned (with size hint)
    "text",         # claude wrote some prose to stdout (collapsed)
    "ingest",       # backend ingested a file into SQLite
    "error",        # something went wrong
    "result",       # final result from a phase
)


# ---------------------------------------------------------------------------
# Status surface
# ---------------------------------------------------------------------------

PHASE_NAMES = ("idle", "plan", "extract", "review", "densify", "dedupe", "complete", "failed")


@dataclass
class BuildStatus:
    phase: str = "idle"
    message: str = ""
    domains_total: int = 0
    domains_done: int = 0
    nodes_total: int = 0
    started_at: float | None = None
    ended_at: float | None = None
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "phase": self.phase,
            "message": self.message,
            "domains_total": self.domains_total,
            "domains_done": self.domains_done,
            "nodes_total": self.nodes_total,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "error": self.error,
        }


# ---------------------------------------------------------------------------
# Builder
# ---------------------------------------------------------------------------

@dataclass
class Builder:
    project_root: Path
    db_path: Path
    extract_model: str = "claude-sonnet-4-6"
    review_model: str = "claude-opus-4-7"
    dedupe_model: str = "claude-opus-4-7"
    extract_concurrency: int = 5
    extract_timeout_sec: int = 5400  # 90 min
    plan_timeout_sec: int = 600
    review_timeout_sec: int = 1800
    dedupe_timeout_sec: int = 1200

    _status: BuildStatus = field(default_factory=BuildStatus)
    _thread: threading.Thread | None = field(default=None, init=False, repr=False)
    _proc: subprocess.Popen | None = field(default=None, init=False, repr=False)
    _cancel: threading.Event = field(default_factory=threading.Event, init=False, repr=False)
    _lock: threading.Lock = field(default_factory=threading.Lock, init=False, repr=False)

    # Live event log — ring buffer plus an append-only file.
    _log_buf: deque = field(
        default_factory=lambda: deque(maxlen=LOG_BUFFER_SIZE),
        init=False, repr=False,
    )
    _log_seq: int = field(default=0, init=False, repr=False)
    _log_lock: threading.Lock = field(
        default_factory=threading.Lock, init=False, repr=False,
    )

    # ---------- lifecycle ----------

    def is_running(self) -> bool:
        with self._lock:
            return self._thread is not None and self._thread.is_alive()

    def status(self) -> BuildStatus:
        # Refresh nodes_total from DB (cheap).
        try:
            s = db.get_status(self.db_path)
            self._status.nodes_total = s["nodes_total"]
        except Exception:
            pass
        return self._status

    # ---------- event log surface ----------

    def _log_file(self) -> Path:
        return self._build_dir() / "builder.log"

    def _log(self, kind: str, message: str, **meta: Any) -> dict[str, Any]:
        """Append an event to the ring buffer + on-disk log. Returns the event."""
        with self._log_lock:
            self._log_seq += 1
            evt: dict[str, Any] = {
                "seq": self._log_seq,
                "ts": time.time(),
                "phase": self._status.phase,
                "kind": kind,
                "message": message,
            }
            if meta:
                evt["meta"] = meta
            self._log_buf.append(evt)
        # Write to disk outside the lock; tolerate failures silently.
        try:
            with open(self._log_file(), "a", encoding="utf-8") as f:
                f.write(json.dumps(evt, ensure_ascii=False) + "\n")
        except OSError:
            pass
        # Also send to the standard Python logger so `tail -f backend.log` shows it.
        log.info("[catalog %s] %s: %s", evt["phase"], kind, message[:300])
        return evt

    def get_log(self, since: int = 0, limit: int = 200) -> list[dict[str, Any]]:
        with self._log_lock:
            out = [e for e in self._log_buf if e["seq"] > since]
        if limit and len(out) > limit:
            out = out[-limit:]
        return out

    def log_cursor(self) -> int:
        with self._log_lock:
            return self._log_seq

    def start(self) -> bool:
        with self._lock:
            if self._thread and self._thread.is_alive():
                return False
            self._cancel.clear()
            self._status = BuildStatus(phase="plan", message="starting…", started_at=time.time())
            # Clear the in-memory ring buffer for a fresh run, but DO NOT
            # reset the seq counter — clients (the frontend log tail) hold a
            # cursor across builds, and a reset would silently strand them
            # behind a high prior cursor and they'd see no new events.
            with self._log_lock:
                self._log_buf.clear()
            try:
                lf = self._log_file()
                lf.parent.mkdir(parents=True, exist_ok=True)
                # Append a session marker to the log file so prior runs aren't lost.
                with open(lf, "a", encoding="utf-8") as f:
                    f.write(json.dumps({"_marker": "build_started", "ts": time.time()}) + "\n")
            except OSError:
                pass
            self._log("info", "build started")
            self._thread = threading.Thread(
                target=self._run, daemon=True, name="catalog-builder"
            )
            self._thread.start()
        return True

    def cancel(self) -> None:
        self._cancel.set()
        with self._lock:
            proc = self._proc
        if proc and proc.poll() is None:
            try:
                if os.name != "nt" and hasattr(os, "killpg"):
                    os.killpg(proc.pid, signal.SIGTERM)
                else:
                    proc.terminate()
            except OSError:
                pass

    # ---------- phase orchestration ----------

    def _run(self) -> None:
        try:
            self._build_dir().mkdir(parents=True, exist_ok=True)
            self._clean_build_artifacts()
            self._phase_plan()
            if self._cancel.is_set():
                return self._set_status("failed", "cancelled before extract")
            self._phase_extract()
            if self._cancel.is_set():
                return self._set_status("failed", "cancelled before review")
            self._phase_review()
            if self._cancel.is_set():
                return self._set_status("failed", "cancelled before densify")
            self._phase_densify()
            if self._cancel.is_set():
                return self._set_status("failed", "cancelled before dedupe")
            self._phase_dedupe()
            self._set_status("complete", "build complete", ended=True)
        except Exception as exc:
            log.exception("build failed: %s", exc)
            self._status.error = str(exc)
            self._set_status("failed", f"error: {exc}", ended=True)

    # ---------- phase 1: plan ----------

    def _phase_plan(self) -> None:
        self._set_status("plan", "asking Claude to plan extraction domains…")
        log_id = db.log_phase(self.db_path, "plan", "running")
        plan_path = self._build_dir() / "extraction_plan.json"
        prompt = prompts.plan_user_prompt(plan_path)
        rc, out, err = self._run_claude(
            system_prompt=prompts.PLAN_SYSTEM_PROMPT,
            user_prompt=prompt,
            model=self.extract_model,
            timeout=self.plan_timeout_sec,
        )
        if rc != 0:
            db.finish_phase(self.db_path, log_id, "failed", err.strip()[:500])
            raise RuntimeError(f"plan phase failed (rc={rc}): {err.strip()[:300]}")
        if not plan_path.exists():
            db.finish_phase(self.db_path, log_id, "failed", "extraction_plan.json not written")
            raise RuntimeError("plan phase: extraction_plan.json missing")
        try:
            plan = json.loads(plan_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            db.finish_phase(self.db_path, log_id, "failed", f"plan JSON invalid: {exc}")
            raise RuntimeError(f"plan phase: invalid JSON in {plan_path.name}: {exc}")
        domains = plan.get("domains") or []
        if len(domains) == 0:
            db.finish_phase(self.db_path, log_id, "failed", "plan returned 0 domains")
            raise RuntimeError("plan phase: extraction_plan.json has 0 domains")
        self._status.domains_total = len(domains)
        db.finish_phase(self.db_path, log_id, "done", f"{len(domains)} domains")
        self._log("info", f"plan ready: {len(domains)} domains queued for extraction")

    # ---------- phase 2: extract (fan-out) ----------

    def _phase_extract(self) -> None:
        self._set_status("extract", "running fan-out subagents…")
        log_id = db.log_phase(self.db_path, "extract", "running")
        plan_path = self._build_dir() / "extraction_plan.json"
        out_dir = self._build_dir() / "extraction"
        out_dir.mkdir(parents=True, exist_ok=True)
        # Start a watcher thread that ingests files as they appear
        watcher_stop = threading.Event()
        watcher = threading.Thread(
            target=self._watch_extraction_dir,
            args=(out_dir, watcher_stop),
            daemon=True,
            name="catalog-extract-watcher",
        )
        watcher.start()
        try:
            prompt = prompts.extract_user_prompt(
                plan_path=plan_path,
                out_dir=out_dir,
                concurrency=self.extract_concurrency,
            )
            rc, _out, err = self._run_claude(
                system_prompt=prompts.EXTRACT_SYSTEM_PROMPT,
                user_prompt=prompt,
                model=self.extract_model,
                timeout=self.extract_timeout_sec,
            )
        finally:
            watcher_stop.set()
            watcher.join(timeout=5)
            # Final ingestion sweep in case the watcher missed the last file.
            for p in sorted(out_dir.glob("*.json")):
                self._ingest_extraction_file(p)
        if rc != 0:
            db.finish_phase(self.db_path, log_id, "failed", err.strip()[:500])
            raise RuntimeError(f"extract phase failed (rc={rc}): {err.strip()[:300]}")
        # Sanity check: even if rc=0, the orchestrator may have skipped Task
        # fan-out and produced nothing. Catch that here so phase 3 (which
        # operates on the DB) doesn't run on an empty graph.
        files_written = sorted(out_dir.glob("*.json"))
        if not files_written:
            db.finish_phase(self.db_path, log_id, "failed", "no extraction files produced")
            raise RuntimeError(
                "extract phase: orchestrator returned cleanly but produced no "
                "domain JSON files. Did it use the Task tool to fan out?"
            )
        db.finish_phase(
            self.db_path, log_id, "done",
            f"{self._status.domains_done}/{self._status.domains_total} domains, "
            f"{len(files_written)} files",
        )

    def _watch_extraction_dir(self, out_dir: Path, stop: threading.Event) -> None:
        seen: set[Path] = set()
        while not stop.is_set():
            for p in sorted(out_dir.glob("*.json")):
                if p in seen:
                    continue
                # Wait until the file is stable (not still being written).
                size = p.stat().st_size
                time.sleep(0.6)
                if not p.exists() or p.stat().st_size != size:
                    continue
                if self._ingest_extraction_file(p):
                    seen.add(p)
                    self._status.domains_done = len(seen)
                    self._status.message = (
                        f"ingested {len(seen)}/{self._status.domains_total} domains"
                    )
            stop.wait(1.0)

    def _ingest_extraction_file(self, path: Path) -> bool:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            self._log("error", f"extraction file {path.name} unreadable: {exc}")
            return False
        nodes = payload.get("nodes") or []
        edges = payload.get("edges") or []
        n_count, e_count = db.bulk_upsert(self.db_path, nodes, edges)
        self._log(
            "ingest",
            f"{path.name}: +{n_count} nodes, +{e_count} edges",
            domain_id=path.stem,
            nodes=n_count,
            edges=e_count,
        )
        return True

    # ---------- phase 3: review ----------

    def _phase_review(self) -> None:
        self._set_status("review", "reviewing for missed entities…")
        log_id = db.log_phase(self.db_path, "review", "running")
        # Generate a textual DB summary the review pass can read alongside source files.
        summary_path = self._build_dir() / "db_summary.txt"
        self._write_db_summary(summary_path)
        review_path = self._build_dir() / "review.json"
        if review_path.exists():
            review_path.unlink()
        prompt = prompts.review_user_prompt(
            summary_path=summary_path,
            out_path=review_path,
        )
        rc, _out, err = self._run_claude(
            system_prompt=prompts.REVIEW_SYSTEM_PROMPT,
            user_prompt=prompt,
            model=self.review_model,
            timeout=self.review_timeout_sec,
        )
        if rc != 0:
            db.finish_phase(self.db_path, log_id, "failed", err.strip()[:500])
            log.warning("review phase failed (rc=%s); skipping additions", rc)
            return  # don't kill the whole build over review
        if review_path.exists():
            try:
                payload = json.loads(review_path.read_text(encoding="utf-8"))
                add_nodes = payload.get("additions", {}).get("nodes") or []
                add_edges = payload.get("additions", {}).get("edges") or []
                expansions = payload.get("expansions") or []
                db.bulk_upsert(self.db_path, add_nodes, add_edges)
                # Expansions are a list of {node_id, new_children: [...]}
                for ex in expansions:
                    children = ex.get("new_children") or []
                    db.bulk_upsert(self.db_path, children, [])
                db.finish_phase(
                    self.db_path, log_id, "done",
                    f"+{len(add_nodes)} nodes, +{len(add_edges)} edges, "
                    f"{len(expansions)} expansions",
                )
            except Exception as exc:
                db.finish_phase(self.db_path, log_id, "failed", repr(exc))
                log.warning("review apply failed: %s", exc)
        else:
            db.finish_phase(self.db_path, log_id, "done", "no review.json — nothing to add")

    def _write_db_summary(self, path: Path) -> None:
        # One line per node: id | level | breadcrumb | source_refs
        # Cheap and fits in Claude's context for a few thousand nodes.
        s = db.get_subgraph(self.db_path, None)
        lines: list[str] = ["# Catalog DB summary (id | level | breadcrumb | sources)"]
        # Walk depth-first. We don't have a tree-walk helper in db.py yet;
        # use repeated subgraph fetches.
        stack: list[str | None] = [None]
        while stack:
            parent = stack.pop()
            sub = db.get_subgraph(self.db_path, parent)
            for n in sub["nodes"]:
                anc = " › ".join(a["label"] for a in db.get_ancestors(self.db_path, n["id"]))
                refs = ", ".join(n.get("source_refs") or [])
                lines.append(f"{n['id']} | L{n['level']} | {anc} › {n['label']} | {refs}")
                if not n.get("is_leaf") and n.get("child_count", 0) > 0:
                    stack.append(n["id"])
        path.write_text("\n".join(lines), encoding="utf-8")

    # ---------- phase 4: densify (per-domain edge enrichment) ----------

    def _phase_densify(self) -> None:
        self._set_status("densify", "asking Claude to add missing edges…")
        log_id = db.log_phase(self.db_path, "densify", "running")
        edges_before = db.count_edges(self.db_path)
        self._log("info", f"edges before densify: {edges_before}")

        # One pass per top-level domain. Each domain's subtree fits comfortably
        # under the 200K context limit (max ~300 nodes seen in practice).
        top = db.get_subgraph(self.db_path, None)
        domains = top.get("nodes") or []
        if not domains:
            db.finish_phase(self.db_path, log_id, "done", "no domains to densify")
            return

        densify_dir = self._build_dir() / "densify"
        densify_dir.mkdir(parents=True, exist_ok=True)
        added_total = 0

        for domain in domains:
            if self._cancel.is_set():
                break
            domain_id = domain["id"]
            descendants = db.descendants_of(self.db_path, domain_id)
            # Include the domain root itself so edges can attach to it.
            all_nodes = [domain, *descendants]
            if len(all_nodes) < 4:
                # Tiny domain — no point asking for edges between 1-3 nodes.
                continue

            nodes_path = densify_dir / f"{domain_id}.nodes.txt"
            self._write_node_listing(all_nodes, nodes_path)
            out_path = densify_dir / f"{domain_id}.edges.json"
            if out_path.exists():
                out_path.unlink()

            self._log(
                "info",
                f"densify {domain_id} ({len(all_nodes)} nodes)",
                domain_id=domain_id,
                nodes=len(all_nodes),
            )
            prompt = prompts.densify_user_prompt(domain_id, nodes_path, out_path)
            rc, _out, err = self._run_claude(
                system_prompt=prompts.DENSIFY_SYSTEM_PROMPT,
                user_prompt=prompt,
                model=self.extract_model,
                timeout=self.review_timeout_sec,
            )
            if rc != 0 or not out_path.exists():
                self._log(
                    "error",
                    f"densify {domain_id} skipped (rc={rc}): {err.strip()[:200]}",
                )
                continue
            try:
                payload = json.loads(out_path.read_text(encoding="utf-8"))
                edges = payload.get("edges") or []
                _, e_count = db.bulk_upsert(self.db_path, [], edges)
                added_total += e_count
                self._log(
                    "ingest",
                    f"densify {domain_id}: +{e_count} edges",
                    domain_id=domain_id,
                    edges=e_count,
                )
            except (OSError, json.JSONDecodeError) as exc:
                self._log("error", f"densify {domain_id} ingest failed: {exc}")
                continue

        edges_after = db.count_edges(self.db_path)
        self._log(
            "info",
            f"edges: {edges_before} → {edges_after} (+{added_total} ingested, "
            f"net {edges_after - edges_before})",
        )
        db.finish_phase(
            self.db_path, log_id, "done",
            f"+{edges_after - edges_before} edges across {len(domains)} domains",
        )

    @staticmethod
    def _write_node_listing(nodes: list[dict], out_path: Path) -> None:
        """One node per line: id | level | kind | year | breadcrumb | description."""
        lines = ["# id | level | kind | year | label | description"]
        for n in nodes:
            year = n.get("year")
            year_s = str(year) if year is not None else "—"
            desc = (n.get("description") or "").replace("\n", " ").strip()
            if len(desc) > 200:
                desc = desc[:197] + "…"
            lines.append(
                f"{n['id']} | L{n.get('level', '?')} | {n.get('kind', '?')} "
                f"| {year_s} | {n.get('label', '')} | {desc}"
            )
        out_path.write_text("\n".join(lines), encoding="utf-8")

    # ---------- phase 5: dedupe ----------

    def _phase_dedupe(self) -> None:
        self._set_status("dedupe", "computing duplicate candidates…")
        log_id = db.log_phase(self.db_path, "dedupe", "running")
        clusters = db.list_dedupe_candidates(self.db_path)
        if not clusters:
            db.finish_phase(self.db_path, log_id, "done", "no candidates")
            return
        clusters_path = self._build_dir() / "dedupe_clusters.json"
        clusters_path.write_text(
            json.dumps(
                [
                    [
                        {
                            "id": n["id"],
                            "label": n["label"],
                            "kind": n["kind"],
                            "year": n["year"],
                            "description": n["description"][:200],
                            "breadcrumb": " › ".join(
                                a["label"]
                                for a in db.get_ancestors(self.db_path, n["id"])
                            ),
                        }
                        for n in cluster
                    ]
                    for cluster in clusters
                ],
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        out_path = self._build_dir() / "dedupe.json"
        if out_path.exists():
            out_path.unlink()
        prompt = prompts.dedupe_user_prompt(
            clusters_path=clusters_path, out_path=out_path
        )
        rc, _out, err = self._run_claude(
            system_prompt=prompts.DEDUPE_SYSTEM_PROMPT,
            user_prompt=prompt,
            model=self.dedupe_model,
            timeout=self.dedupe_timeout_sec,
        )
        if rc != 0 or not out_path.exists():
            db.finish_phase(self.db_path, log_id, "failed", err.strip()[:300])
            log.warning("dedupe phase failed; leaving clusters intact")
            return
        try:
            payload = json.loads(out_path.read_text(encoding="utf-8"))
            merges = payload.get("merges") or []
            for m in merges:
                canonical = m.get("canonical")
                dups = m.get("duplicates") or []
                if canonical and dups:
                    db.merge_nodes(self.db_path, canonical, dups)
            db.finish_phase(
                self.db_path, log_id, "done", f"merged {len(merges)} clusters"
            )
        except Exception as exc:
            db.finish_phase(self.db_path, log_id, "failed", repr(exc))

    # ---------- subprocess plumbing ----------

    def _build_dir(self) -> Path:
        return self.project_root / "catalog" / "build"

    def _clean_build_artifacts(self) -> None:
        """Wipe stale per-build files at the start of a fresh run.

        Claude Code's Write tool refuses to overwrite an existing file
        unless it has been Read first in the same session. If a prior build
        left ``extraction_plan.json`` (or other phase outputs) on disk,
        Claude either errors out or — worse — improvises Bash heredoc
        workarounds that hit shell-quoting bugs and waste the run.

        We keep ``builder.log`` so the history of past builds is intact.
        """
        bd = self._build_dir()
        for name in (
            "extraction_plan.json",
            "review.json",
            "dedupe.json",
            "dedupe_clusters.json",
            "db_summary.txt",
            "extraction_done.marker",
        ):
            p = bd / name
            if p.exists():
                try:
                    p.unlink()
                    self._log("info", f"cleaned {name}")
                except OSError as exc:
                    self._log("error", f"failed to clean {name}: {exc}")
        ext_dir = bd / "extraction"
        if ext_dir.exists():
            try:
                shutil.rmtree(ext_dir)
                self._log("info", "cleaned extraction/")
            except OSError as exc:
                self._log("error", f"failed to clean extraction/: {exc}")

    def _set_status(self, phase: str, message: str, ended: bool = False) -> None:
        prev = self._status.phase
        self._status.phase = phase
        self._status.message = message
        if ended:
            self._status.ended_at = time.time()
        if prev != phase:
            self._log("phase", f"→ {phase}")
        if message:
            self._log("info", message)

    def _run_claude(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        model: str,
        timeout: int,
    ) -> tuple[int, str, str]:
        """Invoke ``claude -p ...`` once and return (rc, result_text, err).

        Uses ``--output-format stream-json`` so we can tail events as Claude
        runs and surface them through ``_log()`` to the live UI panel. The
        final ``result`` event carries the same payload that ``--output-format
        json`` would have returned at the end, including ``is_error`` /
        ``terminal_reason`` for API failures (e.g. ``prompt_too_long``).
        """
        cmd = [
            "claude", "-p",
            "--verbose",
            "--output-format", "stream-json",
            "--include-partial-messages",
            "--model", model,
            "--permission-mode", "bypassPermissions",
            "--add-dir", str(self.project_root),
            "--system-prompt", system_prompt,
            user_prompt,
        ]
        preexec = os.setsid if os.name != "nt" else None
        result_text = ""
        err_lines: list[str] = []
        api_error: str | None = None
        try:
            with self._lock:
                self._proc = subprocess.Popen(
                    cmd,
                    cwd=str(self.project_root),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    bufsize=1,
                    preexec_fn=preexec,
                )
            assert self._proc.stdout is not None and self._proc.stderr is not None

            # Drain stderr in a side thread so a chatty CLI can't deadlock us.
            def _drain_stderr() -> None:
                try:
                    for line in self._proc.stderr:  # type: ignore[union-attr]
                        s = line.rstrip("\n")
                        if s:
                            err_lines.append(s)
                except Exception:
                    pass
            stderr_thread = threading.Thread(target=_drain_stderr, daemon=True)
            stderr_thread.start()

            deadline = time.time() + timeout
            text_so_far_per_block: dict[str, str] = {}

            for raw in self._proc.stdout:
                if time.time() > deadline:
                    self._log("error", f"timeout after {timeout}s — terminating")
                    self._terminate(self._proc)
                    err_lines.append("[timeout]")
                    break
                line = raw.strip()
                if not line:
                    continue
                try:
                    evt = json.loads(line)
                except json.JSONDecodeError:
                    continue
                # Translate the CLI's stream-json events into our log events.
                rt, ae = self._handle_stream_event(evt, text_so_far_per_block)
                if rt is not None:
                    result_text = rt
                if ae is not None:
                    api_error = ae

            stderr_thread.join(timeout=2)

            # Wait for process exit.
            try:
                self._proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self._terminate(self._proc)
                self._proc.wait(timeout=5)
            rc = self._proc.returncode or 0

            err_text = "\n".join(err_lines).strip()
            if api_error:
                err_text = (err_text + "\n" + api_error).strip() if err_text else api_error
                if rc == 0:
                    rc = 1
            return rc, result_text, err_text
        except FileNotFoundError as exc:
            return 127, "", f"claude CLI not found: {exc}"
        finally:
            with self._lock:
                self._proc = None

    # ---- stream-json event handler ----

    def _handle_stream_event(
        self,
        evt: dict[str, Any],
        text_per_block: dict[str, str],
    ) -> tuple[str | None, str | None]:
        """Map one CLI event → log entries. Returns (final_result_text_or_None,
        api_error_or_None) — at most one of these is set, and only on the
        terminal ``result`` event."""
        etype = evt.get("type")

        # Per-block text accumulators (so we can log a single "wrote N chars"
        # at the end of a text block instead of every delta).
        if etype == "stream_event":
            inner = evt.get("event", {}) or {}
            inner_type = inner.get("type")
            idx = str(inner.get("index", "0"))
            if inner_type == "content_block_start":
                cb = inner.get("content_block") or {}
                cb_type = cb.get("type")
                if cb_type == "tool_use":
                    name = cb.get("name") or "tool"
                    self._log("tool_use", f"→ {name}", tool=name, input=cb.get("input"))
                elif cb_type == "text":
                    text_per_block[idx] = ""
            elif inner_type == "content_block_delta":
                delta = inner.get("delta") or {}
                if delta.get("type") == "text_delta":
                    text_per_block[idx] = text_per_block.get(idx, "") + (delta.get("text") or "")
                # Tool-input deltas (input_json_delta / partial_json) are too
                # noisy to log per-chunk; we log the final tool_use input from
                # the assistant block instead (see below).
            elif inner_type == "content_block_stop":
                # If a text block just closed, log a one-liner summary.
                if idx in text_per_block:
                    body = text_per_block.pop(idx)
                    if body.strip():
                        snippet = body.strip().replace("\n", " ")
                        if len(snippet) > 200:
                            snippet = snippet[:197] + "…"
                        self._log("text", snippet)
            return None, None

        if etype == "assistant":
            # Final assistant message — surface tool_use blocks here too,
            # because stream_event content_block_start may not always fire
            # cleanly for tool_use across CLI versions.
            msg = evt.get("message") or {}
            for block in msg.get("content") or []:
                btype = block.get("type")
                if btype == "tool_use":
                    name = block.get("name") or "tool"
                    inp = block.get("input")
                    summary = self._summarize_tool_input(name, inp)
                    self._log("tool_use", f"{name}{summary}", tool=name, input=inp)
            return None, None

        if etype == "user":
            # tool_result events: log a brief preview of the result.
            msg = evt.get("message") or {}
            for block in msg.get("content") or []:
                if block.get("type") == "tool_result":
                    raw = block.get("content")
                    if isinstance(raw, list):
                        # content can be [{type: text, text: "..."}, ...]
                        text = " ".join(
                            str(c.get("text", "")) for c in raw if isinstance(c, dict)
                        )
                    else:
                        text = str(raw or "")
                    is_err = bool(block.get("is_error"))
                    snippet = text.strip().replace("\n", " ")
                    if len(snippet) > 160:
                        snippet = snippet[:157] + "…"
                    kind = "error" if is_err else "tool_result"
                    self._log(kind, snippet or f"({len(text)} chars)")
            return None, None

        if etype == "result":
            res = str(evt.get("result", ""))
            usage = evt.get("usage") or {}
            duration = evt.get("duration_ms")
            cost = evt.get("total_cost_usd")
            extras: dict[str, Any] = {}
            if duration is not None:
                extras["duration_ms"] = duration
            if cost is not None:
                extras["cost_usd"] = cost
            if usage:
                extras["usage"] = {
                    k: usage.get(k)
                    for k in ("input_tokens", "output_tokens", "cache_read_input_tokens")
                    if usage.get(k) is not None
                }
            if evt.get("is_error"):
                reason = evt.get("terminal_reason") or evt.get("error") or "unknown"
                msg_line = res or f"[claude api error: {reason}]"
                self._log("error", f"api error ({reason}): {msg_line[:200]}", **extras)
                return res, f"[claude api error: {reason}] {res}".strip()
            preview = res.strip().split("\n", 1)[0]
            if len(preview) > 200:
                preview = preview[:197] + "…"
            self._log("result", preview or "(no result text)", **extras)
            return res, None
        return None, None

    @staticmethod
    def _summarize_tool_input(name: str, inp: Any) -> str:
        """Render a short '(arg)' suffix for a tool_use log entry."""
        if not isinstance(inp, dict):
            return ""
        # Pull the most useful field per common tool name.
        if name == "Read" and "file_path" in inp:
            extra = ""
            if "pages" in inp:
                extra = f" pp.{inp['pages']}"
            return f" {Path(str(inp['file_path'])).name}{extra}"
        if name in ("Glob", "Grep"):
            return f" {inp.get('pattern') or inp.get('path') or ''}"
        if name == "Write" and "file_path" in inp:
            return f" → {Path(str(inp['file_path'])).name}"
        if name == "Edit" and "file_path" in inp:
            return f" {Path(str(inp['file_path'])).name}"
        if name == "Task":
            sub = inp.get("description") or inp.get("subagent_type") or ""
            return f" — {str(sub)[:60]}"
        if name == "Bash" and "command" in inp:
            cmd = str(inp["command"])
            return f" $ {cmd[:80]}"
        return ""

    @staticmethod
    def _terminate(proc: subprocess.Popen) -> None:
        if proc.poll() is not None:
            return
        try:
            if os.name != "nt" and hasattr(os, "killpg"):
                os.killpg(proc.pid, signal.SIGTERM)
            else:
                proc.terminate()
        except OSError:
            pass
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            try:
                if os.name != "nt" and hasattr(os, "killpg"):
                    os.killpg(proc.pid, signal.SIGKILL)
                else:
                    proc.kill()
            except OSError:
                pass


__all__ = ["Builder", "BuildStatus"]
