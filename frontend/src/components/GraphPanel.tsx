import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from "reactflow";
import { Eraser, MousePointerClick, Network } from "lucide-react";
import type {
  CausalEdge,
  CausalEdgeKind,
  CausalGraph,
  CausalNode,
  CausalNodeKind,
} from "../types";
import { NodeDetailPanel } from "./NodeDetailPanel";

type NodeClickHandler = (event: React.MouseEvent, node: Node) => void;
type EdgeClickHandler = (event: React.MouseEvent, edge: Edge) => void;

interface Props {
  graph: CausalGraph;
  onClear: () => void;
  /** User-dragged positions (id → {x, y}). Auto-laid-out unless overridden. */
  positions?: Record<string, { x: number; y: number }>;
  /** Persist a node's user-dragged position. */
  onPositionChange?: (id: string, pos: { x: number; y: number }) => void;
}

// Layout constants — picked so node cards (~220px wide × ~80px tall) never
// overlap their neighbours and have visible gutters between them.
const COL_WIDTH = 280;
const ROW_HEIGHT = 130;
const PAD = 80;

const KIND_STYLES: Record<CausalNodeKind, { dot: string; ring: string; label: string }> = {
  event:     { dot: "#b04a2e", ring: "ring-accent/40",      label: "event"     },
  policy:    { dot: "#3f3a29", ring: "ring-ink-700/40",     label: "policy"    },
  actor:     { dot: "#7a2f1a", ring: "ring-accent-dark/40", label: "actor"     },
  condition: { dot: "#8b8267", ring: "ring-ink-400/40",     label: "condition" },
  idea:      { dot: "#5e573f", ring: "ring-ink-500/40",     label: "idea"      },
};

const EDGE_STYLES: Record<CausalEdgeKind, { stroke: string; dash?: string; label: string }> = {
  precondition: { stroke: "#8b8267", dash: "4 3", label: "precondition" },
  trigger:      { stroke: "#b04a2e",                label: "trigger"      },
  amplifier:    { stroke: "#7a2f1a", dash: "1 3", label: "amplifier"    },
  consequence:  { stroke: "#3f3a29",                label: "consequence"  },
};
const ASSERTED_LABEL = "asserted";

function CausalNodeView({ data, selected }: NodeProps<{ node: CausalNode }>) {
  const n = data.node;
  // Tolerant fallback: Claude occasionally invents a `kind` we don't model
  // (e.g. "movement") or omits it. Default to event styling instead of
  // crashing the whole graph.
  const style =
    (n.kind && KIND_STYLES[n.kind as CausalNodeKind]) || KIND_STYLES.event;
  return (
    <div
      className={[
        "rounded-xl bg-white border border-ink-200 shadow-paper px-3 py-2 min-w-[160px] max-w-[220px]",
        "ring-2 transition cursor-grab active:cursor-grabbing",
        selected ? "ring-accent" : "ring-transparent",
      ].join(" ")}
    >
      <Handle type="target" position={Position.Left} style={{ background: "#8b8267" }} />
      <div className="flex items-center gap-1.5 mb-0.5 text-[10px] uppercase tracking-wider text-ink-400">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: style.dot }}
        />
        {style.label}
        {n.year ? <span className="ml-auto text-ink-500">{n.year}</span> : null}
      </div>
      <div className="font-serif font-semibold text-[14px] text-ink-900 leading-snug">
        {n.label}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: "#8b8267" }} />
    </div>
  );
}

const nodeTypes = { causal: CausalNodeView };

interface LaidOut {
  rfNodes: Node[];
  rfEdges: Edge[];
}

/**
 * Bucket nodes into year-based columns. Same year → same column, stacked
 * vertically with a fixed row height. Nodes with no `year` go in a trailing
 * column on the right. Guarantees no overlap regardless of LLM input.
 *
 * `positions` lets a caller override the auto-layout for any node id (used
 * to remember user drags).
 */
