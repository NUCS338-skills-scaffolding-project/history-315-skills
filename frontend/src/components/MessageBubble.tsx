import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, Network, Wrench } from "lucide-react";
import type { ChatMessage } from "../types";
import { stripCausalBlocks } from "../lib/causal";

interface Props {
  message: ChatMessage;
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function MessageBubbleImpl({ message }: Props) {
  const isUser = message.role === "user";
  const display = isUser ? message.text : stripCausalBlocks(message.text);
  const hasDelta =
    !!message.causalDelta &&
    (message.causalDelta.nodes.length + message.causalDelta.edges.length > 0);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[78%] rounded-2xl px-4 py-3 shadow-paper",
          isUser
            ? "bg-ink-900 text-ink-50 rounded-br-sm"
            : "bg-white border border-ink-200/70 rounded-bl-sm",
        ].join(" ")}
      >
        {message.attachedFile && (
          <div
            className={[
              "flex items-center gap-2 mb-2 rounded-lg px-3 py-2 text-[13px]",
              isUser
                ? "bg-ink-800/60 text-ink-100 border border-ink-700"
                : "bg-ink-100 text-ink-700 border border-ink-200",
            ].join(" ")}
          >
            <FileText size={14} className="shrink-0" />
            <span className="font-medium truncate">
              {message.attachedFile.name}
            </span>
            <span className="opacity-60 ml-auto">
              {formatBytes(message.attachedFile.size)}
            </span>
          </div>
        )}

        {!!message.toolUses?.length && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {message.toolUses.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-ink-500 bg-ink-100 px-2 py-0.5 rounded-full"
              >
                <Wrench size={10} />
                {t.name}
              </span>
            ))}
          </div>
        )}

        <div
          className={
            isUser
              ? "text-[15px] leading-relaxed whitespace-pre-wrap"
              : "prose-history"
          }
        >
          {isUser ? (
            display
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {display || (message.streaming ? "…" : "")}
            </ReactMarkdown>
          )}
        </div>

        {hasDelta && (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-accent-dark border-t border-ink-200/70 pt-2">
            <Network size={13} />
            <span>
              Added{" "}
              <strong>
                {message.causalDelta!.nodes.length} node
                {message.causalDelta!.nodes.length === 1 ? "" : "s"}
              </strong>
              {" and "}
              <strong>
                {message.causalDelta!.edges.length} link
                {message.causalDelta!.edges.length === 1 ? "" : "s"}
              </strong>{" "}
              to the graph →
            </span>
          </div>
        )}

        {message.error && (
          <div className="mt-2 text-[12px] text-accent-dark">
            ⚠ {message.error}
          </div>
        )}
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleImpl);
