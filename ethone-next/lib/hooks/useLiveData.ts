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
] as const;

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function arr(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function obj(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function normalize(source: (typeof SOURCES)[number], data: unknown): LiveRecord {
  const o = obj(data) || {};
  switch (source.id) {
    case "nowPlaying":
      return {
        ...source,
        status: o.title ? "connected" : "empty",
        title: str(o.title) || "Aucune lecture",
        subtitle: str(o.artist),
        meta: str(o.source),
      };
    case "lanyard": {
      const activities = arr(o.activities);
      const first = obj(activities?.[0]) || {};
      return {
        ...source,
        status: o.discord_status ? "connected" : "empty",
        title: str(o.discord_status) || "Hors ligne",
        subtitle: str(first.name),
        meta: str(first.details),
      };
    }
    case "github":
      return {
        ...source,
        status: o.login ? "connected" : "empty",
        title: str(o.login) || "GitHub",
        subtitle: str(o.bio),
        meta: num(o.public_repos) ? `${num(o.public_repos)} repos` : undefined,
      };
    case "todoist":
    case "notion": {
      const items = arr(data) || [];
      return {
        ...source,
        status: items.length > 0 ? "connected" : "empty",
        title: source.label,
        subtitle: `${items.length} ${source.id === "todoist" ? "tâches" : "pages"}`,
      };
    }
    case "reddit": {
      const submissions = arr(o.submissions) || [];
      const comments = arr(o.comments) || [];
      return {
        ...source,
        status: submissions.length || comments.length ? "connected" : "empty",
        title: "Reddit",
        subtitle: submissions.length ? `${submissions.length} posts` : "Aucune activité",
      };
    }
    case "youtube": {
      const items = arr(o.items) || [];
      return {
        ...source,
        status: items.length ? "connected" : "empty",
        title: "YouTube",
        subtitle: items.length ? `${items.length} activités` : "Aucune activité",
      };
    }
    case "lastfm": {
      const tracks = arr(data) || [];
      const first = obj(tracks[0]) || {};
      return {
        ...source,
        status: tracks.length > 0 ? "connected" : "empty",
        title: "Last.fm",
        subtitle: str(first.name),
        meta: str(first.artist),
      };
    }
    case "weather":
      return {
        ...source,
        status: o.temp !== undefined ? "connected" : "empty",
        title: str(o.condition) || "Météo",
        subtitle: str(o.city),
        meta: num(o.temp) ? `${o.temp}°C` : undefined,
      };
    default:
      return source as unknown as LiveRecord;
  }
}

export function useLiveData() {
  const [records, setRecords] = useState<LiveRecord[]>(SOURCES.map((s) => ({ ...s, status: "loading" })));
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
