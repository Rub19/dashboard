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

async function refreshSpotifyAccessToken(clientId?: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken =
    localStorage.getItem("ethone:refresh_token:spotify") ||
    localStorage.getItem("spotify_refresh_token") ||
    localStorage.getItem("ethone:cred:spotify:refreshToken");
  if (!refreshToken) return null;

  const resolvedClientId =
    clientId ||
    localStorage.getItem("ethone:clientId:spotify") ||
    localStorage.getItem("ethone:cred:spotify:clientId") ||
    OAUTH_APP_CLIENT_IDS.spotify ||
    "6619fbf6315e4e68948dc08532251912";

  try {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: resolvedClientId,
    });
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (res.ok) {
      const data = (await res.json()) as { access_token?: string; refresh_token?: string };
      if (data.access_token) {
        localStorage.setItem("ethone:token:spotify", data.access_token);
        localStorage.setItem("spotify_access_token", data.access_token);
        localStorage.setItem("ethone:cred:spotify:accessToken", data.access_token);
        if (data.refresh_token) {
          localStorage.setItem("ethone:refresh_token:spotify", data.refresh_token);
          localStorage.setItem("spotify_refresh_token", data.refresh_token);
        }
        return data.access_token;
      }
    }
  } catch {}
  return null;
}

function parseSpotifyItem(
  item: any,
  isPlaying?: boolean,
  progressMs?: number,
  device?: { id?: string; volume_percent?: number }
): NowPlaying | null {
  if (!item) return null;
  const artists = Array.isArray(item.artists)
    ? item.artists.map((a: any) => a?.name || "").filter(Boolean).join(", ")
    : item.show?.name || "";

  const albumImages = item.album?.images || item.show?.images || item.images || [];
  const covers = albumImages.map((img: any) => img?.url).filter(Boolean) as string[];
  const cover = covers[0] || undefined;

  return {
    id: item.id ? String(item.id) : undefined,
    source: "spotify",
    title: String(item.name || ""),
    artist: artists || "Artiste inconnu",
    album: item.album?.name || item.show?.name || undefined,
    cover,
    artworkUrl: cover,
    covers: covers.length > 0 ? covers : undefined,
    progressMs: typeof progressMs === "number" ? progressMs : undefined,
    durationMs: typeof item.duration_ms === "number" ? item.duration_ms : undefined,
    volumePercent: typeof device?.volume_percent === "number" ? device.volume_percent : undefined,
    deviceId: device?.id ? String(device.id) : undefined,
    isPlaying: Boolean(isPlaying),
    isSaved: false,
  };
}

