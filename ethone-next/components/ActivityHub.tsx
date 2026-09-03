"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Flame, TrendingUp, Sparkles, ExternalLink, CheckCircle2, RefreshCw, Loader2, AlertCircle, Download, Trash2, FileJson, FileSpreadsheet, Lightbulb, BarChart2 } from "lucide-react";
import { useItems } from "@/lib/hooks/useItems";
import { useCloudFiles } from "@/lib/hooks/useCloudFiles";
import { useActivityJournal } from "@/lib/hooks/useActivityJournal";
import { useI18n } from "@/lib/hooks/useI18n";
import type { ActivityCategory, ActivityEntry, ActivitySnapshot } from "@/lib/activity-journal";
import { cn } from "@/lib/utils";
import { Icon } from "@/lib/icons";
import Input from "@/components/Input";
import AnimatedFilterTabs from "@/components/ui/AnimatedFilterTabs";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ToastProvider";
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatLocalDate(d: Date, mounted: boolean): string {
  return mounted ? d.toLocaleDateString() : dateKey(d.toISOString());
}

function displayCategory(e: ActivityEntry): string | null {
  for (const chip of CATEGORY_CHIPS) {
    if (chip.match(e)) return chip.id;
  }
  return null;
}

function clusterDayEvents(list: ActivityEntry[], thresholdMs = 12 * 60 * 1000) { // 12 minutes
  const clusters: { key: string; items: ActivityEntry[] }[] = [];
  let current: typeof clusters[0] | null = null;
  for (const e of list) {
    const t = new Date(e.timestamp).getTime();
    if (
      current &&
      e.title === current.items[0].title &&
      new Date(current.items[current.items.length - 1].timestamp).getTime() - t <= thresholdMs
    ) {
      current.items.push(e);
    } else {
      const key = `${dateKey(e.timestamp)}-${e.title}-${e.id}`;
      current = { key, items: [e] };
      clusters.push(current);
    }
  }
  return clusters;
}

function formatLocalTime(iso: string, mounted: boolean): string {
  return mounted ? new Date(iso).toLocaleTimeString() : "";
}

