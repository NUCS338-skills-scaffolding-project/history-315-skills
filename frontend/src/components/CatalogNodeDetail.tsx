import { ChevronDown, ChevronRight, Calendar, FileText, ListTree, MessageSquarePlus, Tag, X } from "lucide-react";
import type { CatalogNodeT } from "../types";

interface Props {
  node: CatalogNodeT;
  onClose: () => void;
  /** Toggles inline expansion (children visible / hidden in the canvas). */
  onToggleExpand: () => void;
  /** Whether this node is currently expanded in the canvas. */
  isExpanded: boolean;
  onAskAbout: () => void;
  /** True if a chat is already anchored to this node — relabel button. */
  hasExistingChat: boolean;
  /** Open the tree-view side panel. */
  onOpenTree: () => void;
  /** Whether the tree-view side panel is currently open. */
  treeOpen: boolean;
}

export function CatalogNodeDetail({
  node,
  onClose,
  onToggleExpand,
  isExpanded,
  onAskAbout,
  hasExistingChat,
  onOpenTree,
  treeOpen,
}: Props) {
  const drillable = !node.is_leaf && node.child_count > 0;
  return (
    <div className="absolute top-3 right-3 bottom-3 w-[340px] max-w-[88%] bg-white border border-ink-200 rounded-2xl shadow-paper flex flex-col overflow-hidden z-10">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-200/70">
        <span className="text-[11px] uppercase tracking-wider text-ink-400">
          {node.kind || "node"}
        </span>
        <button
          onClick={onOpenTree}
          disabled={treeOpen}
          className="ml-auto inline-flex items-center gap-1 text-[11px] text-ink-600 hover:text-accent-dark border border-ink-200 bg-white rounded-full px-2.5 py-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
          title={treeOpen ? "Tree is open" : "Open tree view"}
        >
          <ListTree size={11} />
          Tree
        </button>
        <button
          onClick={onClose}
          className="text-ink-400 hover:text-ink-700 transition"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        <h3 className="font-serif text-[18px] font-semibold text-ink-900 leading-snug mb-3">
          {node.label}
        </h3>

        <dl className="space-y-2 text-[13px] mb-3">
          {node.kind && (
            <Row icon={<Tag size={12} />} label="Kind" value={node.kind} />
          )}
          {typeof node.year === "number" && (
            <Row icon={<Calendar size={12} />} label="Year" value={String(node.year)} />
          )}
          {Array.isArray(node.year_range) && (
            <Row
              icon={<Calendar size={12} />}
              label="Range"
              value={`${node.year_range[0]} – ${node.year_range[1]}`}
            />
          )}
          <Row
            label="ID"
            value={<code className="font-mono text-[12px]">{node.id}</code>}
          />
          {node.child_count > 0 && (
            <Row
              label="Subtree"
              value={
                <span>
                  {node.child_count} direct child
                  {node.child_count === 1 ? "" : "ren"}
                </span>
              }
            />
          )}
        </dl>

        {node.description ? (
          <p className="text-[13px] leading-relaxed text-ink-700 border-t border-ink-100 pt-3">
            {node.description}
          </p>
        ) : (
          <p className="text-[12px] italic text-ink-400 border-t border-ink-100 pt-3">
            No description.
          </p>
        )}

        {node.source_refs && node.source_refs.length > 0 && (
          <div className="mt-4 border-t border-ink-100 pt-3">
            <p className="text-[11px] uppercase tracking-wider text-ink-400 mb-1.5">
              Source materials
            </p>
            <ul className="space-y-1">
              {node.source_refs.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 text-[12px] text-ink-700"
                >
                  <FileText size={11} className="text-ink-400 mt-0.5 shrink-0" />
                  <span className="font-mono break-all">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-ink-200/70 p-3 flex gap-2">
        {drillable && (
          <button
            onClick={onToggleExpand}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-[13px] bg-white border border-ink-200 text-ink-800 hover:border-ink-400 transition rounded-xl px-3 py-2 font-medium"
            title={isExpanded ? "Hide children in the graph" : "Show children inline in the graph"}
          >
            {isExpanded ? (
              <>
                <ChevronDown size={13} />
                Collapse
              </>
            ) : (
              <>
                <ChevronRight size={13} />
                Expand
              </>
            )}
          </button>
        )}
        <button
          onClick={onAskAbout}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-[13px] bg-accent text-white hover:bg-accent-dark transition rounded-xl px-3 py-2 font-medium shadow"
        >
          <MessageSquarePlus size={13} />
          {hasExistingChat ? "Resume chat" : "Ask about this"}
        </button>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <dt className="flex items-center gap-1 w-16 shrink-0 text-ink-400 text-[12px] uppercase tracking-wider pt-0.5">
        {icon}
        {label}
      </dt>
      <dd className="flex-1 text-ink-800 capitalize first-letter:uppercase">
        {value}
      </dd>
    </div>
  );
}
