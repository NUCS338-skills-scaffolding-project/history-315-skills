import { useState } from "react";
import { ChevronLeft, MessageSquarePlus, Network, Trash2 } from "lucide-react";
import type { ChatSession } from "../types";

interface Props {
  sessions: ChatSession[];
  activeId: string | null;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function relativeTime(t: number): string {
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export function Sidebar({
  sessions,
  activeId,
  collapsed,
  onToggle,
  onSelect,
  onNew,
  onDelete,
}: Props) {
  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="absolute top-3 left-3 z-20 grid place-items-center w-9 h-9 rounded-xl bg-white border border-ink-200 shadow-paper text-ink-600 hover:text-accent transition"
        title="Open sessions sidebar"
      >
        <ChevronLeft size={16} className="rotate-180" />
      </button>
    );
  }

  return (
    <div className="h-full flex flex-col border-r border-ink-200/70 bg-ink-100/40 backdrop-blur">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-ink-200/70">
        <button
          onClick={onNew}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-ink-900 hover:bg-ink-800 text-ink-50 text-[13px] font-medium shadow-paper transition"
        >
          <MessageSquarePlus size={14} />
          New chat
        </button>
        <button
          onClick={onToggle}
          className="grid place-items-center w-9 h-9 rounded-xl border border-ink-200 bg-white text-ink-500 hover:text-ink-800 transition"
          title="Collapse sidebar"
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {sessions.length === 0 ? (
          <p className="text-[12px] text-ink-400 px-4 py-3 italic">
            No conversations yet.
          </p>
        ) : (
          <ul className="space-y-0.5 px-2">
            {sessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                active={s.id === activeId}
                onSelect={() => onSelect(s.id)}
                onDelete={() => onDelete(s.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="px-3 py-2 border-t border-ink-200/70 text-[10px] text-ink-400 leading-snug">
        Sessions are saved in your browser. Clearing site data will erase
        them.
      </div>
    </div>
  );
}

interface RowProps {
  session: ChatSession;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SessionRow({ session, active, onSelect, onDelete }: RowProps) {
  const [confirming, setConfirming] = useState(false);
  const graphCount = session.graph.nodes.length;

  return (
    <li>
      <div
        className={[
          "group flex items-start gap-2 px-2 py-2 rounded-lg cursor-pointer transition",
          active
            ? "bg-white shadow-paper border border-ink-200"
            : "hover:bg-white/60 border border-transparent",
        ].join(" ")}
        onClick={() => {
          if (confirming) return;
          onSelect();
        }}
      >
        <div className="flex-1 min-w-0">
          <p className={[
            "text-[13px] leading-snug truncate",
            active ? "text-ink-900 font-medium" : "text-ink-700",
          ].join(" ")}>
            {session.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-ink-400">
            <span>{relativeTime(session.modifiedAt)}</span>
            {graphCount > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Network size={9} />
                {graphCount}
              </span>
            )}
          </div>
        </div>
        {confirming ? (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-[10px] uppercase tracking-wider text-accent-dark px-1.5 py-0.5 rounded hover:bg-accent/10 transition"
            >
              Delete
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirming(false);
              }}
              className="text-[10px] uppercase tracking-wider text-ink-500 px-1.5 py-0.5 rounded hover:bg-ink-100 transition"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirming(true);
            }}
            className="opacity-0 group-hover:opacity-100 transition shrink-0 text-ink-400 hover:text-accent-dark p-1 rounded"
            aria-label="Delete conversation"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </li>
  );
}
