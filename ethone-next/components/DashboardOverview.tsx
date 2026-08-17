"use client";

import { useMemo, useState, Fragment } from "react";
import dynamic from "next/dynamic";
import { LayoutGrid } from "lucide-react";
import Select from "@/components/ui/Select";
import BentoCard from "@/components/BentoCard";
import BrandMark from "@/components/BrandMark";
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

const LiveBentoGrid = dynamic(() => import("@/components/LiveBentoGrid"));
const BillsWidget = dynamic(() => import("@/components/BillsWidget"));
const BrainBriefingPanel = dynamic(() => import("@/components/BrainBriefingPanel"));

type SectionDef = { id: string; label: string; icon: string };

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
  const { items: notes } = useItems("notes");
  const { items: events } = useItems("events");
  const focus = useFocus();
  const [customizing, setCustomizing] = useState(false);
  const [workspace, setWorkspace] = useState("ethone");
  const { layout, update: updateLayout } = useDesktopLayout();

  const widgets = useMemo<WidgetLayout[]>(() => {
    if (layout && layout.widgets.length > 0) return layout.widgets;
    const hidden = new Set(settings.homeHiddenSections || []);
    return DEFAULT_WIDGETS.map((w) => ({ ...w, visible: !hidden.has(w.id) }));
  }, [layout, settings.homeHiddenSections]);

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
        return { id: w.id, ...meta[w.id] };
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
            loading={loading}
            openTasksCount={openTasksCount}
            todayEventsCount={todayEvents.length}
            notesCount={notes.length}
            className="col-span-12 lg:col-span-8"
          />
        );
      case "system":
        return <SystemControlCard className="col-span-12 lg:col-span-4" />;
      case "daystream":
        return (
          <DayTimelineCard
            todayEvents={todayEvents}
            nextTasks={nextTasks}
            focus={focus}
            className="col-span-12 md:col-span-6 lg:col-span-4"
          />
        );
      case "productivity":
        return <TasksWidget data={tasksApi} className="col-span-12 md:col-span-6 lg:col-span-4" />;
      case "recent":
        return <RecentNotesCard notes={notes} className="col-span-12 lg:col-span-4" />;
      case "brain":
        return (
          <BentoCard title={i18n("brain")} icon="brain" className="col-span-12 md:col-span-6 lg:col-span-6">
            <BrainBriefingPanel />
          </BentoCard>
        );
      case "bills":
        return (
          <BentoCard title={i18n("billsTitle")} icon="bills" className="col-span-12 md:col-span-6 lg:col-span-6">
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
            records={live.records}
            updatedAt={live.updatedAt}
            loading={live.loading}
            className="col-span-12 h-full"
          />
        );
      default:
        return null;
    }
  }

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <header className="mb-6 flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandMark size={36} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">ETHONE</h1>
            <p className="text-sm text-zinc-400">{i18n("home")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={workspace}
            onChange={setWorkspace}
            options={[
              { id: "ethone", label: "ETHONE" },
              { id: "personal", label: i18n("personal", "Personnel") },
            ]}
            aria-label={i18n("workspace", "Workspace")}
            className="w-36"
          />
          <button
            type="button"
            onClick={() => setCustomizing((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-zinc-950/70 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white/20 hover:text-zinc-200"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            {customizing ? i18n("done") : i18n("customize")}
          </button>
        </div>
      </header>

      <div className="grid w-full grid-cols-12 gap-4">
        {customizing && (
          <BentoCard
            title={i18n("customizeDashboard")}
            icon="sliders-horizontal"
            className="col-span-12"
            action={
              <button
                type="button"
                onClick={() => setCustomizing(false)}
                className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
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
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-white/[0.06] bg-white/[0.02] text-zinc-500"
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
          <div className="col-span-12 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error.message}
          </div>
        )}

        {widgets.map((w) => (w.visible ? <Fragment key={w.id}>{renderWidget(w.id)}</Fragment> : null))}
      </div>
    </main>
  );
}