export function useNowPlaying(pollMs = 3000) {
  const { settings } = useSettings();
  const { performanceMode = "normal" } = settings;
  const basePollMs = performanceMode === "low" ? 15000 : Math.max(2000, pollMs);

  const [data, setData] = useState<NowPlaying | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchingRef = useRef(false);

  const fetchLiveTrack = useCallback(async () => {
    if (typeof window === "undefined" || fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      let spotifyToken =
        localStorage.getItem("ethone:token:spotify") ||
        localStorage.getItem("spotify_access_token") ||
        localStorage.getItem("ethone:cred:spotify:accessToken") ||
        localStorage.getItem("ethone:cred:spotify:token");

      const isSpotifyConnected =
        localStorage.getItem("ethone:connected:spotify") === "true" ||
        Boolean(spotifyToken) ||
        Boolean(settings.liveSpotifyClientId) ||
        Boolean(localStorage.getItem("ethone:clientId:spotify")) ||
        settings.liveNowPlayingSource === "spotify";

      const resolvedSpotifyClientId =
        settings.liveSpotifyClientId ||
        localStorage.getItem("ethone:cred:spotify:clientId") ||
        localStorage.getItem("ethone:clientId:spotify") ||
        OAUTH_APP_CLIENT_IDS.spotify;

      // Note: deliberately does NOT fall back to "ethone:clientId:discord" — that
      // key holds ETHONE's own Discord OAuth app client ID (a fixed constant,
      // the same for every user), not a Discord *user* ID. Using it here sent
      // every visitor without a real Lanyard identity to
      // https://api.lanyard.rest/v1/users/<ETHONE's app client id>, which
      // 404s every single poll (Lanyard has no such user) instead of just
      // skipping this source cleanly.
      let discordId =
        (settings.liveNowPlayingSource === "lanyard" ? settings.liveNowPlayingIdentity : null) ||
        settings.liveLanyardUserId ||
        settings.liveNowPlayingIdentity ||
        localStorage.getItem("ethone:pub:discord:liveLanyardUserId") ||
        localStorage.getItem("ethone:pub:lanyardUserId") ||
        localStorage.getItem("ethone:cred:discord:userId");

      if (!discordId) {
        try {
          const storedProf = localStorage.getItem("ethone:discord:profile");
          if (storedProf) {
            const p = JSON.parse(storedProf);
            if (p?.user?.id) discordId = String(p.user.id);
          }
        } catch {}
      }

      // Helper for Lanyard Spotify live detection
      const fetchLanyardTrack = async (id: string): Promise<NowPlaying | null> => {
        try {
          const lanyardRes = await fetch(`https://api.lanyard.rest/v1/users/${encodeURIComponent(id)}`);
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
              };
            };
            const sp = lJson?.data?.spotify;
            if (sp && sp.song) {
              const start = sp.timestamps?.start;
              const end = sp.timestamps?.end;
              return {
                id: sp.track_id,
                source: "spotify",
                title: sp.song,
                artist: sp.artist || "Spotify",
                album: sp.album,
                cover: sp.album_art_url,
                artworkUrl: sp.album_art_url,
                covers: sp.album_art_url ? [sp.album_art_url] : [],
                progressMs: start ? Math.max(0, Date.now() - start) : undefined,
                durationMs: start && end ? end - start : undefined,
                isPlaying: true,
                isSaved: false,
              };
            }
          }
        } catch {}
        return null;
      };

      let activeTrack: NowPlaying | null = null;
      let idleTrack: NowPlaying | null = null;

      // 1. Try Spotify Web API directly with token
      if (spotifyToken) {
        try {
          let spotifyRes = await fetch("https://api.spotify.com/v1/me/player?additional_types=track,episode", {
            headers: { Authorization: `Bearer ${spotifyToken}` },
          });

          if (spotifyRes.status === 401) {
            // Attempt token refresh via PKCE
            const refreshed = await refreshSpotifyAccessToken(resolvedSpotifyClientId);
            if (refreshed) {
              spotifyToken = refreshed;
              spotifyRes = await fetch("https://api.spotify.com/v1/me/player?additional_types=track,episode", {
                headers: { Authorization: `Bearer ${spotifyToken}` },
              });
            } else {
              // Refresh failed too (no valid refresh token, or it was itself
              // revoked/expired) — clear every local Spotify token key so we
              // stop retrying a doomed refresh on every poll and fall through
              // cleanly to the Worker-backed now-playing route below, which
              // holds its own server-side token independent of this browser.
              localStorage.removeItem("ethone:token:spotify");
              localStorage.removeItem("spotify_access_token");
              localStorage.removeItem("ethone:cred:spotify:accessToken");
              localStorage.removeItem("ethone:cred:spotify:token");
              localStorage.removeItem("ethone:refresh_token:spotify");
              localStorage.removeItem("spotify_refresh_token");
              localStorage.removeItem("ethone:cred:spotify:refreshToken");
              spotifyToken = null;
            }
          }

          // If the refresh above failed, spotifyToken is now null and every
          // request above would 401 again for nothing — skip straight to the
          // Worker-backed fallback (step 3) instead of hammering Spotify with
          // guaranteed-failing requests using a `Bearer null` header.
          if (spotifyToken) {
            if (spotifyRes.status === 200) {
              const spJson = (await spotifyRes.json().catch(() => null)) as any;
              if (spJson?.item) {
                const mapped = parseSpotifyItem(spJson.item, spJson.is_playing, spJson.progress_ms, spJson.device);
                if (mapped) {
                  if (mapped.isPlaying) {
                    activeTrack = mapped;
                  } else {
                    idleTrack = mapped;
                  }
                }
              }
            }

            if (!activeTrack && (spotifyRes.status === 204 || !spotifyRes.ok)) {
              // Check currently-playing directly
              const cpRes = await fetch("https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode", {
                headers: { Authorization: `Bearer ${spotifyToken}` },
              });
              if (cpRes.status === 200) {
                const cpJson = (await cpRes.json().catch(() => null)) as any;
                if (cpJson?.item) {
                  const mapped = parseSpotifyItem(cpJson.item, cpJson.is_playing, cpJson.progress_ms, cpJson.device);
                  if (mapped) {
                    if (mapped.isPlaying) {
                      activeTrack = mapped;
                    } else if (!idleTrack) {
                      idleTrack = mapped;
                    }
                  }
                }
              }
            }

            // Fallback to recently-played if no track yet
            if (!activeTrack && !idleTrack) {
              try {
                const recentRes = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=1", {
                  headers: { Authorization: `Bearer ${spotifyToken}` },
                });
                if (recentRes.ok) {
                  const rJson = (await recentRes.json().catch(() => null)) as any;
                  const lastTrack = rJson?.items?.[0]?.track;
                  if (lastTrack) {
                    const mapped = parseSpotifyItem(lastTrack, false, 0);
                    if (mapped) idleTrack = mapped;
                  }
                }
              } catch {}
            }
          }
        } catch {
          // Direct browser fetch failed (e.g. adblocker, CORS) -> continue to next sources
        }
      }

      // If direct Spotify API already found an actively playing song, return it
      if (activeTrack && activeTrack.isPlaying) {
        setData(activeTrack);
        setError(null);
        return;
      }

      // 2. Try Discord Lanyard presence for active Spotify playback (or as live playing override)
      if (discordId) {
        const lanyardTrack = await fetchLanyardTrack(discordId);
        if (lanyardTrack && lanyardTrack.isPlaying) {
          setData(lanyardTrack);
          setError(null);
          return;
        }
      }

      // If we had a paused/recent track from Spotify Web API, show it
      if (idleTrack) {
        setData(idleTrack);
        setError(null);
        return;
      }

      // 3. Try Worker now-playing endpoint
      if (isSpotifyConnected && resolvedSpotifyClientId) {
        try {
          const res = await fetchWorker(`/api/spotify/now-playing?clientId=${encodeURIComponent(resolvedSpotifyClientId)}`);
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

      // 4. Default Spotify standby state if no live stream is broadcasting
      if (isSpotifyConnected) {
        setData({
          source: "spotify",
          title: "Spotify",
          artist: "Connecté • Prêt pour la lecture",
          isPlaying: false,
        });
      } else {
        setData({
          source: "spotify",
          title: "Spotify",
          artist: "Prêt • Cliquez pour connecter",
          isPlaying: false,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [settings.liveSpotifyClientId, settings.liveNowPlayingSource, settings.liveNowPlayingIdentity, settings.liveLanyardUserId]);

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
    window.addEventListener("storage", onConnectionUpdate);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("v8:connection-updated", onConnectionUpdate);
      window.removeEventListener("v8:nowplaying-updated", onConnectionUpdate);
      window.removeEventListener("storage", onConnectionUpdate);
    };
  }, [fetchLiveTrack]);

  return {
    nowPlaying: data,
    loading,
    error,
    refetch: fetchLiveTrack,
  };
}

