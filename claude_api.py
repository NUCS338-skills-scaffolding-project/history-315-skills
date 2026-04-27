"""
claude_api.py

Anthropic-style Python API facade over Claude Code CLI with session resume and optional stream events.
It exposes `client.messages.create(...)` semantics while running locally through the CLI.
"""

from __future__ import annotations

import json
import os
import signal
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator, Optional, Sequence

PROCESS_KILL_TIMEOUT_SECONDS = 5


class ClaudeAPIError(RuntimeError):
    pass


def _to_prompt(messages: Sequence[dict]) -> str:
    """Render the user/assistant message list as a single prompt string.

    The CLI takes the prompt as its final positional arg; the system prompt is
    forwarded separately via ``--system-prompt`` and is NOT inlined here.
    """
    lines: list[str] = []
    for item in messages:
        role = str(item.get("role", "user")).strip().capitalize()
        content = item.get("content", "")
        if isinstance(content, list):
            text = "\n".join(str(part.get("text", "")) for part in content if isinstance(part, dict))
        else:
            text = str(content)
        lines.append(f"{role}: {text.strip()}")
    return "\n\n".join(lines).strip()


def _parse_json_line(line: str) -> dict | None:
    line = line.strip()
    if not line:
        return None
    try:
        payload = json.loads(line)
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


@dataclass
class _MessagesAPI:
    _client: "ClaudeAPI"

    def create(
        self,
        *,
        model: str | None = None,
        messages: Sequence[dict],
        max_tokens: int | None = None,
        system: str | None = None,
        stream: bool = False,
        session_id: str | None = None,
        fork_session: bool = False,
        permission_mode: str | None = None,
        temperature: float | None = None,
    ) -> dict | Iterator[dict]:
        del max_tokens, temperature
        prompt = _to_prompt(messages)
        if not prompt:
            raise ValueError("messages must contain at least one non-empty content item")
        if stream:
            return self._client._stream_create(
                model=model,
                prompt=prompt,
                system=system,
                session_id=session_id,
                fork_session=fork_session,
                permission_mode=permission_mode,
            )
        return self._client._create_once(
            model=model,
            prompt=prompt,
            system=system,
            session_id=session_id,
            fork_session=fork_session,
            permission_mode=permission_mode,
        )


