"use client";

import { useWorker } from "@/lib/hooks/useWorker";
import Card3D from "@/components/Card3D";
import { Activity, Clock } from "lucide-react";

function relativeTime(iso = "") {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}

export default function ActivityPage() {
  const { data, loading } = useWorker<any>("/api/cloud/activity");
  const events: any[] = Array.isArray(data?.data) ? data.data : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Activité</h1>
      <div className="space-y-3">
        {loading ? (
          <Card3D>
            <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--border)]" />
          </Card3D>
        ) : events.length === 0 ? (
          <Card3D>
            <p className="text-sm text-[var(--muted)]">Aucune activité récente.</p>
          </Card3D>
        ) : (
          events.slice(0, 30).map((event: any, i) => (
            <Card3D key={event.id || i}>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                  <Activity className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{event.title || event.action || "Événement"}</p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    <Clock className="mr-1 inline h-3 w-3" />
                    {relativeTime(event.created_at || event.at)}
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
