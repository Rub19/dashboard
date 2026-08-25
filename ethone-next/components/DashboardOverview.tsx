"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { LayoutGrid } from "lucide-react";
import { EASE_OUT } from "@/lib/ease";
import BentoCard from "@/components/BentoCard";
import HeroBriefingCard from "@/components/HeroBriefingCard";
import SystemControlCard from "@/components/SystemControlCard";
import { DayTimelineCard, RecentNotesCard } from "@/components/ProductivityCards";
import TasksWidget from "@/components/TasksWidget";
import { useCloudTasks } from "@/lib/hooks/useCloudTasks";
import { useHomeData } from "@/lib/hooks/useDashboard";
import { useLiveData } from "@/lib/hooks/useLiveData";

import { useItems } from "@/lib/hooks/useItems";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useFocus } from "@/components/FocusProvider";
import { useDesktopLayout, type WidgetLayout } from "@/lib/hooks/useDesktopLayout";
import { Icon } from "@/lib/icons";
import PullToRefresh from "@/components/PullToRefresh";
import DashboardSkeleton from "@/components/DashboardSkeleton";

const LiveBentoGrid = dynamic(() => import("@/components/LiveBentoGrid"));
const BillsWidget = dynamic(() => import("@/components/BillsWidget"));
const BrainBriefingPanel = dynamic(() => import("@/components/BrainBriefingPanel"));

type SectionDef = { id: string; label: string; icon: string };

const homeCardClass = "h-auto min-h-0 overflow-visible";

const gridVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.04,
    },
  },
};

const widgetItemVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.36, ease: EASE_OUT },
  },
};

const WIDGET_COL_SPAN: Record<string, string> = {
  hero: "col-span-12 lg:col-span-8",
  system: "col-span-12 lg:col-span-4",
  daystream: "col-span-12 sm:col-span-6 lg:col-span-4",
  productivity: "col-span-12 sm:col-span-6 lg:col-span-4",
  recent: "col-span-12 sm:col-span-6 lg:col-span-4",
  brain: "col-span-12 sm:col-span-6 lg:col-span-6",
  bills: "col-span-12 sm:col-span-6 lg:col-span-6",
  live: "col-span-12",
};

const WIDGET_PRIORITY_SCORES: Record<string, Record<string, number>> = {
  morning: { daystream: 90, productivity: 80, hero: 70, brain: 60, recent: 50, bills: 40, live: 30, system: 20 },
  work: { productivity: 90, brain: 80, hero: 70, daystream: 60, recent: 50, bills: 40, live: 30, system: 20 },
  evening: { live: 90, brain: 80, hero: 70, daystream: 60, recent: 50, productivity: 40, bills: 30, system: 20 },
  night: { hero: 90, brain: 70, recent: 60, bills: 50, system: 40, daystream: 30, productivity: 20, live: 10 },
};

function getDayPeriod(hour: number) {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "work";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
}

const DEFAULT_WIDGETS: WidgetLayout[] = [
  { id: "hero", x: 0, y: 0, w: 12, h: 2, visible: true },
  { id: "system", x: 0, y: 1, w: 4, h: 1, visible: true },
  { id: "daystream", x: 4, y: 1, w: 4, h: 1, visible: true },
  { id: "productivity", x: 8, y: 1, w: 4, h: 1, visible: true },
  { id: "recent", x: 0, y: 2, w: 4, h: 1, visible: true },
  { id: "brain", x: 0, y: 3, w: 6, h: 1, visible: true },
  { id: "bills", x: 6, y: 3, w: 6, h: 1, visible: true },
  { id: "live", x: 0, y: 4, w: 12, h: 2, visible: true },
];

