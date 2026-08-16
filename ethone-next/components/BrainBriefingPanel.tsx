"use client";

import { useMemo, useState } from "react";
import { useHomeData } from "@/lib/hooks/useDashboard";
import { useItems } from "@/lib/hooks/useItems";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useWorker } from "@/lib/hooks/useWorker";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";

type Section = "weather" | "agenda" | "tasks" | "mail" | "notifications" | "activity" | "nowPlaying";

export default function BrainBriefingPanel() {
  const i18n = useI18n();
  const { settings } = useSettings();
  const { greeting, nowPlaying } = useHomeData();
  const { unreadCount, importantCount } = useNotifications();
  const { items: tasks } = useItems("tasks");
  const { items: events } = useItems("events");
  const { data: weatherData, loading: weatherLoading } = useWorker<{ data: { temperature?: number; description?: string } | null }>(
    settings.liveWeatherCity ? `/api/weather?city=${encodeURIComponent(settings.liveWeatherCity)}` : null
  );
  const weather = weatherData?.data ?? null;
  const [hidden, setHidden] = useState<Set<Section>>(new Set());

  const openTasks = useMemo(() => tasks.filter((t) => !t.done).length, [tasks]);
  const todayEvents = useMemo(
    () =>
      events.filter((e) => {
        const start = e.startAt ? new Date(e.startAt) : null;
        const now = new Date();
        return start && start.getDate() === now.getDate() && start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
      }).length,
    [events]
  );

  const recentActivity = openTasks + todayEvents + (unreadCount || 0) + (importantCount || 0);

  function toggle(section: Section) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  const sections: { id: Section; label: string; icon: string; value: React.ReactNode }[] = [
    { id: "weather", label: i18n("weather"), icon: "cloud-sun", value: weatherLoading ? "-" : `${weather?.temperature ?? "-"}° — ${weather?.description ?? ""}` },
    { id: "agenda", label: i18n("todayEvents"), icon: "calendar", value: todayEvents },
    { id: "tasks", label: i18n("openTasks"), icon: "tasks", value: openTasks },
    { id: "mail", label: i18n("unread"), icon: "mail", value: unreadCount || 0 },
    { id: "notifications", label: i18n("important"), icon: "bell", value: importantCount || 0 },
    { id: "activity", label: i18n("activity"), icon: "activity", value: recentActivity },
    { id: "nowPlaying", label: i18n("nowPlaying"), icon: "music", value: nowPlaying?.title || i18n("none") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">{i18n("brainBriefingDescription")}</p>
        <p className="text-sm font-medium text-[var(--accent)]">{greeting.label}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {sections
          .filter((s) => !hidden.has(s.id))
          .map((s) => (
            <Card3D key={s.id}>
              <div className="flex items-center gap-2">
                <Icon name={s.icon} className="h-4 w-4 text-[var(--accent)]" />
                <span className="text-xs text-[var(--muted)]">{s.label}</span>
              </div>
              <p className="mt-1 truncate text-lg font-bold">{s.value}</p>
            </Card3D>
          ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--muted)]">{i18n("visibleSections")}</p>
        <div className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className={`rounded-[var(--panel-radius)] border px-2 py-1 text-xs font-medium transition-colors ${
                hidden.has(s.id)
                  ? "border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--muted)]"
                  : "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
              } backdrop-blur-[var(--panel-blur)]`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
