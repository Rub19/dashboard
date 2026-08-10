"use client";

import { useEffect, useState } from "react";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";

const MODES = {
  pomodoro: { label: "Pomodoro", minutes: 25, color: "text-rose-400" },
  shortBreak: { label: "Pause courte", minutes: 5, color: "text-sky-400" },
  longBreak: { label: "Pause longue", minutes: 15, color: "text-emerald-400" },
};

type Mode = keyof typeof MODES;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function FocusPage() {
  const i18n = useI18n();
  const { success } = useToast();
  const [mode, setMode] = useState<Mode>("pomodoro");
  const [time, setTime] = useState(MODES.pomodoro.minutes * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setTime(MODES[mode].minutes * 60);
    setRunning(false);
  }, [mode]);

  useEffect(() => {
    if (!running) return;
    if (time <= 0) {
      setRunning(false);
      return;
    }
    const id = setInterval(() => setTime((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [running, time]);

  function switchMode(m: Mode) {
    setMode(m);
    success(i18n("switched"));
  }

  function toggleTimer() {
    setRunning((r) => {
      const next = !r;
      success(i18n(next ? "started" : "stopped"));
      return next;
    });
  }

  function resetTimer() {
    setRunning(false);
    setTime(MODES[mode].minutes * 60);
    success(i18n("reseted"));
  }

  const progress = 100 - (time / (MODES[mode].minutes * 60)) * 100;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold">{i18n("focusTitle")}</h1>

      <Card3D>
        <div className="flex justify-center gap-2">
          {(Object.keys(MODES) as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === m
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-raised)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {i18n(m === "pomodoro" ? "pomodoros" : m)}
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
              className={`transition-all duration-1000 ${MODES[mode].color}`}
            />
          </svg>
          <div className="absolute text-center">
            <p className={`text-5xl font-bold tabular-nums ${MODES[mode].color}`}>
              {formatTime(time)}
            </p>
            <p className="text-sm text-[var(--muted)]">{i18n(mode === "pomodoro" ? "pomodoros" : mode)}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={toggleTimer}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-opacity hover:opacity-90"
          >
            {running ? <Icon name="pause" className="h-5 w-5" /> : <Icon name="play" className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={resetTimer}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <Icon name="rotate-ccw" className="h-5 w-5" />
          </button>
        </div>
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