function formatRelative(iso: string, now: number, i18n: (k: string, ...args: unknown[]) => string): string {
  const ms = now - new Date(iso).getTime();
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return i18n("justNow", "à l'instant");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${i18n("minutesAgo", "il y a {{count}} min").replace("{{count}}", String(minutes))}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${i18n("hoursAgo", "il y a {{count}} h").replace("{{count}}", String(hours))}`;
  const days = Math.floor(hours / 24);
  return `${i18n("daysAgo", "il y a {{count}} j").replace("{{count}}", String(days))}`;
}

const PERIODS = [
  { id: "1", label: "Aujourd'hui" },
  { id: "2", label: "Hier" },
  { id: "7", label: "7j" },
  { id: "30", label: "30j" },
  { id: "90", label: "3m" },
  { id: "180", label: "6m" },
  { id: "365", label: "1an" },
];

function weeksForPeriod(days: number): number {
  if (days <= 2) return 1;
  if (days <= 7) return 2;
  if (days <= 30) return 5;
  if (days <= 90) return 13;
  if (days <= 180) return 26;
  return 53;
}

const CATEGORY_META: Record<ActivityCategory, { color: string; bg: string; border: string }> = {
  productivity: { color: "text-[var(--info)]", bg: "bg-[var(--info)]", border: "border-[var(--info)]" },
  work: { color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  system: { color: "text-[var(--accent-primary)]", bg: "bg-[var(--accent-primary)]", border: "border-[var(--accent-primary)]" },
  brain: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
};

type ChipDef = { id: string; label: string; match: (e: ActivityEntry) => boolean };

const CATEGORY_CHIPS: ChipDef[] = [
  { id: "productivity", label: "Productivité", match: (e) => e.category === "productivity" },
  { id: "gaming", label: "Gaming", match: (e) => /discord|steam/i.test(e.source) },
  { id: "media", label: "Média", match: (e) => /spotify|youtube/i.test(e.source) },
  { id: "development", label: "Développement", match: (e) => /github|gitlab/i.test(e.source) },
  { id: "brain", label: "Brain", match: (e) => e.category === "brain" },
  { id: "settings", label: "Réglages", match: (e) => e.category === "system" && /settings|theme|appearance/.test(e.eventType || "") },
  { id: "security", label: "Sécurité", match: (e) => /password|otp|passkey|login|new.device/i.test(e.eventType || "") },
  { id: "sessions", label: "Sessions", match: (e) => (e.eventType || "").startsWith("route:home") },
  { id: "widgets", label: "Widgets", match: (e) => /widget/i.test(e.eventType || "") },
  { id: "connections", label: "Connexions", match: (e) => /sync|connection/i.test(e.eventType || "") },
  { id: "automations", label: "Automations", match: (e) => /automation/i.test(e.eventType || "") },
  { id: "system", label: "Système", match: (e) => e.category === "system" },
];

const TONE_META: Record<string, { labelKey: string; color: string; bg: string }> = {
  success: { labelKey: "statusSuccess", color: "text-[var(--accent-primary)]", bg: "bg-[var(--accent-primary)] border border-[var(--accent-primary)]" },
  error: { labelKey: "statusError", color: "text-red-300", bg: "bg-red-500/15 border border-red-500/25" },
  failure: { labelKey: "statusError", color: "text-red-300", bg: "bg-red-500/15 border border-red-500/25" },
  warning: { labelKey: "statusWarning", color: "text-amber-300", bg: "bg-amber-500/15 border border-amber-500/25" },
  note: { labelKey: "journalTypeNote", color: "text-[var(--text-primary)]", bg: "bg-[var(--text-primary)]/[0.06] border border-[var(--text-primary)]/[0.08]" },
  task: { labelKey: "journalTypeTask", color: "text-[var(--text-primary)]", bg: "bg-[var(--text-primary)]/[0.06] border border-[var(--text-primary)]/[0.08]" },
  calendar: { labelKey: "journalTypeEvent", color: "text-[var(--text-primary)]", bg: "bg-[var(--text-primary)]/[0.06] border border-[var(--text-primary)]/[0.08]" },
  file: { labelKey: "journalTypeFile", color: "text-[var(--text-primary)]", bg: "bg-[var(--text-primary)]/[0.06] border border-[var(--text-primary)]/[0.08]" },
  navigation: { labelKey: "journalTypeRoute", color: "text-[var(--text-primary)]", bg: "bg-[var(--text-primary)]/[0.06] border border-[var(--text-primary)]/[0.08]" },
};

type StatCardProps = {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  tone?: "emerald" | "amber" | "cyan" | "purple";
};

function StatCard({ label, value, sub, icon, tone = "emerald" }: StatCardProps) {
  const toneRing = {
    emerald: "hover:border-[var(--accent-primary)]",
    amber: "hover:border-amber-500/30",
    cyan: "hover:border-[var(--info)]",
    purple: "hover:border-purple-500/30",
  }[tone];

  return (
    <div
      className={`group bg-zinc-950/80 border border-[var(--text-primary)]/[0.08] backdrop-blur-xl p-4 rounded-2xl shadow-lg hover:border-white/15 transition-all ${toneRing}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-mono font-bold tracking-tight text-[var(--text-primary)] mt-1">{value}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">{sub}</p>
        </div>
        <div className="shrink-0 rounded-xl bg-[var(--text-primary)]/[0.04] p-2 ring-1 ring-inset ring-[var(--text-primary)]/[0.06]">{icon}</div>
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="bg-zinc-950/80 border border-[var(--text-primary)]/[0.08] backdrop-blur-xl p-4 rounded-2xl shadow-lg animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="w-full space-y-2">
          <div className="h-3 w-16 rounded bg-[var(--text-primary)]/[0.06]" />
          <div className="h-8 w-20 rounded bg-[var(--text-primary)]/[0.08]" />
          <div className="h-3 w-28 rounded bg-[var(--text-primary)]/[0.04]" />
        </div>
        <div className="h-10 w-10 rounded-xl bg-[var(--text-primary)]/[0.04]" />
      </div>
    </div>
  );
}

