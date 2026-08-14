"use client";

import { useMemo, useState } from "react";
import Card3D from "@/components/Card3D";
import LiveWidgets from "@/components/LiveWidgets";
import LiveStats from "@/components/LiveStats";
import BillsWidget from "@/components/BillsWidget";
import DailyBriefing from "@/components/DailyBriefing";
import BrainBriefingPanel from "@/components/BrainBriefingPanel";
import BrandMark from "@/components/BrandMark";
import { useHomeData } from "@/lib/hooks/useDashboard";
import { useMail } from "@/lib/hooks/useMail";
import { useItems } from "@/lib/hooks/useItems";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useFocus } from "@/components/FocusProvider";
import { type SessionMode } from "@/lib/settings";
import Link from "next/link";

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
    <Card3D tilt>
      <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">{i18n("sessionMode")}</h2>
      <button
        type="button"
        onClick={cycle}
        title={i18n("changeSessionMode")}
        aria-label={i18n("changeSessionMode")}
        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-left text-sm font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
      >
        <span className="flex items-center gap-2 text-[var(--foreground)]">
          <Icon name={active.icon} className="h-4 w-4 text-[var(--accent)]" />
          {i18n(active.label)}
        </span>
        <Icon name="chevron-right" className="h-4 w-4 text-[var(--muted)] transition-transform group-hover:translate-x-0.5" />
      </button>
      <p className="mt-2 text-xs text-[var(--muted)]">{i18n(active.copy)}</p>
    </Card3D>
  );
}

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

function SectionWrap({
  id,
  title,
  icon,
  children,
  hidden,
  action,
}: {
  id: string;
  title: string;
  icon: string;
  children: React.ReactNode;
  hidden: Set<string>;
  action?: React.ReactNode;
}) {
  if (hidden.has(id)) return null;
  return (
    <section className="space-y-3" data-section={id}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
          <Icon name={icon} className="h-5 w-5 text-[var(--accent)]" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Summary({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-raised)] p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold tabular-nums">{value}</p>
        <p className="text-[10px] text-[var(--muted)]">{label}</p>
      </div>
    </div>
  );
}

