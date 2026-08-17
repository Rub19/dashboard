"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, SkipForward, Maximize2, Minimize2, Brain, Clock, Coffee } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { useFocus } from "@/components/FocusProvider";
import { useSettings } from "@/components/SettingsProvider";
import { useZenMode } from "@/lib/hooks/useZenMode";
import FocusTimerRing from "@/components/FocusTimerRing";

const PRESETS = [
  { id: "pomodoro", label: "Pomodoro (25m)" },
  { id: "deep-work", label: "Deep Work (50m)" },
  { id: "sprint", label: "Sprint (15m)" },
  { id: "custom", label: "Personnalisé" },
] as const;

type PresetId = (typeof PRESETS)[number]["id"];

function formatTotalFocus(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}min`;
  return `${minutes} min`;
}

export default function FocusPage() {
  const i18n = useI18n();
  const { success } = useToast();
  const { state, start, pause, resume, stop, skipBreak, format } = useFocus();
  const { settings, update } = useSettings();
  const { zenMode, toggle } = useZenMode();
  const prevPhase = useRef(state.phase);

  useEffect(() => {
    if (prevPhase.current === "focus" && (state.phase === "shortBreak" || state.phase === "longBreak")) {
      success(i18n("focusDone"));
    }
    prevPhase.current = state.phase;
  }, [state.phase, success, i18n]);

  const activePreset = (state.activePreset || settings.focusPreset || "pomodoro") as PresetId;

  const progress = state.total > 0 ? (state.total - state.remaining) / state.total : 0;

  function select(preset: PresetId) {
    start(preset);
    if (PRESETS.some((p) => p.id === preset)) {
      update({ focusPreset: preset });
    }
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
    toggle();
  }

  const isBreak = state.phase === "shortBreak" || state.phase === "longBreak";
  const isIdle = state.phase === "idle";

  const cycleLabel = isBreak
    ? i18n(state.phase)
    : i18n("focusCycle").replace("{{cycle}}", String(state.cycle)).replace("{{total}}", "4");

  return (
    <div className="w-full space-y-5 px-4 pb-10 pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>{i18n("focusTitle")}</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">{i18n("focusDescription")}</p>
        </div>
        <button
          type="button"
          onClick={handleZen}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
            zenMode
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"
          }`}
          title={zenMode ? i18n("disableZen") : i18n("enableZen")}
        >
          {zenMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          {zenMode ? i18n("disableZen") : i18n("enableZen")}
        </button>
      </div>

      <div className="inline-flex w-full justify-center p-1 bg-white/[0.03] border border-white/[0.08] rounded-xl backdrop-blur-md">
        {PRESETS.map((preset) => {
          const active = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => select(preset.id)}
              className="relative z-10 px-3.5 py-2 text-xs font-medium transition-colors text-left"
            >
              {active && (
                <motion.div
                  layoutId="activeFocusPreset"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: "var(--accent-muted, rgba(168, 85, 247, 0.12))",
                    border: "1px solid var(--accent-border, rgba(168, 85, 247, 0.3))",
                    boxShadow: "0 0 12px var(--accent-glow, rgba(168, 85, 247, 0.15))",
                  }}
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <span
                className="relative z-10"
                style={{ color: active ? "#ffffff" : "#a1a1aa" }}
              >
                {i18n(preset.label)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-zinc-950/70 border border-white/[0.08] p-5 shadow-xl shadow-black/50 backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent rounded-2xl" />
        <FocusTimerRing
          progress={progress}
          remaining={format(state.remaining)}
          label={cycleLabel}
          size={288}
        />

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label={state.paused || isIdle ? i18n("play") : i18n("pause")}
            onClick={togglePlay}
            className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: "var(--accent-color, #10b981)",
              color: "#09090b",
              boxShadow: "0 0 24px var(--accent-glow, rgba(16, 185, 129, 0.35))",
            }}
          >
            {state.paused || isIdle ? (
              <Play className="h-6 w-6 fill-current ml-0.5" />
            ) : (
              <Pause className="h-6 w-6 fill-current" />
            )}
          </button>

          <button
            type="button"
            aria-label={i18n("stop")}
            onClick={stop}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 transition-all hover:bg-white/[0.08] hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            type="button"
            aria-label={i18n("skipBreak")}
            onClick={skipBreak}
            disabled={!isBreak}
            className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all ${
              isBreak
                ? "border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"
                : "border-white/[0.06] bg-white/[0.02] text-zinc-600 cursor-not-allowed"
            }`}
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 w-full">
        <div className="rounded-2xl bg-zinc-950/70 border border-white/[0.08] p-4 flex flex-col items-center text-center transition-all hover:border-white/[0.16]">
          <Brain className="h-5 w-5 mb-2" style={{ color: "var(--accent-color, #10b981)" }} />
          <p className="text-2xl font-bold font-mono text-white">{state.completedPomodoros}</p>
          <p className="text-xs text-zinc-400 mt-1">{i18n("pomodoros")}</p>
        </div>

        <div className="rounded-2xl bg-zinc-950/70 border border-white/[0.08] p-4 flex flex-col items-center text-center transition-all hover:border-white/[0.16]">
          <Clock className="h-5 w-5 text-amber-400 mb-2" />
          <p className="text-2xl font-bold font-mono text-white">{formatTotalFocus(state.totalFocusSeconds)}</p>
          <p className="text-xs text-zinc-400 mt-1">{i18n("totalFocus")}</p>
        </div>

        <div className="rounded-2xl bg-zinc-950/70 border border-white/[0.08] p-4 flex flex-col items-center text-center transition-all hover:border-white/[0.16]">
          <Coffee className="h-5 w-5 text-cyan-400 mb-2" />
          <p className="text-2xl font-bold font-mono text-white">{state.completedBreaks}</p>
          <p className="text-xs text-zinc-400 mt-1">{i18n("breaks")}</p>
        </div>
      </div>

      {zenMode && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl">
          <div className="absolute inset-0 bg-gradient-radial from-emerald-500/10 via-transparent to-transparent" />
          <FocusTimerRing
            progress={progress}
            remaining={format(state.remaining)}
            label={cycleLabel}
            size={320}
          />
          <button
            type="button"
            onClick={handleZen}
            className="absolute bottom-8 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white"
          >
            {i18n("disableZen")}
          </button>
        </div>
      )}
    </div>
  );
}
