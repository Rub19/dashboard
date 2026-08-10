"use client";

import { useEffect, useState } from "react";
import { fetchWorker } from "@/lib/api";

export type NowPlaying = {
  source?: string;
  title?: string;
  artist?: string;
  album?: string;
  cover?: string;
  artworkUrl?: string;
  progressMs?: number;
  durationMs?: number;
  isPlaying?: boolean;
};

export type LanyardPresence = {
  userId?: string;
  displayName?: string;
  avatarUrl?: string;
  discord_status?: "online" | "idle" | "dnd" | "offline";
  spotify?: {
    playing?: boolean;
    title?: string;
    artist?: string;
    album?: string;
    artwork?: string;
  };
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
  image?: string;
  status: "connected" | "loading" | "empty" | "error";
};

type ApiData = Record<string, unknown>;

function asStr(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function asNum(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
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

function getArtworkUrl(np: ApiData | null): string | undefined {
  return asStr(np?.artworkUrl || np?.cover || np?.artwork);
}

export function useLiveData(pollMs = 15000) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [lanyard, setLanyard] = useState<LanyardPresence | null>(null);
  const [weather, setWeather] = useState<ApiData | null>(null);
  const [github, setGitHub] = useState<ApiData | null>(null);
  const [todoist, setTodoist] = useState<ApiData | null>(null);
  const [youtube, setYouTube] = useState<ApiData | null>(null);
  const [reddit, setReddit] = useState<ApiData | null>(null);
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
        if (np.status === "fulfilled") {
          const d = np.value || {};
          setNowPlaying({
            source: asStr(d.source) || "Spotify",
            title: asStr(d.title),
            artist: asStr(d.artist),
            album: asStr(d.album),
            cover: asStr(d.cover),
            artworkUrl: asStr(d.artworkUrl),
            progressMs: asNum(d.progressMs),
            durationMs: asNum(d.durationMs),
            isPlaying: Boolean(d.isPlaying ?? d.playing),
          });
        }
        if (la.status === "fulfilled") {
          const d = la.value || {};
          setLanyard({
            userId: asStr(d.userId),
            displayName: asStr(d.displayName),
            avatarUrl: asStr(d.avatarUrl),
            discord_status: (d.status as LanyardPresence["discord_status"]) || "offline",
            spotify: d.spotify
              ? {
                  playing: Boolean((d.spotify as ApiData).playing),
                  title: asStr((d.spotify as ApiData).title),
                  artist: asStr((d.spotify as ApiData).artist),
                  album: asStr((d.spotify as ApiData).album),
                  artwork: asStr((d.spotify as ApiData).artwork),
                }
              : undefined,
            activities: Array.isArray(d.activities)
              ? d.activities.map((a: unknown) => ({
                  name: asStr((a as ApiData).name) || "",
                  state: asStr((a as ApiData).state),
                  details: asStr((a as ApiData).details),
                }))
              : [],
          });
        }
        if (we.status === "fulfilled") setWeather(we.value);
        if (gh.status === "fulfilled") setGitHub(gh.value);
        if (td.status === "fulfilled") setTodoist(td.value);
        if (yt.status === "fulfilled") setYouTube(yt.value);
        if (rd.status === "fulfilled") setReddit(rd.value);
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
      label: nowPlaying.source || "Spotify",
      title: nowPlaying.title || "En lecture",
      subtitle: nowPlaying.artist,
      meta: nowPlaying.album,
      image: getArtworkUrl(nowPlaying as unknown as ApiData),
      status: "connected",
    });
  } else {
    records.push({
      id: "nowplaying",
      source: "nowplaying",
      label: "Spotify",
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
      title: lanyard.displayName || lanyard.discord_status,
      subtitle: activity?.name,
      meta: activity?.details,
      image: lanyard.avatarUrl,
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

  const wCondition = asStr(weather?.condition);
  const wTemp = asNum(weather?.temperature);
  records.push({
    id: "weather",
    source: "weather",
    label: "Météo",
    title: wTemp !== undefined ? `${wTemp}°C` : "—",
    subtitle: wCondition,
    meta: asStr(weather?.location) || asStr(weather?.city),
    image: asStr(weather?.iconUrl),
    status: weather ? "connected" : loading ? "loading" : "empty",
  });

  const githubLogin = asStr(github?.login);
  records.push({
    id: "github",
    source: "github",
    label: "GitHub",
    title: githubLogin || "GitHub",
    subtitle: githubLogin ? `${asNum(github?.publicRepos) ?? 0} repos · ${asNum(github?.followers) ?? 0} followers` : undefined,
    meta: asStr((github?.recentEvent as ApiData)?.type),
    image: asStr(github?.avatarUrl),
    status: githubLogin ? "connected" : loading ? "loading" : "empty",
  });

  const todoistTask = asStr(todoist?.task);
  records.push({
    id: "todoist",
    source: "todoist",
    label: "Todoist",
    title: todoistTask || "Aucune tâche",
    subtitle: asStr(todoist?.project),
    status: todoistTask ? "connected" : loading ? "loading" : "empty",
  });

  const youtubeChannel = asStr((youtube?.channel as ApiData)?.title) || asStr(youtube?.channelTitle);
  const youtubeVideo = youtube?.latestVideo as ApiData;
  const youtubeVideoTitle = asStr(youtubeVideo?.title) || asStr(youtube?.latestVideoTitle);
  records.push({
    id: "youtube",
    source: "youtube",
    label: "YouTube",
    title: youtubeChannel || "YouTube",
    subtitle: youtubeVideoTitle,
    image: asStr(youtubeVideo?.thumbnailUrl) || asStr(youtube?.latestVideoThumbnailUrl),
    status: youtubeChannel ? "connected" : loading ? "loading" : "empty",
  });

  const redditProfile = reddit?.profile as ApiData;
  const redditName = asStr(redditProfile?.username) || asStr(reddit?.name);
  const redditKarma = asNum(redditProfile?.karma);
  const redditPost = reddit?.latestPost as ApiData;
  const redditPostTitle = asStr(redditPost?.title) || asStr(reddit?.latestPostTitle);
  records.push({
    id: "reddit",
    source: "reddit",
    label: "Reddit",
    title: redditName || "Reddit",
    subtitle: redditKarma !== undefined ? `${redditKarma} karma` : undefined,
    meta: redditPostTitle,
    image: asStr(redditProfile?.avatarUrl) || asStr(reddit?.avatarUrl),
    status: redditName ? "connected" : loading ? "loading" : "empty",
  });

  return { nowPlaying, lanyard, weather, records, loading, error };
}
