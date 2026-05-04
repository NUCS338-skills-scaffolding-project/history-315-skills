import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  Database,
  FileText,
  Hammer,
  Wrench,
} from "lucide-react";
import type { BuildLogEvent, BuildLogKind } from "../types";

interface Props {
  events: BuildLogEvent[];
}

const KIND_ICON: Record<BuildLogKind, React.ReactNode> = {
  info:        <Hammer size={11} />,
  phase:       <ArrowDownToLine size={11} />,
  tool_use:    <Wrench size={11} />,
  tool_result: <FileText size={11} />,
  text:        <FileText size={11} />,
  ingest:      <Database size={11} />,
  error:       <AlertTriangle size={11} />,
  result:      <CheckCircle2 size={11} />,
};

const KIND_TONE: Record<BuildLogKind, string> = {
  info:        "text-ink-600",
  phase:       "text-accent-dark font-medium",
  tool_use:    "text-ink-700",
  tool_result: "text-ink-500",
  text:        "text-ink-500 italic",
  ingest:      "text-emerald-700",
  error:       "text-accent-dark",
  result:      "text-emerald-700 font-medium",
};

function formatTime(t: number): string {
  return new Date(t * 1000).toLocaleTimeString(undefined, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function BuildLogTail({ events }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom on new events, unless the user has scrolled up.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !autoScroll) return;
    el.scrollTop = el.scrollHeight;
  }, [events, autoScroll]);

  // Detect manual scroll-up to pause auto-scroll.
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  };

  if (events.length === 0) {
    return (
      <div className="text-[12px] italic text-ink-400 px-3 py-4 text-center">
        Waiting for events…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-ink-100 text-[11px] text-ink-500">
        <span>
          {events.length} event{events.length === 1 ? "" : "s"}
        </span>
        {!autoScroll && (
          <button
            onClick={() => {
              setAutoScroll(true);
              const el = scrollRef.current;
              if (el) el.scrollTop = el.scrollHeight;
            }}
            className="inline-flex items-center gap-1 text-accent-dark hover:underline"
          >
            <ArrowDownToLine size={10} />
            Jump to live
          </button>
        )}
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto scrollbar-thin px-2 py-1 font-mono text-[11.5px] leading-snug bg-ink-50/60"
      >
        {events.map((e) => (
          <div
            key={e.seq}
            className={[
              "flex items-start gap-1.5 px-1 py-0.5 rounded",
              KIND_TONE[e.kind] ?? "text-ink-700",
            ].join(" ")}
          >
            <span className="text-ink-400 shrink-0">{formatTime(e.ts)}</span>
            <span className="shrink-0 mt-0.5">{KIND_ICON[e.kind]}</span>
            <span className="shrink-0 uppercase tracking-wider text-[9.5px] mt-[2px] opacity-70">
              {e.kind === "tool_use" ? "tool" : e.kind === "tool_result" ? "←" : e.kind}
            </span>
            <span className="break-words flex-1 whitespace-pre-wrap">
              {e.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
