import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  ListTree,
  X,
} from "lucide-react";
import type { CatalogTreeRow } from "../types";
import { TREE_ROOT_KEY } from "../lib/catalog";

interface Props {
  rows: CatalogTreeRow[];
  byId: Map<string, CatalogTreeRow>;
  childrenByParent: Map<string, CatalogTreeRow[]>;
  /** Tree-view's own expand state (which rows are open in the sidebar). */
  treeExpanded: string[];
  onTreeExpandedChange: (next: string[]) => void;
  /** What's expanded in the main graph (so we can show a small eye icon). */
  graphExpanded: Set<string>;
  /** Click a row → jump the graph to it. */
  onJump: (id: string) => void;
  selectedId?: string;
  /** Visibility is controlled by the parent (opened from the node detail
   *  panel's "Tree" button; closed by the X here). */
  open: boolean;
  onClose: () => void;
}

const KIND_DOT: Record<string, string> = {
  era:       "#3f3a29",
  theme:     "#5e573f",
  topic:     "#5e573f",
  event:     "#b04a2e",
  sub_event: "#b04a2e",
  person:    "#7a2f1a",
  group:     "#7a2f1a",
  policy:    "#3f3a29",
  law:       "#3f3a29",
  court_case:"#3f3a29",
  idea:      "#5e573f",
  concept:   "#5e573f",
  term:      "#8b8267",
  movement:  "#7a2f1a",
  reading:   "#5e573f",
  lecture:   "#5e573f",
  source:    "#8b8267",
  document:  "#8b8267",
};

