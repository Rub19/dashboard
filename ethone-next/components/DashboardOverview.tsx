"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { LayoutGrid } from "lucide-react";
import BentoCard from "@/components/BentoCard";
import BrandMark from "@/components/BrandMark";
import HeroBriefingCard from "@/components/HeroBriefingCard";
import SystemControlCard from "@/components/SystemControlCard";
import { DayTimelineCard, ProjectsTasksCard, RecentNotesCard } from "@/components/ProductivityCards";
import { useHomeData } from "@/lib/hooks/useDashboard";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useMail } from "@/lib/hooks/useMail";
import { useItems } from "@/lib/hooks/useItems";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useFocus } from "@/components/FocusProvider";
import { Icon } from "@/lib/icons";

const LiveBentoGrid = dynamic(() => import("@/components/LiveBentoGrid"));
const BillsWidget = dynamic(() => import("@/components/BillsWidget"));
const BrainBriefingPanel = dynamic(() => import("@/components/BrainBriefingPanel"));

type SectionDef = { id: string; label: string; icon: string };

export default function DashboardOverview() {
  const i18n = useI18n();
  const { settings, update: updateSettings } = useSettings();
  const { greeting, dashboard, nowPlaying, loading, error } = useHomeData();
  const live = useLiveData();
  const { unread: unreadMail, loading: mailLoading } = useMail();
  const { items: tasks } = useItems("tasks");
  const { items: notes } = useItems("notes");
  const { items: events } = useItems("events");
  const focus = useFocus();
  const [customizing, setCustomizing] = useState(false);

  const hidden = new Set(settings.homeHiddenSections || []);

  const sections: SectionDef[] = useMemo(
    () => [
      { id: "hero", label: i18n("home"), icon: "sun" },
      { id: "system", label: i18n("system"), icon: "sliders-horizontal" },
      { id: "daystream", label: i18n("daystream"), icon: "calendar" },
      { id: "productivity", label: i18n("productivityAndRhythm"), icon: "zap" },
      { id: "recent", label: i18n("recent"), icon: "history" },
      { id: "brain", label: i18n("brain"), icon: "brain" },
      { id: "bills", label: i18n("billsTitle"), icon: "bills" },
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

  const openTasksCount = openTasksList.length;
  const totalTasks = openTasksCount + 3;
  const completed = Math.max(0, totalTasks - openTasksCount);
  const percentage = Math.round((completed / Math.max(1, totalTasks)) * 100);

  function toggleSection(id: string) {
    const next = hidden.has(id)
      ? (settings.homeHiddenSections || []).filter((x) => x !== id)
      : [...(settings.homeHiddenSections || []), id];
    updateSettings({ homeHiddenSections: next });
  }

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <header className="mb-6 flex max-w-7xl mx-auto w-full items-center justify-between gap-4">
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
            {customizing ? i18n("done") : i18n("customize")}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4 max-w-7xl mx-auto w-full">
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
                    hidden.has(s.id)
                      ? "border-white/[0.06] bg-white/[0.02] text-zinc-500"
                      : "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  }`}
                >
                  <Icon name={hidden.has(s.id) ? "eye-off" : "eye"} className="h-4 w-4" />
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

        {!hidden.has("hero") && (
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
        )}

        {!hidden.has("system") && <SystemControlCard className="col-span-12 lg:col-span-4" />}

        {!hidden.has("daystream") && (
          <DayTimelineCard
            todayEvents={todayEvents}
            nextTasks={nextTasks}
            focus={focus}
            className="col-span-12 md:col-span-6 lg:col-span-4"
          />
        )}

        {!hidden.has("productivity") && (
          <ProjectsTasksCard
            openTasksCount={openTasksCount}
            completed={completed}
            totalTasks={totalTasks}
            percentage={percentage}
            unreadMail={unreadMail}
            mailLoading={mailLoading}
            focus={focus}
            className="col-span-12 md:col-span-6 lg:col-span-4"
          />
        )}

        {!hidden.has("recent") && <RecentNotesCard notes={notes} className="col-span-12 lg:col-span-4" />}

        {!hidden.has("brain") && (
          <BentoCard title={i18n("brain")} icon="brain" className="col-span-12 md:col-span-6 lg:col-span-6">
            <BrainBriefingPanel />
          </BentoCard>
        )}

        {!hidden.has("bills") && (
          <BentoCard title={i18n("billsTitle")} icon="bills" className="col-span-12 md:col-span-6 lg:col-span-6">
            <BillsWidget />
          </BentoCard>
        )}

        {!hidden.has("live") && (
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
        )}
      </div>
    </main>
  );
}
