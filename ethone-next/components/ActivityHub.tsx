"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Flame, TrendingUp, Target, Search, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { useItems } from "@/lib/hooks/useItems";
import { useCloudFiles } from "@/lib/hooks/useCloudFiles";
import { useActivityJournal } from "@/lib/hooks/useActivityJournal";
import { useI18n } from "@/lib/hooks/useI18n";
import type { ActivityCategory, ActivitySnapshot } from "@/lib/activity-journal";
import { Icon } from "@/lib/icons";
import Select from "@/components/ui/Select";
import AnimatedFilterTabs from "@/components/ui/AnimatedFilterTabs";

function dateKey(iso = "") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
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

const PERIODS = [
  { id: "7", label: "7j" },
  { id: "30", label: "30j" },
  { id: "90", label: "90j" },
  { id: "365", label: "365j" },
];

type HeatLevel = 0 | 1 | 2 | 3;

const HEATMAP_LEVELS: Record<HeatLevel, string> = {
  0: "bg-white/[0.03] border border-white/[0.04]",
  1: "bg-emerald-950/60 border border-emerald-500/20",
  2: "bg-emerald-700/60 border border-emerald-500/40",
  3: "bg-emerald-500 border border-emerald-400/50 shadow-[0_0_8px_rgba(16,185,129,0.35)]",
};

function heatLevelByCount(count: number): HeatLevel {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  return 3;
}

