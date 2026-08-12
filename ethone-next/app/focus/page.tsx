"use client";

import { useEffect } from "react";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { useFocus } from "@/components/FocusProvider";
import { useSettings } from "@/components/SettingsProvider";
import { useZenMode } from "@/lib/hooks/useZenMode";

const FOCUS_PRESETS: { id: string; color: string }[] = [
  { id: "pomodoro", color: "text-rose-400" },
  { id: "deep", color: "text-violet-400" },
  { id: "sprint", color: "text-orange-400" },
];

const BREAK_PRESETS: { id: string; color: string }[] = [
  { id: "shortBreak", color: "text-sky-400" },
  { id: "longBreak", color: "text-emerald-400" },
];

export default function FocusPage() {
  const i18n = useI18n();
  const { success } = useToast();
  const { state, start, pause, resume, stop, format } = useFocus();
  const { settings, update } = useSettings();
  const { zenMode, toggle } = useZenMode();

  useEffect(() => {
    if (state.remaining <= 0 && !state.paused && state.phase !== "idle") {
      success(i18n("focusDone"));
    }
  }, [state.remaining, state.paused, state.phase, success, i18n]);

  const activePreset = state.activePreset || settings.focusPreset || "pomodoro";

  const currentMode =
    state.phase === "focus"
      ? activePreset
      : state.phase === "shortBreak"
      ? "shortBreak"
      : state.phase === "longBreak"
      ? "longBreak"
      : activePreset;

  const modeColor =
    FOCUS_PRESETS.find((p) => p.id === currentMode)?.color ||
    BREAK_PRESETS.find((p) => p.id === currentMode)?.color ||
    "text-[var(--accent)]";

  const progress = state.total > 0 ? 100 - (state.remaining / state.total) * 100 : 0;

  function select(preset: string) {
    start(preset);
    if (FOCUS_PRESETS.some((p) => p.id === preset)) {
      update({ focusPreset: preset });
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex items-center justify-between">
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

      <Card3D>
        <p className="mb-2 text-center text-xs text-[var(--muted)]">{i18n("focusPresets")}</p>
        <div className="flex justify-center gap-2">
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
              {i18n(p.id)}
            </button>
          ))}
        </div>

        <div className="relative my-8 flex items-center justify-center">
          <svg className="h-56 w-56 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${progress * 2.83} 283`}
              className={`transition-all duration-1000 ${modeColor}`}
            />
          </svg>
          <div className="absolute text-center">
            <p className={`text-5xl font-bold tabular-nums ${modeColor}`}>
              {format(state.remaining)}
            </p>
            <p className="text-sm text-[var(--muted)]">{i18n(currentMode)}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label={state.paused ? i18n("play") : i18n("pause")}
            onClick={() => (state.paused ? resume() : pause())}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-opacity hover:opacity-90"
          >
            {state.paused ? <Icon name="play" className="h-5 w-5" /> : <Icon name="pause" className="h-5 w-5" />}
          </button>
          <button
            type="button"
            aria-label={i18n("stop")}
            onClick={stop}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <Icon name="square" className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-2 mt-6 text-center text-xs text-[var(--muted)]">{i18n("breaks")}</p>
        <div className="flex justify-center gap-2">
          {BREAK_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => start(p.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                currentMode === p.id
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-raised)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {i18n(p.id)}
            </button>
          ))}
        </div>
      </Card3D>

      <Card3D>
        <p className="text-center text-sm text-[var(--muted)]">{i18n("zenModeDesc")}</p>
      </Card3D>

      <div className="grid grid-cols-3 gap-3">
        <Card3D>
          <div className="flex flex-col items-center gap-1 text-center">
            <Icon name="brain" className="h-5 w-5 text-[var(--accent)]" />
            <p className="text-lg font-bold">0</p>
            <p className="text-[10px] text-[var(--muted)]">{i18n("pomodoros")}</p>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex flex-col items-center gap-1 text-center">
            <Icon name="timer" className="h-5 w-5 text-amber-400" />
            <p className="text-lg font-bold">{i18n("zeroMin")}</p>
            <p className="text-[10px] text-[var(--muted)]">{i18n("totalFocus")}</p>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex flex-col items-center gap-1 text-center">
            <Icon name="coffee" className="h-5 w-5 text-emerald-400" />
            <p className="text-lg font-bold">0</p>
            <p className="text-[10px] text-[var(--muted)]">{i18n("breaks")}</p>
          </div>
        </Card3D>
      </div>
    </div>
  );
}
