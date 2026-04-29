export type CausalNodeKind = "event" | "policy" | "actor" | "condition" | "idea";
export type CausalEdgeKind = "precondition" | "trigger" | "amplifier" | "consequence";

export interface CausalNode {
  id: string;
  label: string;
  year?: number;
  kind?: CausalNodeKind;
  description?: string;
  [extra: string]: unknown;
}

export interface CausalEdge {
  from: string;
  to: string;
  label?: string;
  /** One of precondition/trigger/amplifier/consequence (from the skill spec). */
  kind?: CausalEdgeKind;
  description?: string;
  [extra: string]: unknown;
}

export interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
}

export interface AttachedFile {
  path: string;
  name: string;
  size: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  causalDelta?: CausalGraph;
  attachedFile?: AttachedFile;
  streaming?: boolean;
  toolUses?: { name: string; description?: string }[];
  durationS?: number;
  error?: string;
  /** Epoch ms — used for grouping & display. */
  createdAt: number;
}

export interface NodeContext {
  id: string;
  label: string;
  description: string;
  /** Pre-computed " › "-joined ancestor path. */
  breadcrumb: string;
}

export interface ChatSession {
  id: string;
  /** Display title — auto-derived from first user message. */
  title: string;
  createdAt: number;
  modifiedAt: number;
  /** Claude CLI's session UUID, populated after the first assistant turn. */
  claudeSessionId: string | null;
  messages: ChatMessage[];
  graph: CausalGraph;
  /** Sticky attachment — survives across messages until removed. */
  attachedFile: AttachedFile | null;
  /** User-dragged node positions, keyed by node id. Auto-laid-out positions
   *  are recomputed each render unless the user has placed the node manually. */
  nodePositions?: Record<string, { x: number; y: number }>;
  /** Set when this chat is anchored to a catalog node (Ask-about-this flow). */
  nodeContext?: NodeContext;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export interface CatalogNodeT {
  id: string;
  parent_id: string | null;
  label: string;
  description: string;
  kind: string;
  year?: number | null;
  year_range?: [number, number] | null;
  level: number;
  source_refs: string[];
  is_leaf: boolean;
  built: boolean;
  child_count: number;
}

export interface CatalogEdgeT {
  from: string;
  to: string;
  label?: string | null;
  kind?: string | null;
  description?: string | null;
}

export interface CatalogSubgraphT {
  parent: CatalogNodeT | null;
  ancestors: CatalogNodeT[];
  nodes: CatalogNodeT[];
  edges: CatalogEdgeT[];
}

export interface CatalogSearchHit {
  id: string;
  label: string;
  description: string;
  breadcrumb: string;
  kind: string;
}

export type BuildPhase =
  | "idle"
  | "plan"
  | "extract"
  | "review"
  | "densify"
  | "dedupe"
  | "complete"
  | "failed";

/** Compact row for the top-right tree-view sidebar; one entry per node in the
 *  whole catalog. Keep this lean — the hook fetches ~1500 of these at once. */
export interface CatalogTreeRow {
  id: string;
  parent_id: string | null;
  label: string;
  kind: string;
  level: number;
  year: number | null;
  is_leaf: boolean;
  child_count: number;
}

export interface BuildStatus {
  phase: BuildPhase;
  message: string;
  domains_total: number;
  domains_done: number;
  nodes_total: number;
  started_at?: number | null;
  ended_at?: number | null;
  error?: string | null;
  log_cursor?: number;
  db?: {
    nodes_total: number;
    leaves_total: number;
    top_level_count: number;
    max_level: number;
    edges_total?: number;
    parent_links_total?: number;
    /** Sum of parent_links_total + edges_total — every connection in the graph. */
    relationships_total?: number;
  };
}

export type BuildLogKind =
  | "info"
  | "phase"
  | "tool_use"
  | "tool_result"
  | "text"
  | "ingest"
  | "error"
  | "result";

export interface BuildLogEvent {
  seq: number;
  ts: number; // unix seconds
  phase: string;
  kind: BuildLogKind;
  message: string;
  meta?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Persisted state (localStorage)
// ---------------------------------------------------------------------------

export type AppView = "chat" | "catalog";

export interface PersistedState {
  /** Bump when the schema changes incompatibly. */
  version: 3;
  activeSessionId: string | null;
  /** Order matters: most-recent first (the sidebar renders in this order). */
  sessions: ChatSession[];
  /** Which top-level view is showing. */
  view: AppView;
  /** node_id → session_id, so a second click on the same catalog node resumes. */
  nodeChats: Record<string, string>;
  /** Catalog drill-in: id of the currently zoomed-in node (null = top level). */
  catalogActiveNodeId: string | null;
  /** Tree-view (sidebar) expand state — separate from graph navigation. */
  catalogTreeExpanded: string[];
  /** User-dragged catalog node positions, keyed by activeNodeId. */
  catalogPositions: Record<string, Record<string, { x: number; y: number }>>;
}
