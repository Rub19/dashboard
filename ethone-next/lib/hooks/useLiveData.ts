"use client";

import { useEffect, useState } from "react";
import { fetchWorker } from "@/lib/api";

export type NowPlaying = {
  source?: string;
  title?: string;
  artist?: string;
  album?: string;
  cover?: string;
  isPlaying?: boolean;
};

export type LanyardPresence = {
  discord_status?: "online" | "idle" | "dnd" | "offline";
  activities?: Array<{
    name: string;
    state?: string;
    details?: string;
  }>;
};

export type LiveRecord = {
  id: string;
  source: string;
  label: string;
  title: string;
  subtitle?: string;
  meta?: string;
  status: "connected" | "loading" | "empty" | "error";
};

export function useLiveData(pollMs = 15000) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [lanyard, setLanyard] = useState<LanyardPresence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const [np, la] = await Promise.allSettled([
          fetchWorker("/api/now-playing"),
          fetchWorker("/api/lanyard/presence"),
        ]);
        if (cancelled) return;
        if (np.status === "fulfilled") setNowPlaying(np.value?.data || null);
        if (la.status === "fulfilled") setLanyard(la.value?.data || null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMs]);

  const records: LiveRecord[] = [];

  if (nowPlaying?.isPlaying) {
    records.push({
      id: "nowplaying",
      source: "nowplaying",
      label: nowPlaying.source || "Now Playing",
      title: nowPlaying.title || "En lecture",
      subtitle: nowPlaying.artist,
      meta: nowPlaying.album,
      status: "connected",
    });
  } else {
    records.push({
      id: "nowplaying",
      source: "nowplaying",
      label: "Now Playing",
      title: loading ? "Chargement..." : "Rien en lecture",
      status: loading ? "loading" : "empty",
    });
  }

  if (lanyard?.discord_status) {
    const activity = lanyard.activities?.[0];
    records.push({
      id: "lanyard",
      source: "lanyard",
      label: "Discord",
      title: lanyard.discord_status,
      subtitle: activity?.name,
      meta: activity?.details,
      status: lanyard.discord_status === "offline" ? "empty" : "connected",
    });
  } else {
    records.push({
      id: "lanyard",
      source: "lanyard",
      label: "Discord",
      title: loading ? "Chargement..." : "Hors ligne",
      status: loading ? "loading" : "empty",
    });
  }

  return { nowPlaying, lanyard, records, loading, error };
}
