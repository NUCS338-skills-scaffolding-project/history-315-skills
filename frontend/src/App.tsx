import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GraduationCap, PanelRightClose, PanelRightOpen } from "lucide-react";
import { ChatPanel } from "./components/ChatPanel";
import { Composer } from "./components/Composer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GraphPanel } from "./components/GraphPanel";
import { Sidebar } from "./components/Sidebar";
import { clearGraph, fetchGraph, streamChat, uploadFile } from "./lib/api";
import {
  deriveTitle,
  loadState,
  newSession,
  saveState,
} from "./lib/storage";
import type {
  ChatMessage,
  ChatSession,
  PersistedState,
} from "./types";

function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function App() {
  const [state, setState] = useState<PersistedState>(() => loadState());
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [graphOpen, setGraphOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [graphWidth, setGraphWidth] = useState<number>(() => {
    if (typeof localStorage === "undefined") return 440;
    const saved = Number(localStorage.getItem("hist315.graphWidth"));
    return Number.isFinite(saved) && saved > 0
      ? Math.min(900, Math.max(280, saved))
      : 440;
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("hist315.graphWidth", String(graphWidth));
    } catch {
      /* ignore quota */
    }
  }, [graphWidth]);

  const startGraphResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = graphWidth;
      const onMove = (ev: MouseEvent) => {
        const dx = startX - ev.clientX;
        setGraphWidth(Math.min(900, Math.max(280, startW + dx)));
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [graphWidth],
  );

  // Persist on every state change (cheap; localStorage is sync).
  useEffect(() => {
    saveState(state);
  }, [state]);

  const active = useMemo<ChatSession | null>(() => {
    if (!state.activeSessionId) return null;
    return state.sessions.find((s) => s.id === state.activeSessionId) ?? null;
  }, [state]);

  // Lazy-create the first session if storage was empty.
  useEffect(() => {
    if (state.sessions.length === 0) {
      const s = newSession();
      setState({ version: 1, activeSessionId: s.id, sessions: [s] });
    } else if (!state.activeSessionId) {
      setState((prev) => ({ ...prev, activeSessionId: prev.sessions[0]!.id }));
    }
  }, [state.sessions.length, state.activeSessionId]);

  const updateSession = useCallback(
    (id: string, fn: (s: ChatSession) => ChatSession) => {
      setState((prev) => {
        const idx = prev.sessions.findIndex((s) => s.id === id);
        if (idx < 0) return prev;
        const next = [...prev.sessions];
        next[idx] = fn(next[idx]!);
        return { ...prev, sessions: next };
      });
    },
    [],
  );

  const moveToTop = useCallback((id: string) => {
    setState((prev) => {
      const idx = prev.sessions.findIndex((s) => s.id === id);
      if (idx <= 0) return prev;
      const next = [...prev.sessions];
      const [s] = next.splice(idx, 1);
      next.unshift(s!);
      return { ...prev, sessions: next };
    });
  }, []);

  const handleNewSession = useCallback(() => {
    const s = newSession();
    setState((prev) => ({
      ...prev,
      activeSessionId: s.id,
      sessions: [s, ...prev.sessions],
    }));
  }, []);

  const handleSelectSession = useCallback((id: string) => {
    if (abortRef.current) abortRef.current.abort();
    setState((prev) => ({ ...prev, activeSessionId: id }));
  }, []);

  const handleDeleteSession = useCallback((id: string) => {
    setState((prev) => {
      const remaining = prev.sessions.filter((s) => s.id !== id);
      const nextActive =
        prev.activeSessionId === id
          ? remaining[0]?.id ?? null
          : prev.activeSessionId;
      // If we deleted the last session, the lazy-create effect will spin a new one.
      return { ...prev, activeSessionId: nextActive, sessions: remaining };
    });
  }, []);

  const handleAttach = useCallback(
    async (file: File) => {
      if (!active) return;
      setUploading(true);
      try {
        const result = await uploadFile(active.id, file);
        updateSession(active.id, (s) => ({ ...s, attachedFile: result }));
      } catch (err) {
        console.error(err);
        alert(`Upload failed: ${err instanceof Error ? err.message : err}`);
      } finally {
        setUploading(false);
      }
    },
    [active, updateSession],
  );

  const handleClearAttached = useCallback(() => {
    if (!active) return;
    updateSession(active.id, (s) => ({ ...s, attachedFile: null }));
  }, [active, updateSession]);

  const handleClearGraph = useCallback(() => {
    if (!active) return;
    const id = active.id;
    updateSession(id, (s) => ({
      ...s,
      graph: { nodes: [], edges: [] },
      nodePositions: {},
      modifiedAt: Date.now(),
    }));
    void clearGraph(id);
  }, [active, updateSession]);

  const handleNodeMoved = useCallback(
    (id: string, pos: { x: number; y: number }) => {
      if (!active) return;
      updateSession(active.id, (s) => ({
        ...s,
        nodePositions: { ...(s.nodePositions ?? {}), [id]: pos },
      }));
    },
    [active, updateSession],
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (!active) return;
      const sessionId = active.id;
      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        text,
        attachedFile: active.attachedFile ?? undefined,
        createdAt: Date.now(),
      };
      const assistantId = uid();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        text: "",
        streaming: true,
        toolUses: [],
        createdAt: Date.now(),
      };

      const filePath = active.attachedFile?.path ?? null;
      const claudeSessionIdAtStart = active.claudeSessionId;
      const isFirstUserMessage =
        active.messages.filter((m) => m.role === "user").length === 0;

      updateSession(sessionId, (s) => ({
        ...s,
        title: isFirstUserMessage ? deriveTitle(text) : s.title,
        messages: [...s.messages, userMsg, assistantMsg],
        modifiedAt: Date.now(),
      }));
      moveToTop(sessionId);

      setBusy(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      // Poll the graph file while Claude is streaming so the side panel
      // reflects writes from its Write tool in near-real-time.
      const pollGraph = async () => {
        const graph = await fetchGraph(sessionId).catch(() => null);
        if (!graph) return;
        updateSession(sessionId, (s) => ({ ...s, graph }));
      };
      const pollId = window.setInterval(pollGraph, 1500);

      try {
        await streamChat({
          message: text,
          sessionId,
          claudeSessionId: claudeSessionIdAtStart,
          filePath,
          signal: ctrl.signal,
          onDelta: (delta) => {
            updateSession(sessionId, (s) => ({
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantId ? { ...m, text: m.text + delta } : m,
              ),
            }));
          },
          onToolUse: (info) => {
            updateSession(sessionId, (s) => ({
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantId
                  ? { ...m, toolUses: [...(m.toolUses ?? []), info] }
                  : m,
              ),
            }));
          },
          onDone: async ({ claudeSessionId, durationS }) => {
            const graph = await fetchGraph(sessionId).catch(() => null);
            updateSession(sessionId, (s) => ({
              ...s,
              claudeSessionId: claudeSessionId ?? s.claudeSessionId,
              modifiedAt: Date.now(),
              graph: graph ?? s.graph,
              messages: s.messages.map((m) =>
                m.id === assistantId
                  ? { ...m, streaming: false, durationS }
                  : m,
              ),
            }));
          },
          onError: (msg) => {
            updateSession(sessionId, (s) => ({
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantId
                  ? { ...m, streaming: false, error: msg }
                  : m,
              ),
            }));
          },
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const msg = err instanceof Error ? err.message : String(err);
        updateSession(sessionId, (s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.id === assistantId
              ? { ...m, streaming: false, error: msg }
              : m,
          ),
        }));
      } finally {
        window.clearInterval(pollId);
        setBusy(false);
        abortRef.current = null;
      }
    },
    [active, moveToTop, updateSession],
  );

  // ---------------------------------------------------------------- render
  return (
    <div className="h-full flex flex-col">
      <Header
        graphOpen={graphOpen}
        onToggleGraph={() => setGraphOpen((v) => !v)}
        graphCount={active?.graph.nodes.length ?? 0}
      />
      <div className="flex-1 min-h-0 flex">
        <div
          className="shrink-0 transition-[width] duration-200 overflow-hidden"
          style={{ width: sidebarCollapsed ? 0 : 260 }}
        >
          <Sidebar
            sessions={state.sessions}
            activeId={state.activeSessionId}
            collapsed={false}
            onToggle={() => setSidebarCollapsed((v) => !v)}
            onSelect={handleSelectSession}
            onNew={handleNewSession}
            onDelete={handleDeleteSession}
          />
        </div>
        {sidebarCollapsed && (
          <Sidebar
            sessions={state.sessions}
            activeId={state.activeSessionId}
            collapsed={true}
            onToggle={() => setSidebarCollapsed((v) => !v)}
            onSelect={handleSelectSession}
            onNew={handleNewSession}
            onDelete={handleDeleteSession}
          />
        )}

        <main className="flex-1 min-w-0 border-r border-ink-200/70 bg-ink-50/40 relative">
          {active ? (
            <ChatPanel
              messages={active.messages}
              composer={
                <Composer
                  busy={busy}
                  attached={active.attachedFile}
                  onAttach={handleAttach}
                  onClearAttached={handleClearAttached}
                  onSend={handleSend}
                  uploading={uploading}
                />
              }
            />
          ) : (
            <div className="h-full grid place-items-center text-ink-400 text-[13px]">
              Loading…
            </div>
          )}
        </main>

        {graphOpen && (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              onMouseDown={startGraphResize}
              onDoubleClick={() => setGraphWidth(440)}
              className="group relative shrink-0 w-1 hover:w-1.5 cursor-col-resize bg-ink-200/70 hover:bg-accent/60 transition-all"
              title="Drag to resize · double-click to reset"
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </div>
            <aside
              className="shrink-0 min-h-0 overflow-hidden"
              style={{ width: graphWidth }}
            >
              {active && (
                <ErrorBoundary label="graph" onReset={handleClearGraph}>
                  <GraphPanel
                    graph={active.graph}
                    onClear={handleClearGraph}
                    positions={active.nodePositions}
                    onPositionChange={handleNodeMoved}
                  />
                </ErrorBoundary>
              )}
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

interface HeaderProps {
  graphOpen: boolean;
  onToggleGraph: () => void;
  graphCount: number;
}

function Header({ graphOpen, onToggleGraph, graphCount }: HeaderProps) {
  return (
    <header className="flex items-center gap-3 px-5 py-3 border-b border-ink-200/70 bg-ink-50/80 backdrop-blur">
      <div className="w-9 h-9 rounded-xl bg-ink-900 text-ink-50 grid place-items-center shadow-paper">
        <GraduationCap size={18} />
      </div>
      <div className="min-w-0">
        <div className="font-serif font-semibold text-ink-900 text-[16px] leading-tight">
          HIST 315 — Study Assistant
        </div>
        <div className="text-[11px] text-ink-500 truncate">
          The United States Since 1968 · Socratic tutor with causal-chain graph
        </div>
      </div>
      <button
        onClick={onToggleGraph}
        className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-ink-600 hover:text-accent-dark border border-ink-200 bg-white rounded-full px-3 py-1.5 transition"
        title="Toggle graph panel"
      >
        {graphOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
        Graph ({graphCount})
      </button>
    </header>
  );
}

