"""FastAPI backend for the History 315 study assistant.

Architecture (kept simple on purpose):

  * No warm-up, no session forking. Each conversation is its own Claude CLI
    session. The first turn ships a fat system prompt (tutor persona +
    causal-chains-skill spec + course-materials directory listing); later
    turns just ``--resume`` and inherit it.

  * The causal-chain graph lives in a per-conversation JSON file at
    ``causal_chains/<session_id>.json``. Claude updates it via Read/Write;
    the frontend polls ``GET /api/graph/<session_id>`` to render the live
    state. JSON does NOT appear inline in the chat reply.

Endpoints:
    GET    /api/health              — sanity check
    GET    /api/skills              — list discovered skill metadata
    POST   /api/upload              — multipart file upload (assignments)
    GET    /api/graph/{session_id}  — current causal-chain JSON
    DELETE /api/graph/{session_id}  — wipe the graph for that session
    POST   /api/chat                — SSE stream of Claude tokens
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from claude_api import ClaudeAPI, ClaudeAPIError

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
log = logging.getLogger("hist315")

PROJECT_ROOT = Path(__file__).resolve().parent
SKILLS_DIR = PROJECT_ROOT / "skills"
COURSE_DIR = PROJECT_ROOT / "course-materials"
UPLOAD_DIR = PROJECT_ROOT / "uploads"
GRAPHS_DIR = PROJECT_ROOT / "causal_chains"
UPLOAD_DIR.mkdir(exist_ok=True)
GRAPHS_DIR.mkdir(exist_ok=True)

DEFAULT_MODEL = "claude-sonnet-4-6"
_TEMPLATE_MARKER = 'skill_id: "skill-name"'
_INLINE_SKILL_ID = "causal-chains-skill"


# ---------------------------------------------------------------------------
# Per-session causal-chain graph file
# ---------------------------------------------------------------------------

def _safe_session_id(sid: str) -> str:
    cleaned = "".join(c if c.isalnum() or c in "-_" else "_" for c in sid)[:64]
    return cleaned or "default"


def graph_path_for(session_id: str) -> Path:
    return GRAPHS_DIR / f"{_safe_session_id(session_id)}.json"


def empty_graph() -> dict:
    return {"nodes": [], "edges": []}


def read_graph(session_id: str) -> dict:
    path = graph_path_for(session_id)
    if not path.exists():
        return empty_graph()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return empty_graph()
    if not isinstance(data, dict):
        return empty_graph()
    data.setdefault("nodes", [])
    data.setdefault("edges", [])
    return data


def ensure_graph(session_id: str) -> Path:
    path = graph_path_for(session_id)
    if not path.exists():
        path.write_text(json.dumps(empty_graph(), indent=2), encoding="utf-8")
    return path


# ---------------------------------------------------------------------------
# Skill + course materials discovery
# ---------------------------------------------------------------------------

def _load_skill_briefs() -> list[dict[str, str]]:
    if not SKILLS_DIR.exists():
        return []
    out: list[dict[str, str]] = []
    for p in sorted(SKILLS_DIR.glob("*/skills.md")):
        text = p.read_text(encoding="utf-8", errors="replace")
        first_line = next(
            (line.strip("# ").strip() for line in text.splitlines() if line.startswith("# ")),
            p.parent.name,
        )
        out.append({
            "id": p.parent.name,
            "name": first_line,
            "path": str(p.relative_to(PROJECT_ROOT)),
            "is_template": "1" if _TEMPLATE_MARKER in text else "",
            "_content": text,
        })
    return out


def _skill_short_desc(content: str) -> str:
    """Pull the first paragraph of the ``## Description`` section."""
    desc = ""
    in_desc = False
    for line in content.splitlines():
        if line.strip().lower() == "## description":
            in_desc = True
            continue
        if in_desc:
            stripped = line.strip()
            if not stripped:
                if desc:
                    break
                continue
            if stripped.startswith("#"):
                break
            desc = (desc + " " + stripped).strip()
            if len(desc) > 220:
                break
    return desc[:220].rstrip()


def _course_materials_tree() -> str:
    """Markdown bullet tree of every file under course-materials/."""
    if not COURSE_DIR.exists():
        return "_(no course-materials/ directory — student should `git pull main`)_"
    groups: dict[str, list[Path]] = {}
    for p in sorted(COURSE_DIR.rglob("*")):
        if not p.is_file() or p.name.startswith("."):
            continue
        rel = p.relative_to(COURSE_DIR)
        top = rel.parts[0] if len(rel.parts) > 1 else "(root)"
        groups.setdefault(top, []).append(rel)
    lines: list[str] = []
    for group in sorted(groups):
        lines.append(f"\n**{group}**")
        for rel in groups[group]:
            lines.append(f"- `course-materials/{rel.as_posix()}`")
    return "\n".join(lines).strip()


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

