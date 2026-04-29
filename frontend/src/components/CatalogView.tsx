import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "reactflow";
import { Loader2, Network, Spline } from "lucide-react";
import { CausalNodeCard, type CausalCardData } from "./CausalNodeCard";
import { CatalogBreadcrumb } from "./CatalogBreadcrumb";
import { CatalogBuildPanel } from "./CatalogBuildPanel";
import { CatalogNodeDetail } from "./CatalogNodeDetail";
import { CatalogSearch } from "./CatalogSearch";
import { CatalogTreeView } from "./CatalogTreeView";
import { ErrorBoundary } from "./ErrorBoundary";
import {
  catalogApi,
  useBuildStatus,
  useCatalogSubgraph,
  useCatalogTree,
} from "../lib/catalog";
import type {
  CatalogEdgeT,
  CatalogNodeT,
  CatalogSearchHit,
  NodeContext,
} from "../types";

interface Props {
  activeNodeId: string | null;
  onActiveNodeChange: (id: string | null) => void;
  /** Tree-view sidebar's open rows. */
  treeExpanded: string[];
  onTreeExpandedChange: (next: string[]) => void;
  /** User-dragged positions, keyed by activeNodeId then node_id. */
  positions: Record<string, Record<string, { x: number; y: number }>>;
  onPositionChange: (
    activeNodeId: string | null,
    nodeId: string,
    pos: { x: number; y: number },
  ) => void;
  onAskAbout: (ctx: NodeContext) => void;
  hasExistingChat: (nodeId: string) => boolean;
}

const nodeTypes = { causal: CausalNodeCard };

const EDGE_STYLES: Record<string, { stroke: string; dash?: string }> = {
  precondition: { stroke: "#8b8267", dash: "4 3" },
  trigger:      { stroke: "#b04a2e" },
  amplifier:    { stroke: "#7a2f1a", dash: "1 3" },
  consequence:  { stroke: "#3f3a29" },
  related:      { stroke: "#8b8267", dash: "1 4" },
  context:      { stroke: "#5e573f", dash: "6 4" },
  compare:      { stroke: "#3f3a29", dash: "2 4" },
  contrast:     { stroke: "#b04a2e", dash: "8 4" },
  temporal:     { stroke: "#8b8267", dash: "1 6" },
  thematic:     { stroke: "#5e573f", dash: "3 3 1 3" },
};

const COL_WIDTH = 280;
const ROW_HEIGHT = 130;
const PAD = 80;

interface ViewLayout {
  rfNodes: Node[];
  rfEdges: Edge[];
}

/** Year-bucket layout: same year → same column, stacked vertically.
 *  Nodes with no year go in a trailing column on the right. */
