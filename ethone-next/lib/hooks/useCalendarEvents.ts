"use client";

import { useEffect, useState } from "react";
import { fetchWorker } from "@/lib/api";

type GoogleTime = { dateTime?: string; date?: string };

type GoogleEvent = {
  id?: string;
  title?: string;
  summary?: string;
  startAt?: string;
  start?: string | GoogleTime;
  endAt?: string;
  end?: string | GoogleTime;
};

export type CalendarEvent = {
  id: string;
  title: string;
  startAt?: string;
  endAt?: string;
  source: "google" | "local";
};

function toIso(value: string | GoogleTime | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value || undefined;
  return value.dateTime || value.date || undefined;
}

export function useCalendarEvents(clientId?: string) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!clientId) {
      setEvents([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchWorker(`/api/google-calendar/events?clientId=${encodeURIComponent(clientId)}`)
      .then((res) => {
        if (cancelled) return;
        const data = (res?.data?.events || res?.events || []) as GoogleEvent[];
        setEvents(
          data.map((e) => ({
            id: e.id || `${Date.now()}-${Math.random()}`,
            title: e.title || e.summary || "Événement",
            startAt: e.startAt || toIso(e.start),
            endAt: e.endAt || toIso(e.end),
            source: "google" as const,
          }))
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return { events, loading, error };
}
