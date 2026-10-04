"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingPortal } from "@floating-ui/react";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import { useLayer } from "@/components/LayerProvider";
import { useFocus, type FocusPhase } from "./FocusProvider";
import { hapticLightImpact } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const PRESETS: { id: string; phase: FocusPhase; minutes: number; icon: string; color: string; bg: string }[] = [
  { id: "pomodoro", phase: "focus", minutes: 25, icon: "timer", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
  { id: "deep", phase: "focus", minutes: 50, icon: "timer", color: "text-[var(--accent-primary)]", bg: "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/20" },
  { id: "sprint", phase: "focus", minutes: 10, icon: "timer", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  { id: "quick", phase: "focus", minutes: 15, icon: "timer", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
  { id: "shortBreak", phase: "shortBreak", minutes: 5, icon: "coffee", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { id: "longBreak", phase: "longBreak", minutes: 15, icon: "armchair", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
];

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled):not([aria-disabled="true"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export default function FocusPopover({
  open,
  onClose,
  referenceRef,
}: {
  open: boolean;
  onClose: () => void;
  referenceRef: HTMLElement | null;
}) {
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

  const isRunning = state.phase !== "idle" && !state.paused;

  return (
    <FloatingPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={setRefs}
            initial={{ opacity: 0, y: 18, x: "-50%", scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: 12, x: "-50%", scale: 0.96 }}
            transition={{ type: "spring", stiffness: 440, damping: 28, mass: 0.75 }}
            style={{ transformOrigin: "bottom center" }}
            className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] left-1/2 z-[var(--z-popover)] w-88 max-w-[calc(100vw-1.5rem)] overflow-hidden pointer-events-auto outline-none"
            role="dialog"
            aria-modal="false"
            aria-label={i18n("focus")}
          >
            <div className="relative rounded-3xl border border-white/[0.09] bg-[#0c1017]/92 dark:bg-[#070b13]/96 p-5 text-[var(--text-primary)] shadow-[0_30px_70px_-10px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-3xl overflow-hidden">
              {/* Dynamic breathing focus aura */}
              <motion.div
                animate={{
                  scale: isRunning ? [1, 1.15, 1] : 1,
                  opacity: isRunning ? [0.6, 0.85, 0.6] : 0.45,
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 rounded-full bg-gradient-to-br from-rose-500/25 via-[var(--accent-primary)]/20 to-amber-500/15 blur-3xl"
                aria-hidden="true"
              />

              {/* Top Header */}
              <div className="relative mb-3.5 flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      state.phase === "focus"
                        ? "border-rose-500/30 bg-rose-500/15 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                        : state.phase === "shortBreak" || state.phase === "longBreak"
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                        : "border-white/[0.08] bg-white/[0.04] text-[var(--text-muted)]"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isRunning ? "animate-pulse" : "",
                        state.phase === "focus"
                          ? "bg-rose-400"
                          : state.phase === "shortBreak" || state.phase === "longBreak"
                          ? "bg-emerald-400"
                          : "bg-zinc-400"
                      )}
                    />
                    <span>{phaseLabels[state.phase]}</span>
                  </div>
                </div>

                <motion.button
                  type="button"
                  onClick={onClose}
                  whileHover={{ scale: 1.12, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={i18n("close")}
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <Icon pack="phosphor" name="close" className="h-3.5 w-3.5" />
                </motion.button>
              </div>

              {/* Timer Hero & Controls */}
              <div className="relative mb-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-4xl font-black tracking-tight text-white tabular-nums drop-shadow-md">
                    {state.format(state.remaining)}
                  </p>
                  {state.phase !== "idle" && (
                    <p className="mt-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                      {state.paused ? "En pause" : "Session active"}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {state.phase !== "idle" && (
                    <>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => {
                          hapticLightImpact();
                          if (state.paused) resume();
                          else pause();
                        }}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl border transition-all cursor-pointer",
                          state.paused
                            ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shadow-[0_0_12px_var(--glow-color)]"
                            : "border-white/[0.08] bg-white/[0.05] text-white hover:bg-white/[0.1]"
                        )}
                        aria-label={state.paused ? i18n("resume") : i18n("pause")}
                      >
                        <Icon name={state.paused ? "play" : "pause"} className="h-4 w-4" />
                      </motion.button>

                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => {
                          hapticLightImpact();
                          stop();
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] text-[var(--danger)] transition-all hover:border-red-500/40 hover:bg-red-500/15 cursor-pointer"
                        aria-label={i18n("stop")}
                      >
                        <Icon name="square" className="h-4 w-4" />
                      </motion.button>

                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => {
                          hapticLightImpact();
                          skip();
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] text-[var(--text-muted)] transition-all hover:bg-white/[0.1] hover:text-white cursor-pointer"
                        aria-label={i18n("skip")}
                      >
                        <Icon name="skipForward" className="h-4 w-4" />
                      </motion.button>
                    </>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {state.phase !== "idle" && (
                <div className="relative mb-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-black/40 border border-white/[0.08]">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 via-[var(--accent-primary)] to-amber-400 shadow-[0_0_12px_var(--glow-color)]"
                      style={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[9px] font-mono text-[var(--text-muted)] tabular-nums px-0.5">
                    <span>0%</span>
                    <span>{Math.round(progress)}%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}

              {/* Presets Header */}
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-0.5">
                {i18n("presets")}
              </p>

              {/* Presets Bento Grid */}
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((p) => (
                  <motion.button
                    key={p.id}
                    type="button"
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 450, damping: 25 }}
                    onClick={() => {
                      hapticLightImpact();
                      start(p.id);
                      onClose();
                    }}
                    className="group relative flex flex-col items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-center transition-all hover:border-white/[0.16] hover:bg-white/[0.07] cursor-pointer"
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-xl border transition-transform group-hover:scale-110",
                        p.bg
                      )}
                    >
                      <Icon name={p.icon} className={`h-3.5 w-3.5 ${p.color}`} />
                    </div>
                    <span className="w-full truncate text-[11px] font-bold text-[var(--text-primary)]">
                      {i18n(p.id)}
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-[var(--text-muted)] opacity-85">
                      {p.minutes} min
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FloatingPortal>
  );
}
