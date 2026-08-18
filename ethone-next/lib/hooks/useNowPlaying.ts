"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { fetchWorker } from "@/lib/api";
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

export function useNowPlaying(pollMs = 30000) {
  const { settings } = useSettings();
  const { performanceMode = "normal" } = settings;
  const effectivePollMs = performanceMode === "low" ? 120000 : pollMs;

  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const lastAtRef = useRef(0);

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      const now = Date.now();
      if (now - lastAtRef.current < 1000) return;
      lastAtRef.current = now;
      if (!path) {
        if (!cancelled) {
          setNowPlaying(null);
          setLoading(false);
          setError(null);
        }
        return;
      }
      if (!cancelled) setError(null);
      try {
        const res = (await fetchWorker(path)) as ApiData | null;
        if (cancelled) return;
        const data = (res?.data as ApiData | undefined) || res || null;
        const track = (data?.track as ApiData) || data || {};
        const mapped: NowPlaying | null = data
          ? {
              id: asStr(track.id ?? data.id),
              source: asStr(data.source) || "spotify",
              title: asStr(track.title ?? data.title),
              artist: asStr(track.artist ?? data.artist),
              album: asStr(track.album ?? data.album),
              cover: asStr(track.cover ?? track.artworkUrl ?? track.artwork ?? data.cover ?? data.artworkUrl ?? data.artwork),
              artworkUrl: getArtworkUrl(data) || asStr(track.artworkUrl ?? track.artwork ?? track.cover),
              progressMs: asNum(track.progressMs ?? data.progressMs),
              durationMs: asNum(track.durationMs ?? data.durationMs),
              volumePercent: typeof track.volumePercent === "number" ? Math.max(0, Math.min(100, track.volumePercent)) : undefined,
              deviceId: asStr(track.deviceId),
              isPlaying: Boolean(data.isPlaying ?? data.playing ?? track.isPlaying ?? track.playing),
              isSaved: track.isSaved === true,
            }
          : null;
        setNowPlaying(mapped);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, effectivePollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [path, effectivePollMs]);

  const refetch = () => {
    lastAtRef.current = 0;
    setLoading(true);
  };

  return { nowPlaying, loading, error, refetch };
}
