type InteractionsHeatmapPoint = {
  date: string;
  count: number;
  byKind: Record<string, number>;
};

export type HeatmapRange = 30 | 90 | 365;

export type HeatmapStats = {
  today: number;
  streak: number;
  thisWeekPercent: number;
  consistency: number;
  total: number;
  byKind: Record<string, number>;
  maxInDay: number;
  averagePerDay: number;
};

export type HeatmapWeek = {
  week: string;
  days: (InteractionsHeatmapPoint | null)[];
};

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function dateKey(d: Date) {
  return startOfDay(d).toISOString().slice(0, 10);
}

function isSameDay(a: Date, b: Date) {
  return dateKey(a) === dateKey(b);
}

function weekday(d: Date) {
  const day = d.getDay();
  return day === 0 ? 6 : day - 1; // Lundi = 0, Dimanche = 6
}

function weekKey(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  const day = weekday(c);
  c.setDate(c.getDate() - day);
  return c.toISOString().slice(0, 10);
}

function getKind(record: { data?: Record<string, unknown> }): string {
  const data = record.data || {};
  if (typeof data.action === "string") {
    const map: Record<string, string> = {
      note_create: "noteCreate",
      note_save: "noteSave",
      task_create: "taskCreate",
      task_complete: "taskComplete",
      task_delete: "taskDelete",
      event_create: "eventCreate",
      file_create: "fileCreate",
      space_switch: "spaceSwitch",
      sync: "sync",
      ui_customize: "uiCustomize",
    };
    if (map[data.action]) return map[data.action];
  }
  if (typeof data.kind === "string") return data.kind;
  return "sync";
}

export class InteractionsHeatmap {
  private records: Array<{ created_at: string; data?: Record<string, unknown> }>;

  constructor(records: Array<{ created_at: string; data?: Record<string, unknown> }> = []) {
    this.records = records;
  }

  setRecords(records: Array<{ created_at: string; data?: Record<string, unknown> }>) {
    this.records = records;
  }

  add(record: { created_at: string; data?: Record<string, unknown> }) {
    this.records.push(record);
  }

  build(range: HeatmapRange, filterKind: string | "all" = "all"): {
    heatmap: InteractionsHeatmapPoint[];
    points: InteractionsHeatmapPoint[];
    weeks: HeatmapWeek[];
    matrix: (InteractionsHeatmapPoint | null)[][];
    stats: HeatmapStats;
  } {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const points: InteractionsHeatmapPoint[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      points.push({ date: dateKey(d), count: 0, byKind: {} });
    }

    const byKind: Record<string, number> = {};
    let maxInDay = 0;

    this.records.forEach((r) => {
      const at = new Date(r.created_at);
      const day = points.find((d) => isSameDay(new Date(d.date), at));
      const kind = getKind(r);
      if (filterKind !== "all" && kind !== filterKind) return;
      if (day) {
        day.count += 1;
        day.byKind[kind] = (day.byKind[kind] || 0) + 1;
        if (day.count > maxInDay) maxInDay = day.count;
      }
      byKind[kind] = (byKind[kind] || 0) + 1;
    });

    const today = points[points.length - 1]?.count || 0;
    let streak = 0;
    for (let i = points.length - 1; i >= 0; i--) {
      if (points[i].count > 0) streak += 1;
      else break;
    }

    const thisWeek = points.slice(-7);
    const thisWeekCount = thisWeek.reduce((s, d) => s + d.count, 0);
    const thisWeekMax = thisWeek.length * 10;
    const thisWeekPercent = thisWeekMax ? Math.round((thisWeekCount / thisWeekMax) * 100) : 0;
    const activeDays = points.filter((d) => d.count > 0).length;
    const consistency = points.length ? Math.round((activeDays / points.length) * 100) : 0;
    const total = points.reduce((s, d) => s + d.count, 0);
    const averagePerDay = points.length ? Math.round((total / points.length) * 10) / 10 : 0;

    const weeksMap: Record<string, (InteractionsHeatmapPoint | null)[]> = {};
    points.forEach((day) => {
      const d = new Date(day.date);
      const wk = weekKey(d);
      if (!weeksMap[wk]) weeksMap[wk] = Array(7).fill(null);
      const idx = weekday(d);
      weeksMap[wk][idx] = day;
    });

    const weeks = Object.entries(weeksMap).map(([week, days]) => ({ week, days })).sort((a, b) => a.week.localeCompare(b.week));
    const matrix = weeks.map((w) => w.days);

    return {
      heatmap: points,
      points,
      weeks,
      matrix,
      stats: {
        today,
        streak,
        thisWeekPercent,
        consistency,
        total,
        byKind,
        maxInDay,
        averagePerDay,
      },
    };
  }

  static intensity(count: number, max = 10): number {
    if (count === 0) return 0;
    if (max === 0) return 1;
    const ratio = count / max;
    if (ratio < 0.2) return 1;
    if (ratio < 0.4) return 2;
    if (ratio < 0.7) return 3;
    return 4;
  }
}