export function CatalogTreeView({
  rows,
  byId,
  childrenByParent,
  treeExpanded,
  onTreeExpandedChange,
  graphExpanded,
  onJump,
  selectedId,
  open,
  onClose,
}: Props) {
  const [filter, setFilter] = useState("");
  const expandedSet = useMemo(() => new Set(treeExpanded), [treeExpanded]);

  /** When a filter is active, surface every row whose label matches AND
   *  expand all of its ancestors so the path is visible. */
  const visibleRowIds = useMemo<Set<string> | null>(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return null; // null = no filter, show normal tree
    const matches = rows.filter((r) => r.label.toLowerCase().includes(q));
    const visible = new Set<string>();
    for (const r of matches) {
      visible.add(r.id);
      // Walk ancestors and add them too.
      let cur: CatalogTreeRow | undefined = r;
      while (cur && cur.parent_id) {
        visible.add(cur.parent_id);
        cur = byId.get(cur.parent_id);
      }
    }
    return visible;
  }, [filter, rows, byId]);

  const toggleRow = (id: string) => {
    if (expandedSet.has(id)) {
      onTreeExpandedChange(treeExpanded.filter((x) => x !== id));
    } else {
      onTreeExpandedChange([...treeExpanded, id]);
    }
  };

  const expandAll = () => {
    const all: string[] = [];
    for (const r of rows) if (!r.is_leaf && r.child_count > 0) all.push(r.id);
    onTreeExpandedChange(all);
  };
  const collapseAll = () => onTreeExpandedChange([]);

  if (!open) return null;

  return (
    <div className="absolute top-3 right-3 bottom-3 w-[300px] max-w-[88%] z-20 flex flex-col bg-white border border-ink-200 rounded-2xl shadow-paper overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-ink-200/70">
        <ListTree size={14} className="text-accent shrink-0" />
        <span className="font-serif font-semibold text-[14px] text-ink-900">
          Tree
        </span>
        <span className="text-[11px] text-ink-400 ml-auto">
          {rows.length} node{rows.length === 1 ? "" : "s"}
        </span>
        <button
          onClick={onClose}
          className="ml-1 grid place-items-center w-6 h-6 rounded-md text-ink-500 hover:text-ink-800 hover:bg-ink-100 transition"
          title="Close tree"
        >
          <X size={13} />
        </button>
      </div>

      <div className="px-3 pt-2 pb-1.5 border-b border-ink-100">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by label…"
          className="w-full bg-ink-50 border border-ink-200 rounded-md px-2 py-1 text-[12px] outline-none focus:border-ink-400 transition placeholder:text-ink-400"
        />
        <div className="flex items-center justify-between mt-1.5 text-[10px] text-ink-400">
          <button
            onClick={expandAll}
            className="hover:text-accent-dark transition"
          >
            Expand all
          </button>
          <button
            onClick={collapseAll}
            className="hover:text-accent-dark transition"
          >
            Collapse all
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
        {rows.length === 0 ? (
          <p className="text-[12px] italic text-ink-400 px-3 py-3">
            No nodes yet — build the catalog first.
          </p>
        ) : (
          <ul>
            {(childrenByParent.get(TREE_ROOT_KEY) ?? []).map((r) => (
              <TreeRow
                key={r.id}
                row={r}
                depth={0}
                expandedSet={expandedSet}
                onToggle={toggleRow}
                onJump={onJump}
                childrenByParent={childrenByParent}
                visibleRowIds={visibleRowIds}
                graphExpanded={graphExpanded}
                selectedId={selectedId}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface RowProps {
  row: CatalogTreeRow;
  depth: number;
  expandedSet: Set<string>;
  onToggle: (id: string) => void;
  onJump: (id: string) => void;
  childrenByParent: Map<string, CatalogTreeRow[]>;
  visibleRowIds: Set<string> | null;
  graphExpanded: Set<string>;
  selectedId?: string;
}

function TreeRow({
  row,
  depth,
  expandedSet,
  onToggle,
  onJump,
  childrenByParent,
  visibleRowIds,
  graphExpanded,
  selectedId,
}: RowProps) {
  // Filter mode: hide rows that aren't matched (or ancestors of matches).
  if (visibleRowIds && !visibleRowIds.has(row.id)) return null;

  // In filter mode, force-expand matched ancestors so the path is visible.
  const isExpanded =
    visibleRowIds !== null ? visibleRowIds.has(row.id) : expandedSet.has(row.id);
  const hasChildren = !row.is_leaf && row.child_count > 0;
  const dotColor = KIND_DOT[row.kind] ?? "#8b8267";
  const isInGraph = graphExpanded.has(row.id);
  const isSelected = selectedId === row.id;

  const childRows =
    isExpanded && hasChildren
      ? (childrenByParent.get(row.id) ?? [])
      : [];

  return (
    <li>
      <div
        className={[
          "group flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition",
          isSelected
            ? "bg-accent/10 border border-accent/40"
            : "hover:bg-ink-50 border border-transparent",
        ].join(" ")}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => onJump(row.id)}
        title={`${row.label} (${row.kind})`}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(row.id);
            }}
            className="grid place-items-center w-4 h-4 text-ink-400 hover:text-ink-700 transition shrink-0"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>
        ) : (
          <span className="w-4 h-4 shrink-0" />
        )}
        <span
          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: dotColor }}
        />
        <span
          className={[
            "text-[12px] leading-snug truncate",
            isSelected
              ? "text-ink-900 font-medium"
              : isInGraph
                ? "text-accent-dark"
                : "text-ink-700",
          ].join(" ")}
        >
          {row.label}
        </span>
        {row.year !== null && row.year !== undefined && (
          <span className="text-[10px] text-ink-400 ml-auto shrink-0">
            {row.year}
          </span>
        )}
        {hasChildren && row.year === null && (
          <span className="text-[10px] text-ink-400 ml-auto shrink-0">
            {row.child_count}
          </span>
        )}
        {isInGraph && (
          <Eye
            size={10}
            className="text-accent-dark shrink-0"
            aria-label="visible in graph"
          />
        )}
      </div>
      {childRows.length > 0 && (
        <ul>
          {childRows.map((c) => (
            <TreeRow
              key={c.id}
              row={c}
              depth={depth + 1}
              expandedSet={expandedSet}
              onToggle={onToggle}
              onJump={onJump}
              childrenByParent={childrenByParent}
              visibleRowIds={visibleRowIds}
              graphExpanded={graphExpanded}
              selectedId={selectedId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
