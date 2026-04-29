import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BuildLogEvent,
  BuildStatus,
  CatalogEdgeT,
  CatalogNodeT,
  CatalogSearchHit,
  CatalogSubgraphT,
  CatalogTreeRow,
} from "../types";

// ---------------------------------------------------------------------------
// REST client
// ---------------------------------------------------------------------------

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new HttpError(res.status, `${url} → ${res.status}: ${detail}`);
  }
  return (await res.json()) as T;
}

export { HttpError };

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${url} → ${res.status}: ${detail}`);
  }
  return (await res.json()) as T;
}

export type TopResult =
  | { empty: true; build: BuildStatus }
  | (CatalogSubgraphT & { empty?: false });

export const catalogApi = {
  fetchTop(): Promise<TopResult> {
    return getJson<TopResult>("/api/catalog");
  },
  fetchNode(id: string): Promise<CatalogSubgraphT> {
    return getJson<CatalogSubgraphT>(
      `/api/catalog/node/${encodeURIComponent(id)}`,
    );
  },
  fetchPath(id: string): Promise<{ node: CatalogNodeT; ancestors: CatalogNodeT[] }> {
    return getJson(`/api/catalog/node/${encodeURIComponent(id)}/path`);
  },
  fetchTree(): Promise<{ nodes: CatalogTreeRow[] }> {
    return getJson("/api/catalog/tree");
  },
  search(q: string, limit = 20): Promise<{ hits: CatalogSearchHit[] }> {
    const u = new URL("/api/catalog/search", window.location.origin);
    u.searchParams.set("q", q);
    u.searchParams.set("limit", String(limit));
    return getJson(u.pathname + u.search);
  },
  buildStatus(): Promise<BuildStatus> {
    return getJson<BuildStatus>("/api/catalog/build/status");
  },
  buildLog(
    since: number,
    limit = 200,
  ): Promise<{ events: BuildLogEvent[]; cursor: number }> {
    const u = new URL("/api/catalog/build/log", window.location.origin);
    u.searchParams.set("since", String(since));
    u.searchParams.set("limit", String(limit));
    return getJson(u.pathname + u.search);
  },
  startBuild(): Promise<{ started: boolean; status: BuildStatus }> {
    return postJson("/api/catalog/build");
  },
  cancelBuild(): Promise<{ cancelled: boolean }> {
    return postJson("/api/catalog/build/cancel");
  },
};

// ---------------------------------------------------------------------------
// Hooks — build status / log / search (unchanged from prior round)
// ---------------------------------------------------------------------------

/** Polls /api/catalog/build/status. Polling stops once phase is "complete"
 *  or "failed" (to avoid hammering the server when nothing's changing). */
export function useBuildStatus(active: boolean): BuildStatus | null {
  const [status, setStatus] = useState<BuildStatus | null>(null);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const s = await catalogApi.buildStatus();
        if (!cancelled) setStatus(s);
      } catch {
        /* ignore */
      }
    };
    tick();
    const id = setInterval(() => {
      if (status && (status.phase === "complete" || status.phase === "failed")) {
        return;
      }
      tick();
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active, status?.phase]);
  return status;
}

/** Live tail of build log events. */
export function useBuildLog(
  active: boolean,
  buildPhase: BuildStatus["phase"] | null,
  cap = 600,
): BuildLogEvent[] {
  const [events, setEvents] = useState<BuildLogEvent[]>([]);
  const cursorRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const { events: chunk, cursor } = await catalogApi.buildLog(
          cursorRef.current,
        );
        if (cancelled) return;
        if (cursor < cursorRef.current) {
          cursorRef.current = 0;
          setEvents([]);
          return;
        }
        if (chunk.length === 0) {
          cursorRef.current = cursor;
          return;
        }
        cursorRef.current = cursor;
        setEvents((prev) => {
          const next = [...prev, ...chunk];
          if (next.length > cap) next.splice(0, next.length - cap);
          return next;
        });
      } catch {
        // ignore
      }
    };

    tick();
    const isTerminal =
      buildPhase === "complete" || buildPhase === "failed";
    if (isTerminal) return;
    const id = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active, buildPhase, cap]);

  return events;
}

/** Debounced search hook. */
export function useCatalogSearch(query: string, debounceMs = 150): CatalogSearchHit[] {
  const [hits, setHits] = useState<CatalogSearchHit[]>([]);
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const { hits: results } = await catalogApi.search(q, 20);
        if (!cancelled) setHits(results);
      } catch {
        if (!cancelled) setHits([]);
      }
    }, debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query, debounceMs]);
  return hits;
}

// ---------------------------------------------------------------------------
// Drill-in subgraph — used by the main catalog graph
// ---------------------------------------------------------------------------

export type SubgraphState =
  | { status: "loading" }
  | { status: "empty"; build: BuildStatus }
  | { status: "ready"; subgraph: CatalogSubgraphT }
  | { status: "missing" }
  | { status: "error"; error: string };

/** Fetch the subgraph for `activeId` (null = top-level). Re-fetches every 4s
 *  while a build is in flight so partial results stream in. */
export function useCatalogSubgraph(
  activeId: string | null,
  buildPhase: BuildStatus["phase"] | null,
): SubgraphState {
  const [state, setState] = useState<SubgraphState>({ status: "loading" });
  const versionRef = useRef(0);

  useEffect(() => {
    versionRef.current += 1;
    const myVersion = versionRef.current;
    let cancelled = false;

    const fetchOnce = async () => {
      try {
        if (activeId === null) {
          const top = await catalogApi.fetchTop();
          if (cancelled || versionRef.current !== myVersion) return;
          if ("empty" in top && top.empty) {
            setState({ status: "empty", build: top.build });
          } else {
            setState({
              status: "ready",
              subgraph: top as CatalogSubgraphT,
            });
          }
        } else {
          const sub = await catalogApi.fetchNode(activeId);
          if (cancelled || versionRef.current !== myVersion) return;
          setState({ status: "ready", subgraph: sub });
        }
      } catch (err) {
        if (cancelled || versionRef.current !== myVersion) return;
        if (err instanceof HttpError && err.status === 404) {
          setState({ status: "missing" });
          return;
        }
        setState({
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    };

    fetchOnce();
    const isBuilding =
      buildPhase &&
      buildPhase !== "complete" &&
      buildPhase !== "failed" &&
      buildPhase !== "idle";
    if (isBuilding) {
      const id = setInterval(fetchOnce, 4000);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [activeId, buildPhase]);

  return state;
}

// ---------------------------------------------------------------------------
// Tree view — flat list of every node (~1500 rows)
// ---------------------------------------------------------------------------

export interface TreeState {
  status: "loading" | "empty" | "ready" | "error";
  rows: CatalogTreeRow[];
  /** id → row, for O(1) lookup. */
  byId: Map<string, CatalogTreeRow>;
  /** parent_id (or "__root__" for top-level) → child rows. */
  childrenByParent: Map<string, CatalogTreeRow[]>;
  error?: string;
  /** Refetch the whole tree (use after a build completes). */
  refresh: () => void;
}

const ROOT_KEY = "__root__";

export function useCatalogTree(active: boolean): TreeState {
  const [rows, setRows] = useState<CatalogTreeRow[]>([]);
  const [status, setStatus] = useState<TreeState["status"]>("loading");
  const [error, setError] = useState<string | undefined>(undefined);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setStatus("loading");
    catalogApi
      .fetchTree()
      .then((result) => {
        if (cancelled) return;
        setRows(result.nodes ?? []);
        setStatus(result.nodes && result.nodes.length > 0 ? "ready" : "empty");
        setError(undefined);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [active, refreshTick]);

  const { byId, childrenByParent } = useMemo(() => {
    const id = new Map<string, CatalogTreeRow>();
    const kids = new Map<string, CatalogTreeRow[]>();
    for (const r of rows) {
      id.set(r.id, r);
      const key = r.parent_id ?? ROOT_KEY;
      const list = kids.get(key) ?? [];
      list.push(r);
      kids.set(key, list);
    }
    // Sort each child list alphabetically by label.
    for (const list of kids.values()) {
      list.sort((a, b) => a.label.localeCompare(b.label));
    }
    return { byId: id, childrenByParent: kids };
  }, [rows]);

  const refresh = () => setRefreshTick((t) => t + 1);

  return { status, rows, byId, childrenByParent, error, refresh };
}

export const TREE_ROOT_KEY = ROOT_KEY;

// ---------------------------------------------------------------------------
// LOD expansion — fetch the union of visible subgraphs for the current
// `expanded` set
// ---------------------------------------------------------------------------

export interface ExpansionState {
  status: "loading" | "empty" | "ready" | "error";
  /** All nodes currently visible (top-level + every expanded node's children). */
  nodes: CatalogNodeT[];
  /** Sibling edges (from the DB) wherever both endpoints are visible. */
  edges: CatalogEdgeT[];
  build?: BuildStatus;
  error?: string;
}

interface SubgraphCacheEntry {
  fetching: boolean;
  subgraph?: CatalogSubgraphT;
  error?: string;
}

/** Fetch the top-level subgraph plus the subgraph of every id in `expanded`,
 *  union them into a single nodes+edges set, and return the result.
 *
 *  Caches per-node fetches indefinitely (the catalog is built once and
 *  doesn't change between builds; on rebuild the user reloads the page).
 */
export function useCatalogExpansion(
  expanded: Set<string>,
  buildPhase: BuildStatus["phase"] | null,
): ExpansionState {
  const [state, setState] = useState<ExpansionState>({
    status: "loading",
    nodes: [],
    edges: [],
  });
  const cacheRef = useRef<Map<string, SubgraphCacheEntry>>(new Map());
  const expandedKeyRef = useRef<string>("");
  const buildPhaseRef = useRef<BuildStatus["phase"] | null>(null);

  const expandedKey = useMemo(
    () => Array.from(expanded).sort().join("|"),
    [expanded],
  );

  useEffect(() => {
    let cancelled = false;
    expandedKeyRef.current = expandedKey;
    buildPhaseRef.current = buildPhase;

    const recompute = async () => {
      // Always fetch top-level (always visible, fast).
      const cache = cacheRef.current;
      const topKey = "__top__";
      if (!cache.has(topKey) || !cache.get(topKey)?.subgraph) {
        cache.set(topKey, { fetching: true });
        try {
          const top = await catalogApi.fetchTop();
          if (cancelled) return;
          if ("empty" in top && top.empty) {
            setState({
              status: "empty",
              nodes: [],
              edges: [],
              build: top.build,
            });
            cache.set(topKey, { fetching: false });
            return;
          }
          cache.set(topKey, {
            fetching: false,
            subgraph: top as CatalogSubgraphT,
          });
        } catch (err) {
          if (cancelled) return;
          if (err instanceof HttpError && err.status === 404) {
            setState({ status: "empty", nodes: [], edges: [] });
          } else {
            setState({
              status: "error",
              nodes: [],
              edges: [],
              error: err instanceof Error ? err.message : String(err),
            });
          }
          cache.set(topKey, { fetching: false });
          return;
        }
      }

      // Fetch every expanded node's subgraph in parallel (cache misses only).
      const ids = Array.from(expanded);
      const missing = ids.filter(
        (id) => !cache.get(id)?.subgraph && !cache.get(id)?.error,
      );
      if (missing.length) {
        await Promise.all(
          missing.map(async (id) => {
            cache.set(id, { ...(cache.get(id) ?? { fetching: false }), fetching: true });
            try {
              const sub = await catalogApi.fetchNode(id);
              cache.set(id, { fetching: false, subgraph: sub });
            } catch (err) {
              if (err instanceof HttpError && err.status === 404) {
                cache.set(id, { fetching: false, error: "missing" });
              } else {
                cache.set(id, {
                  fetching: false,
                  error: err instanceof Error ? err.message : String(err),
                });
              }
            }
          }),
        );
      }
      if (cancelled) return;

      // Recompute on whichever expansion set is current (the caller may have
      // toggled while we were fetching).
      if (expandedKeyRef.current !== expandedKey) return;

      // Union: top-level nodes always, plus children of every expanded node.
      const visible = new Map<string, CatalogNodeT>();
      const allEdges: CatalogEdgeT[] = [];
      const top = cache.get(topKey)?.subgraph;
      if (top) {
        for (const n of top.nodes) visible.set(n.id, n);
        allEdges.push(...top.edges);
      }
      for (const id of expanded) {
        const sub = cache.get(id)?.subgraph;
        if (!sub) continue;
        // Make sure the parent node itself is visible (it normally already is
        // via the top-level OR via being a child of some other expanded node).
        if (sub.parent && !visible.has(sub.parent.id)) {
          visible.set(sub.parent.id, sub.parent);
        }
        for (const n of sub.nodes) visible.set(n.id, n);
        allEdges.push(...sub.edges);
      }
      // Drop edges where either endpoint isn't visible (cheap defensive
      // filter — backend already does this per-subgraph but the union may
      // have stragglers from a node whose parent expanded then collapsed).
      const safeEdges = allEdges.filter(
        (e) => visible.has(e.from) && visible.has(e.to),
      );
      // Dedupe edges by (from, to).
      const edgeKey = (e: CatalogEdgeT) => `${e.from}->${e.to}`;
      const dedupedEdges = Array.from(
        new Map(safeEdges.map((e) => [edgeKey(e), e])).values(),
      );

      setState({
        status: visible.size > 0 ? "ready" : "empty",
        nodes: Array.from(visible.values()),
        edges: dedupedEdges,
      });
    };

    void recompute();

    // While building, periodically invalidate top + expanded caches so the
    // graph fills in.
    const isBuilding =
      buildPhase &&
      buildPhase !== "complete" &&
      buildPhase !== "failed" &&
      buildPhase !== "idle";
    if (isBuilding) {
      const id = setInterval(() => {
        cacheRef.current.clear();
        void recompute();
      }, 4000);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [expandedKey, buildPhase]);

  return state;
}