def terminate_process(process: subprocess.Popen) -> None:
    """Gracefully terminate a subprocess, escalating to SIGKILL if needed."""
    if process.poll() is not None:
        return
    try:
        if os.name != "nt" and hasattr(os, "killpg"):
            os.killpg(process.pid, signal.SIGTERM)
        else:
            process.terminate()
    except OSError:
        pass
    try:
        process.wait(timeout=PROCESS_KILL_TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired:
        try:
            if os.name != "nt" and hasattr(os, "killpg"):
                os.killpg(process.pid, signal.SIGKILL)
            else:
                process.kill()
        except OSError:
            pass
        process.wait(timeout=PROCESS_KILL_TIMEOUT_SECONDS)


@dataclass
class ClaudeAPI:
    model: Optional[str] = None
    working_dir: Optional[Path] = None
    permission_mode: Optional[str] = "default"
    extra_args: Sequence[str] = ()
    timeout_seconds: int = 600
    session_id: Optional[str] = None
    _base_command: list[str] = field(init=False, repr=False)
    messages: _MessagesAPI = field(init=False, repr=False)
    active_process: Optional[subprocess.Popen] = field(init=False, repr=False, default=None)

    def __post_init__(self) -> None:
        if self.working_dir is not None:
            self.working_dir = Path(self.working_dir)
        self._base_command = ["cmd", "/c", "claude"] if os.name == "nt" else ["claude"]
        self.messages = _MessagesAPI(self)

    def abort(self) -> None:
        """Kill the active streaming subprocess if one is running."""
        if self.active_process is not None:
            terminate_process(self.active_process)
            self.active_process = None

    def _create_once(
        self,
        *,
        model: str | None,
        prompt: str,
        system: str | None,
        session_id: str | None,
        fork_session: bool = False,
        permission_mode: str | None,
    ) -> dict:
        command = self._build_command(
            model=model,
            prompt=prompt,
            system=system,
            stream=False,
            session_id=session_id,
            fork_session=fork_session,
            permission_mode=permission_mode,
        )
        try:
            completed = subprocess.run(
                command,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=self.timeout_seconds,
                cwd=str(self.working_dir) if self.working_dir else None,
                check=False,
            )
        except FileNotFoundError as exc:
            raise ClaudeAPIError(
                f"Claude CLI not found. Command: {' '.join(command)}"
            ) from exc
        except subprocess.TimeoutExpired as exc:
            raise ClaudeAPIError(
                f"Claude CLI timed out after {self.timeout_seconds}s. "
                f"Command: {' '.join(command)}"
            ) from exc
        stdout = (completed.stdout or "").strip()
        stderr = (completed.stderr or "").strip()
        if completed.returncode != 0:
            raise ClaudeAPIError(
                f"Claude CLI failed (exit={completed.returncode}).\n"
                f"Command: {' '.join(command)}\nSTDERR: {stderr}\nSTDOUT: {stdout}"
            )
        payload = _parse_json_line(stdout)
        if payload is None:
            raise ClaudeAPIError(f"Claude output was not valid JSON: {stdout[:500]}")
        if payload.get("is_error") is True:
            raise ClaudeAPIError(f"Claude returned error payload: {payload}")
        text = payload.get("result")
        if not isinstance(text, str):
            raise ClaudeAPIError(f"Claude payload missing `result` text: {payload}")

        sid = payload.get("session_id")
        if isinstance(sid, str) and sid:
            self.session_id = sid

        return {
            "id": payload.get("session_id") or f"msg_{int(time.time() * 1000)}",
            "type": "message",
            "role": "assistant",
            "model": payload.get("model") or model or self.model,
            "content": [{"type": "text", "text": text.strip()}],
            "stop_reason": payload.get("stop_reason") or "end_turn",
            "usage": payload.get("usage", {}),
            "session_id": self.session_id,
            "_raw": payload,
        }

    def _stream_create(
        self,
        *,
        model: str | None,
        prompt: str,
        system: str | None,
        session_id: str | None,
        fork_session: bool = False,
        permission_mode: str | None,
    ) -> Iterator[dict]:
        command = self._build_command(
            model=model,
            prompt=prompt,
            system=system,
            stream=True,
            session_id=session_id,
            fork_session=fork_session,
            permission_mode=permission_mode,
        )
        preexec = os.setsid if os.name != "nt" else None
        try:
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace",
                cwd=str(self.working_dir) if self.working_dir else None,
                bufsize=1,
                preexec_fn=preexec,
            )
        except FileNotFoundError as exc:
            raise ClaudeAPIError(
                f"Claude CLI not found. Command: {' '.join(command)}"
            ) from exc
        if process.stdout is None or process.stderr is None:
            raise ClaudeAPIError("Failed to open Claude process streams.")

        self.active_process = process
        try:
            for raw_line in process.stdout:
                payload = _parse_json_line(raw_line)
                if payload is None:
                    continue
                sid = payload.get("session_id")
                if isinstance(sid, str) and sid:
                    self.session_id = sid
                yield payload
        finally:
            terminate_process(process)
            self.active_process = None
            stderr = ""
            if process.stderr:
                try:
                    stderr = process.stderr.read().strip()
                except (ValueError, OSError):
                    pass
            return_code = process.returncode
            if return_code and return_code > 0:
                raise ClaudeAPIError(
                    f"Claude stream failed (exit={return_code}).\n"
                    f"Command: {' '.join(command)}\nSTDERR: {stderr}"
                )

    def _build_command(
        self,
        *,
        model: str | None,
        prompt: str,
        system: str | None,
        stream: bool,
        session_id: str | None,
        fork_session: bool = False,
        permission_mode: str | None,
    ) -> list[str]:
        cmd = [*self._base_command, "-p"]
        if stream:
            cmd += ["--verbose", "--output-format", "stream-json", "--include-partial-messages"]
        else:
            cmd += ["--output-format", "json"]
        chosen_model = model or self.model
        if chosen_model:
            cmd += ["--model", chosen_model]

        mode = permission_mode if permission_mode is not None else self.permission_mode
        if mode:
            cmd += ["--permission-mode", mode]
        if self.working_dir:
            cmd += ["--add-dir", str(self.working_dir)]
        if system:
            cmd += ["--system-prompt", system]
        cmd += list(self.extra_args)

        sid = session_id or self.session_id
        if sid:
            cmd += ["--resume", sid]
            if fork_session:
                cmd += ["--fork-session"]
        cmd += [prompt]
        return cmd
