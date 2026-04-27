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
}

export interface PersistedState {
  /** Bump when the schema changes incompatibly. */
  version: 1;
  activeSessionId: string | null;
  /** Order matters: most-recent first (the sidebar renders in this order). */
  sessions: ChatSession[];
}
