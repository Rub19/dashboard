"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/lib/icons";
import { useFocus } from "@/components/FocusProvider";
import {
  calculateFocusStreak,
  DAILY_GOAL_PRESETS,
  formatFocusDuration,
  formatGoalDuration,
  getStoredDailyGoal,
  getTodayStoredFocusStats,
  saveStoredDailyGoal,
  type FocusHistoryEntry,
} from "@/lib/focus-stats";
import { cn } from "@/lib/utils";

interface FocusStatsAndGoalsProps {
  completedPomodoros?: number;
  totalFocusSeconds?: number;
  completedBreaks?: number;
}

export default function FocusStatsAndGoals({
  completedBreaks = 0,
}: FocusStatsAndGoalsProps) {
  const { state } = useFocus();
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(120);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [history, setHistory] = useState<FocusHistoryEntry[]>([]);
  const [todayStats, setTodayStats] = useState({ totalFocusSeconds: 0, completedPomodoros: 0 });

  // Load history and daily goal on mount and upon updates
  const refreshStats = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("ethone-focus-history") || "[]";
      const parsed = JSON.parse(raw);
      setHistory(Array.isArray(parsed) ? parsed : []);
    } catch {
      setHistory([]);
    }
    setTodayStats(getTodayStoredFocusStats());
    setDailyGoalMinutes(getStoredDailyGoal());
  }, []);

  useEffect(() => {
    refreshStats();

    const handleCompleted = () => refreshStats();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "ethone-focus-history" || e.key === "ethone_focus_daily_goal_minutes") {
        refreshStats();
      }
    };

    window.addEventListener("v8:focus-session-completed", handleCompleted);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("v8:focus-session-completed", handleCompleted);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refreshStats]);

  // Real-time active focus time calculation:
  // If the timer is actively in the "focus" phase, add the elapsed seconds of the current session
  const activeElapsed =
    state.phase === "focus" && state.total > 0
      ? Math.max(0, state.total - state.remaining)
      : 0;

  const realTodaySeconds = todayStats.totalFocusSeconds + activeElapsed;
  const realTodayPomodoros = todayStats.completedPomodoros;
  const realBreaks = state.completedBreaks ?? completedBreaks;

  const goalProgress = Math.min(100, Math.round((realTodaySeconds / (dailyGoalMinutes * 60)) * 100));
  const streakDays = calculateFocusStreak(history);

  const handleSelectGoal = (minutes: number) => {
    setDailyGoalMinutes(minutes);
    saveStoredDailyGoal(minutes);
    setIsEditingGoal(false);
  };

  return (
    <div className="flex flex-col gap-4 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-4 shadow-lg backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-[var(--panel-border)]/50 pb-2.5">
        <div className="flex items-center gap-2">
          <Icon name="chart-bar" className="h-4 w-4 text-[var(--accent-primary)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Objectif & Statistiques
          </span>
        </div>

        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors",
            streakDays > 0
              ? "bg-amber-500/15 text-amber-400"
              : "bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--panel-border)]/50"
          )}
          title={
            streakDays > 0
              ? `${streakDays} jour${streakDays > 1 ? "s" : ""} consécutif${streakDays > 1 ? "s" : ""} avec du focus`
              : "Aucune série active pour le moment"
          }
        >
          <Icon name="flame" className="h-3 w-3" />
          Série : {streakDays} {streakDays > 1 ? "jours" : "jour"}
        </span>
      </div>

      {/* Daily Goal Bar */}
      <div className="space-y-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[var(--text-primary)]">Objectif du jour</span>
            <button
              type="button"
              onClick={() => setIsEditingGoal((prev) => !prev)}
              title="Modifier l'objectif du jour"
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            >
              <span>({formatGoalDuration(dailyGoalMinutes)})</span>
              <Icon name={isEditingGoal ? "caret-up" : "caret-down"} className="h-2.5 w-2.5" />
            </button>
          </div>

          <span className="font-mono text-[var(--accent-primary)] font-bold">
            {formatFocusDuration(realTodaySeconds)} / {formatGoalDuration(dailyGoalMinutes)} ({goalProgress}%)
          </span>
        </div>

        {/* Interactive Goal Presets Picker */}
        {isEditingGoal && (
          <div className="flex flex-wrap items-center gap-1 pt-1 pb-1 border-t border-[var(--panel-border)]/40">
            <span className="text-[10px] text-[var(--text-muted)] mr-1">Choisir :</span>
            {DAILY_GOAL_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleSelectGoal(m)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-semibold transition-all cursor-pointer",
                  dailyGoalMinutes === m
                    ? "bg-[var(--accent-primary)] text-white shadow-xs"
                    : "bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                )}
              >
                {formatGoalDuration(m)}
              </button>
            ))}
          </div>
        )}

        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-soft, #a855f7)] transition-all duration-500"
            style={{ width: `${goalProgress}%` }}
          />
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center justify-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2.5 text-center">
          <span className="text-lg font-bold font-mono text-[var(--text-primary)]">
            {realTodayPomodoros}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">Cycles</span>
        </div>

        <div className="flex flex-col items-center justify-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2.5 text-center">
          <span className="text-lg font-bold font-mono text-amber-400">
            {formatFocusDuration(realTodaySeconds)}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">Temps total</span>
        </div>

        <div className="flex flex-col items-center justify-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2.5 text-center">
          <span className="text-lg font-bold font-mono text-[var(--info)]">
            {realBreaks}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">Pauses</span>
        </div>
      </div>
    </div>
  );
}
