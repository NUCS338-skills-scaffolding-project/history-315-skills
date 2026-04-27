import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, Loader2, Paperclip, X } from "lucide-react";
import type { AttachedFile } from "../types";

interface Props {
  busy: boolean;
  attached: AttachedFile | null;
  onAttach: (file: File) => Promise<void>;
  onClearAttached: () => void;
  onSend: (text: string) => void;
  uploading: boolean;
}

export function Composer({
  busy,
  attached,
  onAttach,
  onClearAttached,
  onSend,
  uploading,
}: Props) {
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const canSend = !!text.trim() && !busy;

  const send = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) await onAttach(f);
    e.target.value = "";
  };

  return (
    <div className="border-t border-ink-200/70 bg-ink-50/80 backdrop-blur px-4 py-3">
      {attached && (
        <div className="mb-2 flex items-center gap-2 bg-white border border-ink-200 rounded-lg px-3 py-2 text-[13px]">
          <Paperclip size={14} className="text-ink-500" />
          <span className="font-medium truncate flex-1">{attached.name}</span>
          <span className="text-ink-400 text-[12px]">
            {(attached.size / 1024).toFixed(1)} KB
          </span>
          <button
            onClick={onClearAttached}
            className="text-ink-400 hover:text-ink-700 transition"
            aria-label="Remove attachment"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 bg-white border border-ink-200 rounded-2xl shadow-paper p-2 focus-within:border-ink-400 transition">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || busy}
          className="shrink-0 p-2 text-ink-500 hover:text-accent hover:bg-ink-100 rounded-lg transition disabled:opacity-40"
          aria-label="Attach assignment"
        >
          {uploading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Paperclip size={18} />
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.txt,.md,.docx,.doc,.rtf,.html,.htm,.png,.jpg,.jpeg"
          onChange={onFile}
        />

        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const ta = e.target;
            ta.style.height = "auto";
            ta.style.height = `${Math.min(ta.scrollHeight, 220)}px`;
          }}
          onKeyDown={onKey}
          placeholder={
            attached
              ? `Ask about "${attached.name}"…`
              : "Ask about an assignment, an event, or paste a prompt…"
          }
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-[15px] leading-relaxed placeholder:text-ink-400 max-h-56 scrollbar-thin"
        />

        <button
          onClick={send}
          disabled={!canSend}
          className={[
            "shrink-0 grid place-items-center w-9 h-9 rounded-xl transition",
            canSend
              ? "bg-accent hover:bg-accent-dark text-white shadow"
              : "bg-ink-200 text-ink-400",
          ].join(" ")}
          aria-label="Send"
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ArrowUp size={16} />
          )}
        </button>
      </div>

      <p className="mt-2 text-[11px] text-ink-400 px-2">
        ⏎ to send · Shift+⏎ for newline · attach an assignment file and Claude
        will read it before responding
      </p>
    </div>
  );
}
