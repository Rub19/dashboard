"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import BentoCard from "@/components/BentoCard";
import IconButton from "@/components/ui/IconButton";
import Button from "@/components/ui/Button";
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
import SortableWidget from "@/components/SortableWidget";

const LiveBentoGrid = dynamic(() => import("@/components/LiveBentoGrid"));
const BillsWidget = dynamic(() => import("@/components/BillsWidget"));
const BrainBriefingPanel = dynamic(() => import("@/components/BrainBriefingPanel"));
const ConnectionCardsWidget = dynamic(() => import("@/components/ConnectionCardsWidget"));

type SectionDef = { id: string; label: string; icon: string };

const homeCardClass = "h-full min-h-0";

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



const WIDGET_COL_SPAN: Record<string, string> = {
  hero: "col-span-12 lg:col-span-8",
  system: "col-span-12 lg:col-span-4",
  daystream: "col-span-12 sm:col-span-6 lg:col-span-4",
  productivity: "col-span-12 sm:col-span-6 lg:col-span-4",
  recent: "col-span-12 sm:col-span-6 lg:col-span-4",
  brain: "col-span-12 sm:col-span-6 lg:col-span-6",
  bills: "col-span-12 sm:col-span-6 lg:col-span-6",
  live: "col-span-12",
  connections: "col-span-12",
};

const WIDGET_PRIORITY_SCORES: Record<string, Record<string, number>> = {
  morning: { daystream: 95, productivity: 85, hero: 75, brain: 65, recent: 55, connections: 50, bills: 40, live: 35, system: 20 },
  work: { productivity: 95, brain: 85, hero: 75, daystream: 70, recent: 60, connections: 50, bills: 40, live: 35, system: 20 },
  evening: { live: 95, brain: 85, hero: 70, daystream: 60, recent: 55, connections: 45, productivity: 40, bills: 35, system: 20 },
  night: { hero: 95, brain: 80, recent: 65, connections: 55, bills: 50, system: 40, daystream: 30, productivity: 20, live: 15 },
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
  { id: "connections", x: 0, y: 4, w: 12, h: 1, visible: true },
  { id: "live", x: 0, y: 5, w: 12, h: 2, visible: true },
];