def build_system_prompt() -> str:
    skills = _load_skill_briefs()
    inline_skill = next((s for s in skills if s["id"] == _INLINE_SKILL_ID), None)
    other_skills = [
        s for s in skills if s["id"] != _INLINE_SKILL_ID and not s.get("is_template")
    ]
    inline_block = inline_skill["_content"] if inline_skill else "(causal-chains-skill missing)"
    other_lines = (
        "\n".join(
            f"- `{s['path']}` — {_skill_short_desc(s['_content'])}"
            for s in other_skills
        )
        or "(none)"
    )

    return f"""You are a study assistant for **History 315: The United States Since 1968** \
at Northwestern.

## Tutor stance

Socratic. Push the student to commit to a position, then test the evidence \
and the mechanism. Never write the student's essay; help them find the \
shape of the argument. Don't restate the student's question. Skip \
preambles like "Great question".

## Output style

- **Socratic guidance** ("what should I argue?", "is this evidence good?"): \
2-4 sentences, ideally one pointed follow-up question.
- **Explanatory questions** ("what is X?", "tell me about Y"): 2-4 short \
paragraphs. Cite specific lectures/readings when relevant.

## Causal-chain graph protocol — file-based

Each conversation has a JSON graph file at \
`causal_chains/<session_id>.json`. Each user message will tell you the \
absolute path. Whenever you discuss any specific historical entity \
(person, event, policy, condition, idea, movement, law, election, war, \
decade-trend), update that file:

1. **Read** the file to get the current `{{"nodes": [...], "edges": [...]}}`.
2. Merge in new nodes/edges or refine existing ones. Dedupe by node `id` \
and edge `(from, to)`.
3. **Write** the merged JSON back.

Do this BEFORE you finish your prose reply — the student watches the graph \
update in real time. **Do NOT include the JSON in your chat reply**; the \
file is the source of truth.

### Schema
```json
{{
  "nodes": [
    {{
      "id": "powell_memo",
      "label": "Powell Memorandum",
      "year": 1971,
      "kind": "idea",
      "description": "1-2 sentences."
    }}
  ],
  "edges": [
    {{
      "from": "powell_memo",
      "to": "corporate_pac_boom",
      "label": "blueprint for organized capital",
      "kind": "trigger",
      "description": "1-2 sentences (optional)."
    }}
  ]
}}
```

- `id` — stable, snake_case, ASCII; reused turn-to-turn.
- `nodes[].kind` ∈ {{event, policy, actor, condition, idea}}.
- `edges[].kind` ∈ {{precondition, trigger, amplifier, consequence}}.
- `description` required on every node (the student clicks to read it).
- Use `"label": "asserted"` on an edge when the student hasn't named a \
mechanism — the UI flags it weak.

## The causal-chains-skill (full)

{inline_block}

## Other skills available

When a student's question matches one of these, **Read** the file with \
your Read tool, then apply that skill's Tutor Stance and Flow:

{other_lines}

## Course materials

The student's course materials are on disk. **Read on demand** when their \
question references them — do not invent quotes or page numbers.

{_course_materials_tree()}

The textbook (Gerstle's *Rise and Fall of the Neoliberal Order*) is also \
under `course-materials/` but is large; only Read it when specifically \
needed.

## Assignments

If the student attaches a file, the message will give you the absolute \
path. Read it before responding."""


SYSTEM_PROMPT = build_system_prompt()


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="History 315 Study Assistant")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="claude-stream")


class ChatRequest(BaseModel):
    message: str
    session_id: str
    """Frontend's per-conversation id — keys the graph file."""
    claude_session_id: str | None = None
    """The CLI session UUID from a prior turn, or None for a fresh chat."""
    file_path: str | None = None
    model: str | None = None


@app.get("/api/health")
def health() -> dict[str, object]:
    return {
        "ok": True,
        "default_model": DEFAULT_MODEL,
        "skills_loaded": len(_load_skill_briefs()),
        "course_materials_files": sum(1 for _ in COURSE_DIR.rglob("*") if _.is_file()) if COURSE_DIR.exists() else 0,
        "system_prompt_chars": len(SYSTEM_PROMPT),
    }


@app.get("/api/skills")
def skills() -> list[dict[str, str]]:
    return [
        {k: v for k, v in s.items() if k != "_content"}
        for s in _load_skill_briefs()
    ]


@app.get("/api/graph/{session_id}")
def graph(session_id: str) -> dict:
    return read_graph(session_id)


@app.delete("/api/graph/{session_id}")
def clear_graph(session_id: str) -> dict:
    path = graph_path_for(session_id)
    path.write_text(json.dumps(empty_graph(), indent=2), encoding="utf-8")
    return {"ok": True}


