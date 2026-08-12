"use client";

import { useMemo } from "react";
import { useItems } from "@/lib/hooks/useItems";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useHomeData } from "@/lib/hooks/useDashboard";
import { useFocus } from "@/components/FocusProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import Card3D from "./Card3D";

export default function BrainContextPanel() {
  const i18n = useI18n();
  const { settings } = useSettings();
  const { greeting, nowPlaying } = useHomeData();
  const { unreadCount, importantCount } = useNotifications();
  const { state } = useFocus();
  const { items: tasks } = useItems("tasks");
  const { items: events } = useItems("events");

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
  const focusMinutes = Math.round((state.total - state.remaining) / 60);

  const context = [
    { label: i18n("greeting"), value: greeting.label, icon: "sun" },
    { label: i18n("unread"), value: unreadCount || 0, icon: "mail" },
    { label: i18n("important"), value: importantCount || 0, icon: "bell" },
    { label: i18n("openTasks"), value: openTasks, icon: "tasks" },
    { label: i18n("todayEvents"), value: todayEvents, icon: "calendar" },
    { label: i18n("focusMinutes"), value: focusMinutes, icon: "timer" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">{i18n("brainContextTitle")}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {context.map((c) => (
          <Card3D key={c.label}>
            <div className="flex items-center gap-2">
              <Icon name={c.icon} className="h-4 w-4 text-[var(--accent)]" />
              <span className="text-xs text-[var(--muted)]">{c.label}</span>
            </div>
            <p className="mt-1 text-lg font-bold">{c.value}</p>
          </Card3D>
        ))}
      </div>

      {nowPlaying?.title && (
        <Card3D>
          <p className="text-sm text-[var(--muted)]">{i18n("nowPlaying")}</p>
          <div className="mt-2 flex items-center gap-3">
            <Icon name="disc" className="h-5 w-5 animate-spin-slow text-green-400" />
            <div>
              <p className="font-medium">{nowPlaying.title}</p>
              <p className="text-xs text-[var(--muted)]">{nowPlaying.artist}</p>
            </div>
          </div>
        </Card3D>
      )}

      <Card3D>
        <p className="text-sm text-[var(--muted)]">{i18n("brainContextDescription")}</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--foreground)]">
          <li>{i18n("language")}: {settings.language || "fr"}</li>
          <li>{i18n("density")}: {settings.density}</li>
          <li>{i18n("status")}: {settings.status}</li>
        </ul>
      </Card3D>
    </div>
  );
}