export default function DashboardOverview() {
  const i18n = useI18n();
  const { settings } = useSettings();
  const { greeting, dashboard, nowPlaying, loading, error } = useHomeData();
  const live = useLiveData();
  const tasksApi = useCloudTasks();
  const { items: notes, loading: notesLoading } = useItems("notes");
  const { items: events, loading: eventsLoading } = useItems("events");
  const homeLoading = loading;
  const bentoLoading = false;
  const focus = useFocus();
  const [customizing, setCustomizing] = useState(false);
  const { layout, update: updateLayout } = useDesktopLayout();
  const hour = useMemo(() => new Date().getHours(), []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const widgets = useMemo<WidgetLayout[]>(() => {
    const hidden = new Set(settings.homeHiddenSections || []);
    const defaults = DEFAULT_WIDGETS.map((w) => ({ ...w, visible: !hidden.has(w.id) }));
    const saved = layout?.widgets || [];
    const savedMap = new Map(saved.map((w) => [w.id, w]));

    // Merge saved positions with the default widget set so new widgets still
    // appear when a saved layout exists without them.
    const merged: WidgetLayout[] = defaults.map((w) => {
      const override = savedMap.get(w.id);
      return override ? { ...w, ...override } : w;
    });

    // Append any custom widgets the user previously added that are not in defaults.
    const extras = saved.filter((w) => !defaults.some((d) => d.id === w.id));

    const base = [...merged, ...extras];
    const seen = new Set<string>();
    const sanitized = base.filter((w) => {
      if (!w.id || seen.has(w.id)) return false;
      seen.add(w.id);
      return true;
    });

    let sorted: WidgetLayout[];
    const period = getDayPeriod(hour);
    const scores = WIDGET_PRIORITY_SCORES[period];

    if (saved.length > 0) {
      // Respect the user's persisted order for all widgets, then push newly
      // added widgets to the end, sorted by default priority.
      const indexMap = new Map(saved.map((w, i) => [w.id, i]));
      const baseOffset = saved.length;
      sorted = [...sanitized].sort(
        (a, b) =>
          (indexMap.get(a.id) ?? baseOffset + (scores[a.id] ?? 0)) -
          (indexMap.get(b.id) ?? baseOffset + (scores[b.id] ?? 0))
      );
    } else {
      sorted = [...sanitized].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
    }

    return sorted.length > 0 ? sorted : defaults;
  }, [layout, settings.homeHiddenSections, hour]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const visible = widgets.filter((w) => w.visible);
      const oldIndex = visible.findIndex((w) => w.id === active.id);
      const newIndex = visible.findIndex((w) => w.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const newVisibleOrder = arrayMove(visible, oldIndex, newIndex);
      let visibleCursor = 0;
      const next = widgets.map((w) => (w.visible ? newVisibleOrder[visibleCursor++] : w));
      void updateLayout(next);
    },
    [widgets, updateLayout]
  );

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
          connections: { label: i18n("services", "Services"), icon: "plug" },
        };
        const info = meta[w.id] ?? { label: w.id, icon: "square" };
        return { id: w.id, ...info };
      }),
    [widgets, i18n]
  );

  const maxWClass = useMemo(() => {
    switch (settings.homeGrid) {
      case "2":
        return "max-w-[980px]";
      case "3":
        return "max-w-[1280px]";
      default:
        return "max-w-[1600px]";
    }
  }, [settings.homeGrid]);

  const densityGap = useMemo(() => {
    switch (settings.densityMode) {
      case "compact":
      case "dense":
      case "ultra-compact":
        return "gap-2 pb-2";
      case "spacious":
      case "airy":
      case "ultra":
        return "gap-5 pb-5";
      default:
        return "gap-3 pb-3";
    }
  }, [settings.densityMode]);

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

  const handleToggleCustomize = useCallback(() => setCustomizing((v) => !v), []);
  const handleCloseCustomize = useCallback(() => setCustomizing(false), []);
  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const toggleSection = useCallback(
    (id: string) => {
      const next = widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
      void updateLayout(next);
    },
    [widgets, updateLayout]
  );

  const visibleSet = useMemo(() => new Set(widgets.filter((w) => w.visible).map((w) => w.id)), [widgets]);

  function renderWidget(id: string) {
    switch (id) {
      case "hero":
        return (
          <HeroBriefingCard
            greeting={greeting}
            dashboard={dashboard}
            nowPlaying={nowPlaying}
            loading={homeLoading}
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
            loading={eventsLoading || tasksApi.loading}
            scrollable={false}
            className={homeCardClass}
          />
        );
      case "productivity":
        return <TasksWidget data={tasksApi} scrollable={false} className={homeCardClass} />;
      case "recent":
        return <RecentNotesCard notes={notes} loading={notesLoading} scrollable={false} className={homeCardClass} />;
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
      case "connections":
        return (
          <ConnectionCardsWidget
            records={live.records}
            loading={live.loading}
            error={live.error}
            className={homeCardClass}
          />
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
      <PullToRefresh onRefresh={handleRefresh}>
        <div className={cn("mx-auto w-full min-h-full px-2 sm:px-4", maxWClass)}>
        <header className="shrink-0 mb-3 flex w-full items-center justify-end">
        <IconButton
          size="sm"
          variant="default"
          onClick={handleToggleCustomize}
          title={customizing ? i18n("done") : i18n("customize")}
          aria-label={customizing ? i18n("done") : i18n("customize")}
        >
          <Icon pack="lucide" name="layout-grid" className="h-4 w-4" />
        </IconButton>
      </header>

      {customizing && (
        <BentoCard
          title={i18n("customizeDashboard")}
          icon="sliders-horizontal"
          className="shrink-0 mb-4"
          action={
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCloseCustomize}
            >
              {i18n("done")}
            </Button>
          }
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {sections.map((s) => {
              const visible = visibleSet.has(s.id);
              return (
                <Button
                  key={s.id}
                  size="sm"
                  variant={visible ? "outline" : "ghost"}
                  onClick={() => toggleSection(s.id)}
                  className="justify-start"
                  leftIcon={
                    <Icon pack={visible ? "lucide" : "lucide"} name={visible ? "eye" : "eye-off"} className="h-4 w-4" />
                  }
                >
                  {s.label}
                </Button>
              );
            })}
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
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext
            items={widgets.filter((w) => w.visible).map((w) => w.id)}
            strategy={rectSortingStrategy}
          >
            <motion.div
              initial="hidden"
              animate="visible"
              variants={gridVariants}
              data-home-grid
              className={cn("grid w-full h-auto grid-cols-12", densityGap)}
            >
              {widgets.map(
                (w, i) =>
                  w.visible && (
                    <SortableWidget
                      key={w.id}
                      id={w.id}
                      index={i}
                      customizing={customizing}
                      className={WIDGET_COL_SPAN[w.id]}
                    >
                      {renderWidget(w.id)}
                    </SortableWidget>
                  )
              )}
            </motion.div>
          </SortableContext>
        </DndContext>
      )}
      </div>
      </PullToRefresh>
    </div>
  );
}
