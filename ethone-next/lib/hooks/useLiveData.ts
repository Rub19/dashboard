"use client";

import { useEffect, useState } from "react";
import { fetchWorker } from "../api";

export type LiveRecord = {
  id: string;
  source: string;
  label: string;
  status: "loading" | "connected" | "empty" | "error";
  title?: string;
  subtitle?: string;
  meta?: string;
  url?: string;
  icon?: string;
};

const SOURCES = [
  { id: "nowPlaying", source: "nowplaying", label: "Spotify / Now Playing", path: "/api/now-playing" },
  { id: "lanyard", source: "lanyard", label: "Discord", path: "/api/lanyard/presence" },
  { id: "github", source: "github", label: "GitHub", path: "/api/github/profile" },
  { id: "todoist", source: "todoist", label: "Todoist", path: "/api/todoist/tasks" },
  { id: "notion", source: "notion", label: "Notion", path: "/api/notion/pages" },
  { id: "reddit", source: "reddit", label: "Reddit", path: "/api/reddit/activity" },
  { id: "youtube", source: "youtube", label: "YouTube", path: "/api/youtube/activity" },
  { id: "lastfm", source: "lastfm", label: "Last.fm", path: "/api/lastfm/recent-tracks" },
  { id: "weather", source: "weather", label: "Météo", path: "/api/weather" },
];

function normalize(source: (typeof SOURCES)[number], data: any): LiveRecord {
  switch (source.id) {
    case "nowPlaying":
      return {
        ...source,
        status: data?.title ? "connected" : "empty",
        title: data?.title || "Aucune lecture",
        subtitle: data?.artist,
        meta: data?.source,
      };
    case "lanyard":
      return {
        ...source,
        status: data?.discord_status ? "connected" : "empty",
        title: data?.discord_status || "Hors ligne",
        subtitle: data?.activities?.[0]?.name,
        meta: data?.activities?.[0]?.details,
      };
    case "github":
      return {
        ...source,
        status: data?.login ? "connected" : "empty",
        title: data?.login || "GitHub",
        subtitle: data?.bio,
        meta: data?.public_repos ? `${data.public_repos} repos` : undefined,
      };
    case "todoist":
      return {
        ...source,
        status: Array.isArray(data) && data.length > 0 ? "connected" : "empty",
        title: "Todoist",
        subtitle: Array.isArray(data) ? `${data.length} tâches` : "Aucune tâche",
      };
    case "notion":
      return {
        ...source,
        status: Array.isArray(data) && data.length > 0 ? "connected" : "empty",
        title: "Notion",
        subtitle: Array.isArray(data) ? `${data.length} pages` : "Aucune page",
      };
    case "reddit":
      return {
        ...source,
        status: data?.submissions?.length || data?.comments?.length ? "connected" : "empty",
        title: "Reddit",
        subtitle: data?.submissions?.length ? `${data.submissions.length} posts` : "Aucune activité",
      };
    case "youtube":
      return {
        ...source,
        status: data?.items?.length ? "connected" : "empty",
        title: "YouTube",
        subtitle: data?.items?.length ? `${data.items.length} activités` : "Aucune activité",
      };
    case "lastfm":
      return {
        ...source,
        status: Array.isArray(data) && data.length > 0 ? "connected" : "empty",
        title: "Last.fm",
        subtitle: data?.[0]?.name,
        meta: data?.[0]?.artist,
      };
    case "weather":
      return {
        ...source,
        status: data?.temp !== undefined ? "connected" : "empty",
        title: data?.condition || "Météo",
        subtitle: data?.city,
        meta: data?.temp ? `${data.temp}°C` : undefined,
      };
    default:
      return { ...source, status: "empty", title: source.label };
  }
}

export function useLiveData() {
  const [records, setRecords] = useState<LiveRecord[]>(
    SOURCES.map((s) => ({ ...s, status: "loading" }))
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      const results = await Promise.all(
        SOURCES.map(async (source) => {
          try {
            const res = await fetchWorker(source.path);
            const data = res?.data;
            return normalize(source, data);
          } catch {
            return { ...source, status: "error" as const, title: source.label };
          }
        })
      );
      if (!cancelled) {
        setRecords(results);
        setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { records, loading };
}
