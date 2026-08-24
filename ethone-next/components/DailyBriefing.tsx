"use client";

import { useFocus } from "@/components/FocusProvider";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import Card3D from "./Card3D";
import type { CloudDashboard, NowPlaying } from "@/lib/hooks/useDashboard";

export default function DailyBriefing({
  greeting,
  dashboard,
  nowPlaying,
  loading,
}: {
  greeting: { label: string; tone: string };
  dashboard: CloudDashboard | null;
  nowPlaying: NowPlaying | null;
  loading: boolean;
}) {
  const i18n = useI18n();
  const { state } = useFocus();
  const { unreadCount, importantCount } = useNotifications();

  const focusTime = state.total > 0 ? Math.round((state.total - state.remaining) / 60) : 0;

  const stats = [
    { icon: "mail", label: i18n("unread"), value: unreadCount || 0, color: "text-sky-400" },
    { icon: "bell", label: i18n("important"), value: importantCount || 0, color: "text-amber-400" },
    { icon: "files", label: i18n("totalFiles"), value: dashboard?.totalFiles ?? 0, color: "text-violet-400" },
    { icon: "timer", label: i18n("focusMinutes"), value: focusTime, color: "text-rose-400" },
  ];

  return (
    <Card3D>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">{greeting.label}</h2>
          <p className="text-[var(--text-muted)]">{greeting.tone}</p>
          {nowPlaying?.title && (
            <p className="mt-2 flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Icon name="disc" className="h-4 w-4 animate-spin-slow" />
              <span className="truncate">{nowPlaying.title}</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="truncate">{nowPlaying.artist}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex min-w-[5.5rem] flex-col items-center gap-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 backdrop-blur-[var(--panel-blur)]"
            >
              <Icon name={s.icon} className={`h-4 w-4 ${s.color}`} />
              <span className="text-lg font-bold tabular-nums">{loading ? "-" : s.value}</span>
              <span className="text-[10px] text-[var(--text-muted)]">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card3D>
  );
}
