"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutGrid,
  Search,
  Sparkles,
  Calendar as CalendarIcon,
  CheckCircle2,
  Timer,
  Brain,
  Upload,
  Mail,
  Lock,
  Unlock,
  RotateCcw,
  Zap,
} from "lucide-react";
import {
  DndContext,
  type DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import BentoCard from "@/components/BentoCard";
import Button from "@/components/ui/Button";
import HeroBriefingCard from "@/components/HeroBriefingCard";
import SystemControlCard from "@/components/SystemControlCard";
import { DayTimelineCard, RecentNotesCard } from "@/components/ProductivityCards";
import TasksWidget from "@/components/TasksWidget";

import { useCloudTasks } from "@/lib/hooks/useCloudTasks";
import { useHomeData } from "@/lib/hooks/useDashboard";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useItems } from "@/lib/hooks/useItems";
import { useSettings, useActiveProfile } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useFocus } from "@/components/FocusProvider";
import { useDesktopLayout, type WidgetLayout } from "@/lib/hooks/useDesktopLayout";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { useToast } from "@/components/ToastProvider";
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
  { id: "productivity", x: 0, y: 2, w: 4, h: 1, visible: true },
  { id: "recent", x: 4, y: 2, w: 4, h: 1, visible: true },
  { id: "brain", x: 0, y: 3, w: 6, h: 1, visible: true },
  { id: "bills", x: 6, y: 3, w: 6, h: 1, visible: true },
  { id: "connections", x: 0, y: 4, w: 12, h: 1, visible: true },
  { id: "live", x: 0, y: 5, w: 12, h: 2, visible: true },
];

