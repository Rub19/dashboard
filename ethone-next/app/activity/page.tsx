"use client";

import { useMemo, useState } from "react";

import { useWorker } from "@/lib/hooks/useWorker";
import { useI18n } from "@/lib/hooks/useI18n";
import Card3D from "@/components/Card3D";
import Input from "@/components/Input";
import { Icon } from "@/lib/icons";

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

function dateKey(iso = "") {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function lastDays(days: number) {
  const list: { key: string; date: Date }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    list.push({ key: dateKey(d.toISOString()), date: d });
  }
  return list;
}

export default function ActivityPage() {
  const i18n = useI18n();
  const { data, loading, error } = useWorker<{ data: { events: ActivityEvent[] } }>("/api/cloud/activity");
  const events = useMemo(() => data?.data?.events || [], [data?.data?.events]);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return events;
    const q = query.toLowerCase();
    return events.filter(
      (e) =>
        (e.title || "").toLowerCase().includes(q) ||
        (e.action || "").toLowerCase().includes(q)
    );
  }, [events, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEvent[]>();
    for (const e of filtered) {
      const key = dateKey(e.created_at || e.at || "");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [filtered]);

  const days = useMemo(() => lastDays(28), []);
  const maxCount = useMemo(() => Math.max(1, ...days.map((d) => grouped.get(d.key)?.length || 0)), [days, grouped]);

  const stats = useMemo(() => {
    const total = events.length;
    const today = dateKey(new Date().toISOString());
    const todayCount = events.filter((e) => dateKey(e.created_at || e.at || "") === today).length;
    const actions = new Set(events.map((e) => e.action).filter(Boolean)).size;
    return { total, todayCount, actions };
  }, [events]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("activityTitle")}</h1>

      <div className="grid grid-cols-3 gap-3">
        <Card3D>
          <p className="text-xs text-[var(--muted)]">{i18n("total")}</p>
          <p className="text-2xl font-bold">{loading ? "-" : stats.total}</p>
        </Card3D>
        <Card3D>
          <p className="text-xs text-[var(--muted)]">{i18n("today")}</p>
          <p className="text-2xl font-bold">{loading ? "-" : stats.todayCount}</p>
        </Card3D>
        <Card3D>
          <p className="text-xs text-[var(--muted)]">{i18n("actions")}</p>
          <p className="text-2xl font-bold">{loading ? "-" : stats.actions}</p>
        </Card3D>
      </div>

      <Card3D>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{i18n("activityHeatmap")}</h2>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={i18n("search")}
            icon="search"
            className="w-48"
          />
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((d) => {
            const count = grouped.get(d.key)?.length || 0;
            const intensity = count / maxCount;
            return (
              <div
                key={d.key}
                title={`${d.date.toLocaleDateString()}: ${count}`}
                className={`group relative aspect-square rounded-lg transition-colors ${
                  count === 0 ? "bg-[var(--surface-raised)]" : "bg-violet-500"
                }`}
                style={{ opacity: count === 0 ? 1 : 0.2 + intensity * 0.8 }}
              >
                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--muted)] opacity-0 group-hover:opacity-100">
                  {d.date.getDate()}
                </span>
              </div>
            );
          })}
        </div>
      </Card3D>

      {error && (
        <Card3D>
          <p className="text-sm text-red-400">{error.message}</p>
        </Card3D>
      )}

      <div className="space-y-3">
        {loading ? (
          <Card3D>
            <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--border)]" />
          </Card3D>
        ) : filtered.length === 0 ? (
          <Card3D>
            <p className="text-sm text-[var(--muted)]">{i18n("noActivity")}</p>
          </Card3D>
        ) : (
          Object.entries(
            filtered.reduce<Record<string, ActivityEvent[]>>((acc, e) => {
              const key = dateKey(e.created_at || e.at || "");
              if (!acc[key]) acc[key] = [];
              acc[key].push(e);
              return acc;
            }, {})
          )
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([key, group]) => (
              <div key={key} className="space-y-2">
                <h3 className="text-xs font-semibold text-[var(--muted)]">{new Date(key).toLocaleDateString()}</h3>
                {group.map((event, i) => (
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
                ))}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
