"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { LayoutGrid } from "lucide-react";
import BentoCard from "@/components/BentoCard";
import BrandMark from "@/components/BrandMark";
import MinecraftWidget from "@/components/MinecraftWidget";
import WeatherWidget, { type WeatherData } from "@/components/WeatherWidget";
import MediaWidget from "@/components/MediaWidget";
import { useHomeData } from "@/lib/hooks/useDashboard";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useMail } from "@/lib/hooks/useMail";
import { useItems } from "@/lib/hooks/useItems";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useFocus } from "@/components/FocusProvider";
import { type SessionMode } from "@/lib/settings";
import Link from "next/link";

const LiveStats = dynamic(() => import("@/components/LiveStats"));
const BillsWidget = dynamic(() => import("@/components/BillsWidget"));
const DailyBriefing = dynamic(() => import("@/components/DailyBriefing"));
const BrainBriefingPanel = dynamic(() => import("@/components/BrainBriefingPanel"));

function formatBytes(bytes = 0) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const AURAS = [
  { id: "classic", icon: "sparkles" },
  { id: "boreal", icon: "zap" },
  { id: "cyberpunk", icon: "flame" },
  { id: "eclipse", icon: "moon-star" },
  { id: "emerald", icon: "gem" },
  { id: "mineral", icon: "layers-3" },
] as const;

const SESSION_MODES: { id: SessionMode; icon: string; label: string; copy: string }[] = [
  { id: "default", icon: "circle", label: "sessionModeDefault", copy: "sessionModeDefaultCopy" },
  { id: "focus", icon: "target", label: "sessionModeFocus", copy: "sessionModeFocusCopy" },
  { id: "intense", icon: "zap", label: "sessionModeIntense", copy: "sessionModeIntenseCopy" },
  { id: "zen", icon: "coffee", label: "sessionModeZen", copy: "sessionModeZenCopy" },
  { id: "night", icon: "moon", label: "sessionModeNight", copy: "sessionModeNightCopy" },
];

type SectionDef = { id: string; label: string; icon: string };

type Continuation = {
  type: string;
  title: string;
  detail: string;
  action: string;
  href: string;
  icon: string;
};

type Recommendation = {
  title: string;
  detail: string;
  action: string;
  href: string;
  icon: string;
  onClick?: () => void;
};

function SessionModeSelector() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const activeIndex = SESSION_MODES.findIndex((m) => m.id === settings.sessionMode);
  const currentIndex = activeIndex >= 0 ? activeIndex : 0;
  const active = SESSION_MODES[currentIndex];

  function cycle() {
    const nextIndex = (currentIndex + 1) % SESSION_MODES.length;
    update({ sessionMode: SESSION_MODES[nextIndex].id });
  }

  return (
    <>
      <button
        type="button"
        onClick={cycle}
        title={i18n("changeSessionMode")}
        aria-label={i18n("changeSessionMode")}
        className="group flex w-full items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-left text-sm font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)] backdrop-blur-[var(--panel-blur)]"
      >
        <span className="flex items-center gap-2 text-[var(--foreground)]">
          <Icon name={active.icon} className="h-4 w-4 text-[var(--accent)]" />
          {i18n(active.label)}
        </span>
        <Icon name="chevron-right" className="h-4 w-4 text-[var(--muted)] transition-transform group-hover:translate-x-0.5" />
      </button>
      <p className="mt-2 text-xs text-[var(--muted)]">{i18n(active.copy)}</p>
    </>
  );
}

function AuraSelector() {
  const i18n = useI18n();
  const { settings, update } = useSettings();

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {AURAS.map((a) => {
        const active = settings.aura === a.id;
        const key = `aura${a.id.charAt(0).toUpperCase()}${a.id.slice(1)}`;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => update({ aura: a.id })}
            className={`flex flex-col items-center gap-1 rounded-[var(--panel-radius)] border p-2 text-center text-xs font-medium transition-colors ${
              active
                ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                : "border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
            } backdrop-blur-[var(--panel-blur)]`}
          >
            <Icon name={a.icon} className="h-4 w-4" />
            <span>{i18n(key)}</span>
          </button>
        );
      })}
    </div>
  );
}

function Summary({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--panel-radius)] bg-[var(--panel-bg)] p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--accent)]/10 text-[var(--accent)]">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold tabular-nums">{value}</p>
        <p className="text-[10px] text-[var(--muted)]">{label}</p>
      </div>
    </div>
  );
}

