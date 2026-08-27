"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { useFocus } from "@/components/FocusProvider";
import { triggerPomodoroCompletedNotification } from "@/lib/local-notifications";
import { useSettings } from "@/components/SettingsProvider";
import { useZenMode } from "@/lib/hooks/useZenMode";
import { Icon } from "@/lib/icons";
import FocusTimer2026 from "@/components/focus/FocusTimer2026";
import FocusTaskQueue from "@/components/focus/FocusTaskQueue";
import FocusSoundscapeMixer from "@/components/focus/FocusSoundscapeMixer";
import FocusScenes from "@/components/focus/FocusScenes";
import FocusStatsAndGoals from "@/components/focus/FocusStatsAndGoals";
import { cn } from "@/lib/utils";

const FOCUS_MODES = [
  { id: "pomodoro", label: "Pomodoro", duration: "25m / 5m" },
  { id: "deep-work", label: "Deep Work", duration: "50m / 10m" },
  { id: "sprint", label: "Sprint", duration: "15m / 3m" },
  { id: "flow", label: "Flow", duration: "90m / 20m" },
  { id: "study", label: "Study", duration: "45m / 10m" },
  { id: "quick", label: "Quick Focus", duration: "10m" },
] as const;

export default function FocusPage() {
  const i18n = useI18n();
  const { success } = useToast();
  const { state, start, pause, resume, stop, skipBreak, adjustTime, format } = useFocus();
  const { settings, update } = useSettings();
  const { zenMode, toggle: toggleZen } = useZenMode();
  const [activeTask, setActiveTask] = useState<{ id: string; title: string } | null>(null);
  const prevPhase = useRef(state.phase);

  useEffect(() => {
    if (
      prevPhase.current === "focus" &&
      (state.phase === "shortBreak" || state.phase === "longBreak")
    ) {
      success("Cycle terminé ! Prenez une pause bien méritée.");
      void triggerPomodoroCompletedNotification(state.activePreset || "Focus");
    }
    prevPhase.current = state.phase;
  }, [state.phase, state.activePreset, success]);

  const activePreset = state.activePreset || settings.focusPreset || "pomodoro";
  const progress = state.total > 0 ? (state.total - state.remaining) / state.total : 0;

  function selectMode(presetId: string) {
    start(presetId);
    update({ focusPreset: presetId as never });
  }

  function togglePlay() {
    if (state.phase === "idle") {
      start(activePreset);
    } else if (state.paused) {
      resume();
    } else {
      pause();
    }
  }

  function handleZen() {
    if (!zenMode && typeof document !== "undefined" && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (zenMode && typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    toggleZen();
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-transparent">
      {/* Top Bar Header */}
      <header className="flex items-center justify-between border-b border-[var(--panel-border)]/60 bg-[var(--panel-bg)]/40 px-6 py-3.5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold">
            <Icon name="timer" className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[var(--text-primary)]">
              ETHONE Focus OS
            </h1>
            <p className="text-[10px] text-[var(--text-muted)]">
              Environnement de concentration haute fidélité
            </p>
          </div>
        </div>

        {/* Zen Mode Button */}
        <button
          type="button"
          onClick={handleZen}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all",
            zenMode
              ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
              : "border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
        >
          <Icon name={zenMode ? "corners-in" : "corners-out"} className="h-3.5 w-3.5" />
          <span>{zenMode ? "Quitter Zen" : "Mode Zen"}</span>
        </button>
      </header>

      {/* Main Responsive Grid Layout */}
      <div className="flex-1 overflow-y-auto os-scroll p-4 sm:p-6">
        <div className="max-w-6xl mx-auto w-full space-y-6">
          {/* Focus Mode Selector Bar */}
          <div className="flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 backdrop-blur-md">
            {FOCUS_MODES.map((mode) => {
              const isActive = activePreset === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => selectMode(mode.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all",
                    isActive
                      ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-semibold shadow-md"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]/40"
                  )}
                >
                  <span>{mode.label}</span>
                  <span className="text-[10px] opacity-75">({mode.duration})</span>
                </button>
              );
            })}
          </div>

          {/* Brain Smart Recommendation Pill */}
          <div className="flex items-center gap-2.5 rounded-2xl border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 px-4 py-2.5 text-xs text-[var(--text-primary)] shadow-sm">
            <Icon name="brain" className="h-4 w-4 text-[var(--accent-primary)] shrink-0" />
            <span className="text-[var(--text-muted)]">Recommandation Brain :</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {activeTask
                ? `Lancez une session sur "${activeTask.title}" avec l'ambiance Pluie pour un focus optimal.`
                : "Associez une tâche à votre session pour maximiser votre flow."}
            </span>
          </div>

          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Center Timer */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center rounded-3xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-6 shadow-xl backdrop-blur-2xl">
              <FocusTimer2026
                progress={progress}
                remaining={format(state.remaining)}
                phase={state.phase}
                cycle={state.cycle}
                paused={state.paused}
                onTogglePlay={togglePlay}
                onStop={stop}
                onSkipBreak={skipBreak}
                onAdjustTime={adjustTime}
                activeTaskTitle={activeTask?.title}
              />
            </div>

            {/* Right Column: Task Queue & Stats & Mixer */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              {/* Task Queue */}
              <FocusTaskQueue
                activeTaskId={activeTask?.id || null}
                onSelectTask={(t) => setActiveTask(t)}
              />

              {/* Focus Scenes */}
              <FocusScenes />

              {/* Soundscape Mixer */}
              <FocusSoundscapeMixer />

              {/* Stats & Goals */}
              <FocusStatsAndGoals
                completedPomodoros={state.completedPomodoros}
                totalFocusSeconds={state.totalFocusSeconds}
                completedBreaks={state.completedBreaks}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Zen Overlay */}
      {zenMode && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex flex-col items-center justify-center bg-[var(--bg-main)]/95 backdrop-blur-3xl p-6">
          <FocusTimer2026
            progress={progress}
            remaining={format(state.remaining)}
            phase={state.phase}
            cycle={state.cycle}
            paused={state.paused}
            onTogglePlay={togglePlay}
            onStop={stop}
            onSkipBreak={skipBreak}
            onAdjustTime={adjustTime}
            size={360}
            activeTaskTitle={activeTask?.title}
          />

          <button
            type="button"
            onClick={handleZen}
            className="mt-8 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all"
          >
            Quitter le mode Zen (Échap)
          </button>
        </div>
      )}
    </div>
  );
}
