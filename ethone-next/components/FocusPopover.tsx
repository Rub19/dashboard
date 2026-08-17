"use client";

import { useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFloating, offset, flip, shift, autoUpdate, FloatingPortal } from "@floating-ui/react";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import { useFocus, type FocusPhase } from "./FocusProvider";

const PRESETS: { id: string; phase: FocusPhase; minutes: number; icon: string; color: string }[] = [
  { id: "pomodoro", phase: "focus", minutes: 25, icon: "timer", color: "text-rose-400" },
  { id: "deep", phase: "focus", minutes: 50, icon: "timer", color: "text-violet-400" },
  { id: "sprint", phase: "focus", minutes: 10, icon: "timer", color: "text-orange-400" },
  { id: "quick", phase: "focus", minutes: 15, icon: "timer", color: "text-sky-400" },
  { id: "shortBreak", phase: "shortBreak", minutes: 5, icon: "coffee", color: "text-emerald-400" },
  { id: "longBreak", phase: "longBreak", minutes: 15, icon: "armchair", color: "text-amber-400" },
];

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled):not([aria-disabled="true"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export default function FocusPopover({ open, onClose, referenceRef }: { open: boolean; onClose: () => void; referenceRef: HTMLElement | null }) {
  const i18n = useI18n();
  const { state, start, pause, resume, stop, skip } = useFocus();
  const panelRef = useRef<HTMLDivElement | null>(null);

  const { refs, floatingStyles, isPositioned, update: recalculate } = useFloating({
    open,
    onOpenChange: onClose,
    placement: "bottom",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
  });

  useLayoutEffect(() => {
    if (referenceRef) {
      refs.setReference(referenceRef);
      recalculate?.();
    }
  }, [referenceRef, refs, recalculate]);

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
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
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

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        referenceRef &&
        !referenceRef.contains(target)
      ) {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onClose, referenceRef, getFocusable]);

  const progress = state.total > 0 ? ((state.total - state.remaining) / state.total) * 100 : 0;

  const phaseLabels: Record<string, string> = {
    focus: i18n("focus"),
    shortBreak: i18n("shortBreak"),
    longBreak: i18n("longBreak"),
    idle: i18n("ready"),
  };

  const setRefs = (el: HTMLDivElement | null) => {
    panelRef.current = el;
    refs.setFloating(el as unknown as HTMLElement);
    if (el) {
      recalculate?.();
    }
  };

  return (
    <FloatingPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={setRefs}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" as const }}
            style={{ ...floatingStyles, visibility: isPositioned ? "visible" : "hidden" }}
            className="z-[90] w-72 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-2xl outline-none backdrop-blur-[var(--panel-blur)]"
            role="dialog"
            aria-modal="true"
            aria-label={i18n("focus")}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{phaseLabels[state.phase]}</p>
                <p className="text-2xl font-bold tabular-nums">{state.format(state.remaining)}</p>
              </div>
              <div className="flex gap-1">
                {state.phase !== "idle" && (
                  <button
                    type="button"
                    onClick={() => (state.paused ? resume() : pause())}
                    className="rounded-lg bg-[var(--panel-bg)] p-2 transition-colors hover:bg-[var(--accent)]/10"
                    aria-label={state.paused ? i18n("resume") : i18n("pause")}
                  >
                    <Icon name={state.paused ? "play" : "pause"} className="h-4 w-4" />
                  </button>
                )}
                {state.phase !== "idle" && (
                  <button
                    type="button"
                    onClick={stop}
                    className="rounded-lg bg-[var(--panel-bg)] p-2 transition-colors hover:bg-red-500/10"
                    aria-label={i18n("stop")}
                  >
                    <Icon name="square" className="h-4 w-4" />
                  </button>
                )}
                {state.phase !== "idle" && (
                  <button
                    type="button"
                    onClick={skip}
                    className="rounded-lg bg-[var(--panel-bg)] p-2 transition-colors hover:bg-[var(--accent)]/10"
                    aria-label={i18n("skip")}
                  >
                    <Icon name="skipForward" className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {state.phase !== "idle" && (
              <div className="mb-4 h-2 w-full overflow-hidden rounded-xl bg-[var(--panel-bg)]">
                <div className="h-full rounded-xl bg-[var(--accent)] transition-colors duration-150" style={{ width: `${progress}%` }} />
              </div>
            )}

            <p className="mb-2 text-xs font-medium text-[var(--muted)]">{i18n("presets")}</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    start(p.id);
                    onClose();
                  }}
                  className="flex flex-col items-center gap-1 rounded-lg bg-[var(--panel-bg)] p-2 text-center text-xs transition-colors hover:bg-[var(--accent)]/10"
                >
                  <Icon name={p.icon} className={`h-4 w-4 ${p.color}`} />
                  <span className="font-medium">{i18n(p.id)}</span>
                  <span className="text-[10px] text-[var(--muted)]">{p.minutes} min</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FloatingPortal>
  );
}
