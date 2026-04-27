import type { ChatSession, PersistedState } from "../types";

const KEY = "hist315.state.v1";

export function emptyState(): PersistedState {
  return { version: 1, activeSessionId: null, sessions: [] };
}

export function loadState(): PersistedState {
  if (typeof localStorage === "undefined") return emptyState();
  const raw = localStorage.getItem(KEY);
  if (!raw) return emptyState();
  try {
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed?.version === 1 && Array.isArray(parsed.sessions)) {
      // Defensive: rebuild graph fields if older messages lack them.
      for (const s of parsed.sessions) {
        s.messages ??= [];
        s.graph ??= { nodes: [], edges: [] };
      }
      return parsed;
    }
  } catch {
    // fall through
  }
  return emptyState();
}

export function saveState(state: PersistedState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    // Quota exceeded or otherwise — fail soft so the user keeps chatting.
    console.warn("hist315: failed to persist state", err);
  }
}

export function newSession(): ChatSession {
  const now = Date.now();
  return {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + now.toString(36),
    title: "New conversation",
    createdAt: now,
    modifiedAt: now,
    claudeSessionId: null,
    messages: [],
    graph: { nodes: [], edges: [] },
    attachedFile: null,
  };
}

export function deriveTitle(firstUserMessage: string): string {
  const cleaned = firstUserMessage.trim().replace(/\s+/g, " ");
  if (cleaned.length <= 56) return cleaned || "New conversation";
  return cleaned.slice(0, 53).trimEnd() + "…";
}
