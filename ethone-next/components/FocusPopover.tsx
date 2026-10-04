"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingPortal } from "@floating-ui/react";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import { useLayer } from "@/components/LayerProvider";
import { useFocus, type FocusPhase } from "./FocusProvider";

const PRESETS: { id: string; phase: FocusPhase; minutes: number; icon: string; color: string }[] = [
  { id: "pomodoro", phase: "focus", minutes: 25, icon: "timer", color: "text-rose-400" },
  { id: "deep", phase: "focus", minutes: 50, icon: "timer", color: "text-[var(--accent-primary)]" },
  { id: "sprint", phase: "focus", minutes: 10, icon: "timer", color: "text-orange-400" },
  { id: "quick", phase: "focus", minutes: 15, icon: "timer", color: "text-[var(--info)]" },
  { id: "shortBreak", phase: "shortBreak", minutes: 5, icon: "coffee", color: "text-[var(--accent-primary)]" },
  { id: "longBreak", phase: "longBreak", minutes: 15, icon: "armchair", color: "text-amber-400" },
];

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled):not([aria-disabled="true"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export default function FocusPopover({ open, onClose, referenceRef }: { open: boolean; onClose: () => void; referenceRef: HTMLElement | null }) {
  const i18n = useI18n();
  const { state, start, pause, resume, stop, skip } = useFocus();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useLayer(open, onClose, {
    boundary: panelRef,
    anchor: referenceRef,
    kind: "popover",
    closeOnEscape: true,
    closeOnOutside: true,
    closeOnResize: true,
    closeOnScroll: true,
    initialFocus: false,
    trapFocus: false,
  });

  const getFocusable = useCallback(() => {
    if (!panelRef.current) return [];
    return Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-disabled") !== "true" && !el.closest?.("[inert]")
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    const elements = getFocusable();
    elements[0]?.focus({ preventScroll: true });

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || !panelRef.current) return;
      const all = getFocusable();
      if (all.length === 0) {
        e.preventDefault();
        return;
      }
      const first = all[0];
      const last = all[all.length - 1];
      const active = document.activeElement as HTMLElement;
      if (e.shiftKey) {
        if (active === first || !panelRef.current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !panelRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, getFocusable]);

  const progress = state.total > 0 ? ((state.total - state.remaining) / state.total) * 100 : 0;

  const phaseLabels: Record<string, string> = {
    focus: i18n("focus"),
    shortBreak: i18n("shortBreak"),
    longBreak: i18n("longBreak"),
    idle: i18n("ready"),
  };

  const setRefs = (el: HTMLDivElement | null) => {
    panelRef.current = el;
  };

  return (
    <FloatingPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={setRefs}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.75 }}
            style={{ transformOrigin: "bottom center" }}
            className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] left-1/2 z-[90] w-80 max-w-[calc(100vw-1rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--bg-surface)]/92 dark:bg-[#090d16]/92 p-4 text-[var(--text-primary)] shadow-[0_24px_50px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-2xl pointer-events-auto outline-none"
            role="dialog"
            aria-modal="false"
            aria-label={i18n("focus")}
          >
            {/* Subtle ambient focus aura */}
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 rounded-full bg-gradient-to-br from-rose-500/20 via-amber-500/15 to-transparent blur-2xl opacity-60"
              aria-hidden="true"
            />

            <div className="relative mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {phaseLabels[state.phase]}
                </p>
                <p className="text-3xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
                  {state.format(state.remaining)}
                </p>
              </div>
              <div className="flex gap-1.5">
                {state.phase !== "idle" && (
                  <button
                    type="button"
                    onClick={() => (state.paused ? resume() : pause())}
                    className="rounded-xl border border-[var(--panel-border)] bg-white/[0.04] p-2 text-[var(--text-primary)] transition-all hover:bg-white/[0.08] active:scale-95 cursor-pointer"
                    aria-label={state.paused ? i18n("resume") : i18n("pause")}
                  >
                    <Icon name={state.paused ? "play" : "pause"} className="h-4 w-4" />
                  </button>
                )}
                {state.phase !== "idle" && (
                  <button
                    type="button"
                    onClick={stop}
                    className="rounded-xl border border-[var(--panel-border)] bg-white/[0.04] p-2 text-[var(--danger)] transition-all hover:bg-[var(--danger)]/15 active:scale-95 cursor-pointer"
                    aria-label={i18n("stop")}
                  >
                    <Icon name="square" className="h-4 w-4" />
                  </button>
                )}
                {state.phase !== "idle" && (
                  <button
                    type="button"
                    onClick={skip}
                    className="rounded-xl border border-[var(--panel-border)] bg-white/[0.04] p-2 text-[var(--text-primary)] transition-all hover:bg-white/[0.08] active:scale-95 cursor-pointer"
                    aria-label={i18n("skip")}
                  >
                    <Icon name="skipForward" className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {state.phase !== "idle" && (
              <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-amber-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {i18n("presets")}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    start(p.id);
                    onClose();
                  }}
                  className="flex flex-col items-center gap-1 rounded-xl border border-[var(--panel-border)] bg-white/[0.03] p-2 text-center text-xs transition-all hover:border-[var(--accent-primary)]/40 hover:bg-white/[0.08] active:scale-95 cursor-pointer"
                >
                  <Icon name={p.icon} className={`h-4 w-4 ${p.color}`} />
                  <span className="font-semibold text-[11px] text-[var(--text-primary)]">{i18n(p.id)}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{p.minutes} min</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FloatingPortal>
  );
}
