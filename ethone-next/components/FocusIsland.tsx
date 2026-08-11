"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocus } from "./FocusProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";

export default function FocusIsland() {
  const i18n = useI18n();
  const { state, pause, resume, stop } = useFocus();
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (state.phase === "idle") {
      setProgress(0);
      return;
    }
    setProgress(((state.total - state.remaining) / state.total) * 100);
    let t: ReturnType<typeof setTimeout> | null = null;
    if (state.paused) {
      t = setTimeout(() => setHidden(true), 30000);
    } else {
      setHidden(false);
    }
    return () => { if (t) clearTimeout(t); };
  }, [state]);

  if (state.phase === "idle" && !hidden) return null;

  const phaseLabels: Record<string, string> = {
    focus: i18n("focus"),
    shortBreak: i18n("shortBreak"),
    longBreak: i18n("longBreak"),
    idle: i18n("ready"),
  };

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className={`v8-dynamic-island fixed left-1/2 top-4 z-[80] -translate-x-1/2 cursor-pointer overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-raised)] shadow-2xl backdrop-blur-md transition-all ${expanded ? "w-72 rounded-2xl p-4" : "h-12 w-fit px-4"}`}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            setExpanded((v) => !v);
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-sm font-semibold tabular-nums">{state.format(state.remaining)}</span>
              {!expanded && <span className="text-[10px] text-[var(--muted)]">{phaseLabels[state.phase]}</span>}
            </div>
            {expanded && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => (state.paused ? resume() : pause())}
                  className="rounded-full bg-[var(--surface)] p-2 hover:bg-[var(--surface-raised)]"
                  aria-label={state.paused ? i18n("resume") : i18n("pause")}
                  data-tooltip={state.paused ? i18n("resume") : i18n("pause")}
                >
                  <Icon name={state.paused ? "play" : "pause"} className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={stop}
                  className="rounded-full bg-[var(--surface)] p-2 hover:bg-[var(--surface-raised)]"
                  aria-label={i18n("stop")}
                  data-tooltip={i18n("stop")}
                >
                  <Icon name="square" className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          {expanded && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