function TimelineItem({
  event,
  mounted,
  i18n,
  onSelect,
}: {
  event: ActivityEntry;
  mounted: boolean;
  i18n: (key: string, ...args: unknown[]) => string;
  onSelect?: (event: ActivityEntry) => void;
}) {
  const meta = CATEGORY_META[event.category] || CATEGORY_META.system;
  const tone = event.tone || event.category;
  const toneMeta = TONE_META[tone] || { labelKey: event.category, color: "text-[var(--text-primary)]", bg: "bg-[var(--text-primary)]/[0.06] border border-[var(--text-primary)]/[0.08]" };
  const date = new Date(event.timestamp);

  return (
    <div
      onClick={() => onSelect?.(event)}
      className="group relative flex gap-3 cursor-pointer rounded-xl p-1 transition-colors hover:bg-white/[0.03]"
    >
      <div className="relative flex flex-col items-center">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${meta.bg} ${meta.border}`}>
          <Icon name={event.icon || "activity"} className={`h-4 w-4 ${meta.color}`} />
        </span>
        <div className="mt-1 h-full w-px border-l border-[var(--text-primary)]/[0.08]" />
      </div>
      <div className="min-w-0 flex-1 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-[var(--text-primary)]">{event.title}</p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${toneMeta.color} ${toneMeta.bg}`}>
            {i18n(toneMeta.labelKey)}
          </span>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">{event.description}</p>
        <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
          {formatLocalDate(date, mounted)} · {formatLocalTime(event.timestamp, mounted)}
        </p>
      </div>
    </div>
  );
}

