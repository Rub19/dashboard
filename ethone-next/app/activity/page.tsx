"use client";

import { useMemo, useState } from "react";
import { useWorker } from "@/lib/hooks/useWorker";
import { useI18n } from "@/lib/hooks/useI18n";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";

type ActivityEvent = {
  id?: string;
  eventType: string;
  details?: Record<string, unknown>;
  createdAt: string;
};

function dateKey(iso = "") {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function startOfWeek(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

const PERIODS = [7, 30, 90, 365] as const;

type Level = 0 | 1 | 2 | 3 | 4;

function colorByCount(count: number): Level {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

const LEVELS: Record<Level, string> = {
  0: "bg-[var(--surface-raised)]",
  1: "bg-emerald-500/25",
  2: "bg-emerald-500/45",
  3: "bg-emerald-500/70",
  4: "bg-emerald-500",
};

export default function ActivityPage() {
  const i18n = useI18n();
  const [period, setPeriod] = useState<number>(30);
  const [showDetails, setShowDetails] = useState(false);

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 365);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const { data, loading, error } = useWorker<{ data: { events: ActivityEvent[] } }>(
    `/api/cloud/activity?limit=500&since=${encodeURIComponent(since)}`
  );

  const events = useMemo(() => data?.data?.events || [], [data?.data?.events]);

  const filtered = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - period);
    cutoff.setHours(0, 0, 0, 0);
    return events.filter((e) => new Date(e.createdAt) >= cutoff);
  }, [events, period]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) {
      const key = dateKey(e.createdAt);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [filtered]);

  const today = useMemo(() => new Date(), []);
  const gridStart = useMemo(() => startOfWeek(addDays(today, -period + 1)), [today, period]);
  const weeks = Math.ceil((today.getTime() - gridStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

  const grid = useMemo(() => {
    const rows: { date: Date; count: number; isToday: boolean }[][] = [];
    for (let w = 0; w < weeks; w++) {
      const col: { date: Date; count: number; isToday: boolean }[] = [];
      for (let day = 0; day < 7; day++) {
        const d = addDays(gridStart, w * 7 + day);
        const key = dateKey(d.toISOString());
        const count = counts.get(key) || 0;
        col.push({ date: d, count, isToday: isSameDay(d, today) });
      }
      rows.push(col);
    }
    return rows;
  }, [counts, gridStart, weeks, today]);

  const stats = useMemo(() => {
    const todayKey = dateKey(new Date().toISOString());
    const todayCount = counts.get(todayKey) || 0;

    let streak = 0;
    const d = new Date();
    while (streak < period) {
      const key = dateKey(d.toISOString());
      if ((counts.get(key) || 0) > 0) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else if (streak === 0 && key === todayKey) {
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    const weekStart = startOfWeek(new Date());
    let weekActiveDays = 0;
    for (let i = 0; i < 7; i++) {
      const key = dateKey(addDays(weekStart, i).toISOString());
      if ((counts.get(key) || 0) > 0) weekActiveDays++;
    }

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - period);
    let activeDays = 0;
    for (let i = 0; i < period; i++) {
      const key = dateKey(addDays(periodStart, i + 1).toISOString());
      if ((counts.get(key) || 0) > 0) activeDays++;
    }
    const consistency = period > 0 ? Math.round((activeDays / period) * 100) : 0;
    const weekPct = Math.round((weekActiveDays / 7) * 100);

    return { todayCount, streak, weekPct, consistency };
  }, [counts, period]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEvent[]>();
    for (const e of filtered) {
      const key = dateKey(e.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, group]) => ({ key, group }));
  }, [filtered]);

  if (loading && events.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{i18n("activityTitle")}</h1>
        <Card3D><div className="h-4 w-1/2 animate-pulse rounded bg-[var(--border)]" /></Card3D>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{i18n("activityTitle")}</h1>
          <p className="text-sm text-[var(--muted)]">{i18n("activityLastDays").replace("{{count}}", String(period))}</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {p}j
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card3D>
          <p className="text-xs text-[var(--muted)]">{i18n("today")}</p>
          <p className="text-2xl font-bold">{stats.todayCount}</p>
          <p className="text-[10px] text-[var(--muted)]">{i18n("eventsToday")}</p>
        </Card3D>
        <Card3D>
          <p className="text-xs text-[var(--muted)]">{i18n("currentStreak")}</p>
          <p className="text-2xl font-bold">{stats.streak}D</p>
          <p className="text-[10px] text-[var(--muted)]">{i18n("active")}</p>
        </Card3D>
        <Card3D>
          <p className="text-xs text-[var(--muted)]">{i18n("thisWeek")}</p>
          <p className="text-2xl font-bold">{stats.weekPct}%</p>
          <p className="text-[10px] text-[var(--muted)]">{stats.weekPct}/7 {i18n("activeDays")}</p>
        </Card3D>
        <Card3D>
          <p className="text-xs text-[var(--muted)]">{i18n("consistency")}</p>
          <p className="text-2xl font-bold">{stats.consistency}%</p>
          <p className="text-[10px] text-[var(--muted)]">{i18n("periodActive")}</p>
        </Card3D>
      </div>

      <Card3D>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{i18n("activityHeatmap")}</h2>
          <div className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
            <span>{i18n("less")}</span>
            <div className="flex gap-1">
              {(Object.keys(LEVELS) as unknown as Level[]).map((l) => (
                <span key={l} className={`h-3 w-3 rounded-full ${LEVELS[l]}`} />
              ))}
            </div>
            <span>{i18n("more")}</span>
          </div>
        </div>
        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-[var(--border)]" />
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2">
            <div className="grid grid-flow-col gap-1.5">
              {grid.map((col, w) => (
                <div key={w} className="grid grid-rows-7 gap-1.5">
                  {col.map((cell, d) => (
                    <div
                      key={d}
                      title={`${cell.date.toLocaleDateString()} · ${cell.count} ${i18n("events")}`}
                      className={`h-4 w-4 rounded-full ${LEVELS[colorByCount(cell.count)]} ${
                        cell.isToday ? "ring-2 ring-[var(--accent)]" : ""
                      }`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card3D>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setShowDetails((s) => !s)}
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          {showDetails ? i18n("showLess") : i18n("showMore")}
          <Icon name={showDetails ? "chevron-up" : "chevron-down"} className="ml-1 inline h-4 w-4" />
        </button>
      </div>

      {error && (
        <Card3D>
          <p className="text-sm text-red-400">{error.message}</p>
        </Card3D>
      )}

      {showDetails && (
        <div className="space-y-3">
          {grouped.length === 0 ? (
            <Card3D>
              <p className="text-sm text-[var(--muted)]">{i18n("noActivity")}</p>
            </Card3D>
          ) : (
            grouped.map(({ key, group }) => (
              <div key={key} className="space-y-2">
                <h3 className="text-xs font-semibold text-[var(--muted)]">{new Date(key).toLocaleDateString()}</h3>
                {group.map((event, i) => (
                  <Card3D key={event.id || i}>
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                        <Icon name="activity" className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{event.eventType}</p>
                        <p className="truncate text-xs text-[var(--muted)]">
                          {new Date(event.createdAt).toLocaleTimeString()} · {JSON.stringify(event.details || {}).slice(0, 80)}
                        </p>
                      </div>
                    </div>
                  </Card3D>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
