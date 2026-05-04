import type { ChatSession, PersistedState } from "../types";

const KEY_V3 = "hist315.state.v3";
const KEY_V2 = "hist315.state.v2";
const KEY_V1 = "hist315.state.v1";

export function emptyState(): PersistedState {
  return {
    version: 3,
    activeSessionId: null,
    sessions: [],
    view: "chat",
    nodeChats: {},
    catalogActiveNodeId: null,
    catalogTreeExpanded: [],
    catalogPositions: {},
  };
}

interface PersistedStateV1 {
  version: 1;
  activeSessionId: string | null;
  sessions: ChatSession[];
}

interface PersistedStateV2 {
  version: 2;
  activeSessionId: string | null;
  sessions: ChatSession[];
  view?: "chat" | "catalog";
  nodeChats?: Record<string, string>;
  catalogView?: { activeNodeId: string | null };
  /** v2 stored positions keyed by activeNodeId; v3 flattens. */
  catalogPositions?: Record<string, Record<string, { x: number; y: number }>>;
}

function migrateV1(v1: PersistedStateV1): PersistedState {
  return {
    version: 3,
    activeSessionId: v1.activeSessionId ?? null,
    sessions: v1.sessions ?? [],
    view: "chat",
    nodeChats: {},
    catalogActiveNodeId: null,
    catalogTreeExpanded: [],
    catalogPositions: {},
  };
}

function migrateV2(v2: PersistedStateV2): PersistedState {
  return {
    version: 3,
    activeSessionId: v2.activeSessionId ?? null,
    sessions: v2.sessions ?? [],
    view: v2.view ?? "chat",
    nodeChats: v2.nodeChats ?? {},
    catalogActiveNodeId: v2.catalogView?.activeNodeId ?? null,
    catalogTreeExpanded: [],
    catalogPositions: v2.catalogPositions ?? {},
  };
}

export function loadState(): PersistedState {
  if (typeof localStorage === "undefined") return emptyState();
  // Try v3 first.
  const rawV3 = localStorage.getItem(KEY_V3);
  if (rawV3) {
    try {
      const parsed = JSON.parse(rawV3) as PersistedState;
      if (parsed?.version === 3 && Array.isArray(parsed.sessions)) {
        parsed.view ??= "chat";
        parsed.nodeChats ??= {};
        // Tolerate state from the brief LOD attempt: catalogExpanded /
        // flat catalogPositions. Convert/drop them silently.
        const anyP = parsed as unknown as Record<string, unknown>;
        if ("catalogActiveNodeId" in anyP === false) {
          anyP.catalogActiveNodeId = null;
        }
        parsed.catalogTreeExpanded ??= [];
        if (
          parsed.catalogPositions &&
          typeof parsed.catalogPositions === "object"
        ) {
          // If the inner values are positions instead of nested maps, the
          // user has flat-positions from LOD — drop them; positions will
          // re-derive next render.
          const sample = Object.values(parsed.catalogPositions)[0];
          if (sample && typeof sample === "object" && "x" in (sample as object)) {
            parsed.catalogPositions = {};
          }
        } else {
          parsed.catalogPositions = {};
        }
        for (const s of parsed.sessions) {
          s.messages ??= [];
          s.graph ??= { nodes: [], edges: [] };
        }
        return parsed;
      }
    } catch {
      // fall through
    }
  }
  // Migrate v2 → v3.
  const rawV2 = localStorage.getItem(KEY_V2);
  if (rawV2) {
    try {
      const parsed = JSON.parse(rawV2) as PersistedStateV2;
      if (parsed?.version === 2 && Array.isArray(parsed.sessions)) {
        for (const s of parsed.sessions) {
          s.messages ??= [];
          s.graph ??= { nodes: [], edges: [] };
        }
        const migrated = migrateV2(parsed);
        try {
          localStorage.setItem(KEY_V3, JSON.stringify(migrated));
        } catch {
          /* ignore quota */
        }
        return migrated;
      }
    } catch {
      // fall through
    }
  }
  // Migrate v1 → v3 (skip v2 — apply v1 defaults then v2->v3).
  const rawV1 = localStorage.getItem(KEY_V1);
  if (rawV1) {
    try {
      const parsed = JSON.parse(rawV1) as PersistedStateV1;
      if (parsed?.version === 1 && Array.isArray(parsed.sessions)) {
        for (const s of parsed.sessions) {
          s.messages ??= [];
          s.graph ??= { nodes: [], edges: [] };
        }
        const migrated = migrateV1(parsed);
        try {
          localStorage.setItem(KEY_V3, JSON.stringify(migrated));
        } catch {
          /* ignore */
        }
        return migrated;
      }
    } catch {
      // fall through
    }
  }
  return emptyState();
}

export function saveState(state: PersistedState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY_V3, JSON.stringify(state));
  } catch (err) {
    console.warn("hist315: failed to persist state", err);
  }
}

export function newSession(): ChatSession {
  const now = Date.now();
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
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
