import { ChevronRight, Home } from "lucide-react";
import type { CatalogNodeT } from "../types";

interface Props {
  ancestors: CatalogNodeT[];
  /** The currently zoomed-in node, if any (rendered as a non-clickable trailing segment). */
  current: CatalogNodeT | null;
  /** Called when a segment is clicked. id=null means jump to top level. */
  onSelect: (id: string | null) => void;
}

export function CatalogBreadcrumb({ ancestors, current, onSelect }: Props) {
  return (
    <div className="absolute bottom-3 left-3 z-10 max-w-[calc(100%-3rem)] overflow-x-auto">
      <ol className="flex items-center gap-1 bg-white/90 backdrop-blur border border-ink-200 rounded-full px-2 py-1 text-[12px] shadow-paper">
        <li>
          <button
            onClick={() => onSelect(null)}
            className="inline-flex items-center gap-1 text-ink-600 hover:text-accent-dark px-2 py-0.5 rounded-full transition"
            title="Top of catalog"
          >
            <Home size={11} />
            HIST 315
          </button>
        </li>
        {ancestors.map((a) => (
          <li key={a.id} className="flex items-center gap-1 shrink-0">
            <ChevronRight size={11} className="text-ink-300 shrink-0" />
            <button
              onClick={() => onSelect(a.id)}
              className="text-ink-600 hover:text-accent-dark px-2 py-0.5 rounded-full transition truncate max-w-[180px]"
              title={a.label}
            >
              {a.label}
            </button>
          </li>
        ))}
        {current && (
          <li className="flex items-center gap-1 shrink-0">
            <ChevronRight size={11} className="text-ink-300 shrink-0" />
            <span
              className="text-ink-900 font-medium px-2 py-0.5 rounded-full truncate max-w-[220px]"
              title={current.label}
            >
              {current.label}
            </span>
          </li>
        )}
      </ol>
    </div>
  );
}