function SignalRow({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: "emerald" | "sky" | "amber" | "violet";
}) {
  const styles = {
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
    sky: { bg: "bg-sky-500/10", text: "text-sky-400" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-400" },
    violet: { bg: "bg-violet-500/10", text: "text-violet-400" },
  }[color];
  return (
    <div className="flex items-center justify-between rounded-[var(--panel-radius)] bg-[var(--panel-bg)] p-3">
      <div className="flex items-center gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--panel-radius)] ${styles.bg} ${styles.text}`}>
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${styles.text}`}>{value}</span>
    </div>
  );
}

export default function DashboardOverview() {
  const i18n = useI18n();
  const { settings, update: updateSettings } = useSettings();
  const { greeting, dashboard, nowPlaying, loading, error } = useHomeData();
  const live = useLiveData();
  const weather = live.weather as WeatherData | null;
  const { unread: unreadMail, loading: mailLoading } = useMail();
  const { items: tasks } = useItems("tasks");
  const { items: notes } = useItems("notes");
  const { items: events } = useItems("events");
  const { start } = useFocus();
  const [customizing, setCustomizing] = useState(false);

  const hidden = new Set(settings.homeHiddenSections || []);

  const STATUSES = [
    { id: "online", label: i18n("statusOnline"), icon: "circle" },
    { id: "busy", label: i18n("statusBusy"), icon: "minus-circle" },
    { id: "focus", label: i18n("statusFocus"), icon: "target" },
    { id: "away", label: i18n("statusAway"), icon: "moon" },
    { id: "invisible", label: i18n("statusInvisible"), icon: "eye-off" },
  ] as const;

  const sections: SectionDef[] = useMemo(
    () => [
      { id: "continuity", label: i18n("continuity"), icon: "activity" },
      { id: "daystream", label: i18n("daystream"), icon: "calendar" },
      { id: "recent", label: i18n("recent"), icon: "history" },
      { id: "productivity", label: i18n("productivityAndRhythm"), icon: "zap" },
      { id: "signals", label: i18n("signals"), icon: "radio" },
      { id: "recommendation", label: i18n("recommendation"), icon: "sparkles" },
      { id: "brain", label: i18n("brain"), icon: "brain" },
      { id: "live", label: i18n("live"), icon: "radio" },
    ],
    [i18n]
  );

  const today = useMemo(() => new Date(), []);

  const todayEvents = useMemo(
    () =>
      events.filter((e) => {
        const start = e.startAt ? new Date(e.startAt) : null;
        return (
          start &&
          start.getDate() === today.getDate() &&
          start.getMonth() === today.getMonth() &&
          start.getFullYear() === today.getFullYear()
        );
      }),
    [events, today]
  );

  const openTasksList = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const nextTasks = useMemo(() => openTasksList.slice(0, 3), [openTasksList]);
  const recentNotes = useMemo(
    () =>
      [...notes]
        .sort(
          (a, b) =>
            new Date(String(b.updatedAt || b.createdAt || 0)).getTime() -
            new Date(String(a.updatedAt || a.createdAt || 0)).getTime()
        )
        .slice(0, 3),
    [notes]
  );

  const openTasksCount = openTasksList.length;
  const totalTasks = openTasksCount + 3;
  const completed = Math.max(0, totalTasks - openTasksCount);
  const percentage = Math.round((completed / Math.max(1, totalTasks)) * 100);

  const continuation: Continuation = useMemo(() => {
    const highTask =
      openTasksList.find((t) => (t.data as { priority?: string } | undefined)?.priority === "high") ||
      openTasksList[0];
    if (highTask) {
      return {
        type: i18n("priorityTask"),
        title: highTask.title,
        detail: i18n("focusRecommended"),
        action: i18n("openTasks"),
        href: "/tasks",
        icon: "circle-check",
      };
    }
    if (todayEvents[0]) {
      return {
        type: i18n("nextEvent"),
        title: todayEvents[0].title,
        detail: todayEvents[0].title,
        action: i18n("calendar"),
        href: "/calendar",
        icon: "calendar-days",
      };
    }
    if (recentNotes[0]) {
      return {
        type: i18n("lastNote"),
        title: recentNotes[0].title,
        detail: i18n("continueNote"),
        action: i18n("resume"),
        href: "/notes",
        icon: "notebook-pen",
      };
    }
    return {
      type: i18n("newSpace"),
      title: i18n("dayStart"),
      detail: i18n("brainAvailableDesc"),
      action: i18n("brain"),
      href: "/brain",
      icon: "sparkles",
    };
  }, [openTasksList, todayEvents, recentNotes, i18n]);

  const recommendation: Recommendation = useMemo(() => {
    const highTask =
      openTasksList.find((t) => (t.data as { priority?: string } | undefined)?.priority === "high") ||
      openTasksList[0];
    if (highTask) {
      return {
        title: `${i18n("focusRecommended")} : ${highTask.title}`,
        detail: highTask.title,
        action: i18n("focus"),
        href: "/focus",
        icon: "timer",
        onClick: () => start("pomodoro"),
      };
    }
    if (todayEvents[0]) {
      return {
        title: i18n("nextEvent"),
        detail: todayEvents[0].title,
        action: i18n("calendar"),
        href: "/calendar",
        icon: "calendar-days",
      };
    }
    if (recentNotes[0]) {
      return {
        title: `${i18n("continueNote")} ${recentNotes[0].title}`,
        detail: i18n("continueNote"),
        action: i18n("notes"),
        href: "/notes",
        icon: "notebook-pen",
      };
    }
    return {
      title: i18n("brainAvailable"),
      detail: i18n("brainAvailableDesc"),
      action: i18n("openBrain"),
      href: "/brain",
      icon: "brain",
    };
  }, [openTasksList, todayEvents, recentNotes, i18n, start]);

  function toggleSection(id: string) {
    const next = hidden.has(id)
      ? (settings.homeHiddenSections || []).filter((x) => x !== id)
      : [...(settings.homeHiddenSections || []), id];
    updateSettings({ homeHiddenSections: next });
  }

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <header className="max-w-7xl mx-auto mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandMark size={36} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">ETHONE</h1>
            <p className="text-sm text-zinc-400">{i18n("home")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Workspace"
            className="rounded-lg border border-white/[0.08] bg-zinc-950/70 px-3 py-1.5 text-xs text-zinc-300 outline-none focus:border-white/20"
            defaultValue="ethone"
          >
            <option value="ethone">ETHONE</option>
            <option value="personal">Personnel</option>
          </select>
          <button
            type="button"
            onClick={() => setCustomizing((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-zinc-950/70 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white/20 hover:text-zinc-200"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            {customizing ? i18n("done") : "Personnaliser la grille"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4 max-w-7xl mx-auto">
        {customizing && (
          <BentoCard title={i18n("customizeDashboard")} icon="sliders-horizontal" className="col-span-12">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSection(s.id)}
                  className={`flex items-center gap-2 rounded-[var(--panel-radius)] border px-3 py-2 text-xs font-medium transition-colors ${
                    hidden.has(s.id)
                      ? "border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--muted)]"
                      : "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  }`}
                >
                  <Icon name={hidden.has(s.id) ? "eye-off" : "eye"} className="h-4 w-4" />
                  {s.label}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <AuraSelector />
            </div>
          </BentoCard>
        )}

        <BentoCard title="Briefing" icon="sun" className="col-span-12">
          <DailyBriefing greeting={greeting} dashboard={dashboard} nowPlaying={nowPlaying} loading={loading} />
        </BentoCard>

        <BentoCard title={i18n("sessionMode")} icon="target" className="col-span-12 sm:col-span-6 lg:col-span-4">
          <SessionModeSelector />
        </BentoCard>

        <BentoCard title={i18n("presence")} icon="circle" className="col-span-12 sm:col-span-6 lg:col-span-8">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => updateSettings({ status: s.id })}
                className={`flex items-center justify-center gap-2 rounded-[var(--panel-radius)] border px-3 py-2 text-xs font-medium transition-colors ${
                  settings.status === s.id
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                } backdrop-blur-[var(--panel-blur)]`}
              >
                <Icon name={s.icon} className="h-3.5 w-3.5" />
                {s.label}
              </button>
            ))}
          </div>
        </BentoCard>

        <BentoCard title={i18n("aura")} icon="palette" className="col-span-12 sm:col-span-6 lg:col-span-4">
          <AuraSelector />
        </BentoCard>

        {error && (
          <div className="col-span-12 rounded-[var(--panel-radius)] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error.message}
          </div>
        )}

        {!hidden.has("continuity") && (
          <BentoCard title={i18n("continuity")} icon="activity" className="col-span-12 lg:col-span-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-xs text-[var(--muted)]">{continuation.type}</p>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">{continuation.title}</h3>
                <p className="text-sm text-[var(--muted)]">{continuation.detail}</p>
              </div>
              <Link
                href={continuation.href}
                className="mt-2 inline-flex shrink-0 items-center gap-1.5 rounded-[var(--panel-radius)] bg-[var(--accent)] px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 md:mt-0"
              >
                <Icon name={continuation.icon} className="h-3.5 w-3.5" />
                {continuation.action}
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Summary icon="circle-check" label={i18n("openTasks")} value={openTasksCount} />
              <Summary icon="calendar" label={i18n("todayEvents")} value={todayEvents.length} />
              <Summary icon="notebook-pen" label={i18n("notes")} value={notes.length} />
            </div>
          </BentoCard>
        )}

        {!hidden.has("daystream") && (
          <BentoCard title={i18n("daystream")} icon="calendar" className="col-span-12 sm:col-span-6 lg:col-span-4">
            <div className="mb-3 flex items-center gap-2 text-xs text-[var(--accent)]">
              <Icon name="clock" className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wider">{i18n("daystreamNow")}</span>
            </div>
            <ul className="space-y-2">
              {todayEvents.slice(0, 3).map((e) => (
                <li key={e.id} className="flex items-center gap-2 rounded-[var(--panel-radius)] bg-[var(--panel-bg)] p-2 text-sm">
                  <Icon name="calendar-days" className="h-4 w-4 text-sky-400" />
                  <span className="min-w-0 flex-1 truncate">{e.title}</span>
                  <span className="text-[10px] text-[var(--muted)]">{i18n("events")}</span>
                </li>
              ))}
              {nextTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-2 rounded-[var(--panel-radius)] bg-[var(--panel-bg)] p-2 text-sm">
                  <Icon name="circle" className="h-4 w-4 text-emerald-400" />
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <span className="text-[10px] text-[var(--muted)]">{i18n("tasks")}</span>
                </li>
              ))}
              {todayEvents.length === 0 && nextTasks.length === 0 && (
                <li className="flex items-center gap-2 rounded-[var(--panel-radius)] bg-[var(--panel-bg)] p-2 text-sm text-[var(--muted)]">
                  <Icon name="coffee" className="h-4 w-4" />
                  <span>{i18n("noImperative")} — {i18n("freeDay")}</span>
                </li>
              )}
            </ul>
          </BentoCard>
        )}

        {!hidden.has("recent") && (
          <BentoCard title={i18n("recent")} icon="history" className="col-span-12 sm:col-span-6 lg:col-span-4">
            {recentNotes.length > 0 ? (
              <div className="space-y-2">
                {recentNotes.map((n) => (
                  <Link
                    key={n.id}
                    href="/notes"
                    className="flex items-center gap-2 rounded-[var(--panel-radius)] bg-[var(--panel-bg)] p-2 text-sm transition-colors hover:bg-[var(--panel-bg)]"
                  >
                    <Icon name="file-text" className="h-4 w-4 text-violet-400" />
                    <span className="min-w-0 flex-1 truncate">{n.title}</span>
                    <Icon name="chevron-right" className="h-3.5 w-3.5 text-[var(--muted)]" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[var(--muted)]">{i18n("noRecentNotes")}</div>
            )}
            <Link
              href="/notes"
              className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] backdrop-blur-[var(--panel-blur)]"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              {i18n("createNote")}
            </Link>
          </BentoCard>
        )}

        {!hidden.has("productivity") && (
          <BentoCard title={i18n("productivityAndRhythm")} icon="zap" className="col-span-12">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <BentoCard>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--muted)]">{i18n("tasksDone")}</span>
                  <span className="text-lg font-bold tabular-nums text-[var(--accent)]">{percentage}%</span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--panel-bg)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-colors duration-150"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </BentoCard>
              <BentoCard>
                <div className="flex items-center gap-2">
                  <Icon name="notebook-pen" className="h-4 w-4 text-[var(--muted)]" />
                  <span className="text-xs text-[var(--muted)]">{i18n("activeNotes")}</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{notes.length}</p>
                <p className="text-[10px] text-[var(--muted)]">{i18n("syncedToCloud")}</p>
              </BentoCard>
            </div>
            <div className="mt-4">
              <BillsWidget />
            </div>
          </BentoCard>
        )}

        {!hidden.has("signals") && (
          <BentoCard title={i18n("signals")} icon="radio" className="col-span-12">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <BentoCard>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-violet-500/10 text-violet-400">
                    <Icon name="zap" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">{loading ? "-" : dashboard?.totalFiles ?? 0}</p>
                    <p className="text-xs text-[var(--muted)]">{i18n("totalFiles")}</p>
                  </div>
                </div>
              </BentoCard>
              <BentoCard>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-emerald-500/10 text-emerald-400">
                    <Icon name="mail" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">{mailLoading ? "-" : unreadMail}</p>
                    <p className="text-xs text-[var(--muted)]">{i18n("unread")}</p>
                  </div>
                </div>
              </BentoCard>
              <BentoCard>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-amber-500/10 text-amber-400">
                    <Icon name="activity" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">{loading ? "-" : formatBytes(dashboard?.totalSize)}</p>
                    <p className="text-xs text-[var(--muted)]">{i18n("storageUsed")}</p>
                  </div>
                </div>
              </BentoCard>
              <BentoCard>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-sky-500/10 text-sky-400">
                    <Icon name="brain" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">{settings.brainEnabled ? "ON" : "OFF"}</p>
                    <p className="text-xs text-[var(--muted)]">{i18n("brain")}</p>
                  </div>
                </div>
              </BentoCard>
            </div>

            <BentoCard className="mt-4">
              <div className="space-y-2">
                <SignalRow icon="layers" label={i18n("interface")} value={i18n("active")} color="emerald" />
                <SignalRow icon="database" label={i18n("data")} value={i18n("connection")} color="sky" />
                <SignalRow icon="wifi" label={i18n("network")} value={i18n("online")} color="emerald" />
              </div>
            </BentoCard>
          </BentoCard>
        )}

        {!hidden.has("recommendation") && (
          <BentoCard title={i18n("recommendation")} icon="sparkles" className="col-span-12 lg:col-span-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--accent)]/10 text-[var(--accent)]">
                <Icon name={recommendation.icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[var(--accent)]">{i18n("recommendation")}</p>
                <h3 className="font-semibold text-[var(--foreground)]">{recommendation.title}</h3>
                <p className="text-sm text-[var(--muted)]">{recommendation.detail}</p>
              </div>
              <Link
                href={recommendation.href}
                onClick={() => recommendation.href === "/focus" && recommendation.onClick?.()}
                className="mt-2 inline-flex shrink-0 items-center gap-1.5 rounded-[var(--panel-radius)] bg-[var(--accent)] px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 md:mt-0"
              >
                <Icon name="arrow-right" className="h-3.5 w-3.5" />
                {recommendation.action}
              </Link>
            </div>
          </BentoCard>
        )}

        {!hidden.has("brain") && (
          <BentoCard title={i18n("brain")} icon="brain" className="col-span-12 sm:col-span-6 lg:col-span-4">
            <BrainBriefingPanel />
          </BentoCard>
        )}

        {!hidden.has("live") && (
          <BentoCard title={i18n("live")} icon="radio" className="col-span-12">
            <div className="grid grid-cols-12 gap-4">
              <BentoCard title="Minecraft" icon="gamepad-2" className="col-span-12 h-full lg:col-span-4">
                <MinecraftWidget className="!h-full !max-w-none !min-h-0 !border-0 !bg-transparent !p-0 !shadow-none !overflow-y-auto" />
              </BentoCard>

              <BentoCard title={i18n("weather")} icon="cloudSun" className="col-span-12 h-full sm:col-span-6 lg:col-span-4">
                <WeatherWidget data={weather} loading={live.loading && !weather} className="!h-full !max-w-none !min-h-0 !border-0 !bg-transparent !p-0 !shadow-none !overflow-y-auto" />
              </BentoCard>

              <BentoCard title={i18n("nowPlaying")} icon="disc" className="col-span-12 h-full sm:col-span-6 lg:col-span-4">
                <MediaWidget className="!h-full !max-w-none !min-h-0 !border-0 !bg-transparent !p-0 !shadow-none !overflow-y-auto" />
              </BentoCard>

              <BentoCard title={i18n("liveStats")} icon="activity" className="col-span-12 h-full">
                <LiveStats />
              </BentoCard>
            </div>
          </BentoCard>
        )}
      </div>
    </main>
  );
}