function layoutSubgraph(
  nodes: CatalogNodeT[],
  edges: CatalogEdgeT[],
  positions: Record<string, { x: number; y: number }>,
): ViewLayout {
  if (nodes.length === 0) return { rfNodes: [], rfEdges: [] };

  const yearBuckets = new Map<number, CatalogNodeT[]>();
  const noYear: CatalogNodeT[] = [];
  for (const n of nodes) {
    if (typeof n.year === "number" && Number.isFinite(n.year)) {
      const list = yearBuckets.get(n.year) ?? [];
      list.push(n);
      yearBuckets.set(n.year, list);
    } else {
      noYear.push(n);
    }
  }
  const sortedYears = [...yearBuckets.keys()].sort((a, b) => a - b);
  const auto = new Map<string, { x: number; y: number }>();
  sortedYears.forEach((year, col) => {
    yearBuckets.get(year)!.forEach((n, row) => {
      auto.set(n.id, { x: PAD + col * COL_WIDTH, y: PAD + row * ROW_HEIGHT });
    });
  });
  if (sortedYears.length === 0) {
    // Pure no-year subgraph: 5 per row grid.
    noYear.forEach((n, i) => {
      const col = i % 5;
      const row = Math.floor(i / 5);
      auto.set(n.id, { x: PAD + col * COL_WIDTH, y: PAD + row * ROW_HEIGHT });
    });
  } else {
    noYear.forEach((n, i) => {
      auto.set(n.id, {
        x: PAD + sortedYears.length * COL_WIDTH,
        y: PAD + i * ROW_HEIGHT,
      });
    });
  }

  const rfNodes: Node[] = nodes.map((n) => {
    const dragged = positions[n.id];
    const pos = dragged ?? auto.get(n.id) ?? { x: 0, y: 0 };
    const data: CausalCardData = {
      id: n.id,
      label: n.label,
      kind: n.kind,
      year: n.year ?? undefined,
      hasChildren: !n.is_leaf && n.child_count > 0,
      isLeaf: n.is_leaf,
      childCount: n.child_count,
      // No onToggle: in drill-in mode we use double-click instead of a
      // chevron, keeping the card clean.
    };
    return {
      id: n.id,
      type: "causal",
      position: pos,
      data: { node: data },
      draggable: true,
    };
  });

  const visibleIds = new Set(nodes.map((n) => n.id));
  const seen = new Set<string>();
  const rfEdges: Edge[] = [];
  for (const e of edges) {
    if (!visibleIds.has(e.from) || !visibleIds.has(e.to)) continue;
    const key = `${e.from}->${e.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const style =
      (e.kind && EDGE_STYLES[e.kind]) || EDGE_STYLES.related;
    rfEdges.push({
      id: key,
      source: e.from,
      target: e.to,
      label: e.label || undefined,
      type: "smoothstep",
      animated: e.kind === "trigger",
      labelStyle: {
        fontSize: 11,
        fill: "#5e573f",
        fontFamily: "Inter, sans-serif",
      },
      labelBgStyle: { fill: "#f7f6f2", opacity: 0.9 },
      labelBgPadding: [4, 2],
      style: {
        stroke: style.stroke,
        strokeWidth: 1.5,
        strokeDasharray: style.dash,
      },
    });
  }
  return { rfNodes, rfEdges };
}

export function CatalogView(props: Props) {
  return (
    <ReactFlowProvider>
      <ErrorBoundary
        label="catalog"
        onReset={() => props.onActiveNodeChange(null)}
      >
        <CatalogViewInner {...props} />
      </ErrorBoundary>
    </ReactFlowProvider>
  );
}

function CatalogViewInner({
  activeNodeId,
  onActiveNodeChange,
  treeExpanded,
  onTreeExpandedChange,
  positions,
  onPositionChange,
  onAskAbout,
  hasExistingChat,
}: Props) {
  const buildStatus = useBuildStatus(true);
  const subState = useCatalogSubgraph(activeNodeId, buildStatus?.phase ?? null);
  const tree = useCatalogTree(true);
  const [selected, setSelected] = useState<CatalogNodeT | null>(null);
  const [treeOpen, setTreeOpen] = useState(false);

  // Refresh tree once a build completes.
  useEffect(() => {
    if (buildStatus?.phase === "complete") tree.refresh();
  }, [buildStatus?.phase, tree]);

  // If the active node id points at a missing node (db wipe), reset.
  useEffect(() => {
    if (subState.status === "missing" && activeNodeId !== null) {
      onActiveNodeChange(null);
    }
  }, [subState, activeNodeId, onActiveNodeChange]);

  // Reset selection on drill change.
  useEffect(() => {
    setSelected(null);
  }, [activeNodeId]);

  const layout = useMemo(() => {
    if (subState.status !== "ready") return { rfNodes: [], rfEdges: [] };
    const key = activeNodeId ?? "__top__";
    return layoutSubgraph(
      subState.subgraph.nodes,
      subState.subgraph.edges,
      positions[key] ?? {},
    );
  }, [subState, positions, activeNodeId]);

  // Tree-view "eye" indicator: highlight the current drill-in target's
  // ancestor path. Computed unconditionally (before the early returns
  // below) so hook order stays stable across renders.
  const graphExpandedSet = useMemo(() => {
    const set = new Set<string>();
    if (subState.status !== "ready") return set;
    const sub = subState.subgraph;
    if (sub.parent) set.add(sub.parent.id);
    for (const a of sub.ancestors) set.add(a.id);
    return set;
  }, [subState]);

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      if (subState.status !== "ready") return;
      const found = subState.subgraph.nodes.find((n) => n.id === node.id);
      if (found) setSelected(found);
    },
    [subState],
  );

  const onNodeDoubleClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      if (subState.status !== "ready") return;
      const found = subState.subgraph.nodes.find((n) => n.id === node.id);
      if (!found) return;
      if (!found.is_leaf && found.child_count > 0) {
        onActiveNodeChange(found.id);
      } else {
        setSelected(found);
      }
    },
    [subState, onActiveNodeChange],
  );

  /** "Jump to" — used by tree-row click and search-result click.
   *  - If the node has children, drill INTO it (it becomes the active node).
   *  - Otherwise, drill into its parent and select it. */
  const jumpToNode = useCallback(
    async (id: string) => {
      try {
        const { node, ancestors } = await catalogApi.fetchPath(id);
        if (!node.is_leaf && node.child_count > 0) {
          onActiveNodeChange(node.id);
          setSelected(null);
        } else {
          const parent = ancestors[ancestors.length - 1];
          onActiveNodeChange(parent?.id ?? null);
          setSelected(node);
        }
      } catch (err) {
        console.error("jumpToNode failed", err);
      }
    },
    [onActiveNodeChange],
  );

  const onSearchSelect = useCallback(
    (hit: CatalogSearchHit) => {
      void jumpToNode(hit.id);
    },
    [jumpToNode],
  );

  // ----- branches -----
  if (subState.status === "empty") {
    return <CatalogBuildPanel status={buildStatus} />;
  }
  if (subState.status === "error") {
    return (
      <div className="h-full grid place-items-center text-ink-600 text-sm px-6 text-center">
        <div>
          <p className="mb-2 text-accent-dark">Catalog failed to load.</p>
          <p className="text-[12px] text-ink-500 mb-4">{subState.error}</p>
          <button
            onClick={() => onActiveNodeChange(null)}
            className="text-[12px] underline underline-offset-2 hover:text-accent"
          >
            Back to top
          </button>
        </div>
      </div>
    );
  }
  if (subState.status === "loading" || subState.status === "missing") {
    return (
      <div className="h-full grid place-items-center text-ink-500 text-sm">
        <div className="inline-flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Loading catalog…
        </div>
      </div>
    );
  }

  const sub = subState.subgraph;

  return (
    <div className="h-full relative bg-ink-50/40">
      <ReactFlow
        nodes={layout.rfNodes}
        edges={layout.rfEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStop={(_, n) =>
          onPositionChange(activeNodeId, n.id, {
            x: n.position.x,
            y: n.position.y,
          })
        }
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2.5}
      >
        <Background gap={20} size={1.2} color="#d9d5c3" />
        <Controls showInteractive={false} />
      </ReactFlow>

      <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-2 bg-white border border-ink-200 rounded-full shadow-paper px-3 py-1.5 text-[11px] text-ink-700">
        <span className="inline-flex items-center gap-1">
          <Network size={12} className="text-ink-500" />
          <strong className="font-medium text-ink-900 tabular-nums">
            {(buildStatus?.db?.nodes_total ?? 0).toLocaleString()}
          </strong>
          <span className="text-ink-500">nodes</span>
        </span>
        <span className="text-ink-300">·</span>
        <span
          className="inline-flex items-center gap-1"
          title={
            buildStatus?.db
              ? `${(buildStatus.db.parent_links_total ?? 0).toLocaleString()} parent-child + ${(buildStatus.db.edges_total ?? 0).toLocaleString()} sibling edges`
              : undefined
          }
        >
          <Spline size={12} className="text-ink-500" />
          <strong className="font-medium text-ink-900 tabular-nums">
            {(
              buildStatus?.db?.relationships_total ??
              (buildStatus?.db?.parent_links_total ?? 0) +
                (buildStatus?.db?.edges_total ?? 0)
            ).toLocaleString()}
          </strong>
          <span className="text-ink-500">relationships</span>
        </span>
      </div>

      <CatalogSearch onSelect={onSearchSelect} />

      <CatalogBreadcrumb
        ancestors={sub.ancestors}
        current={sub.parent}
        onSelect={(id) => onActiveNodeChange(id)}
      />

      <CatalogTreeView
        rows={tree.rows}
        byId={tree.byId}
        childrenByParent={tree.childrenByParent}
        treeExpanded={treeExpanded}
        onTreeExpandedChange={onTreeExpandedChange}
        graphExpanded={graphExpandedSet}
        onJump={(id) => void jumpToNode(id)}
        selectedId={selected?.id}
        open={treeOpen}
        onClose={() => setTreeOpen(false)}
      />

      {selected && (
        <CatalogNodeDetail
          node={selected}
          onClose={() => setSelected(null)}
          isExpanded={false}
          onToggleExpand={() => {
            // In drill-in mode, "Expand" means "drill into this node".
            if (!selected.is_leaf && selected.child_count > 0) {
              onActiveNodeChange(selected.id);
              setSelected(null);
            }
          }}
          onAskAbout={() => {
            const breadcrumb =
              [...sub.ancestors.map((a) => a.label), sub.parent?.label, selected.label]
                .filter(Boolean)
                .join(" › ") || selected.label;
            onAskAbout({
              id: selected.id,
              label: selected.label,
              description: selected.description,
              breadcrumb,
            });
          }}
          hasExistingChat={hasExistingChat(selected.id)}
          onOpenTree={() => setTreeOpen(true)}
          treeOpen={treeOpen}
        />
      )}

      {buildStatus &&
        buildStatus.phase !== "complete" &&
        buildStatus.phase !== "failed" &&
        buildStatus.phase !== "idle" && (
          <div className="absolute top-3 right-3 z-30 inline-flex items-center gap-2 bg-white border border-ink-200 rounded-full shadow-paper px-3 py-1.5 text-[11px] text-ink-600">
            <Loader2 size={11} className="animate-spin text-accent" />
            <span>
              {buildStatus.phase} · {buildStatus.domains_done}/
              {buildStatus.domains_total || "?"}
            </span>
          </div>
        )}
    </div>
  );
}
