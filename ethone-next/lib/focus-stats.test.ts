import {
  formatFocusDuration,
  formatGoalDuration,
  calculateFocusStreak,
  getTodayStoredFocusStats,
  getStoredDailyGoal,
  saveStoredDailyGoal,
  FOCUS_DAILY_GOAL_KEY,
} from "./focus-stats";

describe("focus-stats", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("formatFocusDuration", () => {
    it("formats 0 seconds as 0 min", () => {
      expect(formatFocusDuration(0)).toBe("0 min");
    });

    it("formats seconds under an hour", () => {
      expect(formatFocusDuration(59)).toBe("0 min");
      expect(formatFocusDuration(60)).toBe("1 min");
      expect(formatFocusDuration(1500)).toBe("25 min");
    });

    it("formats hours and minutes", () => {
      expect(formatFocusDuration(3600)).toBe("1h00");
      expect(formatFocusDuration(5400)).toBe("1h30");
      expect(formatFocusDuration(7200)).toBe("2h00");
    });
  });

  describe("formatGoalDuration", () => {
    it("formats minutes", () => {
      expect(formatGoalDuration(30)).toBe("30 min");
      expect(formatGoalDuration(60)).toBe("1h00");
      expect(formatGoalDuration(90)).toBe("1h30");
      expect(formatGoalDuration(120)).toBe("2h00");
    });
  });

  describe("calculateFocusStreak", () => {
    it("returns 0 for empty history", () => {
      expect(calculateFocusStreak([])).toBe(0);
    });

    it("returns 1 if user focused today", () => {
      const today = new Date().toISOString();
      expect(calculateFocusStreak([{ completedAt: today }])).toBe(1);
    });

    it("returns streak starting from yesterday if user has not focused today yet", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(calculateFocusStreak([{ completedAt: yesterday.toISOString() }])).toBe(1);
    });

    it("calculates multiple consecutive days", () => {
      const now = new Date();
      const d0 = new Date(now).toISOString();
      const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
      const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2).toISOString();

      expect(
        calculateFocusStreak([
          { completedAt: d0 },
          { completedAt: d1 },
          { completedAt: d2 },
        ])
      ).toBe(3);
    });

    it("returns 0 if last focus was 2 or more days ago", () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      expect(calculateFocusStreak([{ completedAt: twoDaysAgo.toISOString() }])).toBe(0);
    });
  });

  describe("getTodayStoredFocusStats", () => {
    it("returns zeros if no history", () => {
      expect(getTodayStoredFocusStats()).toEqual({ totalFocusSeconds: 0, completedPomodoros: 0 });
    });

    it("aggregates only sessions from today", () => {
      const now = new Date().toISOString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      localStorage.setItem(
        "ethone-focus-history",
        JSON.stringify([
          { id: "1", duration: 1500, preset: "pomodoro", completedAt: now },
          { id: "2", duration: 900, preset: "sprint", completedAt: now },
          { id: "3", duration: 3000, preset: "deep-work", completedAt: yesterday.toISOString() },
        ])
      );

      const stats = getTodayStoredFocusStats();
      expect(stats.totalFocusSeconds).toBe(2400); // 1500 + 900
      expect(stats.completedPomodoros).toBe(2);
    });
  });

  describe("daily goal storage", () => {
    it("returns default 120 minutes if nothing stored", () => {
      expect(getStoredDailyGoal()).toBe(120);
    });

    it("persists and reads custom goal", () => {
      saveStoredDailyGoal(90);
      expect(localStorage.getItem(FOCUS_DAILY_GOAL_KEY)).toBe("90");
      expect(getStoredDailyGoal()).toBe(90);
    });
  });
});
