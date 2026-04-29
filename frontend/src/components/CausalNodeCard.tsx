import { Handle, Position, type NodeProps } from "reactflow";
import { ChevronDown, ChevronRight } from "lucide-react";

/** A "kind" string we recognize, plus a fallback bucket for anything else. */
const KIND_STYLES: Record<string, { dot: string; label: string }> = {
  // Causal-graph kinds
  event:      { dot: "#b04a2e", label: "event"      },
  policy:     { dot: "#3f3a29", label: "policy"     },
  actor:      { dot: "#7a2f1a", label: "actor"      },
  condition:  { dot: "#8b8267", label: "condition"  },
  idea:       { dot: "#5e573f", label: "idea"       },
  // Catalog kinds (extras)
  era:        { dot: "#3f3a29", label: "era"        },
  theme:      { dot: "#5e573f", label: "theme"      },
  topic:      { dot: "#5e573f", label: "topic"      },
  sub_event:  { dot: "#b04a2e", label: "sub-event"  },
  person:     { dot: "#7a2f1a", label: "person"     },
  group:      { dot: "#7a2f1a", label: "group"      },
  law:        { dot: "#3f3a29", label: "law"        },
  court_case: { dot: "#3f3a29", label: "case"       },
  concept:    { dot: "#5e573f", label: "concept"    },
  term:       { dot: "#8b8267", label: "term"       },
  movement:   { dot: "#7a2f1a", label: "movement"   },
  reading:    { dot: "#5e573f", label: "reading"    },
  lecture:    { dot: "#5e573f", label: "lecture"    },
  source:     { dot: "#8b8267", label: "source"     },
  document:   { dot: "#8b8267", label: "document"   },
};

export interface CausalCardData {
  /** Minimal shape the card needs. Both CausalNode and CatalogNodeT satisfy this. */
  id: string;
  label: string;
  kind?: string | null;
  year?: number | null;
  /** Show an expand/collapse chevron for catalog nodes that have children. */
  hasChildren?: boolean;
  /** Show a small "✓" if it's an explicit leaf. */
  isLeaf?: boolean;
  /** True when this node's children are currently visible in the catalog. */
  expanded?: boolean;
  /** How many direct children this node has (catalog use). */
  childCount?: number;
  /** Toggle expansion for this node id (catalog use). When set, the card
   *  renders a chevron badge that calls this on click. */
  onToggle?: (id: string) => void;
}

/** Reusable card used by both the causal-chain graph and the catalog graph.
 *  Pure presentational — receives only the fields it needs via `data.node`. */
export function CausalNodeCard({
  data,
  selected,
}: NodeProps<{ node: CausalCardData }>) {
  const n = data.node;
  const style =
    (n.kind && KIND_STYLES[n.kind]) || KIND_STYLES.event;
  const showChevron = n.hasChildren && typeof n.onToggle === "function";
  const handleToggleClick = (e: React.MouseEvent) => {
    // Don't let the click bubble into ReactFlow's node-select / drag handlers.
    e.stopPropagation();
    e.preventDefault();
    n.onToggle?.(n.id);
  };
  return (
    <div
      className={[
        "rounded-xl bg-white border border-ink-200 shadow-paper px-3 py-2 min-w-[160px] max-w-[220px]",
        "ring-2 transition cursor-grab active:cursor-grabbing",
        selected ? "ring-accent" : "ring-transparent",
        n.expanded ? "ring-1 ring-offset-0 ring-accent/30" : "",
      ].join(" ")}
    >
      <Handle type="target" position={Position.Left} style={{ background: "#8b8267" }} />
      <div className="flex items-center gap-1.5 mb-0.5 text-[10px] uppercase tracking-wider text-ink-400">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: style.dot }}
        />
        <span className="truncate">{style.label}</span>
        {n.year ? <span className="ml-auto text-ink-500">{n.year}</span> : null}
      </div>
      <div className="font-serif font-semibold text-[14px] text-ink-900 leading-snug">
        {n.label}
      </div>
      {showChevron && (
        <button
          type="button"
          onClick={handleToggleClick}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className={[
            "mt-2 w-full inline-flex items-center justify-center gap-1 text-[11px]",
            "rounded-md border px-2 py-1 transition cursor-pointer",
            n.expanded
              ? "border-accent/40 bg-accent/5 text-accent-dark hover:bg-accent/10"
              : "border-ink-200 bg-ink-50 text-ink-600 hover:border-ink-400",
          ].join(" ")}
          aria-label={n.expanded ? "Collapse children" : "Expand children"}
          title={
            n.expanded
              ? "Collapse children"
              : `Expand ${n.childCount ?? "?"} child${(n.childCount ?? 0) === 1 ? "" : "ren"}`
          }
        >
          {n.expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span>
            {n.expanded
              ? "Hide children"
              : `Expand${typeof n.childCount === "number" ? ` (${n.childCount})` : ""}`}
          </span>
        </button>
      )}
      <Handle type="source" position={Position.Right} style={{ background: "#8b8267" }} />
    </div>
  );
}

export const reusableNodeTypes = { causal: CausalNodeCard };
