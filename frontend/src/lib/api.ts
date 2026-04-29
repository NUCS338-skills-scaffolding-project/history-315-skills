import type { AttachedFile, CausalGraph, NodeContext } from "../types";

export interface UploadResponse {
  path: string;
  relative_path: string;
  filename: string;
  size: string;
}

export async function uploadFile(
  sessionId: string,
  file: File,
): Promise<AttachedFile> {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`upload failed (${res.status}): ${detail}`);
  }
  const json = (await res.json()) as UploadResponse;
  return {
    path: json.path,
    name: json.filename,
    size: Number(json.size) || file.size,
  };
}

export interface ChatStreamArgs {
  message: string;
  /** Frontend's session id — keys the per-conversation graph file. */
  sessionId: string;
  /** Claude CLI's session UUID from the previous turn, if any. */
  claudeSessionId: string | null;
  filePath?: string | null;
  /** Sent only on the first turn of a node-anchored chat. */
  nodeContext?: NodeContext | null;
  signal?: AbortSignal;
  onDelta: (text: string) => void;
  onToolUse: (info: { name: string; description?: string }) => void;
  onDone: (info: { claudeSessionId: string | null; durationS?: number }) => void;
  onError: (msg: string) => void;
}

export async function fetchGraph(sessionId: string): Promise<CausalGraph> {
  const res = await fetch(`/api/graph/${encodeURIComponent(sessionId)}`);
  if (!res.ok) return { nodes: [], edges: [] };
  const data = (await res.json()) as Partial<CausalGraph>;
  return {
    nodes: Array.isArray(data.nodes) ? data.nodes : [],
    edges: Array.isArray(data.edges) ? data.edges : [],
  };
}

export async function clearGraph(sessionId: string): Promise<void> {
  await fetch(`/api/graph/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
}

/**
 * Connect to /api/chat as an SSE stream (manual fetch reader because we POST).
 */
export async function streamChat(args: ChatStreamArgs): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: args.signal,
    body: JSON.stringify({
      message: args.message,
      session_id: args.sessionId,
      claude_session_id: args.claudeSessionId,
      file_path: args.filePath ?? null,
      node_context: args.nodeContext ?? null,
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`chat failed (${res.status}): ${detail}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      handleFrame(frame, args);
    }
  }
  if (buf.trim()) handleFrame(buf, args);
}

function handleFrame(frame: string, args: ChatStreamArgs): void {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event: ")) event = line.slice(7).trim();
    else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
  }
  const dataStr = dataLines.join("\n");
  if (!dataStr) return;
  let data: unknown;
  try {
    data = JSON.parse(dataStr);
  } catch {
    return;
  }
  const obj = data as Record<string, unknown>;

  switch (event) {
    case "delta":
      if (typeof obj.text === "string") args.onDelta(obj.text);
      break;
    case "tool_use": {
      const inner = (obj.message as Record<string, unknown> | undefined)?.content;
      const name =
        (typeof obj.name === "string" && obj.name) ||
        (Array.isArray(inner) &&
          (inner as Record<string, unknown>[]).find((b) => b?.type === "tool_use")
            ?.name) ||
        "tool";
      args.onToolUse({ name: String(name) });
      break;
    }
    case "done":
      args.onDone({
        claudeSessionId:
          typeof obj.claude_session_id === "string" ? obj.claude_session_id : null,
        durationS: typeof obj.duration_s === "number" ? obj.duration_s : undefined,
      });
      break;
    case "error":
      args.onError(typeof obj.message === "string" ? obj.message : "stream failed");
      break;
  }
}
