"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  Heart,
  Laptop,
  Pause,
  Play,
  Repeat,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  User,
  Users,
  Volume2,
  VolumeX,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { getSpotifyToken, sendSpotifyCommand } from "@/lib/spotify-client";
import { OAUTH_APP_CLIENT_IDS, startOAuthConnect } from "@/lib/oauth";
import { ConsolePage, EmptyLine, Panel, Segmented, useGuildApi } from "../kit";
import ClientImage from "@/components/ClientImage";
import { cn } from "@/lib/utils";

interface Track {
  id: string;
  name: string;
  artists: string[];
  album: string;
  albumArt?: string;
  durationMs: number;
  progressMs: number;
  isPlaying: boolean;
  url: string;
  isSaved?: boolean;
}

interface Device {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  volume_percent: number;
}

interface TopTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  url: string;
  durationMs: number;
  albumArt?: string;
}

interface TopArtist {
  id: string;
  name: string;
  url: string;
  genres: string[];
  image?: string;
}

const formatTime = (ms: number): string => {
  if (!ms || ms <= 0) return "00:00";
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export default function ConsoleSpotify({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const { success, error: toastError, info } = useToast();

  const [connected, setConnected] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(50);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "track" | "context">("off");
  const [topTab, setTopTab] = useState<"tracks" | "artists">("tracks");
  const [timeRange, setTimeRange] = useState<"short_term" | "medium_term" | "long_term">("medium_term");
  const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
  const [topArtists, setTopArtists] = useState<TopArtist[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TopTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [streamingToVc, setStreamingToVc] = useState(false);
  const [, startTransition] = useTransition();

  const loadState = useCallback(async () => {
    const localToken = getSpotifyToken();
    if (localToken) setConnected(true);

    const res = await api<{
      isConnected: boolean;
      track: Track | null;
      devices: Device[];
    }>("/spotify/state", { silent: true });

    if (res) {
      if (res.isConnected || localToken) setConnected(true);
      if (res.track) {
        setTrack(res.track);
        setProgress(res.track.progressMs);
      }
      if (res.devices && res.devices.length > 0) {
        setDevices(res.devices);
        const active = res.devices.find((d) => d.is_active);
        if (active) setVolume(active.volume_percent);
      }
    }
  }, [api]);

  const loadTop = useCallback(async () => {
    const res = await api<{ topTracks: TopTrack[]; topArtists: TopArtist[] }>(
      `/spotify/top?timeRange=${timeRange}`,
      { silent: true }
    );
    if (res) {
      setTopTracks(res.topTracks || []);
      setTopArtists(res.topArtists || []);
    }
  }, [api, timeRange]);

  useEffect(() => {
    void loadState();
    void loadTop();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadState();
      }
    }, 3500);

    return () => window.clearInterval(timer);
  }, [loadState, loadTop]);

  useEffect(() => {
    if (!track?.isPlaying) return;
    const interval = window.setInterval(() => {
      setProgress((p) => {
        if (!track.durationMs) return p;
        const next = p + 1000;
        return next > track.durationMs ? track.durationMs : next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [track?.isPlaying, track?.durationMs]);

  const handleConnect = async () => {
    const clientId = OAUTH_APP_CLIENT_IDS.spotify;
    if (!clientId) {
      toastError("Spotify", "Client ID Spotify manquant.");
      return;
    }
    try {
      const url = await startOAuthConnect("spotify", clientId);
      window.location.href = url;
    } catch {
      const res = await api<{ url: string }>("/spotify/connect-url");
      if (res?.url) window.location.href = res.url;
    }
  };

  const handleDisconnect = async () => {
    try {
      localStorage.removeItem("ethone:token:spotify");
      localStorage.removeItem("spotify_access_token");
      localStorage.removeItem("ethone:cred:spotify:accessToken");
    } catch {}
    await api("/spotify/disconnect", { method: "POST" });
    setConnected(false);
    setTrack(null);
    info("Spotify", "Compte Spotify déconnecté.");
  };

  const sendControl = async (action: string, payload: Record<string, unknown> = {}) => {
    startTransition(async () => {
      const ok = await sendSpotifyCommand(action as any, payload as any);
      await api("/spotify/control", {
        method: "POST",
        json: { action, ...payload },
        silent: ok,
      });

      if (action === "play" || action === "resume") {
        setTrack((t) => (t ? { ...t, isPlaying: true } : t));
      } else if (action === "pause") {
        setTrack((t) => (t ? { ...t, isPlaying: false } : t));
      } else if (action === "seek" && typeof payload.seconds === "number") {
        setProgress(payload.seconds * 1000);
      }

      await loadState();
    });
  };

  const handleTogglePlay = () => {
    if (track?.isPlaying) {
      void sendControl("pause");
    } else {
      void sendControl("play");
    }
  };

  const handleLike = async () => {
    if (!track) return;
    const nextSaved = !track.isSaved;
    setTrack({ ...track, isSaved: nextSaved });

    const action = nextSaved ? "like" : "unlike";
    await sendSpotifyCommand(nextSaved ? "save" : "unsave", { trackId: track.id });
    await api("/spotify/save", {
      method: "POST",
      json: { action, trackId: track.id },
      silent: true,
    });

    if (nextSaved) {
      success("Spotify", "Titre ajouté aux favoris.");
    } else {
      info("Spotify", "Titre retiré des favoris.");
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!track?.durationMs) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetMs = ratio * track.durationMs;
    setProgress(targetMs);
    void sendControl("seek", { seconds: Math.round(targetMs / 1000) });
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    void sendControl("volume", { percent: newVol });
  };

  const handleCycleRepeat = () => {
    const next = repeatMode === "off" ? "context" : repeatMode === "context" ? "track" : "off";
    setRepeatMode(next);
    void sendControl("repeat", { mode: next });
  };

  const handleToggleShuffle = () => {
    const next = !isShuffle;
    setIsShuffle(next);
    void sendControl("shuffle", { enabled: next });
  };

  const handleStreamToVc = async () => {
    setStreamingToVc(true);
    const res = await api<{ success: boolean; trackTitle?: string; channelName?: string; error?: string }>(
      "/spotify/vc",
      { method: "POST" }
    );
    setStreamingToVc(false);
    if (res?.success) {
      success("Diffusion Vocale", `Titre diffusé dans le salon vocal ${res.channelName || ""} !`);
    } else if (res?.error) {
      toastError("Diffusion Vocale", res.error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    const token = getSpotifyToken();
    if (token) {
      try {
        const res = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery.trim())}&type=track&limit=5`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const items = (data.tracks?.items || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            artist: t.artists?.map((a: any) => a.name).join(", ") || "",
            album: t.album?.name || "",
            url: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
            durationMs: t.duration_ms || 0,
            albumArt: t.album?.images?.[0]?.url || undefined,
          }));
          setSearchResults(items);
          setSearching(false);
          return;
        }
      } catch {}
    }

    await sendControl("play", { query: searchQuery.trim() });
    setSearching(false);
    setSearchQuery("");
  };

  const duration = track?.durationMs || 1;
  const progressRatio = Math.max(0, Math.min(1, progress / duration));

  return (
    <ConsolePage
      title="Spotify Connect"
      actions={
        <div className="flex items-center gap-2">
          {connected ? (
            <button
              onClick={handleDisconnect}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20"
            >
              Déconnecter
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1DB954] px-4 text-xs font-bold text-black shadow-lg shadow-[#1DB954]/20 transition-transform hover:scale-105 active:scale-95"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.502 17.308c-.217.355-.678.469-1.033.252-2.83-1.73-6.392-2.122-10.587-1.164-.405.093-.812-.16-.904-.565-.093-.404.16-.811.565-.904 4.593-1.05 8.528-.607 11.707 1.348.355.217.469.678.252 1.033zm1.47-3.264c-.273.444-.855.586-1.299.313-3.24-1.992-8.18-2.568-12.012-1.405-.498.151-1.03-.134-1.181-.632-.151-.498.134-1.03.632-1.181 4.385-1.332 9.824-.689 13.547 1.606.444.273.586.855.313 1.299zm.126-3.398C15.22 8.354 8.825 8.134 5.138 9.253c-.6-.182-.962-.815-.78-1.415.182-.6.815-.962 1.415-.78 4.24 1.288 11.3 1.536 15.753-1.108.536-.318 1.233-.146 1.551.39.318.536.146 1.233-.39 1.551-4.995 2.964-12.164 2.684-17.069 1.205z" />
              </svg>
              Connecter Spotify
            </button>
          )}
        </div>
      }
    >
      <Panel
        title="Lecteur en Direct"
        subtitle={
          connected
            ? "Contrôle ton lecteur Spotify personnel et diffuse-le dans le salon vocal."
            : "Connecte ton compte pour piloter ton écoute en temps réel."
        }
      >
        <div className="relative overflow-hidden p-5 sm:p-7">
          <div className="grid gap-6 md:grid-cols-[180px_1fr] items-center">
            <div className="flex justify-center">
              <div className="relative h-44 w-44">
                <motion.div
                  animate={{ rotate: track?.isPlaying ? 360 : 0 }}
                  transition={{
                    repeat: track?.isPlaying ? Infinity : 0,
                    duration: 10,
                    ease: "linear",
                  }}
                  className="relative flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-950 p-2 shadow-2xl ring-2 ring-white/10"
                >
                  <div className="absolute inset-4 rounded-full border border-white/5" />
                  <div className="absolute inset-8 rounded-full border border-white/5" />
                  <div className="absolute inset-12 rounded-full border border-white/5" />

                  {track?.albumArt ? (
                    <ClientImage
                      src={track.albumArt}
                      alt={track.name}
                      className="h-20 w-20 rounded-full object-cover shadow-inner ring-4 ring-black/80"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-950/60 ring-4 ring-black/80">
                      <svg className="h-8 w-8 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.502 17.308c-.217.355-.678.469-1.033.252-2.83-1.73-6.392-2.122-10.587-1.164-.405.093-.812-.16-.904-.565-.093-.404.16-.811.565-.904 4.593-1.05 8.528-.607 11.707 1.348.355.217.469.678.252 1.033zm1.47-3.264c-.273.444-.855.586-1.299.313-3.24-1.992-8.18-2.568-12.012-1.405-.498.151-1.03-.134-1.181-.632-.151-.498.134-1.03.632-1.181 4.385-1.332 9.824-.689 13.547 1.606.444.273.586.855.313 1.299zm.126-3.398C15.22 8.354 8.825 8.134 5.138 9.253c-.6-.182-.962-.815-.78-1.415.182-.6.815-.962 1.415-.78 4.24 1.288 11.3 1.536 15.753-1.108.536-.318 1.233-.146 1.551.39.318.536.146 1.233-.39 1.551-4.995 2.964-12.164 2.684-17.069 1.205z" />
                      </svg>
                    </div>
                  )}

                  <div className="absolute h-3 w-3 rounded-full bg-zinc-950 ring-2 ring-white/20" />
                </motion.div>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                      <span className="relative flex h-1.5 w-1.5">
                        {track?.isPlaying && (
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        )}
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                      {track?.isPlaying ? "En cours d'écoute" : "Pause"}
                    </span>

                    <div className="flex items-end gap-0.5 h-3">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.span
                          key={i}
                          animate={{
                            height: track?.isPlaying ? [4, 12, 6, 14, 8][i] : 3,
                          }}
                          transition={{
                            repeat: track?.isPlaying ? Infinity : 0,
                            duration: 0.6 + i * 0.1,
                            repeatType: "reverse",
                          }}
                          className="w-0.5 rounded-full bg-[#1DB954]"
                        />
                      ))}
                    </div>
                  </div>

                  <h3 className="mt-1.5 truncate text-lg font-bold text-[var(--text-primary)] sm:text-xl">
                    {track?.name || "Aucun titre en cours"}
                  </h3>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {track?.artists && track.artists.length > 0
                      ? track.artists.join(", ")
                      : "Lance la musique sur Spotify"}
                    {track?.album ? ` • ${track.album}` : ""}
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={handleLike}
                  disabled={!track}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                    track?.isSaved
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-[var(--panel-border)] bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-emerald-400"
                  )}
                  aria-label="Ajouter aux favoris"
                >
                  <Heart className={cn("h-4 w-4", track?.isSaved && "fill-current text-[#1DB954]")} />
                </motion.button>
              </div>

              <div>
                <div
                  onClick={handleSeek}
                  className="group relative h-2 w-full cursor-pointer rounded-full bg-[var(--surface-raised)] ring-1 ring-[var(--panel-border)]"
                >
                  <motion.div
                    className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-500 to-[#1DB954] shadow-sm shadow-emerald-500/50"
                    style={{ width: `${progressRatio * 100}%` }}
                  />
                  <div
                    className="absolute top-1/2 -mt-1.5 h-3 w-3 rounded-full bg-white opacity-0 shadow-md ring-2 ring-emerald-500 transition-opacity group-hover:opacity-100"
                    style={{ left: `calc(${progressRatio * 100}% - 6px)` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleToggleShuffle}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                      isShuffle ? "text-[#1DB954] bg-emerald-500/10" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                    aria-label="Lecture aléatoire"
                  >
                    <Shuffle className="h-4 w-4" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => sendControl("previous")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                    aria-label="Titre précédent"
                  >
                    <SkipBack className="h-4 w-4" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={handleTogglePlay}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/30"
                    aria-label={track?.isPlaying ? "Pause" : "Lecture"}
                  >
                    {track?.isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => sendControl("next")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                    aria-label="Titre suivant"
                  >
                    <SkipForward className="h-4 w-4" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleCycleRepeat}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                      repeatMode !== "off" ? "text-[#1DB954] bg-emerald-500/10" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                    aria-label="Répétition"
                  >
                    <Repeat className="h-4 w-4" />
                  </motion.button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2">
                    <button
                      onClick={() => handleVolumeChange(volume === 0 ? 50 : 0)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {volume === 0 ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      className="h-1.5 w-16 cursor-pointer accent-[#1DB954]"
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleStreamToVc}
                    disabled={streamingToVc || !track}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 text-xs font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/20 disabled:opacity-50"
                  >
                    <Users className="h-3.5 w-3.5" />
                    {streamingToVc ? "Connexion..." : "Diffuser en Vocal"}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Recherche & File d'attente"
        subtitle="Lance n'importe quel morceau Spotify ou ajoute-le à la file."
      >
        <div className="p-5 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Rechercher un titre, artiste ou coller un lien Spotify..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#1DB954] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1DB954] px-4 text-xs font-bold text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {searching ? "..." : "Jouer"}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="divide-y divide-[var(--panel-border)] rounded-lg border border-[var(--panel-border)] overflow-hidden">
              {searchResults.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)]">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.albumArt && (
                      <ClientImage src={item.albumArt} alt="" className="h-10 w-10 rounded object-cover" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[var(--text-primary)]">{item.name}</p>
                      <p className="truncate text-[11px] text-[var(--text-muted)]">{item.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => sendControl("play", { query: item.url })}
                      className="rounded bg-[#1DB954]/10 border border-[#1DB954]/20 px-2.5 py-1 text-[11px] font-semibold text-[#1DB954] hover:bg-[#1DB954]/20"
                    >
                      Écouter
                    </button>
                    <button
                      onClick={async () => {
                        await api("/spotify/queue", { method: "POST", json: { query: item.url } });
                        success("File d'attente", `${item.name} ajouté.`);
                      }}
                      className="rounded border border-[var(--panel-border)] px-2.5 py-1 text-[11px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                    >
                      + File
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      <Panel
        title="Appareils Connectés"
        subtitle="Transférez la lecture instantanément sur un autre appareil Spotify."
      >
        <div className="divide-y divide-[var(--panel-border)]">
          {devices.length === 0 ? (
            <EmptyLine>Aucun appareil Spotify actif détecté. Ouvre l&apos;application Spotify.</EmptyLine>
          ) : (
            devices.map((dev) => (
              <div key={dev.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg border",
                      dev.is_active
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-[var(--panel-border)] text-[var(--text-muted)]"
                    )}
                  >
                    <Laptop className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-[var(--text-primary)]">{dev.name}</p>
                      {dev.is_active && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                          Actif
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {dev.type} • Volume {dev.volume_percent}%
                    </p>
                  </div>
                </div>

                {!dev.is_active && (
                  <button
                    onClick={() => sendControl("transfer", { deviceId: dev.id })}
                    className="rounded-lg border border-[var(--panel-border)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    Transférer ici
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </Panel>

      <Panel
        title="Statistiques Personnelles"
        subtitle="Découvre tes titres et artistes les plus écoutés sur Spotify."
        actions={
          <div className="flex items-center gap-2">
            <Segmented
              label="Type de statistiques"
              options={[
                ["tracks", "Top Titres"],
                ["artists", "Top Artistes"],
              ]}
              value={topTab}
              onChange={(v) => setTopTab(v as "tracks" | "artists")}
            />
            <Segmented
              label="Période"
              options={[
                ["short_term", "4 sem."],
                ["medium_term", "6 mois"],
                ["long_term", "Complet"],
              ]}
              value={timeRange}
              onChange={(v) => setTimeRange(v as any)}
            />
          </div>
        }
      >
        <div className="divide-y divide-[var(--panel-border)]">
          {topTab === "tracks" ? (
            topTracks.length === 0 ? (
              <EmptyLine>Aucune donnée statistique disponible.</EmptyLine>
            ) : (
              topTracks.map((t, idx) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--surface-hover)] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 text-center font-mono text-xs font-bold text-[var(--text-muted)]">
                      {idx + 1}
                    </span>
                    {t.albumArt && (
                      <ClientImage src={t.albumArt} alt="" className="h-9 w-9 rounded object-cover" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{t.name}</p>
                      <p className="truncate text-[11px] text-[var(--text-muted)]">{t.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-[var(--text-muted)]">{formatTime(t.durationMs)}</span>
                    <button
                      onClick={() => sendControl("play", { query: t.url })}
                      className="rounded bg-[#1DB954]/10 border border-[#1DB954]/20 p-1.5 text-[#1DB954] hover:bg-[#1DB954]/20"
                      aria-label="Lire"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                    </button>
                  </div>
                </div>
              ))
            )
          ) : topArtists.length === 0 ? (
            <EmptyLine>Aucun artiste disponible.</EmptyLine>
          ) : (
            topArtists.map((a, idx) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--surface-hover)] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-5 text-center font-mono text-xs font-bold text-[var(--text-muted)]">
                    {idx + 1}
                  </span>
                  {a.image ? (
                    <ClientImage src={a.image} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-raised)] border border-[var(--panel-border)] text-[var(--text-muted)]">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{a.name}</p>
                    {a.genres.length > 0 && (
                      <p className="truncate text-[11px] text-[var(--text-muted)]">{a.genres.join(", ")}</p>
                    )}
                  </div>
                </div>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-[var(--panel-border)] px-2.5 py-1 text-[11px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                >
                  Profil ↗
                </a>
              </div>
            ))
          )}
        </div>
      </Panel>
    </ConsolePage>
  );
}