function layoutGraph(
  input: CausalGraph,
  positions: Record<string, { x: number; y: number }>,
): LaidOut {
  // Defensive: dedupe nodes by id, drop edges with missing endpoints.
  const byId = new Map<string, CausalNode>();
  for (const n of input.nodes ?? []) {
    if (n?.id && typeof n.id === "string") byId.set(n.id, n);
  }
  const seenEdge = new Set<string>();
  const safeEdges: CausalEdge[] = [];
  for (const e of input.edges ?? []) {
    if (!e?.from || !e?.to) continue;
    if (!byId.has(e.from) || !byId.has(e.to)) continue;
    const k = `${e.from}${e.to}`;
    if (seenEdge.has(k)) continue;
    seenEdge.add(k);
    safeEdges.push(e);
  }
  const g: CausalGraph = { nodes: [...byId.values()], edges: safeEdges };
  if (g.nodes.length === 0) return { rfNodes: [], rfEdges: [] };

  // Year-based column bucketing.
  const yearBuckets = new Map<number, CausalNode[]>();
  const noYear: CausalNode[] = [];
  for (const n of g.nodes) {
    if (typeof n.year === "number" && Number.isFinite(n.year)) {
      const list = yearBuckets.get(n.year) ?? [];
      list.push(n);
      yearBuckets.set(n.year, list);
    } else {
      noYear.push(n);
    }
  }
  const sortedYears = [...yearBuckets.keys()].sort((a, b) => a - b);
  const autoPos = new Map<string, { x: number; y: number }>();
  sortedYears.forEach((year, colIdx) => {
    yearBuckets.get(year)!.forEach((n, rowIdx) => {
      autoPos.set(n.id, {
        x: PAD + colIdx * COL_WIDTH,
        y: PAD + rowIdx * ROW_HEIGHT,
      });
    });
  });
  noYear.forEach((n, i) => {
    autoPos.set(n.id, {
      x: PAD + sortedYears.length * COL_WIDTH,
      y: PAD + i * ROW_HEIGHT,
    });
  });

  const rfNodes: Node[] = g.nodes.map((n) => {
    const dragged = positions[n.id];
    const pos = dragged ?? autoPos.get(n.id) ?? { x: 0, y: 0 };
    return {
      id: n.id,
      type: "causal",
      position: pos,
      data: { node: n },
      draggable: true,
    };
  });

  const rfEdges: Edge[] = g.edges.map((e, i) => {
    const style =
      (e.kind && EDGE_STYLES[e.kind as CausalEdgeKind]) || EDGE_STYLES.trigger;
    const isAsserted = e.label?.toLowerCase() === ASSERTED_LABEL;
    return {
      id: `${e.from}->${e.to}-${i}`,
      source: e.from,
      target: e.to,
      label: e.label,
      type: "smoothstep",
      animated: e.kind === "trigger" || !e.kind,
      labelStyle: {
        fontSize: 11,
        fill: isAsserted ? "#7a2f1a" : "#5e573f",
        fontFamily: "Inter, sans-serif",
        fontStyle: isAsserted ? "italic" : "normal",
      },
      labelBgStyle: { fill: "#f7f6f2", opacity: 0.9 },
      labelBgPadding: [4, 2],
      style: {
        stroke: isAsserted ? "#b04a2e" : style.stroke,
        strokeWidth: 1.5,
        strokeDasharray: isAsserted ? "5 4" : style.dash,
      },
      data: { edge: e },
    };
  });

  return { rfNodes, rfEdges };
}

