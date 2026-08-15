"use client";

import { useEffect, useRef } from "react";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { useFocus } from "@/components/FocusProvider";
import { useSettings } from "@/components/SettingsProvider";
import { useZenMode } from "@/lib/hooks/useZenMode";

const FOCUS_PRESETS: { id: string; label: string; color: string }[] = [
  { id: "pomodoro", label: "pomodoro", color: "text-rose-400" },
  { id: "deep-work", label: "deep", color: "text-violet-400" },
  { id: "sprint", label: "sprint", color: "text-orange-400" },
  { id: "custom", label: "custom", color: "text-sky-400" },
];

const PHASE_COLORS: Record<string, string> = {
  focus: "text-[var(--accent)]",
  shortBreak: "text-sky-400",
  longBreak: "text-emerald-400",
  idle: "text-[var(--accent)]",
};

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

  const activePreset = state.activePreset || settings.focusPreset || "pomodoro";

  const currentMode =
    state.phase === "shortBreak"
      ? "shortBreak"
      : state.phase === "longBreak"
      ? "longBreak"
      : activePreset;

  const modeColor = FOCUS_PRESETS.find((p) => p.id === currentMode)?.color || PHASE_COLORS[state.phase];

  const progress = state.total > 0 ? ((state.total - state.remaining) / state.total) * 100 : 0;

  function select(preset: string) {
    start(preset);
    if (FOCUS_PRESETS.some((p) => p.id === preset)) {
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

  const isBreak = state.phase === "shortBreak" || state.phase === "longBreak";
  const isIdle = state.phase === "idle";

  return (
    <div className="mx-auto w-full max-w-sm sm:max-w-md lg:max-w-lg space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{i18n("focusTitle")}</h1>
        <button
          type="button"
          onClick={toggle}
          className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
            zenMode
              ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
              : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
          }`}
        >
          <Icon name={zenMode ? "shrink" : "expand"} className="h-3.5 w-3.5" />
          {zenMode ? i18n("disableZen") : i18n("enableZen")}
        </button>
      </div>

      <Card3D className="p-4" radius="1.5rem">
        <p className="mb-2 text-center text-xs text-[var(--muted)]">{i18n("focusPresets")}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {FOCUS_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => select(p.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                activePreset === p.id && state.phase === "focus"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-raised)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {i18n(p.label)}
            </button>
          ))}
        </div>

        <div className="relative my-6 flex items-center justify-center">
          <svg className="h-40 w-40 -rotate-90 sm:h-48 sm:w-48" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />
            {progress > 0 && (
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${progress * 2.83} 283`}
                className={`transition-[stroke-dasharray] duration-700 ${modeColor}`}
              />
            )}
          </svg>
          <div className="absolute text-center">
            <p className={`text-3xl font-bold tabular-nums sm:text-4xl ${modeColor}`}>
              {format(state.remaining)}
            </p>
            <p className="text-sm text-[var(--muted)]">
              {isBreak
                ? i18n(state.phase)
                : i18n("focusCycle")
                    .replace("{{cycle}}", String(state.cycle))
                    .replace("{{total}}", "4")}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label={state.paused || isIdle ? i18n("play") : i18n("pause")}
            onClick={togglePlay}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-opacity hover:opacity-90"
          >
            <Icon name={state.paused || isIdle ? "play" : "pause"} className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={i18n("stop")}
            onClick={stop}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <Icon name="square" className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={i18n("skipBreak")}
            onClick={skipBreak}
            disabled={!isBreak}
            className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${
              isBreak
                ? "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted)] hover:text-[var(--foreground)]"
                : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--border)]"
            }`}
          >
            <Icon name="skipForward" className="h-5 w-5" />
          </button>
        </div>
      </Card3D>

      <Card3D className="p-3" radius="1.5rem">
        <p className="text-center text-sm text-[var(--muted)]">{i18n("zenModeDesc")}</p>
      </Card3D>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card3D className="p-3" radius="1.5rem">
          <div className="flex flex-col items-center gap-1 text-center">
            <Icon name="brain" className="h-5 w-5 text-[var(--accent)]" />
            <p className="text-lg font-bold">{state.completedPomodoros}</p>
            <p className="text-[10px] text-[var(--muted)]">{i18n("pomodoros")}</p>
          </div>
        </Card3D>
        <Card3D className="p-3" radius="1.5rem">
          <div className="flex flex-col items-center gap-1 text-center">
            <Icon name="timer" className="h-5 w-5 text-amber-400" />
            <p className="text-base font-bold">{Math.floor(state.totalFocusSeconds / 60)} {i18n("focusMinutes")}</p>
            <p className="text-[10px] text-[var(--muted)]">{i18n("totalFocus")}</p>
          </div>
        </Card3D>
        <Card3D className="p-3" radius="1.5rem">
          <div className="flex flex-col items-center gap-1 text-center">
            <Icon name="coffee" className="h-5 w-5 text-emerald-400" />
            <p className="text-lg font-bold">{state.completedBreaks}</p>
            <p className="text-[10px] text-[var(--muted)]">{i18n("breaks")}</p>
          </div>
        </Card3D>
      </div>
    </div>
  );
}