function AuraSelector() {
  const i18n = useI18n();
  const { settings, update } = useSettings();

  return (
    <Card3D tilt>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
        <Icon name="palette" className="h-4 w-4 text-[var(--accent)]" />
        {i18n("aura")}
      </h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {AURAS.map((a) => {
          const active = settings.aura === a.id;
          const key = `aura${a.id.charAt(0).toUpperCase()}${a.id.slice(1)}`;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => update({ aura: a.id })}
              className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center text-xs font-medium transition-colors ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon name={a.icon} className="h-4 w-4" />
              <span>{i18n(key)}</span>
            </button>
          );
        })}
      </div>
    </Card3D>
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
    <div className="flex items-center justify-between rounded-xl bg-[var(--surface-raised)] p-3">
      <div className="flex items-center gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.bg} ${styles.text}`}>
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${styles.text}`}>{value}</span>
    </div>
  );
}

export default function Home() {
  const i18n = useI18n();
  const { settings, update: updateSettings } = useSettings();
  const { greeting, dashboard, nowPlaying, lanyard, valorant, lol, loading, error } = useHomeData();
  const { unread: unreadMail, loading: mailLoading } = useMail();
  const { items: tasks } = useItems("tasks");
  const { items: notes } = useItems("notes");
  const { items: events } = useItems("events");
  const { start } = useFocus();
  const [customizing, setCustomizing] = useState(false);

  const matches = [...(valorant || []), ...(lol || [])].slice(0, 6);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandMark size={36} />
          <div>
            <h1 className="text-2xl font-bold leading-tight text-[var(--foreground)]">ETHONE</h1>
            <p className="text-xs text-[var(--muted)]">{i18n("home")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCustomizing((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <Icon name={customizing ? "x" : "sliders-horizontal"} className="h-3.5 w-3.5" />
          {customizing ? i18n("done") : i18n("customize")}
        </button>
      </div>

      <DailyBriefing greeting={greeting} dashboard={dashboard} nowPlaying={nowPlaying} loading={loading} />

      {customizing && (
        <Card3D tilt>
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">{i18n("customizeDashboard")}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSection(s.id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                  hidden.has(s.id)
                    ? "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted)]"
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
        </Card3D>
      )}

      <SessionModeSelector />

      <Card3D tilt>
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">{i18n("presence")}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => updateSettings({ status: s.id })}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                settings.status === s.id
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon name={s.icon} className="h-3.5 w-3.5" />
              {s.label}
            </button>
          ))}
        </div>
      </Card3D>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error.message}
        </div>
      )}

      <SectionWrap id="continuity" title={i18n("continuity")} icon="activity" hidden={hidden}>
        <Card3D tilt>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-xs text-[var(--muted)]">{continuation.type}</p>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">{continuation.title}</h3>
              <p className="text-sm text-[var(--muted)]">{continuation.detail}</p>
            </div>
            <Link
              href={continuation.href}
              className="mt-2 inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 md:mt-0"
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
        </Card3D>
      </SectionWrap>

      <SectionWrap id="daystream" title={i18n("daystream")} icon="calendar" hidden={hidden}>
        <Card3D tilt>
          <div className="mb-3 flex items-center gap-2 text-xs text-[var(--accent)]">
            <Icon name="clock" className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">{i18n("daystreamNow")}</span>
          </div>
          <ul className="space-y-2">
            {todayEvents.slice(0, 3).map((e) => (
              <li key={e.id} className="flex items-center gap-2 rounded-xl bg-[var(--surface-raised)] p-2 text-sm">
                <Icon name="calendar-days" className="h-4 w-4 text-sky-400" />
                <span className="min-w-0 flex-1 truncate">{e.title}</span>
                <span className="text-[10px] text-[var(--muted)]">{i18n("events")}</span>
              </li>
            ))}
            {nextTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-xl bg-[var(--surface-raised)] p-2 text-sm">
                <Icon name="circle" className="h-4 w-4 text-emerald-400" />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <span className="text-[10px] text-[var(--muted)]">{i18n("tasks")}</span>
              </li>
            ))}
            {todayEvents.length === 0 && nextTasks.length === 0 && (
              <li className="flex items-center gap-2 rounded-xl bg-[var(--surface-raised)] p-2 text-sm text-[var(--muted)]">
                <Icon name="coffee" className="h-4 w-4" />
                <span>{i18n("noImperative")} — {i18n("freeDay")}</span>
              </li>
            )}
          </ul>
        </Card3D>
      </SectionWrap>

      <SectionWrap id="recent" title={i18n("recent")} icon="history" hidden={hidden}>
        <Card3D tilt>
          {recentNotes.length > 0 ? (
            <div className="space-y-2">
              {recentNotes.map((n) => (
                <Link
                  key={n.id}
                  href="/notes"
                  className="flex items-center gap-2 rounded-xl bg-[var(--surface-raised)] p-2 text-sm transition-colors hover:bg-[var(--surface)]"
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
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            {i18n("createNote")}
          </Link>
        </Card3D>
      </SectionWrap>

      <SectionWrap id="productivity" title={i18n("productivityAndRhythm")} icon="zap" hidden={hidden}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card3D tilt>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--muted)]">{i18n("tasksDone")}</span>
              <span className="text-lg font-bold tabular-nums text-[var(--accent)]">{percentage}%</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </Card3D>
          <Card3D tilt>
            <div className="flex items-center gap-2">
              <Icon name="notebook-pen" className="h-4 w-4 text-[var(--muted)]" />
              <span className="text-xs text-[var(--muted)]">{i18n("activeNotes")}</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{notes.length}</p>
            <p className="text-[10px] text-[var(--muted)]">{i18n("syncedToCloud")}</p>
          </Card3D>
        </div>
        <BillsWidget />
        <AuraSelector />
      </SectionWrap>

      <SectionWrap id="signals" title={i18n("signals")} icon="radio" hidden={hidden}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card3D tilt>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <Icon name="zap" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-bold">{loading ? "-" : dashboard?.totalFiles ?? 0}</p>
                <p className="text-xs text-[var(--muted)]">{i18n("totalFiles")}</p>
              </div>
            </div>
          </Card3D>
          <Card3D tilt>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Icon name="mail" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-bold">{mailLoading ? "-" : unreadMail}</p>
                <p className="text-xs text-[var(--muted)]">{i18n("unread")}</p>
              </div>
            </div>
          </Card3D>
          <Card3D tilt>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Icon name="activity" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-bold">{loading ? "-" : formatBytes(dashboard?.totalSize)}</p>
                <p className="text-xs text-[var(--muted)]">{i18n("storageUsed")}</p>
              </div>
            </div>
          </Card3D>
          <Card3D tilt>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                <Icon name="brain" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-bold">{settings.brainEnabled ? "ON" : "OFF"}</p>
                <p className="text-xs text-[var(--muted)]">{i18n("brain")}</p>
              </div>
            </div>
          </Card3D>
        </div>

        <Card3D tilt>
          <div className="space-y-2">
            <SignalRow icon="layers" label={i18n("interface")} value={i18n("active")} color="emerald" />
            <SignalRow icon="database" label={i18n("data")} value={i18n("connection")} color="sky" />
            <SignalRow icon="wifi" label={i18n("network")} value={i18n("online")} color="emerald" />
          </div>
        </Card3D>

        <LiveStats />
      </SectionWrap>

      <SectionWrap id="recommendation" title={i18n("recommendation")} icon="sparkles" hidden={hidden}>
        <Card3D tilt>
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
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
              className="mt-2 inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 md:mt-0"
            >
              <Icon name="arrow-right" className="h-3.5 w-3.5" />
              {recommendation.action}
            </Link>
          </div>
        </Card3D>
      </SectionWrap>

      <SectionWrap id="brain" title={i18n("brain")} icon="brain" hidden={hidden}>
        <BrainBriefingPanel />
      </SectionWrap>

      <SectionWrap id="live" title={i18n("live")} icon="radio" hidden={hidden}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card3D tilt bump>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <Icon name="music" className="h-4 w-4 text-[var(--muted)]" /> {i18n("live")}
            </h2>
            {loading ? (
              <div className="space-y-3">
                <div className="h-2 w-3/4 animate-pulse rounded bg-[var(--border)]" />
                <div className="h-2 w-1/2 animate-pulse rounded bg-[var(--border)]" />
              </div>
            ) : nowPlaying?.title ? (
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
                  <Icon name="disc" className="h-5 w-5 animate-spin-slow" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{nowPlaying.title}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{nowPlaying.artist}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">{i18n("noLive")}</p>
            )}
          </Card3D>

          <Card3D tilt bump>
            <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">{i18n("cloud")}</h2>
            {loading ? (
              <div className="space-y-3">
                <div className="h-2 w-3/4 animate-pulse rounded bg-[var(--border)]" />
                <div className="h-2 w-1/2 animate-pulse rounded bg-[var(--border)]" />
              </div>
            ) : dashboard ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Icon name="folder" className="h-4 w-4 text-[var(--muted)]" />
                  <span className="text-sm">{dashboard.folders} {i18n("folders")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="heart" className="h-4 w-4 text-[var(--muted)]" />
                  <span className="text-sm">{dashboard.favorites} {i18n("favorites")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="share-2" className="h-4 w-4 text-[var(--muted)]" />
                  <span className="text-sm">{dashboard.activeShares} {i18n("shared")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="cloud" className="h-4 w-4 text-[var(--muted)]" />
                  <span className="text-sm">{dashboard.activeDrops} {i18n("drops")}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">{i18n("cloudUnavailable")}</p>
            )}
          </Card3D>

          <Card3D tilt bump>
            <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">{i18n("recentMatches")}</h2>
            {loading ? (
              <div className="space-y-3">
                <div className="h-2 w-3/4 animate-pulse rounded bg-[var(--border)]" />
                <div className="h-2 w-1/2 animate-pulse rounded bg-[var(--border)]" />
              </div>
            ) : matches.length > 0 ? (
              <div className="space-y-2">
                {matches.map((m, i) => (
                  <div key={m.id || i} className="flex items-center gap-2">
                    {m.agent || m.champion ? (
                      <Icon name="swords" className="h-4 w-4 text-violet-400" />
                    ) : (
                      <Icon name="shield" className="h-4 w-4 text-sky-400" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {m.map || m.mode || "Match"}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {m.kills ?? "-"}/{m.deaths ?? "-"}/{m.assists ?? "-"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">{i18n("noMatches")}</p>
            )}
          </Card3D>
        </div>

        {lanyard?.discord_status && (
          <Card3D tilt bump>
            <h2 className="mb-2 text-sm font-semibold text-[var(--foreground)]">{i18n("discord")}</h2>
            <div className="flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  lanyard.discord_status === "online"
                    ? "bg-emerald-500"
                    : lanyard.discord_status === "idle"
                    ? "bg-amber-500"
                    : lanyard.discord_status === "dnd"
                    ? "bg-red-500"
                    : "bg-zinc-500"
                }`}
              />
              <span className="text-sm capitalize">{lanyard.discord_status}</span>
              {lanyard.activities?.[0] && (
                <span className="ml-2 text-sm text-[var(--muted)]">
                  {lanyard.activities[0].name}
                </span>
              )}
            </div>
          </Card3D>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{i18n("live")}</h2>
          </div>
          <LiveWidgets showHeader={false} customizing={customizing} />
        </section>
      </SectionWrap>
    </div>
  );
}
