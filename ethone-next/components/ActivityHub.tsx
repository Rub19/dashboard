"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Flame, TrendingUp, CheckCircle2, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { useItems } from "@/lib/hooks/useItems";
import { useCloudFiles } from "@/lib/hooks/useCloudFiles";
import { useActivityJournal } from "@/lib/hooks/useActivityJournal";
import { useI18n } from "@/lib/hooks/useI18n";
import type { ActivityCategory, ActivityEntry, ActivitySnapshot } from "@/lib/activity-journal";
import { Icon } from "@/lib/icons";
import Input from "@/components/Input";
import Select from "@/components/ui/Select";
import AnimatedFilterTabs from "@/components/ui/AnimatedFilterTabs";
import ActivityHeatmap from "./ActivityHeatmap";

function dateKey(iso = ""): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatLocalDate(d: Date, mounted: boolean): string {
  return mounted ? d.toLocaleDateString() : dateKey(d.toISOString());
}

function formatLocalTime(iso: string, mounted: boolean): string {
  return mounted ? new Date(iso).toLocaleTimeString() : "";
}

const PERIODS = [
  { id: "7", label: "7j" },
  { id: "30", label: "30j" },
  { id: "90", label: "90j" },
  { id: "365", label: "365j" },
];

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
  productivity: { color: "text-[--info]", bg: "bg-[--info]", border: "border-[--info]" },
  work: { color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  system: { color: "text-[--accent-primary]", bg: "bg-[--accent-primary]", border: "border-[--accent-primary]" },
  brain: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
};

const TONE_META: Record<string, { labelKey: string; color: string; bg: string }> = {
  success: { labelKey: "statusSuccess", color: "text-[--accent-primary]", bg: "bg-[--accent-primary] border border-[--accent-primary]" },
  error: { labelKey: "statusError", color: "text-red-300", bg: "bg-red-500/15 border border-red-500/25" },
  failure: { labelKey: "statusError", color: "text-red-300", bg: "bg-red-500/15 border border-red-500/25" },
  warning: { labelKey: "statusWarning", color: "text-amber-300", bg: "bg-amber-500/15 border border-amber-500/25" },
  note: { labelKey: "journalTypeNote", color: "text-zinc-300", bg: "bg-white/[0.06] border border-white/[0.08]" },
  task: { labelKey: "journalTypeTask", color: "text-zinc-300", bg: "bg-white/[0.06] border border-white/[0.08]" },
  calendar: { labelKey: "journalTypeEvent", color: "text-zinc-300", bg: "bg-white/[0.06] border border-white/[0.08]" },
  file: { labelKey: "journalTypeFile", color: "text-zinc-300", bg: "bg-white/[0.06] border border-white/[0.08]" },
  navigation: { labelKey: "journalTypeRoute", color: "text-zinc-300", bg: "bg-white/[0.06] border border-white/[0.08]" },
};

function matchesType(eventType: string | undefined, type: string): boolean {
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
  tone?: "emerald" | "amber" | "cyan" | "purple";
};

