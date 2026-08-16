"use client";

import { useEffect, useMemo, useState } from "react";
import { useItems } from "@/lib/hooks/useItems";
import { useCloudFiles } from "@/lib/hooks/useCloudFiles";
import { useActivityJournal } from "@/lib/hooks/useActivityJournal";
import { useI18n } from "@/lib/hooks/useI18n";
import type { ActivityCategory, ActivitySnapshot } from "@/lib/activity-journal";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import LiveWidgets from "@/components/LiveWidgets";
import Select from "@/components/ui/Select";

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

function formatLocalDate(d: Date, mounted: boolean) {
  return mounted ? d.toLocaleDateString() : dateKey(d.toISOString());
}

function formatLocalTime(iso: string, mounted: boolean) {
  return mounted ? new Date(iso).toLocaleTimeString() : "";
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
  0: "bg-[var(--panel-bg)]",
  1: "bg-emerald-500/25",
  2: "bg-emerald-500/45",
  3: "bg-emerald-500/70",
  4: "bg-emerald-500",
};

const CATEGORIES: { id: ActivityCategory | "all"; labelKey: string }[] = [
  { id: "all", labelKey: "all" },
  { id: "productivity", labelKey: "productivity" },
  { id: "work", labelKey: "work" },
  { id: "system", labelKey: "system" },
  { id: "brain", labelKey: "brain" },
];

const TYPES = [
  { id: "all", labelKey: "journalTypeAll" },
  { id: "action", labelKey: "journalTypeAction" },
  { id: "route", labelKey: "journalTypeRoute" },
  { id: "derived", labelKey: "journalTypeDerived" },
  { id: "note", labelKey: "journalTypeNote" },
  { id: "task", labelKey: "journalTypeTask" },
  { id: "event", labelKey: "journalTypeEvent" },
  { id: "file", labelKey: "journalTypeFile" },
];

function matchesType(eventType: string | undefined, type: string) {
  if (!eventType) return type === "all";
  if (type === "all") return true;
  if (type === "action") return eventType.startsWith("v8.") || eventType === "v8.brain.call";
  if (type === "route") return eventType.startsWith("route:");
  if (type === "derived") return eventType.startsWith("derived:");
  if (type === "note") return eventType === "derived:note";
  if (type === "task") return eventType === "derived:task";
  if (type === "event") return eventType === "derived:event";
  if (type === "file") return eventType === "derived:file";
  return true;
}