function TimelineGroup({
  events,
  mounted,
  i18n,
  now,
  expanded,
  onToggle,
}: {
  events: ActivityEntry[];
  mounted: boolean;
  i18n: (key: string, ...args: unknown[]) => string;
  now: number | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const first = events[0];
  const meta = CATEGORY_META[first.category] || CATEGORY_META.system;
  const count = events.length;
  return (
    <div className="relative flex gap-3">
      <div className="relative flex flex-col items-center">
        <span className={cn("relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", meta.bg, meta.border)}>
          <Icon name={first.icon || "activity"} className={cn("h-4 w-4", meta.color)} />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[10px] font-bold text-[var(--accent-contrast)]">
            {count}
          </span>
        </span>
        <div className="mt-1 h-full w-px border-l border-[var(--text-primary)]/[0.08]" />
      </div>
      <div className="min-w-0 flex-1 pb-5">
        <button type="button" onClick={onToggle} className="w-full text-left">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              {count} {first.title}
            </p>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            {now ? formatRelative(first.timestamp, now, i18n) : ""}
          </p>
        </button>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-2 border-l border-[var(--text-primary)]/[0.08] pl-3">
                {events.map((event) => (
                  <div key={event.id} className="text-[11px] text-[var(--text-muted)]">
                    <span className="font-medium text-[var(--text-primary)]">{formatLocalTime(event.timestamp, mounted)}</span>
                    {" · "}{event.description}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function ActivityHub() {
  const i18n = useI18n();
  const { toast } = useToast();
  const [period, setPeriod] = useState<string>("365");
  const [query, setQuery] = useState("");
  const [activeChips, setActiveChips] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [today, setToday] = useState<Date | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [selectedEvent, setSelectedEvent] = useState<ActivityEntry | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<string>("all");
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const cat = searchParams?.get("cat");
    if (cat) setActiveChips([cat]);
    const q = searchParams?.get("q");
    if (q) setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    setMounted(true);
    setToday(new Date());
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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

  const { entries, pendingCount, syncing, syncError, lastSync, sync, clear } = useActivityJournal({
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
    if (activeChips.length > 0) {
      list = list.filter((e) => activeChips.some((id) => CATEGORY_CHIPS.find((c) => c.id === id)?.match(e)));
    }
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
  }, [entries, cutoff, activeChips, query]);

  const chipCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) {
      if (new Date(e.timestamp) < cutoff) continue;
      for (const chip of CATEGORY_CHIPS) {
        if (chip.match(e)) counts.set(chip.id, (counts.get(chip.id) || 0) + 1);
      }
    }
    return counts;
  }, [entries, cutoff]);

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
    let sessions = 0;
    for (let i = 0; i < periodDays; i++) {
      const key = dateKey(addDays(periodStart, i + 1).toISOString());
      const count = counts.get(key) || 0;
      totalActions += count;
      if (count > 0) activeDays++;
    }
    for (const e of entries) {
      const ts = new Date(e.timestamp);
      if (ts >= periodStart && e.eventType === "route:home") sessions++;
    }
    const average = activeDays > 0 ? (totalActions / activeDays).toFixed(1) : "0";
    const successRate = periodDays > 0 ? Math.round((activeDays / periodDays) * 100) : 0;

    return { todayCount, yesterdayCount, diff, streak, record, weekTotal, average, successRate, sessions, activeDays };
  }, [counts, periodDays, todayDate, entries]);

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

  const diffText = useMemo(() => {
    if (stats.diff === 0) return i18n("sameAsYesterday") || "= hier";
    if (stats.diff > 0) return `+${stats.diff} ${i18n("sinceYesterday") || "vs hier"}`;
    return `${stats.diff} ${i18n("sinceYesterday") || "vs hier"}`;
  }, [stats.diff, i18n]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const e of filteredEntries) {
      const id = displayCategory(e);
      if (!id) continue;
      map.set(id, (map.get(id) || 0) + 1);
      total++;
    }
    return Array.from(map.entries())
      .map(([id, count]) => {
        const chip = CATEGORY_CHIPS.find((c) => c.id === id);
        return {
          id,
          label: chip?.label || id,
          count,
          percent: total > 0 ? Math.round((count / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [filteredEntries]);

  const insights = useMemo(() => {
    if (filteredEntries.length < 3) return [] as { icon: string; title: string; desc: string }[];
    const items: { icon: string; title: string; desc: string }[] = [];

    const top = categoryBreakdown[0];
    if (top && top.percent > 0) {
      items.push({
        icon: "star",
        title: `${top.label} est votre catégorie principale`,
        desc: `${top.percent}% de vos activités récentes concernent cette catégorie.`,
      });
    }

    const periods: Record<string, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    for (const e of filteredEntries) {
      const h = new Date(e.timestamp).getHours();
      if (h >= 5 && h < 12) periods.morning++;
      else if (h >= 12 && h < 18) periods.afternoon++;
      else if (h >= 18 && h < 23) periods.evening++;
      else periods.night++;
    }
    const peak = Object.entries(periods).sort((a, b) => b[1] - a[1])[0];
    const periodInSentence: Record<string, string> = {
      morning: "le matin",
      afternoon: "l'après-midi",
      evening: "en soirée",
      night: "la nuit",
    };
    if (peak && peak[1] > 0) {
      const periodStr = periodInSentence[peak[0]] || "la nuit";
      items.push({
        icon: "clock",
        title: `Votre activité est principalement concentrée ${periodStr}`,
        desc: "C'est la plage horaire durant laquelle vous utilisez le plus votre espace ETHONE.",
      });
    }

    const sources = new Map<string, number>();
    for (const e of filteredEntries) sources.set(e.source, (sources.get(e.source) || 0) + 1);
    const topSource = Array.from(sources.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topSource && topSource[1] >= 2) {
      const srcRaw = topSource[0];
      const srcName = srcRaw.toLowerCase() === "ethone" ? "ETHONE" : capitalize(srcRaw);
      items.push({
        icon: "plug",
        title: `${srcName} est votre source la plus active`,
        desc: `${topSource[1]} événements et synchronisations enregistrés.`,
      });
    }

    let weekend = 0;
    let totalDays = 0;
    for (const e of filteredEntries) {
      const day = new Date(e.timestamp).getDay();
      if (day === 0 || day === 6) weekend++;
      totalDays++;
    }
    if (totalDays > 0 && weekend / totalDays > 0.55) {
      const pct = Math.round((weekend / totalDays) * 100);
      items.push({
        icon: "calendar",
        title: "Votre activité est plus élevée le week-end",
        desc: `${pct}% des événements et tâches ont lieu en fin de semaine.`,
      });
    }

    return items;
  }, [filteredEntries, categoryBreakdown]);

  const toggleChip = (id: string) => {
    if (id === "all") {
      setActiveChips([]);
      return;
    }
    setActiveChips((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleExport = () => {
    if (filteredEntries.length === 0) return;
    const date = new Date().toISOString().slice(0, 10);
    let content = "";
    let filename = "";
    if (exportFormat === "json") {
      content = JSON.stringify(filteredEntries, null, 2);
      filename = `ethone-activity-${date}.json`;
    } else {
      const header = "timestamp,title,description,source,category,eventType";
      const rows = filteredEntries.map((e) =>
        [e.timestamp, `"${e.title.replace(/"/g, '""')}"`, `"${e.description.replace(/"/g, '""')}"`, e.source, e.category, e.eventType || ""].join(",")
      );
      content = [header, ...rows].join("\n");
      filename = `ethone-activity-${date}.csv`;
    }
    const blob = new Blob([content], { type: exportFormat === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
    toast.success(i18n("exportDone", "Export terminé"), i18n("exportDoneDesc", "Votre activité a été téléchargée."));
  };

  const handleClear = () => {
    clear();
    setClearOpen(false);
    toast.success(i18n("historyCleared", "Historique effacé"), i18n("historyClearedDesc", "Votre journal d'activité a été supprimé."));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="default" padding="md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
              <Icon name="activity" pack="phosphor" className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">{i18n("activityJournal", "Activité")}</h1>
              <p className="text-xs text-[var(--text-muted)]">{i18n("activityJournalDescription", "Votre historique et votre activité ETHONE.")}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <AnimatedFilterTabs tabs={periodTabs} activeId={period} onChange={setPeriod} />
            <div className="flex items-center gap-2 ml-auto">
              {syncing ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {i18n("syncing", "Synchronisation...")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--success)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                  {i18n("synced", "Synchronisé")}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {mounted ? (
          <>
            <StatCard
              label={i18n("today", "Aujourd'hui")}
              value={stats.todayCount}
              sub={diffText}
              icon={<Activity className="h-5 w-5 text-[var(--accent-primary)]" />}
              tone="emerald"
            />
            <StatCard
              label={i18n("thisWeek", "Cette semaine")}
              value={stats.weekTotal}
              sub={i18n("last7Days") || "7 derniers jours"}
              icon={<TrendingUp className="h-5 w-5 text-[var(--info)]" />}
              tone="cyan"
            />
            <StatCard
              label={i18n("currentStreak", "Série active")}
              value={`${stats.streak}j`}
              sub={`${i18n("record", "Record")}: ${stats.record}j`}
              icon={<Flame className="h-5 w-5 text-amber-400" />}
              tone="amber"
            />
            <StatCard
              label={i18n("averagePerDay", "Moyenne / jour")}
              value={stats.average}
              sub={`${stats.activeDays} ${i18n("activeDays", "jours actifs")}`}
              icon={<CheckCircle2 className="h-5 w-5 text-purple-400" />}
              tone="purple"
            />
            <StatCard
              label={i18n("sessions", "Sessions")}
              value={stats.sessions}
              sub={i18n("recentSessions") || "ouvertures"}
              icon={<Icon name="home" pack="phosphor" className="h-5 w-5 text-[var(--success)]" />}
              tone="emerald"
            />
          </>
        ) : (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        )}
      </div>

      {/* Heatmap / Timeline */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Heatmap */}
          <Card padding="md">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{i18n("activityHeatmap", "Activité")}</h2>
          <span className="text-[10px] text-[var(--text-muted)]">{i18n("activityLastDays", "{{count}} derniers jours").replace("{{count}}", String(periodDays))}</span>
        </div>
        {mounted ? (
          <ActivityHeatmap entries={entries} weeks={weeksForPeriod(periodDays)} />
        ) : (
          <div className="h-40 animate-pulse rounded-xl bg-[var(--text-primary)]/[0.04]" />
        )}
      </Card>

      {/* Toolbar */}
      <div className="bg-zinc-950/80 border border-[var(--text-primary)]/[0.08] backdrop-blur-xl rounded-2xl p-4 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{i18n("activityJournalEntries")}</h2>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <Input
              ref={searchRef}
              type="text"
              icon="search"
              clearable
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={i18n("journalSearchPlaceholder", "Rechercher... (Ctrl+K)")}
              aria-label={i18n("journalSearchPlaceholder", "Rechercher dans votre activité")}
              inputSize="compact"
              className="min-w-0 w-full sm:w-56"
            />

            <div className="flex w-full flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => toggleChip("all")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  activeChips.length === 0
                    ? "border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
                    : "border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/[0.06]",
                )}
              >
                {i18n("all", "Toutes")}
              </button>
              {CATEGORY_CHIPS.map((chip) => {
                const count = chipCounts.get(chip.id) || 0;
                const active = activeChips.includes(chip.id);
                return (
                  <button
                    key={chip.id}
                    type="button"
                    disabled={count === 0}
                    onClick={() => toggleChip(chip.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      active
                        ? "border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
                        : "border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/[0.06]",
                      count === 0 && "opacity-40 cursor-not-allowed",
                    )}
                  >
                    {chip.label}
                    <span className="rounded-full bg-[var(--text-primary)]/[0.08] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">{count}</span>
                  </button>
                );
              })}
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
                <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">{lastSyncText}</span>
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
          <p className="text-xs text-[var(--text-muted)]">
            {i18n("journalShowing").replace("{{count}}", String(filteredEntries.length))}
            {pendingCount > 0 ? ` · ${i18n("journalPending").replace("{{count}}", String(pendingCount))}` : ""}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-zinc-950/80 border border-[var(--text-primary)]/[0.08] backdrop-blur-xl rounded-2xl p-4 shadow-lg">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)]">
              <Icon name="inbox" pack="phosphor" className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {i18n("activityEmptyTitle", "Aucune activité pour le moment")}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">
              {i18n("activityEmptyDescription", "Votre activité ETHONE apparaîtra ici lorsque vous commencerez à utiliser vos services.")}
            </p>
            <a
              href="/dashboard"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)]/10 px-3.5 py-2 text-xs font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/20"
            >
              {i18n("exploreEthone", "Explorer ETHONE")}
            </a>
          </div>
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
                  <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--text-primary)]/[0.03] px-2.5 py-1 rounded-md border border-[var(--text-primary)]/[0.05] inline-block">
                    {formatLocalDate(new Date(key), mounted)}
                  </span>
                  <div className="space-y-0">
                    {clusterDayEvents(group).map(({ key: clusterKey, items }) =>
                      items.length === 1 ? (
                        <TimelineItem key={clusterKey} event={items[0]} mounted={mounted} i18n={i18n} />
                      ) : (
                        <TimelineGroup
                          key={clusterKey}
                          events={items}
                          mounted={mounted}
                          i18n={i18n}
                          now={now}
                          expanded={expandedGroups.has(clusterKey)}
                          onToggle={() =>
                            setExpandedGroups((prev) => {
                              const next = new Set(prev);
                              if (next.has(clusterKey)) next.delete(clusterKey);
                              else next.add(clusterKey);
                              return next;
                            })
                          }
                        />
                      )
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
        </div>

        {/* Insights & breakdown */}
        <div className="space-y-4">
          <Card padding="md">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-[var(--accent-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{i18n("brainInsights", "Brain Insights")}</h2>
            </div>
            {insights.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                {i18n("noInsights", "Pas encore assez de données pour générer des insights.")}
              </p>
            ) : (
              <div className="space-y-3">
                {insights.map((insight, i) => (
                  <div key={i} className="rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] p-3">
                    <div className="flex items-center gap-2">
                      <Icon name={insight.icon} pack="phosphor" className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                      <p className="text-[11px] font-medium text-[var(--text-primary)]">{insight.title}</p>
                    </div>
                    <p className="mt-1 text-[10px] text-[var(--text-muted)] leading-relaxed">{insight.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card padding="md">
            <div className="mb-3 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-[var(--accent-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{i18n("activityByCategory", "Activité par catégorie")}</h2>
            </div>
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">{i18n("noCategoryData", "Aucune catégorie pour cette période.")}</p>
            ) : (
              <div className="space-y-2">
                {categoryBreakdown.map((c) => (
                  <div key={c.id}>
                    <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--text-primary)]">
                      <span>{c.label}</span>
                      <span className="text-[var(--text-muted)]">{c.percent}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--text-primary)]/[0.04]">
                      <div
                        className="h-1.5 rounded-full bg-[var(--accent-primary)]"
                        style={{ width: `${c.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card padding="md">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="settings" pack="phosphor" className="h-4 w-4 text-[var(--accent-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{i18n("historyManagement", "Gestion de l'historique")}</h2>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              {i18n("historyManagementDesc", "Exportez ou supprimez votre activité ETHONE.")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={() => setExportOpen(true)}>
                {i18n("export", "Exporter")}
              </Button>
              <Button size="sm" variant="danger" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setClearOpen(true)}>
                {i18n("clearHistory", "Effacer")}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Export modal */}
      <Modal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        title={i18n("exportActivity", "Exporter l'activité")}
        description={i18n("exportActivityDesc", "Choisissez le format et les données à exporter.")}
        size="sm"
        onConfirm={handleExport}
        confirmLabel={i18n("download", "Télécharger")}
        confirmDisabled={filteredEntries.length === 0}
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[11px] text-[var(--text-muted)]">{i18n("format", "Format")}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setExportFormat("csv")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                  exportFormat === "csv"
                    ? "border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
                    : "border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => setExportFormat("json")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                  exportFormat === "json"
                    ? "border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
                    : "border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <FileJson className="h-3.5 w-3.5" />
                JSON
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] p-3 text-xs text-[var(--text-muted)]">
            {filteredEntries.length} {i18n("eventsToExport", "événements à exporter")}
          </div>
        </div>
      </Modal>

      {/* Activity Event Detail Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || "Détails de l'activité"}
        description="Fiche détaillée de l'événement et actions associées"
        size="md"
        hideFooter
      >
        {selectedEvent && (
          <div className="space-y-4 p-1 text-xs">
            <div className="flex items-start gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)]">
                <Icon name={selectedEvent.icon || "activity"} className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h4 className="font-bold text-sm text-[var(--text-primary)]">
                  {selectedEvent.title}
                </h4>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  {selectedEvent.description}
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] text-[var(--text-muted)]">
                  <span className="rounded bg-white/5 px-2 py-0.5">
                    {formatLocalDate(new Date(selectedEvent.timestamp), mounted)}
                  </span>
                  <span className="rounded bg-white/5 px-2 py-0.5">
                    {formatLocalTime(selectedEvent.timestamp, mounted)}
                  </span>
                  <span className="rounded bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] px-2 py-0.5 font-bold uppercase">
                    {selectedEvent.category}
                  </span>
                </div>
              </div>
            </div>

            {/* Deep Link Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--panel-border)]/50">
              {/task/i.test(selectedEvent.category + selectedEvent.source) && (
                <Button size="sm" variant="secondary" onClick={() => { setSelectedEvent(null); router.push("/tasks"); }}>
                  Ouvrir les Tâches
                </Button>
              )}
              {/note/i.test(selectedEvent.category + selectedEvent.source) && (
                <Button size="sm" variant="secondary" onClick={() => { setSelectedEvent(null); router.push("/notes"); }}>
                  Ouvrir les Notes
                </Button>
              )}
              {/calendar|event/i.test(selectedEvent.category + selectedEvent.source) && (
                <Button size="sm" variant="secondary" onClick={() => { setSelectedEvent(null); router.push("/calendar"); }}>
                  Ouvrir le Calendrier
                </Button>
              )}
              {/file|drive/i.test(selectedEvent.category + selectedEvent.source) && (
                <Button size="sm" variant="secondary" onClick={() => { setSelectedEvent(null); router.push("/files"); }}>
                  Ouvrir les Fichiers
                </Button>
              )}
              {selectedEvent.category === "brain" && (
                <Button size="sm" variant="secondary" onClick={() => { setSelectedEvent(null); router.push("/brain"); }}>
                  Consulter ETHONE Brain
                </Button>
              )}
              {/discord|spotify|github|steam/i.test(selectedEvent.source) && (
                <Button size="sm" variant="secondary" onClick={() => { setSelectedEvent(null); router.push("/connections"); }}>
                  Gérer la connexion
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Clear modal */}
      <Modal
        isOpen={clearOpen}
        onClose={() => setClearOpen(false)}
        title={i18n("clearHistoryTitle", "Effacer l'historique")}
        description={i18n("clearHistoryDesc", "Cette action supprime définitivement votre journal d'activité local. Cette action est irréversible.")}
        size="sm"
        variant="danger"
        onConfirm={handleClear}
        confirmLabel={i18n("confirmClear", "Supprimer")}
        cancelLabel={i18n("cancel", "Annuler")}
      />
    </div>
  );
}
