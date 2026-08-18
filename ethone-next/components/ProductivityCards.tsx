"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/hooks/useI18n";
import { useFocus } from "@/components/FocusProvider";
import BentoCard from "@/components/BentoCard";
import { Icon } from "@/lib/icons";
import type { Item } from "@/lib/hooks/useItems";

type FocusApi = ReturnType<typeof useFocus>;

function formatNoteDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function formatEventTime(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function CircularGauge({ percentage, size = 40, stroke = 3 }: { percentage: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, percentage)) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--panel-border, rgba(255,255,255,0.08))"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent-color, var(--accent))"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="transition-all duration-500"
      />
    </svg>
  );
}

export type DayTimelineCardProps = {
  todayEvents: Item[];
  nextTasks: Item[];
  className?: string;
  focus?: FocusApi;
  scrollable?: boolean;
};

export function DayTimelineCard({ todayEvents, nextTasks, className = "", focus, scrollable = true }: DayTimelineCardProps) {
  const i18n = useI18n();
  const focusCtx = useFocus();
  const { state, format, start } = focus ?? focusCtx;

  const isLive = state.phase !== "idle";

  const events = useMemo(
    () =>
      [...todayEvents]
        .filter((e) => e.startAt)
        .sort((a, b) => new Date(String(a.startAt)).getTime() - new Date(String(b.startAt)).getTime())
        .slice(0, 3),
    [todayEvents]
  );

  const badge = isLive ? (
    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
      <Icon name="radio" className="h-3 w-3" />
      <span className="uppercase tracking-wider">{i18n("live")}</span>
    </span>
  ) : undefined;

  return (
    <BentoCard title={i18n("daystream")} icon="calendar" className={className} badge={badge} scrollable={scrollable}>
      <div className="flex h-full min-h-0 flex-col justify-between gap-3">
        <div className="space-y-2">
          {events.length > 0 &&
            events.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2"
              >
                <Icon name="calendar-days" className="h-4 w-4 text-sky-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  {formatEventTime(e.startAt) && <p className="text-[10px] text-[var(--muted)]">{formatEventTime(e.startAt)}</p>}
                </div>
              </div>
            ))}
          {nextTasks.length > 0 &&
            nextTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2"
              >
                <Icon name="circle" className="h-4 w-4 text-emerald-400" />
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</p>
              </div>
            ))}
          {events.length === 0 && nextTasks.length === 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-sm text-[var(--muted)]">
              <Icon name="coffee" className="h-4 w-4" />
              <span>
                {i18n("noImperative")} — {i18n("freeDay")}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-white">
              <Icon name="timer" className="h-3.5 w-3.5 text-[var(--accent)]" />
              {i18n("focus")}
            </span>
            {isLive ? (
              <span className="text-xs font-semibold text-emerald-400">{format(state.remaining)}</span>
            ) : (
              <button
                type="button"
                onClick={() => start("pomodoro")}
                className="text-[10px] font-medium text-[var(--accent)] hover:underline"
              >
                {i18n("start")}
              </button>
            )}
          </div>
          {isLive ? (
            <div className="h-1.5 w-full overflow-hidden rounded-xl bg-white/[0.06]">
              <div
                className="h-full rounded-xl bg-emerald-400 transition-all duration-1000"
                style={{ width: `${state.total ? ((state.total - state.remaining) / state.total) * 100 : 0}%` }}
              />
            </div>
          ) : (
            <p className="text-[10px] text-[var(--muted)]">{i18n("focusRecommended")}</p>
          )}
        </div>
      </div>
    </BentoCard>
  );
}

export type ProjectsTasksCardProps = {
  openTasksCount: number;
  completed: number;
  totalTasks: number;
  percentage: number;
  unreadMail?: number;
  mailLoading?: boolean;
  className?: string;
  focus?: FocusApi;
  scrollable?: boolean;
};

