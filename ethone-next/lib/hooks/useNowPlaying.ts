"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { OAUTH_APP_CLIENT_IDS } from "@/lib/oauth";
import { fetchWorker } from "@/lib/api";
import type { NowPlaying } from "@/lib/hooks/useLiveData";

type ApiData = Record<string, unknown>;

function asStr(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value !== null && typeof value === "object") {
    if ("url" in value && typeof (value as Record<string, unknown>).url === "string") {
      return (value as Record<string, unknown>).url as string;
    }
    if ("src" in value && typeof (value as Record<string, unknown>).src === "string") {
      return (value as Record<string, unknown>).src as string;
    }
  }
  return undefined;
}

function asNum(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return undefined;
}

function getArtworkUrl(np: ApiData | null): string | undefined {
  return asStr(np?.artworkUrl || np?.cover || np?.artwork || np?.image || np?.imageUrl || np?.albumImageUrl || np?.thumbnail || np?.albumArt);
}

function firstItem(list: unknown): string | undefined {
  if (Array.isArray(list)) {
    for (const value of list) {
      const s = asStr(value);
      if (s) return s;
    }
  }
  return undefined;
}

function mapNowPlaying(raw: unknown): NowPlaying | null {
  const res = (raw || {}) as ApiData;
  const data = (res?.data as ApiData | undefined) || res || null;
  if (!data) return null;
  const track = (data?.track as ApiData) || data || {};

  const trackCovers = Array.isArray(track.covers) ? track.covers : [];
  const dataCovers = Array.isArray(data.covers) ? data.covers : [];
  const firstCover =
    asStr(track.cover ?? track.artworkUrl ?? track.artwork ?? track.image ?? track.imageUrl ?? track.albumImageUrl ?? track.thumbnail ?? track.albumArt ??
      data.cover ?? data.artworkUrl ?? data.artwork ?? data.image ?? data.imageUrl ?? data.albumImageUrl ?? data.thumbnail ?? data.albumArt) ||
    firstItem(trackCovers) ||
    firstItem(dataCovers);

  const covers: string[] = [];
  {
    const seen = new Set<string>();
    const add = (value: unknown) => {
      const s = asStr(value);
      if (s && !seen.has(s)) {
        seen.add(s);
        covers.push(s);
      }
    };
    for (const key of ["cover", "artworkUrl", "artwork", "image", "imageUrl", "albumImageUrl", "thumbnail", "albumArt"]) {
      add(track[key]);
      add(data[key]);
    }
    for (const c of trackCovers) add(c);
    for (const c of dataCovers) add(c);
  }

  return {
    id: asStr(track.id ?? data.id),
    source: asStr(data.source) || "spotify",
    title: asStr(track.title ?? data.title),
    artist: asStr(track.artist ?? data.artist),
    album: asStr(track.album ?? data.album),
    cover: firstCover,
    artworkUrl: getArtworkUrl(data) || asStr(track.artworkUrl ?? track.artwork ?? track.cover) || firstItem(trackCovers) || firstItem(dataCovers),
    covers: covers.length > 0 ? covers : undefined,
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

export function useNowPlaying(pollMs = 10000) {
  const { settings } = useSettings();
  const { performanceMode = "normal" } = settings;
  const basePollMs = performanceMode === "low" ? 30000 : Math.max(3000, pollMs);

  const [data, setData] = useState<NowPlaying | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchingRef = useRef(false);

  const fetchLiveTrack = useCallback(async () => {
    if (typeof window === "undefined" || fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const spotifyToken =
        localStorage.getItem("ethone:token:spotify") ||
        localStorage.getItem("spotify_access_token") ||
        localStorage.getItem("ethone:cred:spotify:accessToken") ||
        localStorage.getItem("ethone:cred:spotify:token");

      const isSpotifyConnected =
        localStorage.getItem("ethone:connected:spotify") === "true" || Boolean(spotifyToken);

      const discordId =
        (settings.liveNowPlayingSource === "lanyard" ? settings.liveNowPlayingIdentity : null) ||
        settings.liveNowPlayingIdentity ||
        localStorage.getItem("ethone:pub:lanyardUserId") ||
        localStorage.getItem("ethone:cred:discord:userId") ||
        localStorage.getItem("ethone:clientId:discord");

      // 1. Try Spotify Web API directly with token
      if (spotifyToken) {
        try {
          let spotifyRes = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
            headers: { Authorization: `Bearer ${spotifyToken}` },
          });

          if (spotifyRes.status === 204 || (spotifyRes.status === 200 && !spotifyRes.body)) {
            spotifyRes = await fetch("https://api.spotify.com/v1/me/player", {
              headers: { Authorization: `Bearer ${spotifyToken}` },
            });
          }

          if (spotifyRes.status === 200) {
            const spJson = (await spotifyRes.json()) as {
              is_playing?: boolean;
              progress_ms?: number;
              item?: {
                id?: string;
                name?: string;
                duration_ms?: number;
                artists?: { name: string }[];
                album?: { name: string; images?: { url: string }[] };
              };
            };

            if (spJson?.item) {
              const mapped: NowPlaying = {
                id: spJson.item.id,
                source: "spotify",
                title: spJson.item.name,
                artist: spJson.item.artists?.map((a) => a.name).join(", "),
                album: spJson.item.album?.name,
                cover: spJson.item.album?.images?.[0]?.url,
                artworkUrl: spJson.item.album?.images?.[0]?.url,
                covers: spJson.item.album?.images?.map((i) => i.url) || [],
                progressMs: spJson.progress_ms,
                durationMs: spJson.item.duration_ms,
                isPlaying: Boolean(spJson.is_playing),
                isSaved: false,
              };
              setData(mapped);
              setError(null);
              return;
            }
          }
        } catch {
          // Fall through to Lanyard / Worker proxy
        }
      }

      // 2. Try Discord Lanyard presence for active Spotify playback
      if (discordId) {
        try {
          const lanyardRes = await fetch(`https://api.lanyard.rest/v1/users/${encodeURIComponent(discordId)}`);
          if (lanyardRes.ok) {
            const lJson = (await lanyardRes.json()) as {
              data?: {
                spotify?: {
                  track_id?: string;
                  song?: string;
                  artist?: string;
                  album?: string;
                  album_art_url?: string;
                  timestamps?: { start?: number; end?: number };
                };
                listening_to_spotify?: boolean;
              };
            };

            const sp = lJson?.data?.spotify;
            if (sp && sp.song) {
              const start = sp.timestamps?.start;
              const end = sp.timestamps?.end;
              const mapped: NowPlaying = {
                id: sp.track_id,
                source: "spotify",
                title: sp.song,
                artist: sp.artist,
                album: sp.album,
                cover: sp.album_art_url,
                artworkUrl: sp.album_art_url,
                covers: sp.album_art_url ? [sp.album_art_url] : [],
                progressMs: start ? Math.max(0, Date.now() - start) : undefined,
                durationMs: start && end ? end - start : undefined,
                isPlaying: true,
                isSaved: false,
              };
              setData(mapped);
              setError(null);
              return;
            }
          }
        } catch {
          // Fall through
        }
      }

      // 3. Try Worker now-playing endpoint
      const spotifyClientId =
        settings.liveSpotifyClientId ||
        localStorage.getItem("ethone:cred:spotify:clientId") ||
        OAUTH_APP_CLIENT_IDS.spotify;

      if (isSpotifyConnected && spotifyClientId) {
        try {
          const res = await fetchWorker(`/api/spotify/now-playing?clientId=${encodeURIComponent(spotifyClientId)}`);
          const mapped = mapNowPlaying(res);
          if (mapped && (mapped.title || mapped.isPlaying)) {
            setData(mapped);
            setError(null);
            return;
          }
        } catch {
          // Fall through
        }
      }

      // 4. If Spotify is connected but idle
      if (isSpotifyConnected) {
        setData({
          source: "spotify",
          title: "Spotify",
          artist: "Connecté • Prêt pour la lecture",
          isPlaying: false,
        });
      } else {
        setData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [settings.liveSpotifyClientId, settings.liveNowPlayingSource, settings.liveNowPlayingIdentity]);

  useEffect(() => {
    fetchLiveTrack();
  }, [fetchLiveTrack]);

  // Polling loop
  useEffect(() => {
    if (typeof document !== "undefined" && document.hidden) return;

    const intervalMs = data?.isPlaying ? Math.min(5000, basePollMs) : basePollMs;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchLiveTrack();
      }
    }, intervalMs);
    return () => clearInterval(interval);
  }, [data?.isPlaying, basePollMs, fetchLiveTrack]);

  // Visibility & connection events
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") fetchLiveTrack();
    }
    function onConnectionUpdate() {
      fetchLiveTrack();
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("v8:connection-updated", onConnectionUpdate);
    window.addEventListener("v8:nowplaying-updated", onConnectionUpdate);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("v8:connection-updated", onConnectionUpdate);
      window.removeEventListener("v8:nowplaying-updated", onConnectionUpdate);
    };
  }, [fetchLiveTrack]);

  return {
    nowPlaying: data,
    loading,
    error,
    refetch: fetchLiveTrack,
  };
}

