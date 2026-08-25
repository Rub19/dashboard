"use client";

import { memo, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/hooks/useI18n";
import { useFocus } from "@/components/FocusProvider";
import BentoCard from "@/components/BentoCard";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
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
  loading?: boolean;
};

function DayTimelineCardImpl({ todayEvents, nextTasks, className = "", focus, scrollable = true, loading = false }: DayTimelineCardProps) {
  const i18n = useI18n();
  const router = useRouter();
  const handleAddEvent = useCallback(() => { router.push("/calendar"); }, [router]);
  const focusCtx = useFocus();
  const { state, format, start } = focus ?? focusCtx;

  const handleStartPomodoro = useCallback(() => {
    start("pomodoro");
  }, [start]);

  const isLive = state.phase !== "idle";

  const events = useMemo(
    () =>
      [...todayEvents]
        .filter((e) => e.startAt)
        .sort((a, b) => new Date(String(a.startAt)).getTime() - new Date(String(b.startAt)).getTime())
        .slice(0, 3),
    [todayEvents]
  );

  const badge = useMemo(
    () =>
      isLive ? (
        <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-primary)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent-primary)]">
          <Icon name="radio" className="h-3 w-3" />
          <span className="uppercase tracking-wider">{i18n("live")}</span>
        </span>
      ) : undefined,
    [isLive, i18n]
  );

  if (loading) {
    return (
      <BentoCard title={i18n("daystream")} icon="calendar" className={cn("h-full", className)} scrollable={scrollable} state="loading">
        <div />
      </BentoCard>
    );
  }

  const isEmpty = events.length === 0 && nextTasks.length === 0;

  return (
    <BentoCard
      title={i18n("daystream")}
      icon="calendar"
      className={cn("h-full", className)}
      badge={badge}
      scrollable={scrollable}
      state={isEmpty ? "empty" : undefined}
      stateMessage={isEmpty ? i18n("dayTimelineEmpty", "Aucun événement ou tâche aujourd'hui") : undefined}
      onAction={isEmpty ? handleAddEvent : undefined}
      actionLabel={i18n("seeAgenda", "Voir mon agenda")}
    >
      <div className="flex flex-1 flex-col justify-between gap-3">
        <div className="space-y-2">
          {events.length > 0 &&
            events.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-2 rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] px-2.5 py-2"
              >
                <Icon name="calendar-days" className="h-4 w-4 text-[var(--info)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  {formatEventTime(e.startAt) && <p className="text-[10px] text-[var(--text-muted)]">{formatEventTime(e.startAt)}</p>}
                </div>
              </div>
            ))}
          {nextTasks.length > 0 &&
            nextTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] px-2.5 py-2"
              >
                <Icon name="circle" className="h-4 w-4 text-[var(--accent-primary)]" />
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</p>
              </div>
            ))}
          {events.length === 0 && nextTasks.length === 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] px-2.5 py-2 text-sm text-[var(--text-muted)]">
              <Icon name="coffee" className="h-4 w-4" />
              <span>
                {i18n("noImperative")} — {i18n("freeDay")}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
              <Icon name="timer" className="h-3.5 w-3.5 text-[var(--accent)]" />
              {i18n("focus")}
            </span>
            {isLive ? (
              <span className="text-xs font-semibold text-[var(--accent-primary)]">{format(state.remaining)}</span>
            ) : (
              <button
                type="button"
                onClick={handleStartPomodoro}
                className="text-[10px] font-medium text-[var(--accent-primary)] hover:underline"
              >
                {i18n("start")}
              </button>
            )}
          </div>
          {isLive ? (
            <div className="h-1.5 w-full overflow-hidden rounded-xl bg-[var(--text-primary)]/[0.06]">
              <div
                className="h-full rounded-xl bg-[var(--accent-primary)] transition-all duration-1000"
                style={{ width: `${state.total ? ((state.total - state.remaining) / state.total) * 100 : 0}%` }}
              />
            </div>
          ) : (
            <p className="text-[10px] text-[var(--text-muted)]">{i18n("focusRecommended")}</p>
          )}
        </div>
      </div>
    </BentoCard>
  );
}

