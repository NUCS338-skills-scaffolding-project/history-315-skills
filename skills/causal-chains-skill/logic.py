"""logic.py — Causal-chain merge helper.

The tutor emits ``causal-chain`` JSON blocks containing a *delta* of nodes and
edges. The frontend accumulates a running graph across turns; this helper does
the same merge server-side so a backend or notebook can rehydrate state from a
transcript.

Merge rules (mirror the UI):
  * Nodes are deduped by ``id``. Later turns overwrite earlier metadata for the
    same id (label, year, kind), so a tutor can refine a node by re-emitting it.
  * Edges are deduped by ``(from, to)``. Later emissions replace the label, so
    a tutor can correct a mechanism by re-emitting the edge.
  * Edges whose endpoints are unknown are dropped (with a note in ``warnings``).
"""

from __future__ import annotations

import json
import re
from typing import Any

CAUSAL_BLOCK_RE = re.compile(r"```causal-chain\s*\n(.*?)\n```", re.DOTALL)


def extract_blocks(text: str) -> list[dict[str, Any]]:
    """Pull every ``causal-chain`` JSON block out of an assistant message."""
    blocks: list[dict[str, Any]] = []
    for match in CAUSAL_BLOCK_RE.finditer(text):
        try:
            payload = json.loads(match.group(1))
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict):
            blocks.append(payload)
    return blocks


def merge(graph: dict[str, Any], delta: dict[str, Any]) -> dict[str, Any]:
    """Merge ``delta`` into ``graph`` in place and return ``graph``."""
    nodes_by_id: dict[str, dict[str, Any]] = {n["id"]: n for n in graph.get("nodes", []) if "id" in n}
    edges_by_pair: dict[tuple[str, str], dict[str, Any]] = {
        (e["from"], e["to"]): e for e in graph.get("edges", []) if "from" in e and "to" in e
    }

    for node in delta.get("nodes", []) or []:
        nid = node.get("id")
        if not isinstance(nid, str) or not nid:
            continue
        nodes_by_id[nid] = {**nodes_by_id.get(nid, {}), **node}

    warnings: list[str] = list(graph.get("warnings", []))
    for edge in delta.get("edges", []) or []:
        src, dst = edge.get("from"), edge.get("to")
        if not isinstance(src, str) or not isinstance(dst, str):
            continue
        if src not in nodes_by_id or dst not in nodes_by_id:
            warnings.append(f"edge {src!r}->{dst!r} references unknown node; dropped")
            continue
        edges_by_pair[(src, dst)] = edge

    graph["nodes"] = list(nodes_by_id.values())
    graph["edges"] = list(edges_by_pair.values())
    if warnings:
        graph["warnings"] = warnings
    return graph


def run(input: dict[str, Any]) -> dict[str, Any]:
    """Entry point.

    Input shape::

        {
            "graph": {"nodes": [...], "edges": [...]},   # current graph (optional)
            "message": "assistant text containing causal-chain blocks",
            # OR
            "delta": {"nodes": [...], "edges": [...]},   # pre-parsed delta
        }
    """
    graph = input.get("graph") or {"nodes": [], "edges": []}
    if "delta" in input and isinstance(input["delta"], dict):
        return merge(graph, input["delta"])
    message = input.get("message", "")
    if isinstance(message, str):
        for delta in extract_blocks(message):
            merge(graph, delta)
    return graph