export function GraphPanel({ graph, onClear, positions, onPositionChange }: Props) {
  const { rfNodes, rfEdges } = useMemo(() => {
    try {
      return layoutGraph(graph, positions ?? {});
    } catch (err) {
      console.error("layoutGraph failed", err);
      return { rfNodes: [], rfEdges: [] };
    }
  }, [graph, positions]);

  const [selected, setSelected] = useState<
    | { kind: "node"; node: CausalNode }
    | { kind: "edge"; edge: CausalEdge; from: CausalNode; to: CausalNode }
    | null
  >(null);

  // Keep the current selection in sync if the underlying entity is revised
  // by a later turn.
  useEffect(() => {
    if (!selected) return;
    if (selected.kind === "node") {
      const fresh = graph.nodes.find((n) => n.id === selected.node.id);
      if (!fresh) setSelected(null);
      else if (fresh !== selected.node) setSelected({ kind: "node", node: fresh });
    } else {
      const fresh = graph.edges.find(
        (e) => e.from === selected.edge.from && e.to === selected.edge.to,
      );
      const from = graph.nodes.find((n) => n.id === selected.edge.from);
      const to = graph.nodes.find((n) => n.id === selected.edge.to);
      if (!fresh || !from || !to) setSelected(null);
      else if (fresh !== selected.edge) setSelected({ kind: "edge", edge: fresh, from, to });
    }
  }, [graph, selected]);

  const onNodeClick: NodeClickHandler = useCallback((_, node) => {
    const data = node.data as { node?: CausalNode };
    if (data?.node) setSelected({ kind: "node", node: data.node });
  }, []);

  const onEdgeClick: EdgeClickHandler = useCallback(
    (_, edge) => {
      const data = edge.data as { edge?: CausalEdge };
      const e = data?.edge;
      if (!e) return;
      const from = graph.nodes.find((n) => n.id === e.from);
      const to = graph.nodes.find((n) => n.id === e.to);
      if (from && to) setSelected({ kind: "edge", edge: e, from, to });
    },
    [graph.nodes],
  );

  return (
    <div className="h-full flex flex-col bg-ink-50/40">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-200/70">
        <div className="w-7 h-7 rounded-lg bg-white border border-ink-200 grid place-items-center text-accent">
          <Network size={14} />
        </div>
        <div>
          <div className="font-serif font-semibold text-[15px] text-ink-900 leading-tight">
            Causal chain
          </div>
          <div className="text-[11px] text-ink-500">
            {graph.nodes.length} node{graph.nodes.length === 1 ? "" : "s"} ·{" "}
            {graph.edges.length} link{graph.edges.length === 1 ? "" : "s"}
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={graph.nodes.length === 0}
          className="ml-auto inline-flex items-center gap-1 text-[12px] text-ink-500 hover:text-accent-dark transition disabled:opacity-30"
        >
          <Eraser size={13} />
          Clear
        </button>
      </div>

      <div className="relative flex-1">
        {graph.nodes.length === 0 ? (
          <EmptyGraph />
        ) : (
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onNodeDragStop={(_, node) =>
              onPositionChange?.(node.id, {
                x: node.position.x,
                y: node.position.y,
              })
            }
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: false }}
            minZoom={0.4}
            maxZoom={2}
          >
            <Background gap={20} size={1.2} color="#d9d5c3" />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}

        {selected && (
          <NodeDetailPanel
            selection={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}

function EmptyGraph() {
  return (
    <div className="absolute inset-0 grid place-items-center text-center px-8">
      <div className="max-w-xs">
        <div className="w-12 h-12 rounded-2xl bg-white border border-ink-200 grid place-items-center mx-auto mb-3 text-ink-400">
          <Network size={22} />
        </div>
        <p className="font-serif text-[16px] text-ink-700 mb-1">
          No causal chain yet.
        </p>
        <p className="text-[13px] text-ink-500 leading-relaxed">
          Ask a "what caused…" or "what did X lead to" question. Claude will
          add nodes and links as you reason together — click any node to see
          details, drag to rearrange.
        </p>
        <p className="mt-4 inline-flex items-center gap-1 text-[11px] text-ink-400">
          <MousePointerClick size={11} />
          Click nodes & edges · drag to move
        </p>
      </div>
    </div>
  );
}
