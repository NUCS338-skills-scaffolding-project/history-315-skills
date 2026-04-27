import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import type { ChatMessage } from "../types";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: ChatMessage[];
  composer: React.ReactNode;
}

export function ChatPanel({ messages, composer }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 space-y-4"
      >
        {messages.length === 0 ? <Empty /> : null}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>
      {composer}
    </div>
  );
}

function Empty() {
  const examples = [
    "Trace how stagflation set up the Reagan realignment.",
    "What caused the Iran hostage crisis to break Carter's reelection?",
    "Map the consequences of the 1971 Powell Memorandum.",
    "I uploaded my prompt — help me build the causal chain.",
  ];
  return (
    <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-16">
      <div className="w-12 h-12 rounded-2xl bg-accent/10 grid place-items-center text-accent mb-4 shadow-paper">
        <Sparkles size={22} />
      </div>
      <h1 className="font-serif text-2xl font-semibold text-ink-900 mb-2">
        HIST 315 study assistant
      </h1>
      <p className="text-ink-500 text-[15px] leading-relaxed mb-8">
        A Socratic tutor for <em>The United States Since 1968</em>. Upload an
        assignment PDF and we'll work through it together — building a live
        causal-chain graph as we go.
      </p>
      <div className="grid gap-2 w-full">
        {examples.map((e) => (
          <div
            key={e}
            className="text-left text-[14px] bg-white/70 border border-ink-200/70 rounded-xl px-4 py-2.5 text-ink-600"
          >
            {e}
          </div>
        ))}
      </div>
    </div>
  );
}