export default function ActivityPage() {
  const i18n = useI18n();
  const [period, setPeriod] = useState<number>(30);
  const [showDetails, setShowDetails] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory | "all">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setToday(new Date());
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const { items: notes } = useItems("notes");
  const { items: tasks } = useItems("tasks");
  const { items: events } = useItems("events");
  const { allFiles: files } = useCloudFiles();

  const snapshot: ActivitySnapshot = useMemo(
    () => ({
      notes: notes.map((n) => ({ id: n.id, title: n.title, updatedAt: n.updatedAt, createdAt: n.createdAt })),
      tasks: tasks.map((t) => ({ id: t.id, title: t.title, done: t.done, doneAt: t.updatedAt, createdAt: t.createdAt, updatedAt: t.updatedAt })),
      events: events.map((e) => ({ id: e.id, title: e.title, date: e.startAt })),
      files: files.map((f) => ({ id: f.id, name: f.name, date: f.updatedAt || f.createdAt })),
    }),
    [notes, tasks, events, files]
  );

  const { entries, pendingCount, syncing, syncError, lastSync, sync } = useActivityJournal({
    snapshot,
    syncInterval: 30000,
  });

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - period);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [period]);

  const filteredEntries = useMemo(() => {
    let list = entries;
    list = list.filter((e) => new Date(e.timestamp) >= cutoff);
    if (categoryFilter !== "all") list = list.filter((e) => e.category === categoryFilter);
    if (typeFilter !== "all") list = list.filter((e) => matchesType(e.eventType, typeFilter));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (e.eventType || "").toLowerCase().includes(q) ||
          e.source.toLowerCase().includes(q)
      );
    }
    return list;
  }, [entries, cutoff, categoryFilter, typeFilter, query]);

  const heatmapEntries = useMemo(
    () => entries.filter((e) => new Date(e.timestamp) >= cutoff),
    [entries, cutoff]
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of heatmapEntries) {
      const key = dateKey(e.timestamp);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [heatmapEntries]);

  const activeToday = useMemo(() => today ?? new Date(0), [today]);
  const gridStart = useMemo(() => startOfWeek(addDays(activeToday, -period + 1)), [activeToday, period]);
  const weeks = useMemo(() => Math.ceil((activeToday.getTime() - gridStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1, [activeToday, gridStart]);

  const grid = useMemo(() => {
    const rows: { date: Date; count: number; isToday: boolean }[][] = [];
    for (let w = 0; w < weeks; w++) {
      const col: { date: Date; count: number; isToday: boolean }[] = [];
      for (let day = 0; day < 7; day++) {
        const d = addDays(gridStart, w * 7 + day);
        const key = dateKey(d.toISOString());
        const count = counts.get(key) || 0;
        col.push({ date: d, count, isToday: isSameDay(d, activeToday) });
      }
      rows.push(col);
    }
    return rows;
  }, [counts, gridStart, weeks, activeToday]);

  const stats = useMemo(() => {
    const todayKey = dateKey(activeToday.toISOString());
    const todayCount = counts.get(todayKey) || 0;

    let streak = 0;
    const d = new Date(activeToday);
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

    const weekStart = startOfWeek(new Date(activeToday));
    let weekActiveDays = 0;
    for (let i = 0; i < 7; i++) {
      const key = dateKey(addDays(weekStart, i).toISOString());
      if ((counts.get(key) || 0) > 0) weekActiveDays++;
    }

    const periodStart = new Date(activeToday);
    periodStart.setDate(periodStart.getDate() - period);
    let activeDays = 0;
    for (let i = 0; i < period; i++) {
      const key = dateKey(addDays(periodStart, i + 1).toISOString());
      if ((counts.get(key) || 0) > 0) activeDays++;
    }
    const consistency = period > 0 ? Math.round((activeDays / period) * 100) : 0;
    const weekPct = Math.round((weekActiveDays / 7) * 100);

    return { todayCount, streak, weekPct, consistency };
  }, [counts, period, activeToday]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filteredEntries>();
    for (const e of filteredEntries) {
      const key = dateKey(e.timestamp);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, group]) => ({ key, group }));
  }, [filteredEntries]);

  const lastSyncText = useMemo(() => {
    if (!lastSync || !now) return "";
    const seconds = Math.floor((now - lastSync.getTime()) / 1000);
    if (seconds < 60) return i18n("journalJustNow");
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return i18n("journalMinutesAgo").replace("{{count}}", String(minutes));
    const hours = Math.floor(minutes / 60);
    return i18n("journalHoursAgo").replace("{{count}}", String(hours));
  }, [lastSync, i18n, now]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{i18n("liveWidgets")}</h1>
          <p className="text-sm text-[var(--muted)]">{i18n("liveCardsDescription")}</p>
        </div>
      </div>
      <LiveWidgets showHeader={false} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{i18n("activityJournal")}</h1>
          <p className="text-sm text-[var(--muted)]">{i18n("activityJournalDescription")}</p>
        </div>
        <div className="flex items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-1 backdrop-blur-[var(--panel-blur)]">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-[var(--panel-radius)] px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"
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
        <div className="flex gap-2 overflow-x-auto pb-2">
          <div className="grid grid-flow-col gap-1.5">
            {grid.map((col, w) => (
              <div key={w} className="grid grid-rows-7 gap-1.5">
                {col.map((cell, d) => (
                  <div
                    key={d}
                    title={`${formatLocalDate(cell.date, mounted)} · ${cell.count} ${i18n("events")}`}
                    className={`h-4 w-4 rounded-full ${LEVELS[colorByCount(cell.count)]} ${
                      cell.isToday ? "ring-2 ring-[var(--accent)]" : ""
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card3D>

      <Card3D>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">{i18n("activityJournalEntries")}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={i18n("journalSearchPlaceholder")}
              aria-label={i18n("journalSearchPlaceholder")}
              className="h-9 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
            />
            <Select
              value={categoryFilter}
              onChange={(value) => setCategoryFilter(value as ActivityCategory | "all")}
              options={CATEGORIES.map((c) => ({ id: c.id, label: i18n(c.labelKey) }))}
              aria-label={i18n("journalFilterCategory")}
              className="h-9 min-w-0"
            />
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              options={TYPES.map((t) => ({ id: t.id, label: i18n(t.labelKey) }))}
              aria-label={i18n("journalFilterType")}
              className="h-9 min-w-0"
            />
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-[var(--muted)]">
            {i18n("journalShowing").replace("{{count}}", String(filteredEntries.length))}
            {pendingCount > 0 ? ` · ${i18n("journalPending").replace("{{count}}", String(pendingCount))}` : ""}
          </p>
          <div className="flex items-center gap-2">
            {syncError && <span className="text-xs text-rose-400">{i18n("journalSyncError")}</span>}
            {lastSyncText && <span className="text-xs text-[var(--muted)]">{lastSyncText}</span>}
            <button
              type="button"
              onClick={() => sync()}
              disabled={syncing}
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--panel-radius)] bg-[var(--accent)] px-3 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {syncing ? (
                <>
                  <Icon name="loader" className="h-3.5 w-3.5 animate-spin" />
                  {i18n("journalSyncing")}
                </>
              ) : (
                <>
                  <Icon name="refresh-cw" className="h-3.5 w-3.5" />
                  {i18n("journalSyncNow")}
                </>
              )}
            </button>
          </div>
        </div>

        {grouped.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{i18n("journalNoEntries")}</p>
        ) : (
          <div className="space-y-3">
            {grouped.map(({ key, group }) => (
              <div key={key} className="space-y-2">
                <h3 className="text-xs font-semibold text-[var(--muted)]">
                  {formatLocalDate(new Date(key), mounted)}
                </h3>
                {group.map((event, i) => (
                  <Card3D key={event.id || i}>
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-violet-500/10 text-violet-400">
                        <Icon name={event.icon || "activity"} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{event.title}</p>
                          <span className="rounded-full bg-[var(--panel-bg)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                            {i18n(event.category)}
                          </span>
                          {event.tone && (
                            <span className="rounded-full bg-[var(--panel-bg)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                              {event.eventType}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-[var(--muted)]">
                          {formatLocalTime(event.timestamp, mounted)}{mounted ? " · " : ""}{event.description}
                        </p>
                      </div>
                    </div>
                  </Card3D>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowDetails((s) => !s)}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            {showDetails ? i18n("showLess") : i18n("showMore")}
            <Icon name={showDetails ? "chevron-up" : "chevron-down"} className="ml-1 inline h-4 w-4" />
          </button>
        </div>

        {showDetails && (
          <div className="mt-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 backdrop-blur-[var(--panel-blur)]">
            <p className="text-xs text-[var(--muted)]">{i18n("activityDescription")}</p>
          </div>
        )}
      </Card3D>
    </div>
  );
}
