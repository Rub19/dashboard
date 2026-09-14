import type { Bill, BillCategory } from "@/lib/bills-manager";
import { getNextDueDate } from "@/lib/bills-manager";
import type { Task } from "@/lib/hooks/useTasks";

// Pure data-transform helpers for the /analytics page. Kept dependency-free
// (no localStorage/Supabase reads here) so they're trivially unit-testable —
// callers pass in whatever data they already loaded.

export interface CategoryBreakdownEntry {
  category: BillCategory;
  amount: number;
  count: number;
}

/** Sum of unpaid amount + count per category, across ALL bills (not just this month) — a snapshot, not a trend, since no historical bill data exists yet. */
export function billsCategoryBreakdown(bills: Bill[]): CategoryBreakdownEntry[] {
  const map = new Map<BillCategory, CategoryBreakdownEntry>();
  for (const bill of bills) {
    if (bill.paid) continue;
    const existing = map.get(bill.category);
    if (existing) {
      existing.amount += bill.amount;
      existing.count += 1;
    } else {
      map.set(bill.category, { category: bill.category, amount: bill.amount, count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

export interface BillsMonthSnapshot {
  paidCount: number;
  unpaidCount: number;
  paidAmount: number;
  unpaidAmount: number;
}

/** This-month paid vs unpaid split, based on each bill's next due date (recurring bills included). */
export function billsMonthSnapshot(bills: Bill[], now: Date = new Date()): BillsMonthSnapshot {
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const snapshot: BillsMonthSnapshot = { paidCount: 0, unpaidCount: 0, paidAmount: 0, unpaidAmount: 0 };

  for (const bill of bills) {
    const next = getNextDueDate(bill, firstDay);
    if (!next) continue;
    const nextDate = new Date(next);
    if (nextDate < firstDay || nextDate > lastDay) continue;
    if (bill.paid) {
      snapshot.paidCount += 1;
      snapshot.paidAmount += bill.amount;
    } else {
      snapshot.unpaidCount += 1;
      snapshot.unpaidAmount += bill.amount;
    }
  }
  return snapshot;
}

export interface TaskCreatedByDay {
  rawDate: string;
  dateLabel: string;
  count: number;
}

export interface TasksStats {
  total: number;
  completed: number;
  completionRate: number | null;
  byPriority: { low: number; medium: number; high: number };
  createdByDay: TaskCreatedByDay[];
  completedByDay: TaskCreatedByDay[];
}

/** Completion rate + priority split (current snapshot), tasks-created-per-day, and — now that tasks.completed_at is a real column — a genuine completed-per-day trend. */
export function tasksStats(tasks: Task[]): TasksStats {
  const byPriority = { low: 0, medium: 0, high: 0 };
  const byDay = new Map<string, number>();
  const completedByDayMap = new Map<string, number>();
  let completed = 0;

  for (const task of tasks) {
    if (task.is_completed) completed += 1;
    if (task.priority in byPriority) byPriority[task.priority] += 1;
    const rawDate = task.created_at ? task.created_at.slice(0, 10) : null;
    if (rawDate) byDay.set(rawDate, (byDay.get(rawDate) || 0) + 1);
    const completedRawDate = task.completed_at ? task.completed_at.slice(0, 10) : null;
    if (completedRawDate) completedByDayMap.set(completedRawDate, (completedByDayMap.get(completedRawDate) || 0) + 1);
  }

  const toSeries = (map: Map<string, number>): TaskCreatedByDay[] =>
    Array.from(map.entries())
      .map(([rawDate, count]) => ({
        rawDate,
        dateLabel: new Date(rawDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count,
      }))
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate));

  return {
    total: tasks.length,
    completed,
    completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : null,
    byPriority,
    createdByDay: toSeries(byDay),
    completedByDay: toSeries(completedByDayMap),
  };
}

export interface FocusHistoryEntry {
  id: string;
  duration: number;
  preset: string;
  goal?: string;
  completedAt: string;
}

export interface FocusDayStat {
  rawDate: string;
  dateLabel: string;
  sessions: number;
  minutes: number;
}

/** Sessions/minutes per day from the real (but device-local, 100-entry-capped) focus history. */
export function focusHistoryByDay(history: FocusHistoryEntry[]): FocusDayStat[] {
  const map = new Map<string, { sessions: number; seconds: number }>();
  for (const entry of history) {
    const rawDate = entry.completedAt ? entry.completedAt.slice(0, 10) : null;
    if (!rawDate) continue;
    const existing = map.get(rawDate) || { sessions: 0, seconds: 0 };
    existing.sessions += 1;
    existing.seconds += entry.duration || 0;
    map.set(rawDate, existing);
  }

  return Array.from(map.entries())
    .map(([rawDate, { sessions, seconds }]) => ({
      rawDate,
      dateLabel: new Date(rawDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      sessions,
      minutes: Math.round(seconds / 60),
    }))
    .sort((a, b) => a.rawDate.localeCompare(b.rawDate));
}
