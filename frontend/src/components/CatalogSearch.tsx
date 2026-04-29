import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useCatalogSearch } from "../lib/catalog";
import type { CatalogSearchHit } from "../types";

interface Props {
  onSelect: (hit: CatalogSearchHit) => void;
}

export function CatalogSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hits = useCatalogSearch(query);

  // Reset highlight when results change.
  useEffect(() => {
    setHighlight(0);
  }, [hits]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(hits.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      const hit = hits[highlight];
      if (hit) {
        onSelect(hit);
        setQuery("");
        setOpen(false);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-[min(520px,calc(100%-2rem))]"
    >
      <div className="flex items-center gap-2 bg-white border border-ink-200 rounded-full shadow-paper px-3 py-1.5 focus-within:border-ink-400 transition">
        <Search size={14} className="text-ink-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search the catalog — events, people, concepts…"
          className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-ink-400"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="text-ink-400 hover:text-ink-700 transition"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="mt-1 bg-white border border-ink-200 rounded-2xl shadow-paper overflow-hidden max-h-[60vh] overflow-y-auto scrollbar-thin">
          {hits.length === 0 ? (
            <div className="px-4 py-3 text-[13px] text-ink-400">
              No matches. Build the catalog first if you haven't, or try a
              different term.
            </div>
          ) : (
            <ul>
              {hits.map((h, i) => (
                <li
                  key={h.id}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => {
                    onSelect(h);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={[
                    "px-4 py-2 cursor-pointer border-b border-ink-100 last:border-0",
                    i === highlight ? "bg-ink-100" : "hover:bg-ink-50",
                  ].join(" ")}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-ink-900 text-[14px]">
                      {h.label}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-ink-400">
                      {h.kind}
                    </span>
                  </div>
                  {h.breadcrumb && (
                    <div className="text-[11px] text-ink-500 truncate">
                      {h.breadcrumb}
                    </div>
                  )}
                  {h.description && (
                    <div className="text-[12px] text-ink-600 mt-0.5 line-clamp-2">
                      {h.description}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