export const DayTimelineCard = memo(DayTimelineCardImpl);

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

function ProjectsTasksCardImpl({
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
    <BentoCard title={i18n("productivityAndRhythm")} icon="zap" className={cn("h-full", className)} scrollable={scrollable}>
      <div className="flex flex-1 flex-col justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
            <CircularGauge percentage={percentage} size={72} stroke={5} />
            <span className="absolute text-xs font-bold tabular-nums text-[var(--text-primary)]">{percentage}%</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[var(--text-muted)]">{i18n("tasksDone")}</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {completed}/{totalTasks} {i18n("tasks")}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              {openTasksCount} {i18n("openTasks")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] p-2">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <Icon name="timer" className="h-3.5 w-3.5 text-[var(--danger)]" />
              {i18n("focusMinutes")}
            </div>
            <p className="text-lg font-bold leading-none text-[var(--danger)]">{focusMinutes}</p>
          </div>
          {typeof unreadMail === "number" && (
            <div className="rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] p-2">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                <Icon name="mail" className="h-3.5 w-3.5 text-[var(--info)]" />
                {i18n("unread")}
              </div>
              <p className="text-lg font-bold leading-none text-[var(--info)]">{mailLoading ? "-" : unreadMail}</p>
            </div>
          )}
          <div className="rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] p-2">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <Icon name="trophy" className="h-3.5 w-3.5 text-[var(--warning)]" />
              {i18n("focusDone")}
            </div>
            <p className="text-lg font-bold leading-none text-[var(--warning)]">{state.completedPomodoros}</p>
          </div>
        </div>
      </div>
    </BentoCard>
  );
}

export const ProjectsTasksCard = memo(ProjectsTasksCardImpl);

export type RecentNotesCardProps = {
  notes: Item[];
  className?: string;
  scrollable?: boolean;
  loading?: boolean;
};

function RecentNotesCardImpl({ notes, className = "", scrollable = true, loading = false }: RecentNotesCardProps) {
  const i18n = useI18n();
  const router = useRouter();
  const handleAddNote = useCallback(() => { router.push("/notes"); }, [router]);
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

  const action = useMemo(
    () => (
      <Link
        href="/notes"
        className="relative z-0 inline-flex items-center gap-1 rounded-lg border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] px-2 py-1 text-[10px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)]"
      >
        <Icon name="plus" className="h-3 w-3" />
        {i18n("createNote")}
      </Link>
    ),
    [i18n]
  );

  const isEmpty = !loading && recent.length === 0;

  return (
    <BentoCard
      title={i18n("recent")}
      icon="history"
      className={cn("h-full", className)}
      action={action}
      scrollable={scrollable}
      state={loading ? "loading" : isEmpty ? "empty" : undefined}
      stateMessage={isEmpty ? i18n("noRecentNotes", "Aucune note récente") : undefined}
      onAction={isEmpty ? handleAddNote : undefined}
      actionLabel={i18n("createNote")}
    >
      <div className="flex flex-1 flex-col justify-between gap-2">
        {!loading && recent.length > 0 ? (
          <div className="space-y-2">
            {recent.map((n) => (
              <Link
                key={n.id}
                href="/notes"
                className="group flex items-start gap-2 rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] p-2.5 transition-colors hover:bg-[var(--text-primary)]/[0.04]"
              >
                <Icon name="file-text" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-secondary)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)]">{n.title}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{formatNoteDate(n.updatedAt || n.createdAt)}</p>
                </div>
                <Icon name="chevron-right" className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
              </Link>
            ))}
          </div>
        ) : (
          <div />
        )}
      </div>
    </BentoCard>
  );
}

export const RecentNotesCard = memo(RecentNotesCardImpl);

function ProductivityCardsImpl({
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

const ProductivityCards = memo(ProductivityCardsImpl);
export default ProductivityCards;