const CATEGORIES: { id: ActivityCategory | "all"; labelKey: string; icon: string }[] = [
  { id: "all", labelKey: "all", icon: "layout-grid" },
  { id: "productivity", labelKey: "productivity", icon: "zap" },
  { id: "work", labelKey: "work", icon: "briefcase" },
  { id: "system", labelKey: "system", icon: "settings" },
  { id: "brain", labelKey: "brain", icon: "brain" },
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

const CATEGORY_META: Record<ActivityCategory, { color: string; bg: string; border: string }> = {
  productivity: { color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  work: { color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  system: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  brain: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
};

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

type StatCardProps = {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
};

function StatCard({ label, value, sub, icon }: StatCardProps) {
  return (
    <div className="group bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl p-4 rounded-2xl shadow-lg hover:border-white/15 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl md:text-3xl font-bold font-mono tracking-tight text-white mt-1">{value}</p>
          <p className="text-[11px] text-zinc-500 mt-1">{sub}</p>
        </div>
        <div className="shrink-0 mt-0.5">{icon}</div>
      </div>
    </div>
  );
}

function HeatmapCell({ date, count, isToday }: { date: Date; count: number; isToday: boolean }) {
  const mounted = typeof window !== "undefined";
  const formatted = formatLocalDate(date, mounted);
  const title = count === 0 ? `${formatted} · Aucune action` : `${count} actions le ${formatted}`;
  const level = heatLevelByCount(count);

  return (
    <div
      title={title}
      className={`h-3.5 w-3.5 rounded-[3px] ${HEATMAP_LEVELS[level]} ${isToday ? "ring-2 ring-emerald-300 z-10" : ""}`}
    />
  );
}

export default function ActivityHub() {
  const i18n = useI18n();
  const [period, setPeriod] = useState<string>("30");
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

  const periodDays = Number(period) || 30;
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - periodDays);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [periodDays]);

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
  const gridStart = useMemo(() => startOfWeek(addDays(activeToday, -periodDays + 1)), [activeToday, periodDays]);
  const weeks = useMemo(
    () => Math.ceil((activeToday.getTime() - gridStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1,
    [activeToday, gridStart]
  );

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
    while (streak < periodDays) {
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
    periodStart.setDate(periodStart.getDate() - periodDays);
    let activeDays = 0;
    for (let i = 0; i < periodDays; i++) {
      const key = dateKey(addDays(periodStart, i + 1).toISOString());
      if ((counts.get(key) || 0) > 0) activeDays++;
    }
    const consistency = periodDays > 0 ? Math.round((activeDays / periodDays) * 100) : 0;
    const weekPct = Math.round((weekActiveDays / 7) * 100);

    return { todayCount, streak, weekPct, consistency };
  }, [counts, periodDays, activeToday]);

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
    if (seconds < 60) return i18n("journalJustNow") || "à l'instant";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return i18n("journalMinutesAgo").replace("{{count}}", String(minutes));
    const hours = Math.floor(minutes / 60);
    return i18n("journalHoursAgo").replace("{{count}}", String(hours));
  }, [lastSync, i18n, now]);

  const periodTabs = useMemo(
    () => PERIODS.map((p) => ({ id: p.id, label: p.label })),
    []
  );

  const categoryOptions = useMemo(
    () => CATEGORIES.map((c) => ({ id: c.id, label: i18n(c.labelKey) })),
    [i18n]
  );

  const typeOptions = useMemo(
    () => TYPES.map((t) => ({ id: t.id, label: i18n(t.labelKey) })),
    [i18n]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{i18n("activityJournal")}</h1>
          <p className="text-sm text-zinc-500 mt-1">{i18n("activityJournalDescription")}</p>
        </div>
        <AnimatedFilterTabs
          tabs={periodTabs}
          activeId={period}
          onChange={setPeriod}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={i18n("today")}
          value={stats.todayCount}
          sub={i18n("eventsToday")}
          icon={<Activity className="h-5 w-5 text-emerald-400" />}
        />
        <StatCard
          label={i18n("currentStreak")}
          value={`${stats.streak}j`}
          sub={i18n("active")}
          icon={<Flame className="h-5 w-5 text-amber-400" />}
        />
        <StatCard
          label={i18n("thisWeek")}
          value={`${stats.weekPct}%`}
          sub={`${Math.round((stats.weekPct / 100) * 7)}/7 ${i18n("activeDays")}`}
          icon={<TrendingUp className="h-5 w-5 text-cyan-400" />}
        />
        <StatCard
          label={i18n("consistency")}
          value={`${stats.consistency}%`}
          sub={i18n("periodActive")}
          icon={<Target className="h-5 w-5 text-violet-400" />}
        />
      </div>

      <div className="bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl rounded-2xl p-4 shadow-lg">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">{i18n("activityHeatmap")}</h2>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span>{i18n("less")}</span>
            <div className="flex gap-1">
              {(Object.keys(HEATMAP_LEVELS) as unknown as HeatLevel[]).map((l) => (
                <span key={l} className={`h-3 w-3 rounded-[3px] ${HEATMAP_LEVELS[l]}`} />
              ))}
            </div>
            <span>{i18n("more")}</span>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <div className="grid grid-flow-col gap-1.5">
            {grid.map((col, w) => (
              <div key={w} className="grid grid-rows-7 gap-1.5">
                {col.map((cell, d) => (
                  <HeatmapCell key={d} date={cell.date} count={cell.count} isToday={cell.isToday} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl rounded-2xl p-4 shadow-lg">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-white">{i18n("activityJournalEntries")}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={i18n("journalSearchPlaceholder")}
                aria-label={i18n("journalSearchPlaceholder")}
                className="h-8 w-64 rounded-xl border border-white/10 bg-white/[0.04] pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500/50"
              />
            </div>
            <Select
              value={categoryFilter}
              onChange={(value) => setCategoryFilter(value as ActivityCategory | "all")}
              options={categoryOptions}
              aria-label={i18n("journalFilterCategory")}
              className="h-8 min-w-0 text-xs"
            />
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              options={typeOptions}
              aria-label={i18n("journalFilterType")}
              className="h-8 min-w-0 text-xs"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-zinc-500">
            {i18n("journalShowing").replace("{{count}}", String(filteredEntries.length))}
            {pendingCount > 0 ? ` · ${i18n("journalPending").replace("{{count}}", String(pendingCount))}` : ""}
          </p>
          <div className="flex items-center gap-2">
            {syncError && (
              <button
                type="button"
                onClick={() => sync()}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-2.5 py-1 transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                {i18n("journalSyncError")}
                {syncing ? i18n("journalRetrying") : i18n("journalRetry")}
              </button>
            )}
            {lastSyncText && !syncError && (
              <span className="text-[11px] text-zinc-500">{lastSyncText}</span>
            )}
            <button
              type="button"
              onClick={() => sync()}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium px-3 py-1.5 transition-all disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {syncing ? i18n("journalSyncing") : i18n("journalSyncNow")}
            </button>
          </div>
        </div>

        {grouped.length === 0 ? (
          <p className="text-sm text-zinc-500">{i18n("journalNoEntries")}</p>
        ) : (
          <div className="space-y-5">
            <AnimatePresence initial={false}>
              {grouped.map(({ key, group }) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-2"
                >
                  <span className="text-xs font-mono text-zinc-500 bg-white/[0.03] px-2.5 py-1 rounded-md border border-white/[0.05] inline-block">
                    {formatLocalDate(new Date(key), mounted)}
                  </span>
                  <div className="space-y-2">
                    {group.map((event, i) => {
                      const meta = CATEGORY_META[event.category] || CATEGORY_META.system;
                      return (
                        <div
                          key={event.id || i}
                          className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-zinc-950/50 p-3 transition-colors hover:border-white/[0.12] hover:bg-zinc-900/40"
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.bg} ${meta.border} border`}
                          >
                            <Icon name={event.icon || "activity"} className={`h-4 w-4 ${meta.color}`} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-semibold text-zinc-100">{event.title}</p>
                              <span className="text-[10px] bg-white/[0.05] text-zinc-400 px-1.5 py-0.5 rounded">
                                {i18n(event.category)}
                              </span>
                              {event.tone && (
                                <span className="text-[10px] bg-white/[0.05] text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                                  {event.eventType}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-zinc-500 mt-1">
                              {formatLocalTime(event.timestamp, mounted)}
                              {mounted ? " · " : ""}
                              <span className="text-zinc-400">{event.description}</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
