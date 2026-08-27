"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface FocusStatsAndGoalsProps {
  completedPomodoros: number;
  totalFocusSeconds: number;
  completedBreaks: number;
}

export default function FocusStatsAndGoals({
  completedPomodoros,
  totalFocusSeconds,
  completedBreaks,
}: FocusStatsAndGoalsProps) {
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(120); // 2 hours default
  const [streakDays] = useState(5);

  const totalMinutes = Math.floor(totalFocusSeconds / 60);
  const goalProgress = Math.min(100, Math.round((totalMinutes / dailyGoalMinutes) * 100));

  const formatHours = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-4 shadow-lg backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-[var(--panel-border)]/50 pb-2.5">
        <div className="flex items-center gap-2">
          <Icon name="chart-bar" className="h-4 w-4 text-[var(--accent-primary)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Objectif & Statistiques
          </span>
        </div>

        <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
          🔥 Série : {streakDays} jours
        </span>
      </div>

      {/* Daily Goal Bar */}
      <div className="space-y-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--text-primary)]">Objectif du jour</span>
          <span className="font-mono text-[var(--accent-primary)] font-bold">
            {formatHours(totalFocusSeconds)} / {Math.floor(dailyGoalMinutes / 60)}h00 ({goalProgress}%)
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-soft, #a855f7)] transition-all duration-500"
            style={{ width: `${goalProgress}%` }}
          />
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2.5 text-center">
          <span className="text-lg font-bold font-mono text-[var(--text-primary)]">
            {completedPomodoros}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">Cycles</span>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2.5 text-center">
          <span className="text-lg font-bold font-mono text-amber-400">
            {formatHours(totalFocusSeconds)}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">Temps total</span>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2.5 text-center">
          <span className="text-lg font-bold font-mono text-[var(--info)]">
            {completedBreaks}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">Pauses</span>
        </div>
      </div>
    </div>
  );
}