export function ProjectsTasksCard({
  openTasksCount,
  completed,
  totalTasks,
  percentage,
  unreadMail,
  mailLoading,
  className = "",
  focus,
  scrollable = true,
}: ProjectsTasksCardProps) {
  const i18n = useI18n();
  const focusCtx = useFocus();
  const { state } = focus ?? focusCtx;
  const focusMinutes = Math.round(state.totalFocusSeconds / 60);

  return (
    <BentoCard title={i18n("productivityAndRhythm")} icon="zap" className={className} scrollable={scrollable}>
      <div className="flex h-full min-h-0 flex-col justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
            <CircularGauge percentage={percentage} size={72} stroke={5} />
            <span className="absolute text-xs font-bold tabular-nums text-white">{percentage}%</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[var(--muted)]">{i18n("tasksDone")}</p>
            <p className="text-sm font-semibold text-white">
              {completed}/{totalTasks} {i18n("tasks")}
            </p>
            <p className="text-[10px] text-[var(--muted)]">
              {openTasksCount} {i18n("openTasks")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
              <Icon name="timer" className="h-3.5 w-3.5 text-rose-400" />
              {i18n("focusMinutes")}
            </div>
            <p className="text-lg font-bold leading-none text-rose-400">{focusMinutes}</p>
          </div>
          {typeof unreadMail === "number" && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
                <Icon name="mail" className="h-3.5 w-3.5 text-sky-400" />
                {i18n("unread")}
              </div>
              <p className="text-lg font-bold leading-none text-sky-400">{mailLoading ? "-" : unreadMail}</p>
            </div>
          )}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
              <Icon name="trophy" className="h-3.5 w-3.5 text-amber-400" />
              {i18n("focusDone")}
            </div>
            <p className="text-lg font-bold leading-none text-amber-400">{state.completedPomodoros}</p>
          </div>
        </div>
      </div>
    </BentoCard>
  );
}

export type RecentNotesCardProps = {
  notes: Item[];
  className?: string;
  scrollable?: boolean;
};

export function RecentNotesCard({ notes, className = "", scrollable = true }: RecentNotesCardProps) {
  const i18n = useI18n();
  const recent = useMemo(
    () =>
      [...notes]
        .sort(
          (a, b) =>
            new Date(String(b.updatedAt || b.createdAt || 0)).getTime() -
            new Date(String(a.updatedAt || a.createdAt || 0)).getTime()
        )
        .slice(0, 2),
    [notes]
  );

  const action = (
    <Link
      href="/notes"
      className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
    >
      <Icon name="plus" className="h-3 w-3" />
      {i18n("createNote")}
    </Link>
  );

  return (
    <BentoCard title={i18n("recent")} icon="history" className={className} action={action} scrollable={scrollable}>
      <div className="flex h-full min-h-0 flex-col justify-between gap-2">
        {recent.length > 0 ? (
          <div className="space-y-2">
            {recent.map((n) => (
              <Link
                key={n.id}
                href="/notes"
                className="group flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 transition-colors hover:bg-white/[0.04]"
              >
                <Icon name="file-text" className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white group-hover:text-[var(--accent)]">{n.title}</p>
                  <p className="text-[10px] text-[var(--muted)]">{formatNoteDate(n.updatedAt || n.createdAt)}</p>
                </div>
                <Icon name="chevron-right" className="h-3.5 w-3.5 text-[var(--muted)] group-hover:text-white" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">{i18n("noRecentNotes")}</p>
        )}
      </div>
    </BentoCard>
  );
}

export default function ProductivityCards({
  todayEvents,
  nextTasks,
  openTasksCount,
  completed,
  totalTasks,
  percentage,
  unreadMail,
  mailLoading,
  notes,
  className = "",
  focus,
}: {
  todayEvents: Item[];
  nextTasks: Item[];
  openTasksCount: number;
  completed: number;
  totalTasks: number;
  percentage: number;
  unreadMail?: number;
  mailLoading?: boolean;
  notes: Item[];
  className?: string;
  focus?: FocusApi;
}) {
  return (
    <div className={`grid grid-cols-12 gap-4 ${className}`}>
      <DayTimelineCard todayEvents={todayEvents} nextTasks={nextTasks} focus={focus} className="col-span-12" />
      <ProjectsTasksCard
        openTasksCount={openTasksCount}
        completed={completed}
        totalTasks={totalTasks}
        percentage={percentage}
        unreadMail={unreadMail}
        mailLoading={mailLoading}
        focus={focus}
        className="col-span-12"
      />
      <RecentNotesCard notes={notes} className="col-span-12" />
    </div>
  );
}