@app.post("/api/upload")
async def upload(
    session_id: str = Form(...),
    file: UploadFile = File(...),
) -> dict[str, str]:
    if not session_id:
        raise HTTPException(400, "session_id required")
    safe_name = Path(file.filename or "upload.bin").name
    target_dir = UPLOAD_DIR / session_id
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / safe_name
    contents = await file.read()
    target.write_bytes(contents)
    return {
        "path": str(target),
        "relative_path": str(target.relative_to(PROJECT_ROOT)),
        "filename": safe_name,
        "size": str(len(contents)),
    }


def _format_user_message(text: str, file_path: str | None, graph_path: Path) -> str:
    parts: list[str] = []
    if file_path:
        parts.append(
            f"The student has attached an assignment file at this absolute "
            f"path:\n  {file_path}\n\n"
            f"Read that file with your Read tool before responding."
        )
    parts.append(f"Student's message:\n{text}")
    parts.append(
        "[Graph file for THIS conversation: "
        f"{graph_path}\n"
        "Read → merge → Write whenever you mention any historical entity. "
        "Don't put JSON in the chat reply.]"
    )
    return "\n\n".join(parts)


def _sse(event: str, data: object) -> bytes:
    payload = data if isinstance(data, str) else json.dumps(data)
    return f"event: {event}\ndata: {payload}\n\n".encode("utf-8")


async def _stream_chat(req: ChatRequest) -> AsyncIterator[bytes]:
    model = req.model or DEFAULT_MODEL
    graph_path = ensure_graph(req.session_id)
    user_message = _format_user_message(req.message, req.file_path, graph_path)

    is_first_turn = not req.claude_session_id
    client = ClaudeAPI(
        working_dir=PROJECT_ROOT,
        permission_mode="bypassPermissions",
        session_id=req.claude_session_id,
    )

    yield _sse("started", {"model": model, "first_turn": is_first_turn})

    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[dict | None] = asyncio.Queue()

    def producer() -> None:
        try:
            iterator = client.messages.create(
                model=model,
                # System prompt only on the first turn; later turns inherit
                # it from the resumed session.
                system=SYSTEM_PROMPT if is_first_turn else None,
                messages=[{"role": "user", "content": user_message}],
                stream=True,
                session_id=req.claude_session_id,
            )
            for chunk in iterator:
                loop.call_soon_threadsafe(queue.put_nowait, chunk)
        except ClaudeAPIError as exc:
            loop.call_soon_threadsafe(queue.put_nowait, {"type": "_error", "message": str(exc)})
        except Exception as exc:  # pragma: no cover
            loop.call_soon_threadsafe(queue.put_nowait, {"type": "_error", "message": repr(exc)})
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    fut = loop.run_in_executor(_executor, producer)

    last_assistant_text = ""
    started_at = time.time()
    cli_session_id: str | None = None
    try:
        while True:
            chunk = await queue.get()
            if chunk is None:
                break
            if chunk.get("type") == "_error":
                yield _sse("error", {"message": chunk.get("message", "stream failed")})
                break

            sid = chunk.get("session_id")
            if isinstance(sid, str) and sid:
                cli_session_id = sid

            event_type = chunk.get("type")

            if event_type == "stream_event":
                inner = chunk.get("event", {})
                if inner.get("type") == "content_block_delta":
                    delta = inner.get("delta", {}) or {}
                    # Only forward text_delta from text blocks; tool_use input
                    # JSON deltas would otherwise leak into the chat bubble.
                    if delta.get("type") == "text_delta":
                        text = delta.get("text") or ""
                        if text:
                            last_assistant_text += text
                            yield _sse("delta", {"text": text})
                continue

            if event_type == "assistant":
                msg = chunk.get("message", {})
                for block in msg.get("content", []) or []:
                    if block.get("type") == "text":
                        text = block.get("text", "")
                        if text and text != last_assistant_text:
                            new_text = text[len(last_assistant_text):]
                            if new_text:
                                yield _sse("delta", {"text": new_text})
                                last_assistant_text = text
                continue

            if event_type == "result":
                yield _sse(
                    "done",
                    {
                        "claude_session_id": cli_session_id,
                        "duration_s": round(time.time() - started_at, 2),
                        "usage": chunk.get("usage", {}),
                    },
                )
                continue

            if event_type in {"tool_use", "tool_result"}:
                # Surface tool calls so the UI can show "reading file…".
                yield _sse(event_type, chunk)
    finally:
        fut.cancel()


@app.post("/api/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    if not req.message.strip():
        raise HTTPException(400, "message must not be empty")
    return StreamingResponse(
        _stream_chat(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
