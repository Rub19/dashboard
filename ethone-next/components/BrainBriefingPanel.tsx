"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useHomeData } from "@/lib/hooks/useDashboard";
import { useItems } from "@/lib/hooks/useItems";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useWorker } from "@/lib/hooks/useWorker";
import { useFocus } from "@/components/FocusProvider";
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
  const focus = useFocus();
  const [hidden, setHidden] = useState<Set<Section>>(new Set());
  const [synthesisDismissed, setSynthesisDismissed] = useState(false);

  const openTasks = useMemo(() => tasks.filter((t) => !t.done).length, [tasks]);
  const completedToday = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);
  const now = useMemo(() => new Date(), []);
  const nextEvent = useMemo(() => {
    const upcoming = events
      .filter((e) => e.startAt && new Date(e.startAt).getTime() > now.getTime())
      .sort((a, b) => new Date(a.startAt!).getTime() - new Date(b.startAt!).getTime());
    return upcoming[0] || null;
  }, [events, now]);
  const nextEventIn = useMemo(() => {
    if (!nextEvent?.startAt) return null;
    const ms = new Date(nextEvent.startAt).getTime() - now.getTime();
    if (ms <= 0) return null;
    const minutes = Math.ceil(ms / 60000);
    if (minutes < 60) return i18n("inMinutes", "dans {count} min").replace("{count}", String(minutes));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return i18n("inHours", "dans {count} h").replace("{count}", String(hours));
    return i18n("inHoursMinutes", "dans {h} h {m}").replace("{h}", String(hours)).replace("{m}", String(remainingMinutes));
  }, [nextEvent, now, i18n]);
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

  const synthesis = useMemo(() => {
    if (completedToday > 0 && nextEventIn) {
      return i18n("brainSynthesisTasksEvent", "Vous avez terminé {completed} tâche(s). Votre prochaine activité est {time}.")
        .replace("{completed}", String(completedToday))
        .replace("{time}", nextEventIn);
    }
    if (openTasks > 0 && nextEventIn) {
      return i18n("brainSynthesisOpenEvent", "Vous avez {open} tâche(s) en cours. Prochain événement {time}.")
        .replace("{open}", String(openTasks))
        .replace("{time}", nextEventIn);
    }
    if (openTasks > 0) {
      return i18n("brainSynthesisOpen", "Vous avez {open} tâche(s) en cours.").replace("{open}", String(openTasks));
    }
    if (nextEventIn) {
      return i18n("brainSynthesisEvent", "Votre prochaine activité est {time}.").replace("{time}", nextEventIn);
    }
    if (nowPlaying?.title) {
      return i18n("brainSynthesisMusic", "En écoute : {title}.").replace("{title}", nowPlaying.title);
    }
    return i18n("brainSynthesisFree", "Votre journée est libre.");
  }, [completedToday, openTasks, nextEventIn, nowPlaying?.title, i18n]);

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
        <p className="text-sm text-[var(--text-muted)]">{i18n("brainBriefingDescription")}</p>
        <p className="text-sm font-medium text-[var(--accent)]">{greeting.label}</p>
      </div>

      {!synthesisDismissed && (
        <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 p-3">
          <p className="text-sm font-medium text-[var(--text-primary)]">{synthesis}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => focus.start("focus")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--accent-contrast)] transition-opacity hover:opacity-90"
            >
              <Icon name="timer" className="h-3 w-3" />
              {i18n("startFocus", "Commencer une session Focus")}
            </button>
            <Link
              href="/calendar"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.08]"
            >
              <Icon name="calendar" className="h-3 w-3" />
              {i18n("seeAgenda", "Voir mon agenda")}
            </Link>
            <button
              type="button"
              onClick={() => setSynthesisDismissed(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--text-primary)]/[0.08] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.04] hover:text-[var(--text-primary)]"
            >
              {i18n("dismiss", "Ignorer")}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {sections
          .filter((s) => !hidden.has(s.id))
          .map((s) => (
            <div
              key={s.id}
              className="flex flex-col justify-between rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] p-2.5 transition-colors hover:border-[var(--text-primary)]/10"
            >
              <div className="flex items-center gap-1.5">
                <Icon name={s.icon} className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span className="text-xs text-[var(--text-muted)] truncate">{s.label}</span>
              </div>
              <p className="mt-1 truncate text-base font-bold text-[var(--text-primary)]">{s.value}</p>
            </div>
          ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--text-muted)]">{i18n("visibleSections")}</p>
        <div className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className={`rounded border px-2 py-1 text-xs font-medium transition-colors ${
                hidden.has(s.id)
                  ? "border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-muted)]"
                  : "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
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
