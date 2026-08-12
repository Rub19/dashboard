"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSettings } from "@/components/SettingsProvider";
import { useFocus } from "@/components/FocusProvider";
import { useHomeData } from "./useDashboard";
import { buildSystemContext, filterContextForRoute, type BrainContext, type BrainMemoryItem } from "@/lib/brain-context";
import {
  remember,
  recall,
  recallByCategory,
  forget,
  clearSensitive,
  pruneExpired,
  listRecent,
} from "@/lib/brain-memory";
import { useItems } from "./useItems";
import { useNotifications } from "./useNotifications";
import { useWorker } from "./useWorker";

function countTodayEvents(events: { startAt?: string }[]) {
  const now = new Date();
  return events.filter((e) => {
    const start = e.startAt ? new Date(e.startAt) : null;
    return (
      start &&
      start.getDate() === now.getDate() &&
      start.getMonth() === now.getMonth() &&
      start.getFullYear() === now.getFullYear()
    );
  }).length;
}

export function useBrainContext() {
  const pathname = usePathname();
  const route = pathname || "home";
  const { settings } = useSettings();
  const { nowPlaying } = useHomeData();
  const weatherPath = settings.liveWeatherCity
    ? `/api/weather?city=${encodeURIComponent(settings.liveWeatherCity)}`
    : null;
  const { data: weatherPayload } = useWorker<{ data?: Record<string, unknown> } | null>(weatherPath);
  const { items: tasks } = useItems("tasks");
  const { items: events } = useItems("events");
  const { unreadCount } = useNotifications();
  const { state } = useFocus();
  const [recent, setRecent] = useState<BrainMemoryItem[]>(() => listRecent());

  useEffect(() => {
    setRecent(listRecent());
  }, [route]);

  const context = useMemo<BrainContext>(() => {
    const openTasks = tasks.filter((t) => !t.done).length;
    const todayEvents = countTodayEvents(events);
    const focusMinutes = Math.round((state.total - state.remaining) / 60);
    const liveData = { nowPlaying, weather: weatherPayload?.data ?? null, records: [] };
    const base = buildSystemContext(settings, liveData, route);
    const full: BrainContext = {
      ...base,
      openTasks,
      todayEvents,
      focusMinutes,
      unread: unreadCount || 0,
    };
    return filterContextForRoute(route, full);
  }, [settings, nowPlaying, weatherPayload, route, tasks, events, unreadCount, state]);

  const refresh = useCallback(() => setRecent(listRecent()), []);

  const rememberFn = useCallback(
    (id: string, content: unknown, ttl?: number) => {
      const item = remember(id, content, ttl);
      refresh();
      return item;
    },
    [refresh]
  );

  const recallFn = useCallback((id: string) => recall(id), []);

  const recallByCategoryFn = useCallback((category: string) => recallByCategory(category), []);

  const forgetFn = useCallback(
    (id: string) => {
      const ok = forget(id);
      if (ok) refresh();
      return ok;
    },
    [refresh]
  );

  const clearSensitiveFn = useCallback(() => {
    const count = clearSensitive();
    if (count) refresh();
    return count;
  }, [refresh]);

  const pruneExpiredFn = useCallback(() => {
    const count = pruneExpired();
    if (count) refresh();
    return count;
  }, [refresh]);

  return {
    context,
    recent,
    remember: rememberFn,
    recall: recallFn,
    recallByCategory: recallByCategoryFn,
    forget: forgetFn,
    clearSensitive: clearSensitiveFn,
    pruneExpired: pruneExpiredFn,
  };
}
