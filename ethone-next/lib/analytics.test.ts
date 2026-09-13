import { billsCategoryBreakdown, billsMonthSnapshot, tasksStats, focusHistoryByDay } from "./analytics";
import type { Bill } from "./bills-manager";
import type { Task } from "./hooks/useTasks";

function bill(overrides: Partial<Bill>): Bill {
  return {
    id: "b1",
    label: "Test",
    amount: 10,
    currency: "EUR",
    dueDate: "2026-09-05",
    paid: false,
    category: "other",
    recurrence: "none",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function task(overrides: Partial<Task>): Task {
  return {
    id: "t1",
    title: "Test task",
    description: null,
    is_completed: false,
    priority: "medium",
    due_date: null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("billsCategoryBreakdown", () => {
  it("sums unpaid amounts per category and sorts descending", () => {
    const bills = [
      bill({ id: "1", category: "housing", amount: 800, paid: false }),
      bill({ id: "2", category: "food", amount: 200, paid: false }),
      bill({ id: "3", category: "food", amount: 100, paid: false }),
      bill({ id: "4", category: "housing", amount: 500, paid: true }), // paid, excluded
    ];
    const result = billsCategoryBreakdown(bills);
    expect(result).toEqual([
      { category: "housing", amount: 800, count: 1 },
      { category: "food", amount: 300, count: 2 },
    ]);
  });

  it("returns an empty array when there are no unpaid bills", () => {
    expect(billsCategoryBreakdown([bill({ paid: true })])).toEqual([]);
  });
});

describe("billsMonthSnapshot", () => {
  it("splits paid vs unpaid amounts due within the given month", () => {
    const now = new Date(2026, 8, 10); // Sept 10, 2026
    const bills = [
      bill({ id: "1", dueDate: "2026-09-05", amount: 50, paid: true, recurrence: "none" }),
      bill({ id: "2", dueDate: "2026-09-20", amount: 75, paid: false, recurrence: "none" }),
      bill({ id: "3", dueDate: "2026-10-01", amount: 999, paid: false, recurrence: "none" }), // next month, excluded
    ];
    expect(billsMonthSnapshot(bills, now)).toEqual({
      paidCount: 1,
      unpaidCount: 1,
      paidAmount: 50,
      unpaidAmount: 75,
    });
  });
});

describe("tasksStats", () => {
  it("computes completion rate, priority breakdown, and created-per-day", () => {
    const tasks = [
      task({ id: "1", is_completed: true, priority: "high", created_at: "2026-09-01T10:00:00.000Z" }),
      task({ id: "2", is_completed: false, priority: "low", created_at: "2026-09-01T12:00:00.000Z" }),
      task({ id: "3", is_completed: false, priority: "medium", created_at: "2026-09-02T09:00:00.000Z" }),
    ];
    const stats = tasksStats(tasks);
    expect(stats.total).toBe(3);
    expect(stats.completed).toBe(1);
    expect(stats.completionRate).toBe(33);
    expect(stats.byPriority).toEqual({ low: 1, medium: 1, high: 1 });
    expect(stats.createdByDay).toEqual([
      { rawDate: "2026-09-01", dateLabel: expect.any(String), count: 2 },
      { rawDate: "2026-09-02", dateLabel: expect.any(String), count: 1 },
    ]);
  });

  it("returns a null completion rate for an empty task list", () => {
    expect(tasksStats([]).completionRate).toBeNull();
  });
});

describe("focusHistoryByDay", () => {
  it("sums session count and minutes per day", () => {
    const history = [
      { id: "1", duration: 1500, preset: "pomodoro", completedAt: "2026-09-01T09:00:00.000Z" },
      { id: "2", duration: 900, preset: "pomodoro", completedAt: "2026-09-01T14:00:00.000Z" },
      { id: "3", duration: 1200, preset: "pomodoro", completedAt: "2026-09-02T09:00:00.000Z" },
    ];
    expect(focusHistoryByDay(history)).toEqual([
      { rawDate: "2026-09-01", dateLabel: expect.any(String), sessions: 2, minutes: 40 },
      { rawDate: "2026-09-02", dateLabel: expect.any(String), sessions: 1, minutes: 20 },
    ]);
  });
});
