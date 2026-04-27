import { ArrowRight, Calendar, Tag, X } from "lucide-react";
import type { CausalEdge, CausalNode } from "../types";

type Selection =
  | { kind: "node"; node: CausalNode }
  | { kind: "edge"; edge: CausalEdge; from: CausalNode; to: CausalNode };

interface Props {
  selection: Selection;
  onClose: () => void;
}

export function NodeDetailPanel({ selection, onClose }: Props) {
  return (
    <div className="absolute top-3 right-3 bottom-3 w-[320px] max-w-[88%] bg-white border border-ink-200 rounded-2xl shadow-paper flex flex-col overflow-hidden z-10">
      <div className="flex items-center px-4 py-3 border-b border-ink-200/70">
        <span className="text-[11px] uppercase tracking-wider text-ink-400">
          {selection.kind === "node" ? "Node" : "Causal link"}
        </span>
        <button
          onClick={onClose}
          className="ml-auto text-ink-400 hover:text-ink-700 transition"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        {selection.kind === "node" ? (
          <NodeView node={selection.node} />
        ) : (
          <EdgeView
            edge={selection.edge}
            from={selection.from}
            to={selection.to}
          />
        )}
      </div>
    </div>
  );
}

function NodeView({ node }: { node: CausalNode }) {
  const meta = extraMetadata(node, ["id", "label", "year", "kind", "description"]);
  return (
    <>
      <h3 className="font-serif text-[18px] font-semibold text-ink-900 leading-snug mb-3">
        {node.label}
      </h3>
      <dl className="space-y-2 text-[13px]">
        {node.kind && (
          <Row icon={<Tag size={12} />} label="Kind" value={node.kind} />
        )}
        {typeof node.year === "number" && (
          <Row icon={<Calendar size={12} />} label="Year" value={String(node.year)} />
        )}
        <Row label="ID" value={<code className="font-mono text-[12px]">{node.id}</code>} />
      </dl>

      {node.description ? (
        <p className="mt-4 text-[13px] leading-relaxed text-ink-700 border-t border-ink-100 pt-3">
          {node.description}
        </p>
      ) : (
        <p className="mt-4 text-[12px] italic text-ink-400 border-t border-ink-100 pt-3">
          The tutor hasn't attached a description to this node yet. Ask about
          it in the chat to expand.
        </p>
      )}

      {meta.length > 0 && (
        <div className="mt-4 border-t border-ink-100 pt-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-400 mb-1.5">
            Other fields
          </p>
          <pre className="text-[12px] font-mono bg-ink-50 border border-ink-100 rounded-md p-2 overflow-x-auto">
            {JSON.stringify(Object.fromEntries(meta), null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}

function EdgeView({ edge, from, to }: { edge: CausalEdge; from: CausalNode; to: CausalNode }) {
  const meta = extraMetadata(edge, ["from", "to", "label", "kind", "description"]);
  const isAsserted = edge.label?.toLowerCase() === "asserted";
  return (
    <>
      <div className="flex items-center text-[13px] mb-3">
        <NodeChip node={from} />
        <ArrowRight size={14} className="mx-2 text-ink-400 shrink-0" />
        <NodeChip node={to} />
      </div>
      {edge.kind && (
        <div className="mb-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-400 mb-0.5">
            Link kind
          </p>
          <p className="font-serif text-[14px] text-ink-900 capitalize">
            {edge.kind}
          </p>
        </div>
      )}
      {edge.label && (
        <div className="mb-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-400 mb-0.5">
            Mechanism
          </p>
          <p
            className={[
              "font-serif text-[16px]",
              isAsserted ? "text-accent-dark italic" : "text-ink-900",
            ].join(" ")}
          >
            {edge.label}
            {isAsserted && (
              <span className="block text-[11px] not-italic text-accent-dark mt-0.5 font-sans">
                ⚠ flagged weak — student hasn't named a mechanism
              </span>
            )}
          </p>
        </div>
      )}
      {edge.description ? (
        <p className="text-[13px] leading-relaxed text-ink-700 border-t border-ink-100 pt-3">
          {edge.description}
        </p>
      ) : (
        <p className="text-[12px] italic text-ink-400 border-t border-ink-100 pt-3">
          No description yet — ask the tutor "why does {edge.from} cause{" "}
          {edge.to}?" to expand.
        </p>
      )}

      {meta.length > 0 && (
        <div className="mt-4 border-t border-ink-100 pt-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-400 mb-1.5">
            Other fields
          </p>
          <pre className="text-[12px] font-mono bg-ink-50 border border-ink-100 rounded-md p-2 overflow-x-auto">
            {JSON.stringify(Object.fromEntries(meta), null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}

function NodeChip({ node }: { node: CausalNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-ink-100 border border-ink-200 px-2 py-1 rounded-md text-[12px] min-w-0">
      <span className="font-medium truncate">{node.label}</span>
      {typeof node.year === "number" && (
        <span className="text-ink-400">· {node.year}</span>
      )}
    </span>
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
      <dd className="flex-1 text-ink-800">{value}</dd>
    </div>
  );
}

function extraMetadata(
  obj: Record<string, unknown>,
  known: string[],
): [string, unknown][] {
  return Object.entries(obj).filter(
    ([k, v]) => !known.includes(k) && v !== undefined && v !== null,
  );
}
