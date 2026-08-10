"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchWorker } from "../api";

export type CloudDashboard = {
  totalFiles: number;
  totalSize: number;
  folders: number;
  favorites: number;
  activeShares: number;
  expiredShares: number;
  activeDrops: number;
  expiredDrops: number;
  topFiles: Array<{
    id: string;
    driveFileId: string;
    name: string;
    size: number;
    mimeType: string;
  }>;
};

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

export type TrackerMatch = {
  id: string;
  map?: string;
  mode?: string;
  agent?: string;
  champion?: string;
  result?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  started?: string;
};

export function useHomeData() {
  const [dashboard, setDashboard] = useState<CloudDashboard | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [lanyard, setLanyard] = useState<LanyardPresence | null>(null);
  const [valorant, setValorant] = useState<TrackerMatch[] | null>(null);
  const [lol, setLol] = useState<TrackerMatch[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { label: "Bonjour", tone: "Un départ calme, puis l'essentiel." };
    if (hour >= 12 && hour < 18) return { label: "Bon après-midi", tone: "Gardez le cap sur ce qui compte." };
    if (hour >= 18 && hour < 23) return { label: "Bonsoir", tone: "Le bon moment pour conclure sans se presser." };
    return { label: "Encore éveillé", tone: "ETHONE reste discret pendant que vous avancez." };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const [dash, np, la, val, lo] = await Promise.allSettled([
          fetchWorker("/api/cloud/dashboard"),
          fetchWorker("/api/now-playing"),
          fetchWorker("/api/lanyard/presence"),
          fetchWorker("/api/tracker/valorant-matches"),
          fetchWorker("/api/tracker/lol-matches"),
        ]);

        if (cancelled) return;

        if (dash.status === "fulfilled") setDashboard(dash.value?.data || null);
        if (np.status === "fulfilled") setNowPlaying(np.value?.data || null);
        if (la.status === "fulfilled") setLanyard(la.value?.data || null);
        if (val.status === "fulfilled") setValorant(Array.isArray(val.value?.data) ? val.value.data : val.value?.matches || null);
        if (lo.status === "fulfilled") setLol(Array.isArray(lo.value?.data) ? lo.value.data : lo.value?.matches || null);

        const errors = [dash, np, la, val, lo]
          .map((r, i) => (r.status === "rejected" ? r.reason : null))
          .filter(Boolean);
        if (errors.length === 5) throw new Error("Impossible de charger le dashboard.");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { greeting, dashboard, nowPlaying, lanyard, valorant, lol, loading, error };
}
