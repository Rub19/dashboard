"use client";

import { useEffect, useMemo } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { useCachedFetch } from "@/lib/hooks/useCachedFetch";
import type { NowPlaying } from "@/lib/hooks/useLiveData";

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

function getArtworkUrl(np: ApiData | null): string | undefined {
  return asStr(np?.artworkUrl || np?.cover || np?.artwork);
}

function mapNowPlaying(raw: unknown): NowPlaying | null {
  const res = (raw || {}) as ApiData;
  const data = (res?.data as ApiData | undefined) || res || null;
  if (!data) return null;
  const track = (data?.track as ApiData) || data || {};

  return {
    id: asStr(track.id ?? data.id),
    source: asStr(data.source) || "spotify",
    title: asStr(track.title ?? data.title),
    artist: asStr(track.artist ?? data.artist),
    album: asStr(track.album ?? data.album),
    cover:
      asStr(track.cover ?? track.artworkUrl ?? track.artwork ?? data.cover ?? data.artworkUrl ?? data.artwork),
    artworkUrl: getArtworkUrl(data) || asStr(track.artworkUrl ?? track.artwork ?? track.cover),
    covers: (() => {
      const list = track.covers ?? data.covers;
      if (!Array.isArray(list)) return undefined;
      return list
        .map((c) => asStr(c))
        .filter((c): c is string => typeof c === "string" && c.length > 0);
    })(),
    progressMs: asNum(track.progressMs ?? data.progressMs),
    durationMs: asNum(track.durationMs ?? data.durationMs),
    volumePercent:
      typeof track.volumePercent === "number"
        ? Math.max(0, Math.min(100, track.volumePercent))
        : undefined,
    deviceId: asStr(track.deviceId),
    isPlaying: Boolean(data.isPlaying ?? data.playing ?? track.isPlaying ?? track.playing),
    isSaved: track.isSaved === true,
  };
}

export function useNowPlaying(pollMs = 30000) {
  const { settings } = useSettings();
  const { performanceMode = "normal" } = settings;
  const basePollMs = performanceMode === "low" ? 120000 : pollMs;

  const path = useMemo(() => {
    const source = settings.liveNowPlayingSource;
    const identity = settings.liveNowPlayingIdentity;
    if (source === "lanyard" && identity) {
      return `/api/now-playing?source=lanyard&userId=${encodeURIComponent(identity)}`;
    }
    if (source === "lastfm" && identity) {
      return `/api/now-playing?source=lastfm&username=${encodeURIComponent(identity)}`;
    }
    if (source === "spotify" && settings.liveSpotifyClientId) {
      return `/api/spotify/now-playing?clientId=${encodeURIComponent(settings.liveSpotifyClientId)}`;
    }
    return null;
  }, [settings.liveNowPlayingSource, settings.liveNowPlayingIdentity, settings.liveSpotifyClientId]);

  const { data, loading, error, refresh } = useCachedFetch<NowPlaying | null>({
    path,
    ttl: 5000,
    map: mapNowPlaying,
  });

  useEffect(() => {
    if (!data?.isPlaying) return;
    // Refresh more often while music is playing to stay in sync.
    const intervalMs = Math.min(5000, basePollMs);
    const interval = setInterval(() => refresh(), intervalMs);
    return () => clearInterval(interval);
  }, [data?.isPlaying, basePollMs, refresh]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") refresh();
    }
    function onFocus() {
      refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return {
    nowPlaying: data,
    loading,
    error,
    refetch: refresh,
  };
}
