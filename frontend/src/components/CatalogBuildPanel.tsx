import { useState } from "react";
import { Hammer, Loader2 } from "lucide-react";
import { catalogApi, useBuildLog } from "../lib/catalog";
import type { BuildStatus } from "../types";
import { BuildLogTail } from "./BuildLogTail";

interface Props {
  status: BuildStatus | null;
}

const PHASE_LABELS: Record<string, string> = {
  idle: "Idle",
  plan: "Phase 1 of 5 — Planning extraction domains",
  extract: "Phase 2 of 5 — Fanning out subagents",
  review: "Phase 3 of 5 — Reviewing for missed entities",
  densify: "Phase 4 of 5 — Densifying edges",
  dedupe: "Phase 5 of 5 — Deduping clusters",
  complete: "Build complete",
  failed: "Build failed",
};

export function CatalogBuildPanel({ status }: Props) {
  const [starting, setStarting] = useState(false);
  const phase = status?.phase ?? "idle";
  const isBuilding =
    phase !== "idle" && phase !== "complete" && phase !== "failed";

  const events = useBuildLog(true, status?.phase ?? null);

  const handleStart = async () => {
    setStarting(true);
    try {
      await catalogApi.startBuild();
    } catch (err) {
      console.error("startBuild failed", err);
    } finally {
      setStarting(false);
    }
  };

  const showLog = isBuilding || phase === "failed" || events.length > 0;

  return (
    <div className="h-full overflow-y-auto px-6 py-10">
      {/* Hero block: always centered both ways. */}
      <div className="max-w-md mx-auto flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 grid place-items-center mb-4 text-accent shadow-paper">
          <Hammer size={22} />
        </div>
        <h2 className="font-serif text-[22px] font-semibold text-ink-900 mb-2">
          Build the course catalog
        </h2>
        <p className="text-[14px] text-ink-600 leading-relaxed mb-6">
          This pipeline runs Claude through every file in{" "}
          <code className="font-mono text-[12px] bg-ink-100 px-1 py-0.5 rounded">
            course-materials/
          </code>{" "}
          and produces a browsable knowledge graph — eras, events, people,
          concepts, vocabulary, all densely linked. The first build takes{" "}
          <strong>40–75 minutes</strong>; after that, browsing and search are
          instant.
        </p>

        {!isBuilding && phase !== "complete" && (
          <button
            onClick={handleStart}
            disabled={starting}
            className="inline-flex items-center gap-2 bg-ink-900 hover:bg-ink-800 text-ink-50 rounded-xl px-5 py-2.5 text-[14px] font-medium shadow-paper transition disabled:opacity-60"
          >
            {starting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <Hammer size={14} />
                Start build
              </>
            )}
          </button>
        )}
      </div>

      {/* Progress card (full-width below hero). */}
      {isBuilding && status && (
        <div className="max-w-2xl mx-auto mt-8 text-left bg-white border border-ink-200 rounded-2xl shadow-paper p-4">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 size={14} className="animate-spin text-accent" />
            <span className="font-medium text-[14px] text-ink-900">
              {PHASE_LABELS[phase] ?? phase}
            </span>
          </div>
          {status.message && (
            <p className="text-[12px] text-ink-600 mb-2">{status.message}</p>
          )}
          {status.domains_total > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-[11px] text-ink-500 mb-1">
                <span>Domains</span>
                <span>
                  {status.domains_done} / {status.domains_total}
                </span>
              </div>
              <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{
                    width: `${
                      status.domains_total > 0
                        ? (status.domains_done / status.domains_total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
          {status.db && (
            <div className="text-[11px] text-ink-500 grid grid-cols-3 gap-2 pt-2 border-t border-ink-100">
              <Stat label="Nodes" value={status.db.nodes_total} />
              <Stat label="Leaves" value={status.db.leaves_total} />
              <Stat label="Max depth" value={status.db.max_level} />
            </div>
          )}
        </div>
      )}

      {phase === "failed" && (
        <div className="max-w-2xl mx-auto mt-8 text-left bg-accent/10 border border-accent/30 rounded-2xl p-4 text-[13px] text-accent-dark">
          <p className="font-medium mb-1">Build failed.</p>
          <p className="break-words">
            {status?.error || status?.message || "Unknown error."}
          </p>
          <button
            onClick={handleStart}
            className="mt-3 text-[12px] underline underline-offset-2 hover:text-accent"
          >
            Try again
          </button>
        </div>
      )}

      {showLog && (
        <div className="max-w-3xl mx-auto mt-8 text-left">
          <div className="flex items-baseline justify-between mb-1.5">
            <h3 className="font-serif text-[14px] font-semibold text-ink-900">
              Live log
            </h3>
            <span className="text-[11px] text-ink-400">
              also tailing to{" "}
              <code className="font-mono">catalog/build/builder.log</code>
            </span>
          </div>
          <div className="bg-white border border-ink-200 rounded-2xl shadow-paper overflow-hidden h-[420px]">
            <BuildLogTail events={events} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-ink-400 uppercase tracking-wider">{label}</div>
      <div className="text-ink-900 font-mono text-[14px]">{value}</div>
    </div>
  );
}
