"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface FocusTimer2026Props {
  progress: number;
  remaining: string;
  phase: "idle" | "focus" | "shortBreak" | "longBreak";
  cycle: number;
  paused: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  onSkipBreak: () => void;
  onAdjustTime: (deltaSeconds: number) => void;
  size?: number;
  activeTaskTitle?: string;
}

export default function FocusTimer2026({
  progress,
  remaining,
  phase,
  cycle,
  paused,
  onTogglePlay,
  onStop,
  onSkipBreak,
  onAdjustTime,
  size = 320,
  activeTaskTitle,
}: FocusTimer2026Props) {
  const isBreak = phase === "shortBreak" || phase === "longBreak";
  const isIdle = phase === "idle";
  const isRunning = !paused && !isIdle;

  const stroke = 8;
  const radius = 54;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - Math.min(Math.max(progress, 0), 1) * circumference;
  const gradientId = useId();

  const phaseLabel = isBreak
    ? phase === "shortBreak"
      ? "Pause Courte"
      : "Pause Longue"
    : `Cycle ${cycle} / 4`;

  return (
    <div className="relative flex flex-col items-center justify-center p-4 select-none">
      {/* Active Task Pill Indicator */}
      {activeTaskTitle && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--surface-raised)]/80 px-3.5 py-1 text-xs font-semibold text-[var(--text-primary)] shadow-sm backdrop-blur-md"
        >
          <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
          <span className="text-[var(--text-muted)]">Focus sur :</span>
          <span className="font-bold text-[var(--accent-primary)] truncate max-w-[200px]">
            {activeTaskTitle}
          </span>
        </motion.div>
      )}

      {/* Main Circular Timer */}
      <div
        className="relative mx-auto flex items-center justify-center w-[min(72vw,320px)] h-[min(72vw,320px)] max-w-[320px] max-h-[320px]"
      >
        <svg
          className="-rotate-90 w-full h-full"
          viewBox={`0 0 ${radius * 2} ${radius * 2}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                stopColor={isBreak ? "var(--info, #38bdf8)" : "var(--accent-primary)"}
              />
              <stop
                offset="100%"
                stopColor={isBreak ? "var(--accent-primary)" : "var(--accent-soft, #a855f7)"}
              />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />

          {/* Animated Glowing Progress Ring */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              filter: isRunning
                ? `drop-shadow(0 0 16px ${
                    isBreak ? "rgba(56, 189, 248, 0.4)" : "var(--glow-color)"
                  })`
                : "none",
              transition: "stroke-dashoffset 0.8s ease",
            }}
          />
        </svg>

        {/* Center Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p
            className={cn(
              "text-5xl sm:text-6xl font-bold font-mono tracking-tight text-[var(--text-primary)] transition-all",
              paused && "opacity-75 animate-pulse"
            )}
          >
            {remaining}
          </p>

          <span
            className={cn(
              "mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-widest",
              isBreak
                ? "bg-[var(--info)]/15 text-[var(--info)] border border-[var(--info)]/20"
                : "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20"
            )}
          >
            {isBreak ? (
              <Icon name="coffee" className="h-3 w-3" />
            ) : (
              <Icon name="timer" className="h-3 w-3" />
            )}
            {phaseLabel}
          </span>
        </div>
      </div>

      {/* Primary & Quick Time Adjustment Controls */}
      <div className="mt-6 flex items-center justify-center gap-3">
        {/* -5 min adjustment */}
        <button
          type="button"
          onClick={() => onAdjustTime(-300)}
          className="flex h-9 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-2.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all active:scale-95"
          title="Retirer 5 minutes"
        >
          -5 min
        </button>

        {/* Main Play / Pause Button */}
        <button
          type="button"
          onClick={onTogglePlay}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-bold shadow-xl shadow-[var(--accent-primary)]/25 transition-all hover:scale-105 active:scale-95"
          title={paused || isIdle ? "Démarrer" : "Mettre en pause"}
        >
          {paused || isIdle ? (
            <Icon name="play" className="h-6 w-6 ml-0.5 fill-current" />
          ) : (
            <Icon name="pause" className="h-6 w-6 fill-current" />
          )}
        </button>

        {/* Reset / Stop Button */}
        <button
          type="button"
          onClick={onStop}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)]/40 transition-all active:scale-95"
          title="Réinitialiser le cycle"
        >
          <Icon name="rotate-ccw" className="h-4 w-4" />
        </button>

        {/* Skip Break Button */}
        <button
          type="button"
          onClick={onSkipBreak}
          disabled={!isBreak}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl border transition-all active:scale-95",
            isBreak
              ? "border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)]"
              : "border-transparent text-[var(--text-muted)]/30 opacity-40 cursor-not-allowed"
          )}
          title="Passer la pause"
        >
          <Icon name="skip-forward" className="h-4 w-4" />
        </button>

        {/* +5 min adjustment */}
        <button
          type="button"
          onClick={() => onAdjustTime(300)}
          className="flex h-9 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-2.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all active:scale-95"
          title="Ajouter 5 minutes"
        >
          +5 min
        </button>
      </div>
    </div>
  );
}
