export type FocusHistoryEntry = {
  id: string;
  duration: number; // in seconds
  preset: string;
  goal?: string;
  completedAt: string; // ISO string
};

export const FOCUS_DAILY_GOAL_KEY = "ethone_focus_daily_goal_minutes";
export const DEFAULT_DAILY_GOAL_MINUTES = 120; // 2h00

export const DAILY_GOAL_PRESETS = [30, 60, 90, 120, 180, 240] as const;

export function formatFocusDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);

  if (h > 0) {
    return `${h}h${m > 0 ? String(m).padStart(2, "0") : "00"}`;
  }
  return `${m} min`;
}

export function formatGoalDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) {
    return `${h}h${m > 0 ? String(m).padStart(2, "0") : "00"}`;
  }
  return `${m} min`;
}

export function getTodayStoredFocusStats(): { totalFocusSeconds: number; completedPomodoros: number } {
  if (typeof window === "undefined") return { totalFocusSeconds: 0, completedPomodoros: 0 };
  try {
    const raw = localStorage.getItem("ethone-focus-history") || "[]";
    const list: FocusHistoryEntry[] = JSON.parse(raw);
    const todayStr = new Date().toDateString();
    let total = 0;
    let count = 0;
    if (Array.isArray(list)) {
      for (const item of list) {
        if (item && item.completedAt) {
          const d = new Date(item.completedAt);
          if (!isNaN(d.getTime()) && d.toDateString() === todayStr) {
            total += Number(item.duration) || 0;
            count++;
          }
        }
      }
    }
    return { totalFocusSeconds: total, completedPomodoros: count };
  } catch {
    return { totalFocusSeconds: 0, completedPomodoros: 0 };
  }
}

export function calculateFocusStreak(history: { completedAt: string }[]): number {
  if (!history || history.length === 0) return 0;

  const daysSet = new Set<string>();
  for (const item of history) {
    if (!item?.completedAt) continue;
    const d = new Date(item.completedAt);
    if (isNaN(d.getTime())) continue;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    daysSet.add(`${y}-${m}-${day}`);
  }

  if (daysSet.size === 0) return 0;

  const now = new Date();
  const formatDay = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const todayKey = formatDay(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDay(yesterday);

  let streak = 0;
  let checkDate: Date;

  if (daysSet.has(todayKey)) {
    checkDate = new Date(now);
  } else if (daysSet.has(yesterdayKey)) {
    checkDate = yesterday;
  } else {
    return 0;
  }

  while (daysSet.has(formatDay(checkDate))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

export function getStoredDailyGoal(): number {
  if (typeof window === "undefined") return DEFAULT_DAILY_GOAL_MINUTES;
  try {
    const raw = localStorage.getItem(FOCUS_DAILY_GOAL_KEY);
    if (!raw) return DEFAULT_DAILY_GOAL_MINUTES;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) || parsed <= 0 ? DEFAULT_DAILY_GOAL_MINUTES : parsed;
  } catch {
    return DEFAULT_DAILY_GOAL_MINUTES;
  }
}

export function saveStoredDailyGoal(minutes: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FOCUS_DAILY_GOAL_KEY, String(minutes));
  } catch {}
}