function StatCard({ label, value, sub, icon, tone = "emerald" }: StatCardProps) {
  const toneRing = {
    emerald: "hover:border-[--accent-primary]",
    amber: "hover:border-amber-500/30",
    cyan: "hover:border-[--info]",
    purple: "hover:border-purple-500/30",
  }[tone];

  return (
    <div
      className={`group bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl p-4 rounded-2xl shadow-lg hover:border-white/15 transition-all ${toneRing}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-mono font-bold tracking-tight text-white mt-1">{value}</p>
          <p className="text-[11px] text-zinc-500 mt-1">{sub}</p>
        </div>
        <div className="shrink-0 rounded-xl bg-white/[0.04] p-2 ring-1 ring-inset ring-white/[0.06]">{icon}</div>
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl p-4 rounded-2xl shadow-lg animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="w-full space-y-2">
          <div className="h-3 w-16 rounded bg-white/[0.06]" />
          <div className="h-8 w-20 rounded bg-white/[0.08]" />
          <div className="h-3 w-28 rounded bg-white/[0.04]" />
        </div>
        <div className="h-10 w-10 rounded-xl bg-white/[0.04]" />
      </div>
    </div>
  );
}

function TimelineItem({
  event,
  mounted,
  i18n,
}: {
  event: ActivityEntry;
  mounted: boolean;
  i18n: (key: string, ...args: unknown[]) => string;
}) {
  const meta = CATEGORY_META[event.category] || CATEGORY_META.system;
  const tone = event.tone || event.category;
  const toneMeta = TONE_META[tone] || { labelKey: event.category, color: "text-zinc-300", bg: "bg-white/[0.06] border border-white/[0.08]" };
  const date = new Date(event.timestamp);

  return (
    <div className="relative flex gap-3">
      <div className="relative flex flex-col items-center">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${meta.bg} ${meta.border}`}>
          <Icon name={event.icon || "activity"} className={`h-4 w-4 ${meta.color}`} />
        </span>
        <div className="mt-1 h-full w-px border-l border-white/[0.08]" />
      </div>
      <div className="min-w-0 flex-1 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-zinc-100">{event.title}</p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${toneMeta.color} ${toneMeta.bg}`}>
            {i18n(toneMeta.labelKey)}
          </span>
        </div>
        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{event.description}</p>
        <p className="text-[11px] font-mono text-zinc-500 mt-1">
          {formatLocalDate(date, mounted)} · {formatLocalTime(event.timestamp, mounted)}
        </p>
      </div>
    </div>
  );
}

export default function ActivityHub() {
  const i18n = useI18n();
  const [period, setPeriod] = useState<string>("365");
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

  const periodDays = Number(period) || 365;
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - periodDays);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [periodDays]);

  const filteredEntries = useMemo(() => {
    let list = entries.filter((e) => new Date(e.timestamp) >= cutoff);
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

  const todayDate = useMemo(() => today ?? new Date(0), [today]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const key = dateKey(e.timestamp);
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [entries]);

  const stats = useMemo(() => {
    const todayKey = dateKey(todayDate.toISOString());
    const yesterday = addDays(todayDate, -1);
    const yesterdayKey = dateKey(yesterday.toISOString());
    const todayCount = counts.get(todayKey) || 0;
    const yesterdayCount = counts.get(yesterdayKey) || 0;
    const diff = todayCount - yesterdayCount;

    // Current streak (today counts only if it has activity)
    let streak = 0;
    const d = new Date(todayDate);
    for (let i = 0; i < 366; i++) {
      const key = dateKey(d.toISOString());
      if ((counts.get(key) || 0) > 0) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    // Record streak over the last year
    let record = 0;
    let current = 0;
    const r = new Date(todayDate);
    for (let i = 0; i < 366; i++) {
      const key = dateKey(r.toISOString());
      if ((counts.get(key) || 0) > 0) {
        current++;
        record = Math.max(record, current);
      } else {
        current = 0;
      }
      r.setDate(r.getDate() - 1);
    }

    const weekStart = startOfWeek(new Date(todayDate));
    let weekTotal = 0;
    for (let i = 0; i < 7; i++) {
      const key = dateKey(addDays(weekStart, i).toISOString());
      weekTotal += counts.get(key) || 0;
    }

    const periodStart = new Date(todayDate);
    periodStart.setDate(periodStart.getDate() - periodDays);
    let activeDays = 0;
    let totalActions = 0;
    for (let i = 0; i < periodDays; i++) {
      const key = dateKey(addDays(periodStart, i + 1).toISOString());
      const count = counts.get(key) || 0;
      totalActions += count;
      if (count > 0) activeDays++;
    }
    const average = activeDays > 0 ? (totalActions / activeDays).toFixed(1) : "0";
    const successRate = periodDays > 0 ? Math.round((activeDays / periodDays) * 100) : 0;

    return { todayCount, yesterdayCount, diff, streak, record, weekTotal, average, successRate };
  }, [counts, periodDays, todayDate]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>();
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

  const periodTabs = useMemo(() => PERIODS.map((p) => ({ id: p.id, label: p.label })), []);

  const categoryOptions = useMemo(
    () => CATEGORIES.map((c) => ({ id: c.id, label: i18n(c.labelKey) })),
    [i18n]
  );

  const typeOptions = useMemo(
    () => TYPES.map((t) => ({ id: t.id, label: i18n(t.labelKey) })),
    [i18n]
  );

  const diffText = useMemo(() => {
    if (stats.diff === 0) return i18n("sameAsYesterday") || "= hier";
    if (stats.diff > 0) return `+${stats.diff} ${i18n("sinceYesterday") || "vs hier"}`;
    return `${stats.diff} ${i18n("sinceYesterday") || "vs hier"}`;
  }, [stats.diff, i18n]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{i18n("activityJournal")}</h1>
          <p className="text-sm text-zinc-500 mt-1">{i18n("activityJournalDescription")}</p>
        </div>
        <AnimatedFilterTabs tabs={periodTabs} activeId={period} onChange={setPeriod} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {mounted ? (
          <>
            <StatCard
              label={i18n("today")}
              value={stats.todayCount}
              sub={diffText}
              icon={<Activity className="h-5 w-5 text-[--accent-primary]" />}
              tone="emerald"
            />
            <StatCard
              label={i18n("currentStreak")}
              value={`${stats.streak}j`}
              sub={`${i18n("record") || "Record"}: ${stats.record}j`}
              icon={<Flame className="h-5 w-5 text-amber-400" />}
              tone="amber"
            />
            <StatCard
              label={i18n("averagePerDay") || "Moyenne / jour"}
              value={stats.average}
              sub={`${stats.weekTotal} ${i18n("thisWeek") || "cette semaine"}`}
              icon={<TrendingUp className="h-5 w-5 text-[--info]" />}
              tone="cyan"
            />
            <StatCard
              label={i18n("successRate") || "Taux de succès"}
              value={`${stats.successRate}%`}
              sub={i18n("consistency")}
              icon={<CheckCircle2 className="h-5 w-5 text-purple-400" />}
              tone="purple"
            />
          </>
        ) : (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        )}
      </div>

      {/* Heatmap */}
      <div className="bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl rounded-2xl p-4 shadow-lg">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">{i18n("activityHeatmap")}</h2>
          <span className="text-[10px] text-zinc-500">{i18n("activityLastDays").replace("{{count}}", "365")}</span>
        </div>
        {mounted ? <ActivityHeatmap entries={entries} /> : <div className="h-40 animate-pulse rounded-xl bg-white/[0.04]" />}
      </div>

      {/* Toolbar */}
      <div className="bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl rounded-2xl p-4 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-sm font-semibold text-white">{i18n("activityJournalEntries")}</h2>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <Input
              type="text"
              icon="search"
              clearable
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={i18n("journalSearchPlaceholder")}
              aria-label={i18n("journalSearchPlaceholder")}
              inputSize="compact"
              className="min-w-0 w-full sm:w-56"
            />

            <div className="flex items-center gap-2">
              <Select
                value={categoryFilter}
                onChange={(value) => setCategoryFilter(value as ActivityCategory | "all")}
                options={categoryOptions}
                aria-label={i18n("journalFilterCategory")}
                className="h-9 w-36 text-xs"
              />
              <Select
                value={typeFilter}
                onChange={setTypeFilter}
                options={typeOptions}
                aria-label={i18n("journalFilterType")}
                className="h-9 w-36 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {syncError && (
                <button
                  type="button"
                  onClick={() => sync()}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-xs px-3 py-1.5 transition-colors hover:bg-[var(--danger)]/20 disabled:opacity-50"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  {i18n("journalSyncError")}
                  {syncing ? i18n("journalRetrying") || "..." : i18n("journalRetry") || "Réessayer"}
                </button>
              )}

              {lastSyncText && !syncError && (
                <span className="text-[11px] text-zinc-500 hidden sm:inline">{lastSyncText}</span>
              )}

              <button
                type="button"
                onClick={() => sync()}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)]/15 hover:bg-[var(--accent-primary)]/25 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] text-xs font-medium px-3.5 py-1.5 transition-all disabled:opacity-50"
              >
                {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {syncing ? i18n("journalSyncing") : i18n("journalSyncNow")}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            {i18n("journalShowing").replace("{{count}}", String(filteredEntries.length))}
            {pendingCount > 0 ? ` · ${i18n("journalPending").replace("{{count}}", String(pendingCount))}` : ""}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl rounded-2xl p-4 shadow-lg">
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
                  <div className="space-y-0">
                    {group.map((event) => (
                      <TimelineItem key={event.id} event={event} mounted={mounted} i18n={i18n} />
                    ))}
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
