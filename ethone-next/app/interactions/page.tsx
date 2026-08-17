"use client";

import React, { useMemo, useState } from "react";
import {
  Activity,
  Flame,
  Clock,
  Zap,
  BarChart3,
  Command,
  Sparkles,
  FileUp,
  Layers,
  ChevronRight,
  FileText,
  CheckSquare,
  CheckCircle2,
  Trash2,
  Calendar,
  RefreshCw,
  SlidersHorizontal,
  LayoutGrid,
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useUserData, type UserDataRecord } from "@/lib/hooks/useUserData";
import { InteractionsHeatmap } from "@/lib/interactions-heatmap";
import Tooltip from "@/components/Tooltip";

const INTERACTION_KINDS = [
  "like",
  "comment",
  "share",
  "noteCreate",
  "noteSave",
  "taskCreate",
  "taskComplete",
  "taskDelete",
  "eventCreate",
  "fileCreate",
  "spaceSwitch",
  "sync",
  "uiCustomize",
];

const WEEKDAY_KEYS = [
  "dayShortMon",
  "dayShortTue",
  "dayShortWed",
  "dayShortThu",
  "dayShortFri",
  "dayShortSat",
  "dayShortSun",
];

function getKind(record: UserDataRecord): string {
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
  if (typeof data.kind === "string" && INTERACTION_KINDS.includes(data.kind)) return data.kind;
  return "sync";
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function dateKey(d: Date) {
  return startOfDay(d).toISOString().slice(0, 10);
}

function formatMonthLabel(date: Date, locale = "fr") {
  return date.toLocaleDateString(locale, { month: "short" });
}

function formatDateLong(date: Date, locale = "fr") {
  return date.toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric" });
}

function timeAgo(iso: string, locale = "fr"): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `Il y a ${minutes}m`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function getHeatmapColor(level: number) {
  switch (level) {
    case 1:
      return "bg-emerald-950/70 border border-emerald-800/40";
    case 2:
      return "bg-emerald-800/80 border border-emerald-600/50";
    case 3:
      return "bg-emerald-500 border border-emerald-400/80";
    case 4:
      return "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)] border border-white/40";
    default:
      return "bg-white/[0.03] border border-white/[0.05]";
  }
}

function buildYearData(year: number, records: UserDataRecord[]) {
  const inYear = records.filter((r) => new Date(r.created_at).getFullYear() === year);
  const byDate: Record<string, { count: number; byHour: number[] }> = {};

  inYear.forEach((r) => {
    const d = new Date(r.created_at);
    const key = dateKey(d);
    if (!byDate[key]) byDate[key] = { count: 0, byHour: Array(24).fill(0) };
    byDate[key].count += 1;
    byDate[key].byHour[d.getHours()] += 1;
  });

  // First Monday of the week containing Jan 1
  const jan1 = new Date(year, 0, 1);
  const dow = jan1.getDay(); // 0 = Sun, 1 = Mon
  const diff = (dow === 0 ? -6 : 1) - dow;
  const start = new Date(jan1);
  start.setDate(jan1.getDate() + diff);

  const end = new Date(year, 11, 31);

  const weeks: { days: { date: Date; count: number; level: number; isOutOfMonth: boolean }[] }[] = [];
  const current = new Date(start);

  while (current <= end || weeks.length < 52) {
    const days: { date: Date; count: number; level: number; isOutOfMonth: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(current);
      const key = dateKey(d);
      const count = byDate[key]?.count || 0;
      const level = count > 0 ? InteractionsHeatmap.intensity(count, 15) : 0;
      days.push({ date: d, count, level, isOutOfMonth: d.getFullYear() !== year });
      d.setDate(d.getDate() + 1);
    }
    weeks.push({ days });
    current.setDate(current.getDate() + 7);
    if (weeks.length > 54) break;
  }

  const allCounts = Object.values(byDate).map((d) => d.count);
  const total = allCounts.reduce((a, b) => a + b, 0);
  const activeDays = allCounts.filter((c) => c > 0).length;
  const average = Math.round(total / 365) || 0;
  const consistency = Math.round((activeDays / 365) * 100) || 0;

  // streak (consecutive days with > 0 from latest day backwards)
  const today = new Date();
  const cursor = new Date(today.getFullYear() === year ? today : end);
  cursor.setHours(0, 0, 0, 0);
  let streak = 0;
  while (cursor >= start && cursor.getFullYear() === year) {
    const key = dateKey(cursor);
    if ((byDate[key]?.count || 0) > 0) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // record day
  const maxCount = allCounts.length ? Math.max(...allCounts) : 0;
  const recordEntry = Object.entries(byDate).find(([, v]) => v.count === maxCount) || ["", { count: 0, byHour: [] }];
  const recordDate = recordEntry[0] ? new Date(recordEntry[0]) : null;

  // peak 2h window
  const hourly = Array(24).fill(0);
  Object.values(byDate).forEach((d) => d.byHour.forEach((c, h) => (hourly[h] += c)));
  let bestStart = -1;
  let bestSum = -1;
  for (let h = 0; h < 23; h++) {
    const sum = hourly[h] + hourly[h + 1];
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = h;
    }
  }
  const peakHour = bestStart >= 0 ? `${bestStart}h - ${bestStart + 2}h` : "—";

  return {
    weeks,
    stats: {
      total,
      activeDays,
      average,
      consistency,
      streak,
      maxCount,
      recordDate,
      peakHour,
    },
  };
}

const CATEGORY_MAP: Record<string, string> = {
  noteCreate: "Raccourcis & Commandes",
  noteSave: "Raccourcis & Commandes",
  taskCreate: "Raccourcis & Commandes",
  taskComplete: "Raccourcis & Commandes",
  taskDelete: "Raccourcis & Commandes",
  eventCreate: "Raccourcis & Commandes",
  fileCreate: "Fichiers & Upload",
  spaceSwitch: "Interface & Navigation",
  uiCustomize: "Interface & Navigation",
  sync: "Actions IA / Brain",
  like: "Actions IA / Brain",
  comment: "Actions IA / Brain",
  share: "Actions IA / Brain",
};

const CATEGORY_META: Record<string, { color: string; icon: React.ElementType }> = {
  "Interface & Navigation": { color: "bg-emerald-400", icon: LayoutGrid },
  "Actions IA / Brain": { color: "bg-cyan-400", icon: Sparkles },
  "Raccourcis & Commandes": { color: "bg-purple-400", icon: Command },
  "Fichiers & Upload": { color: "bg-amber-400", icon: FileUp },
};

function iconForKind(kind: string): { icon: React.ElementType; color: string; label: string } {
  switch (kind) {
    case "like":
      return { icon: Heart, color: "text-rose-400", label: "J'aime" };
    case "comment":
      return { icon: MessageCircle, color: "text-cyan-400", label: "Commentaire" };
    case "share":
      return { icon: Share2, color: "text-emerald-400", label: "Partage" };
    case "noteCreate":
      return { icon: FileText, color: "text-emerald-400", label: "Note créée" };
    case "noteSave":
      return { icon: FileText, color: "text-emerald-400", label: "Note enregistrée" };
    case "taskCreate":
      return { icon: CheckSquare, color: "text-cyan-400", label: "Tâche créée" };
    case "taskComplete":
      return { icon: CheckCircle2, color: "text-cyan-400", label: "Tâche terminée" };
    case "taskDelete":
      return { icon: Trash2, color: "text-rose-400", label: "Tâche supprimée" };
    case "eventCreate":
      return { icon: Calendar, color: "text-amber-400", label: "Événement créé" };
    case "fileCreate":
      return { icon: FileUp, color: "text-purple-400", label: "Fichier ajouté" };
    case "spaceSwitch":
      return { icon: LayoutGrid, color: "text-zinc-300", label: "Espace changé" };
    case "sync":
      return { icon: RefreshCw, color: "text-emerald-400", label: "Synchronisation" };
    case "uiCustomize":
      return { icon: SlidersHorizontal, color: "text-zinc-300", label: "Personnalisation UI" };
    default:
      return { icon: Activity, color: "text-zinc-400", label: "Interaction" };
  }
}

export default function InteractionsPage() {
  const i18n = useI18n();
  const { settings } = useSettings();
  const { items: reactions, loading, error } = useUserData("interaction");
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const language = settings.language || "fr";
  const years = useMemo(() => [currentYear, currentYear + 1], [currentYear]);

  const { weeks, stats } = useMemo(() => buildYearData(selectedYear, reactions), [selectedYear, reactions]);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    reactions.forEach((r) => {
      const kind = getKind(r);
      if (new Date(r.created_at).getFullYear() !== selectedYear) return;
      const cat = CATEGORY_MAP[kind] || "Actions IA / Brain";
      counts[cat] = (counts[cat] || 0) + 1;
      total += 1;
    });
    const result = Object.entries(CATEGORY_META).map(([label, meta]) => {
      const count = counts[label] || 0;
      const percent = total ? Math.round((count / total) * 100) : 0;
      return { label, count, percent, ...meta };
    });
    return { rows: result, total };
  }, [reactions, selectedYear]);

  const recent = useMemo(() => {
    return [...reactions]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);
  }, [reactions]);

  const weekdays = WEEKDAY_KEYS.map((k) => i18n(k));

  const monthLabels = useMemo(() => {
    const labels: { index: number; label: string }[] = [];
    weeks.forEach((w, i) => {
      const firstDay = w.days[0];
      if (!firstDay || firstDay.isOutOfMonth) return;
      const d = firstDay.date;
      if (d.getDate() <= 7 || i === 0) {
        const label = formatMonthLabel(d, language);
        if (!labels.length || labels[labels.length - 1].label !== label) {
          labels.push({ index: i, label });
        }
      }
    });
    return labels;
  }, [weeks, language]);

  const topCategory = categories.rows.reduce((a, b) => (b.count > a.count ? b : a), categories.rows[0]);

  return (
    <div className="mx-auto flex max-w-7xl select-none flex-col gap-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white">
            <Activity className="h-6 w-6 text-emerald-400" />
            <span>{i18n("interactionsTitle")}</span>
          </h1>
          <p className="mt-0.5 text-xs text-zinc-400">Télémétrie complète de votre utilisation du système</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-zinc-950/80 px-3 py-1.5 text-xs font-medium text-zinc-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span>Télémétrie en direct</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Volume Total",
            value: loading ? "—" : stats.total.toLocaleString(language),
            sub: "↑ +14% vs semaine passée",
            icon: Activity,
            color: "text-emerald-400",
            subColor: "text-emerald-400",
          },
          {
            label: "Moyenne Quotidienne",
            value: loading ? "—" : `${stats.average} / j`,
            sub: `Régularité de ${stats.consistency}%`,
            icon: BarChart3,
            color: "text-cyan-400",
            subColor: "text-zinc-400",
          },
          {
            label: "Heure de Pointe",
            value: loading ? "—" : stats.peakHour,
            sub: "Session Focus habituelle",
            icon: Clock,
            color: "text-amber-400",
            subColor: "text-amber-400",
          },
          {
            label: "Série Active",
            value: loading ? "—" : `${stats.streak} Jours`,
            sub: stats.recordDate
              ? `Record : ${stats.maxCount} le ${stats.recordDate.toLocaleDateString(language, { month: "short", day: "numeric" })}`
              : "Record personnel en cours 🔥",
            icon: Flame,
            color: "text-rose-400",
            subColor: "text-rose-400",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="flex flex-col gap-1 rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-4 shadow-lg backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">{kpi.label}</span>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-white">{kpi.value}</div>
            <span className={`text-[10px] font-medium ${kpi.subColor}`}>{kpi.sub}</span>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="flex w-full flex-col gap-4 rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 shadow-xl backdrop-blur-2xl">
        <div className="flex flex-col justify-between gap-3 border-b border-white/[0.04] pb-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <Flame className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Heatmap des interactions ({selectedYear})</h3>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <span>Moins</span>
              {[0, 1, 2, 3, 4].map((level) => (
                <div key={level} className={`h-2.5 w-2.5 rounded-sm ${getHeatmapColor(level)}`} />
              ))}
              <span>Plus</span>
            </div>

            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-0.5">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setSelectedYear(y)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    selectedYear === y
                      ? "bg-emerald-500 text-zinc-950 shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-48 w-full animate-pulse rounded-xl bg-white/[0.03]" />
        ) : (
          <div className="overflow-x-auto pb-2 scrollbar-none">
            <div className="flex min-w-max gap-1 sm:gap-1.5" style={{ minWidth: `${weeks.length * 24}px` }}>
              {/* Day labels */}
              <div className="flex w-8 flex-col gap-1 pt-5 sm:gap-1.5">
                {weekdays.map((d, i) => (
                  <div
                    key={i}
                    className="flex h-3 w-3 items-center justify-end text-[10px] text-zinc-500 sm:h-3.5 sm:w-3.5"
                  >
                    {i % 2 === 0 ? d : ""}
                  </div>
                ))}
              </div>

              {/* Grid with month labels */}
              <div className="flex flex-col gap-1 sm:gap-1.5">
                <div className="relative flex h-4 gap-1 sm:gap-1.5">
                  {monthLabels.map((m, i) => (
                    <div
                      key={i}
                      className="absolute text-[10px] text-zinc-500"
                      style={{ left: `${m.index * 19}px` }}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>

                <div className="flex gap-1 sm:gap-1.5">
                  {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-1 sm:gap-1.5">
                      {week.days.map((day, di) => (
                        <div key={di} className="h-3 w-3 sm:h-3.5 sm:w-3.5">
                          {day.isOutOfMonth ? (
                            <div className="h-full w-full rounded-sm" />
                          ) : (
                            <Tooltip
                              label={`${day.count} interactions le ${formatDateLong(day.date, language)}`}
                              position="top"
                            >
                              <button
                                type="button"
                                className={`h-full w-full rounded-sm sm:rounded-md transition-all hover:z-10 hover:scale-125 ${getHeatmapColor(day.level)}`}
                                aria-label={`${day.count} interactions le ${formatDateLong(day.date, language)}`}
                              />
                            </Tooltip>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/[0.04] pt-3 text-[11px] text-zinc-500">
          <span>{loading ? "Chargement…" : `${stats.total.toLocaleString(language)} interactions enregistrées`}</span>
          <span>Données calculées en temps réel</span>
        </div>
      </div>

      {/* Bottom Bento row */}
      <div className="grid grid-cols-12 items-stretch gap-4">
        {/* Category breakdown */}
        <div className="col-span-12 flex flex-col justify-between gap-4 rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 shadow-xl backdrop-blur-2xl lg:col-span-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Répartition par source</h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">Année {selectedYear}</span>
          </div>

          <div className="flex flex-col gap-3">
            {categories.rows.map((item) => (
              <div key={item.label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-medium text-zinc-300">
                    <item.icon className="h-3.5 w-3.5 text-zinc-500" />
                    {item.label}
                    </span>
                  <span className="font-mono text-zinc-400">
                    {item.count} ({item.percent}%)
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-xl bg-white/[0.04]">
                  <div
                    className={`h-full rounded-xl ${item.color} shadow-[0_0_6px_rgba(255,255,255,0.1)]`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-[11px] text-zinc-400">
            <span>
              Module le plus sollicité : <strong className="text-white">{topCategory?.label || "—"}</strong>
            </span>
            <span className="font-medium text-emerald-400">Performances optimales</span>
          </div>
        </div>

        {/* Live feed */}
        <div className="col-span-12 flex flex-col justify-between gap-3 rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 shadow-xl backdrop-blur-2xl lg:col-span-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Journal en direct</h3>
            </div>
            <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
          </div>

          <div className="flex flex-col gap-2">
            {loading ? (
              <div className="h-48 w-full animate-pulse rounded-xl bg-white/[0.03]" />
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] p-6 text-center text-zinc-400">
                <Command className="h-5 w-5 text-zinc-500" />
                <p className="text-sm font-medium text-zinc-300">Aucune interaction récente</p>
                <p className="text-[11px]">Déclenchez une action pour alimenter le flux.</p>
              </div>
            ) : (
              recent.map((r, i) => {
                const kind = getKind(r);
                const { icon: IconComp, color, label } = iconForKind(kind);
                return (
                  <div
                    key={r.id || i}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5 transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <IconComp className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                      <span className="truncate text-xs text-zinc-300">{label}</span>
                    </div>
                    <span className="shrink-0 text-[10px] font-mono text-zinc-500">
                      {timeAgo(r.created_at, language)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 text-xs font-medium text-zinc-300 transition-all hover:bg-white/[0.06] hover:text-white"
          >
            <span>Voir tout l&apos;historique</span>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error.message}
        </div>
      )}
    </div>
  );
}
