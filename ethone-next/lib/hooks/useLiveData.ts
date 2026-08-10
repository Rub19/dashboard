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

type ApiData = Record<string, unknown>;

function asStr(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

async function fetchOptional(path: string): Promise<ApiData | null> {
  try {
    const res = await fetchWorker(path);
    return (res?.data as ApiData | undefined) ?? null;
  } catch {
    return null;
  }
}

export function useLiveData(pollMs = 15000) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [lanyard, setLanyard] = useState<LanyardPresence | null>(null);
  const [weather, setWeather] = useState<Record<string, unknown> | null>(null);
  const [github, setGitHub] = useState<Record<string, unknown> | null>(null);
  const [todoist, setTodoist] = useState<Record<string, unknown> | null>(null);
  const [youtube, setYouTube] = useState<Record<string, unknown> | null>(null);
  const [reddit, setReddit] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const [np, la, we, gh, td, yt, rd] = await Promise.allSettled([
          fetchOptional("/api/now-playing"),
          fetchOptional("/api/lanyard/presence"),
          fetchOptional("/api/weather?q=Paris"),
          fetchOptional("/api/github/profile"),
          fetchOptional("/api/todoist/tasks"),
          fetchOptional("/api/youtube/activity"),
          fetchOptional("/api/reddit/activity"),
        ]);
        if (cancelled) return;
        if (np.status === "fulfilled") setNowPlaying(np.value || null);
        if (la.status === "fulfilled") setLanyard(la.value || null);
        if (we.status === "fulfilled") setWeather(we.value || null);
        if (gh.status === "fulfilled") setGitHub(gh.value || null);
        if (td.status === "fulfilled") setTodoist(td.value || null);
        if (yt.status === "fulfilled") setYouTube(yt.value || null);
        if (rd.status === "fulfilled") setReddit(rd.value || null);
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

  if (weather) {
    records.push({
      id: "weather",
      source: "weather",
      label: "Météo",
      title: `${asStr(weather.temperature) ?? "--"}°C`,
      subtitle: asStr(weather.condition),
      meta: asStr(weather.location),
      status: "connected",
    });
  }

  const githubLogin = asStr(github?.login);
  if (githubLogin) {
    records.push({
      id: "github",
      source: "github",
      label: "GitHub",
      title: githubLogin,
      subtitle: `${asStr(github?.public_repos) ?? 0} repos`,
      status: "connected",
    });
  } else {
    records.push({ id: "github", source: "github", label: "GitHub", title: "Non connecté", status: "empty" });
  }

  const todoistTask = asStr(todoist?.task);
  if (todoistTask) {
    records.push({
      id: "todoist",
      source: "todoist",
      label: "Todoist",
      title: todoistTask,
      subtitle: asStr(todoist?.project),
      status: "connected",
    });
  } else {
    records.push({ id: "todoist", source: "todoist", label: "Todoist", title: "Aucune tâche", status: "empty" });
  }

  const youtubeChannel = asStr(youtube?.channelTitle);
  if (youtubeChannel) {
    records.push({
      id: "youtube",
      source: "youtube",
      label: "YouTube",
      title: youtubeChannel,
      subtitle: asStr(youtube?.latestVideoTitle),
      status: "connected",
    });
  } else {
    records.push({ id: "youtube", source: "youtube", label: "YouTube", title: "Non connecté", status: "empty" });
  }

  const redditName = asStr(reddit?.name);
  if (redditName) {
    records.push({
      id: "reddit",
      source: "reddit",
      label: "Reddit",
      title: redditName,
      subtitle: asStr(reddit?.latestPostTitle),
      status: "connected",
    });
  } else {
    records.push({ id: "reddit", source: "reddit", label: "Reddit", title: "Non connecté", status: "empty" });
  }

  return { nowPlaying, lanyard, weather, records, loading, error };
}