export default function DashboardOverview() {
  const i18n = useI18n();
  const router = useRouter();
  const { success } = useToast();
  const { settings, update: updateSettings } = useSettings();
  const { activeProfile } = useActiveProfile();
  const { greeting, dashboard, nowPlaying, loading, error } = useHomeData();
  const live = useLiveData();
  const tasksApi = useCloudTasks();
  const { items: notes, loading: notesLoading } = useItems("notes");
  const { items: events, loading: eventsLoading } = useItems("events");
  const homeLoading = loading;
  const bentoLoading = false;
  const focus = useFocus();
  const [customizing, setCustomizing] = useState(false);
  const [layoutLocked, setLayoutLocked] = useLocalStorage<boolean>("ethone-home-layout-locked", false);
  const [activeSpace] = useLocalStorage<string>("ethone-active-workspace", "personal");
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

    const merged: WidgetLayout[] = defaults.map((w) => {
      const override = savedMap.get(w.id);
      if (override) {
        const isVisible = override.visible !== false && !hidden.has(w.id);
        return { ...w, ...override, visible: isVisible };
      }
      return w;
    });

    const extras = saved.filter((w) => !defaults.some((d) => d.id === w.id));
    const base = [...merged, ...extras];
    const seen = new Set<string>();
    const sanitized = base.filter((w) => {
      if (!w.id || w.id === "weather" || seen.has(w.id)) return false;
      seen.add(w.id);
      return true;
    });

    let sorted: WidgetLayout[];
    const period = getDayPeriod(hour);
    const scores = WIDGET_PRIORITY_SCORES[period];

    if (saved.length > 0) {
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

  const visibleWidgets = useMemo(
    () => widgets.filter((w) => w.visible),
    [widgets]
  );
  const visibleIds = useMemo(
    () => visibleWidgets.map((w) => w.id),
    [visibleWidgets]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (layoutLocked) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = visibleWidgets.findIndex((w) => w.id === active.id);
      const newIndex = visibleWidgets.findIndex((w) => w.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const newVisibleOrder = arrayMove(visibleWidgets, oldIndex, newIndex);
      let visibleCursor = 0;
      const next = widgets.map((w) =>
        w.visible ? newVisibleOrder[visibleCursor++] : w
      );
      void updateLayout(next);
    },
    [widgets, visibleWidgets, updateLayout, layoutLocked]
  );

  const sections: SectionDef[] = useMemo(
    () =>
      widgets.map((w) => {
        const meta: Record<string, { label: string; icon: string }> = {
          hero: { label: i18n("home", "Accueil"), icon: "sun" },
          system: { label: i18n("system", "Contrôle Système"), icon: "sliders-horizontal" },
          daystream: { label: i18n("daystream", "Fil du jour"), icon: "calendar" },
          productivity: { label: i18n("productivityAndRhythm", "Productivité"), icon: "zap" },
          recent: { label: i18n("recent", "Récents"), icon: "history" },
          brain: { label: i18n("brain", "Brain"), icon: "brain" },
          bills: { label: i18n("billsTitle", "Factures & Dépenses"), icon: "bills" },
          live: { label: i18n("live", "Direct 3D & Tracker"), icon: "radio" },
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

  const handleOptimizeWithBrain = useCallback(() => {
    const period = getDayPeriod(hour);
    const scores = WIDGET_PRIORITY_SCORES[period];
    const optimized = [...widgets].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
    void updateLayout(optimized);
    success("Disposition optimisée par Brain selon le contexte actuel");
  }, [widgets, hour, updateLayout, success]);

  const handleResetLayout = useCallback(() => {
    void updateLayout(DEFAULT_WIDGETS);
    updateSettings({ homeHiddenSections: [] });
    success("Disposition réinitialisée par défaut");
  }, [updateLayout, updateSettings, success]);

  const toggleSection = useCallback(
    (id: string) => {
      const currentHidden = new Set(settings.homeHiddenSections || []);
      const isCurrentlyVisible = widgets.find((w) => w.id === id)?.visible ?? true;
      if (isCurrentlyVisible) {
        currentHidden.add(id);
      } else {
        currentHidden.delete(id);
      }
      const nextHidden = Array.from(currentHidden);
      updateSettings({ homeHiddenSections: nextHidden });

      const next = widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
      void updateLayout(next);
    },
    [widgets, updateLayout, settings.homeHiddenSections, updateSettings]
  );

  const visibleSet = useMemo(() => new Set(widgets.filter((w) => w.visible).map((w) => w.id)), [widgets]);

  // Greeting & Date format
  const dynamicGreeting = useMemo(() => {
    if (hour >= 5 && hour < 12) return "Bonjour";
    if (hour >= 12 && hour < 18) return "Bon après-midi";
    return "Bonsoir";
  }, [hour]);

  const userName = activeProfile?.name || "Rub";

  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(settings.language || "fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(today);
    } catch {
      return today.toDateString();
    }
  }, [today, settings.language]);

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
          <BentoCard title={i18n("brain", "Brain")} icon="brain" scrollable={false} className={homeCardClass}>
            <BrainBriefingPanel />
          </BentoCard>
        );
      case "bills":
        return (
          <BentoCard title={i18n("billsTitle", "Factures")} icon="bills" scrollable={false} className={homeCardClass}>
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
    <div className="flex h-full min-h-0 flex-col overflow-y-auto os-scroll">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className={cn("mx-auto w-full min-h-full px-2 pb-28 sm:px-4 space-y-4", maxWClass)}>
          {/* 1. Intelligent OS Home 2026 Header */}
          <header className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-[var(--panel-border)]/80 bg-[var(--panel-bg)]/80 p-5 shadow-sm backdrop-blur-[var(--panel-blur)] select-none">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-[var(--accent-primary)]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-wider">
                  Espace {activeSpace}
                </span>
                <span className="text-[11px] font-medium text-[var(--text-muted)] capitalize">
                  {formattedDate}
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">
                {dynamicGreeting}, <span className="text-[var(--accent-primary)]">{userName}</span>
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                Votre système d'exploitation personnel en un coup d'œil.
              </p>
            </div>

            {/* Quick Actions & Search */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("v8:open-command-palette"))}
                className="flex h-9 items-center gap-2 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/70 px-3 text-xs font-semibold text-[var(--text-muted)] hover:text-white hover:border-[var(--accent-primary)]/40 transition-all cursor-pointer shadow-xs"
                title="Ouvrir la palette de commandes (Ctrl + K)"
              >
                <Search className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                <span className="hidden sm:inline">Commandes</span>
                <kbd className="rounded-md bg-[var(--panel-bg)] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[var(--text-muted)] border border-[var(--panel-border)]">
                  Ctrl K
                </kbd>
              </button>

              <Button
                size="sm"
                variant={customizing ? "primary" : "ghost"}
                onClick={handleToggleCustomize}
                title={customizing ? i18n("done", "Terminé") : i18n("customize", "Personnaliser")}
                aria-label={customizing ? i18n("done", "Terminé") : i18n("customize", "Personnaliser")}
                leftIcon={<LayoutGrid className="h-3.5 w-3.5" />}
                className="h-9 rounded-2xl px-3 text-xs font-semibold"
              >
                {customizing ? i18n("done", "Terminer") : i18n("customize", "Organiser")}
              </Button>
            </div>
          </header>

          {/* 2. Priority Layer: What's Important Right Now */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Calendar summary */}
            <div
              onClick={() => router.push("/calendar")}
              className="group flex flex-col justify-between rounded-2xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-3.5 transition-all hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-raised)]/70 cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
                <span className="text-[10px] font-bold uppercase tracking-wider">Calendrier</span>
                <CalendarIcon className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              </div>
              <div className="mt-2">
                <span className="font-mono text-base font-bold text-[var(--text-primary)]">
                  {todayEvents.length}
                </span>
                <span className="ml-1.5 text-xs text-[var(--text-muted)]">
                  {todayEvents.length > 1 ? "événements" : "événement"}
                </span>
              </div>
            </div>

            {/* Tasks summary */}
            <div
              onClick={() => router.push("/tasks")}
              className="group flex flex-col justify-between rounded-2xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-3.5 transition-all hover:border-emerald-500/40 hover:bg-[var(--surface-raised)]/70 cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
                <span className="text-[10px] font-bold uppercase tracking-wider">Tâches</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div className="mt-2">
                <span className="font-mono text-base font-bold text-emerald-400">
                  {openTasksCount}
                </span>
                <span className="ml-1.5 text-xs text-[var(--text-muted)]">
                  {openTasksCount > 1 ? "en attente" : "en attente"}
                </span>
              </div>
            </div>

            {/* Focus Session */}
            <div
              onClick={() => router.push("/focus")}
              className="group flex flex-col justify-between rounded-2xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-3.5 transition-all hover:border-sky-500/40 hover:bg-[var(--surface-raised)]/70 cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
                <span className="text-[10px] font-bold uppercase tracking-wider">Focus Mode</span>
                <Timer className="h-3.5 w-3.5 text-sky-400" />
              </div>
              <div className="mt-2">
                <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {focus?.state?.phase && focus.state.phase !== "idle"
                    ? `Session en cours (${focus.state.phase})`
                    : "Prêt à démarrer"}
                </span>
              </div>
            </div>

            {/* Brain Status */}
            <div
              onClick={() => router.push("/brain")}
              className="group flex flex-col justify-between rounded-2xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-3.5 transition-all hover:border-purple-500/40 hover:bg-[var(--surface-raised)]/70 cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
                <span className="text-[10px] font-bold uppercase tracking-wider">ETHONE Brain</span>
                <Brain className="h-3.5 w-3.5 text-purple-400" />
              </div>
              <div className="mt-2">
                <span className="text-xs font-semibold text-purple-300 truncate">
                  Intelligence connectée
                </span>
              </div>
            </div>
          </div>

          {/* 3. Customization & Brain Optimization Panel */}
          {customizing && (
            <BentoCard
              title={i18n("customizeDashboard", "Organiser l'accueil")}
              icon="sliders-horizontal"
              className="shrink-0"
              action={
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLayoutLocked(!layoutLocked)}
                    className={cn(
                      "flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                      layoutLocked
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                        : "border-[var(--panel-border)] text-[var(--text-muted)] hover:text-white"
                    )}
                    title="Verrouiller la disposition"
                  >
                    {layoutLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    <span>{layoutLocked ? "Verrouillé" : "Déverrouillé"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOptimizeWithBrain}
                    className="flex items-center gap-1 rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 px-2.5 py-1 text-xs font-bold text-[var(--accent-primary)] hover:opacity-90 transition-all cursor-pointer"
                    title="Optimiser la disposition selon l'heure et le contexte"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Optimiser avec Brain</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetLayout}
                    className="flex items-center gap-1 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)] hover:text-white transition-all cursor-pointer"
                    title="Réinitialiser l'agencement"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset</span>
                  </button>

                  <Button size="sm" variant="ghost" onClick={handleCloseCustomize}>
                    {i18n("done", "Terminer")}
                  </Button>
                </div>
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
                      className="justify-start text-xs"
                      leftIcon={
                        <Icon pack="lucide" name={visible ? "eye" : "eye-off"} className="h-4 w-4" />
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
            <div className="shrink-0 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {error.message}
            </div>
          )}

          {/* 4. Draggable Grid of Widgets (preserving all 3D tilt cards) */}
          {bentoLoading ? (
            <DashboardSkeleton />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={visibleIds} strategy={rectSortingStrategy}>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={gridVariants}
                  data-home-grid
                  className={cn("grid w-full h-auto auto-rows-fr grid-cols-12", densityGap)}
                >
                  {visibleWidgets.map((w, i) => (
                    <SortableWidget
                      key={w.id}
                      id={w.id}
                      index={i}
                      className={cn(WIDGET_COL_SPAN[w.id] || "col-span-12", homeCardClass)}
                      customizing={customizing && !layoutLocked}
                    >
                      {renderWidget(w.id)}
                    </SortableWidget>
                  ))}
                </motion.div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}
