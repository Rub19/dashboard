"use client";

import { useWorker } from "@/lib/hooks/useWorker";
import { useI18n } from "@/lib/hooks/useI18n";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
;

type ActivityEvent = {
  id?: string;
  title?: string;
  action?: string;
  created_at?: string;
  at?: string;
};

function relativeTime(iso = "", i18n: (key: string) => string) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return i18n("justNow");
  if (minutes < 60) return i18n("minutesAgo").replace("{{count}}", String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return i18n("hoursAgo").replace("{{count}}", String(hours));
  return i18n("daysAgo").replace("{{count}}", String(Math.floor(hours / 24)));
}

export default function ActivityPage() {
  const { data, loading, error } = useWorker<{ data: { events: ActivityEvent[] } }>("/api/cloud/activity");
  const i18n = useI18n();
  const events = data?.data?.events || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("activityTitle")}</h1>
      <div className="space-y-3">
        {loading ? (
          <Card3D>
            <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--border)]" />
          </Card3D>
        ) : error ? (
          <Card3D>
            <p className="text-sm text-red-400">{error.message}</p>
          </Card3D>
        ) : events.length === 0 ? (
          <Card3D>
            <p className="text-sm text-[var(--muted)]">{i18n("noActivity")}</p>
          </Card3D>
        ) : (
          events.slice(0, 30).map((event, i) => (
            <Card3D key={event.id || i}>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                  <Icon name="activity" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{event.title || event.action || i18n("event")}</p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    <Icon name="clock" className="mr-1 inline h-3 w-3" />
                    {relativeTime(event.created_at || event.at, i18n)}
                  </p>
                </div>
              </div>
            </Card3D>
          ))
        )}
      </div>
    </div>
  );
}