export default function DashboardOverview() {
  const i18n = useI18n();
  const { settings } = useSettings();
  const { greeting, dashboard, nowPlaying, loading, error } = useHomeData();
  const live = useLiveData();
  const tasksApi = useCloudTasks();
  const { items: notes, loading: notesLoading } = useItems("notes");
  const { items: events, loading: eventsLoading } = useItems("events");
  const bentoLoading = loading || notesLoading || eventsLoading || tasksApi.loading;
  const focus = useFocus();
  const [customizing, setCustomizing] = useState(false);
  const { layout, update: updateLayout } = useDesktopLayout();
  const hour = useMemo(() => new Date().getHours(), []);

  const widgets = useMemo<WidgetLayout[]>(() => {
    const hidden = new Set(settings.homeHiddenSections || []);
    const base =
      layout && layout.widgets.length > 0
        ? layout.widgets
        : DEFAULT_WIDGETS.map((w) => ({ ...w, visible: !hidden.has(w.id) }));
    const seen = new Set<string>();
    const sanitized = base.filter((w) => {
      if (!w.id || seen.has(w.id)) return false;
      seen.add(w.id);
      return true;
    });
    const period = getDayPeriod(hour);
    const scores = WIDGET_PRIORITY_SCORES[period];
    const sorted = [...sanitized].sort(
      (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0)
    );
    return sorted.length > 0 ? sorted : DEFAULT_WIDGETS.map((w) => ({ ...w, visible: !hidden.has(w.id) }));
  }, [layout, settings.homeHiddenSections, hour]);

  const sections: SectionDef[] = useMemo(
    () =>
      widgets.map((w) => {
        const meta: Record<string, { label: string; icon: string }> = {
          hero: { label: i18n("home"), icon: "sun" },
          system: { label: i18n("system"), icon: "sliders-horizontal" },
          daystream: { label: i18n("daystream"), icon: "calendar" },
          productivity: { label: i18n("productivityAndRhythm"), icon: "zap" },
          recent: { label: i18n("recent"), icon: "history" },
          brain: { label: i18n("brain"), icon: "brain" },
          bills: { label: i18n("billsTitle"), icon: "bills" },
          live: { label: i18n("live"), icon: "radio" },
        };
        const info = meta[w.id] ?? { label: w.id, icon: "square" };
        return { id: w.id, ...info };
      }),
    [widgets, i18n]
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

  const openTasksList = useMemo(() => tasksApi.items.filter((t) => !t.done), [tasksApi.items]);
  const nextTasks = useMemo(() => openTasksList.slice(0, 3), [openTasksList]);

  const openTasksCount = openTasksList.length;

  function toggleSection(id: string) {
    const next = widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
    void updateLayout(next);
  }

  const visibleSet = useMemo(() => new Set(widgets.filter((w) => w.visible).map((w) => w.id)), [widgets]);

  function renderWidget(id: string) {
    switch (id) {
      case "hero":
        return (
          <HeroBriefingCard
            greeting={greeting}
            dashboard={dashboard}
            nowPlaying={nowPlaying}
            loading={bentoLoading}
            openTasksCount={openTasksCount}
            todayEventsCount={todayEvents.length}
            notesCount={notes.length}
            scrollable={false}
            className={homeCardClass}
          />
        );
      case "system":
        return <SystemControlCard scrollable={false} className={homeCardClass} />;
      case "daystream":
        return (
          <DayTimelineCard
            todayEvents={todayEvents}
            nextTasks={nextTasks}
            focus={focus}
            loading={bentoLoading}
            scrollable={false}
            className={homeCardClass}
          />
        );
      case "productivity":
        return <TasksWidget data={tasksApi} scrollable={false} className={homeCardClass} />;
      case "recent":
        return <RecentNotesCard notes={notes} loading={bentoLoading} scrollable={false} className={homeCardClass} />;
      case "brain":
        return (
          <BentoCard title={i18n("brain")} icon="brain" scrollable={false} className={homeCardClass}>
            <BrainBriefingPanel />
          </BentoCard>
        );
      case "bills":
        return (
          <BentoCard title={i18n("billsTitle")} icon="bills" scrollable={false} className={homeCardClass}>
            <BillsWidget />
          </BentoCard>
        );
      case "live":
        return (
          <LiveBentoGrid
            nowPlaying={live.nowPlaying}
            lanyard={live.lanyard}
            weather={live.weather}
            minecraft={live.minecraft}
            valorant={live.valorant}
            lol={live.lol}
            liveTrackerRiotName={live.liveTrackerRiotName}
            liveTrackerRiotTag={live.liveTrackerRiotTag}
            records={live.records}
            updatedAt={live.updatedAt}
            loading={live.loading}
            error={live.error}
            scrollable={false}
            className={homeCardClass}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PullToRefresh onRefresh={() => window.location.reload()}>
        <div className="mx-auto w-full max-w-[1600px] px-2 sm:px-4">
        <header className="shrink-0 mb-3 flex w-full items-center justify-end">
        <button
          type="button"
          onClick={() => setCustomizing((v) => !v)}
          title={customizing ? i18n("done") : i18n("customize")}
          aria-label={customizing ? i18n("done") : i18n("customize")}
          className="flex h-8 w-8 items-center justify-center rounded-lg v8-panel text-[var(--text-muted)] transition-colors hover:border-[var(--text-primary)]/20 hover:text-[var(--text-primary)] active:scale-95"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
      </header>

      {customizing && (
        <BentoCard
          title={i18n("customizeDashboard")}
          icon="sliders-horizontal"
          className="shrink-0 mb-4"
          action={
            <button
              type="button"
              onClick={() => setCustomizing(false)}
              className="rounded-lg border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] px-2 py-1 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)]"
            >
              {i18n("done")}
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSection(s.id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                  visibleSet.has(s.id)
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                    : "border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] text-[var(--text-muted)]"
                }`}
              >
                <Icon name={visibleSet.has(s.id) ? "eye" : "eye-off"} className="h-4 w-4" />
                {s.label}
              </button>
            ))}
          </div>
        </BentoCard>
      )}

      {error && (
        <div className="shrink-0 mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error.message}
        </div>
      )}

      {bentoLoading ? (
        <DashboardSkeleton />
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={gridVariants}
          data-home-grid
          className="grid w-full h-auto grid-cols-12 gap-3 pb-3"
        >
          {widgets.map((w) =>
            w.visible ? (
              <motion.div
                key={w.id}
                data-home-widget
                variants={widgetItemVariants}
                className={`${WIDGET_COL_SPAN[w.id]} flex min-w-0 flex-col`}
              >
                {renderWidget(w.id)}
              </motion.div>
            ) : null
          )}
        </motion.div>
      )}
      </div>
      </PullToRefresh>
    </div>
  );
}
