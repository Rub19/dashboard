"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SafeImage from "@/components/SafeImage";
import { motion } from "framer-motion";
import { SkipBack, SkipForward, Play, Pause, Volume2, VolumeX, Music, Server } from "lucide-react";
import { useNowPlaying } from "@/lib/hooks/useNowPlaying";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useConnections } from "@/lib/hooks/useConnections";
import { fetchWorker } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { useRouter } from "next/navigation";

function formatTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function MediaEqualizer({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-end gap-[3px] ${className}`}>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-lg bg-[var(--accent-primary)]"
          initial={{ height: "30%" }}
          animate={{
            height: ["30%", "80%", "40%", "70%", "30%"],
          }}
          transition={{
            duration: 0.8 + i * 0.15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.08,
          }}
        />
      ))}
    </div>
  );
}

const SOURCE_ICON: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  spotify: { icon: <Music className="h-3 w-3" />, color: "bg-[var(--accent-primary)] text-[var(--text-primary)]", label: "Spotify" },
  jellyfin: { icon: <Server className="h-3 w-3" />, color: "bg-violet-500 text-[var(--text-primary)]", label: "Jellyfin" },
};

export default function MediaWidget({ className = "" }: { className?: string }) {
  const i18n = useI18n();
  const router = useRouter();
  const { settings } = useSettings();
  const { connected } = useConnections();
  const { nowPlaying, loading } = useNowPlaying(15000);
  const { error: showError } = useToast();

  const [progress, setProgress] = useState(nowPlaying?.progressMs ?? 0);
  const [volume, setVolume] = useState(80);
  const [showVolume, setShowVolume] = useState(false);
  const [pending, setPending] = useState(false);

  const isSpotify = nowPlaying?.source === "spotify";
  const hasSpotify = connected.has("spotify");
  const hasJellyfin = connected.has("jellyfin");

  const duration = nowPlaying?.durationMs ?? 0;
  const sourceMeta = SOURCE_ICON[nowPlaying?.source || "spotify"];

  useEffect(() => {
    setProgress(nowPlaying?.progressMs ?? 0);
  }, [nowPlaying?.progressMs]);

  useEffect(() => {
    if (!nowPlaying?.isPlaying || duration <= 0) return;
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 1000, duration));
    }, 1000);
    return () => clearInterval(interval);
  }, [nowPlaying?.isPlaying, duration]);

  const control = useCallback(
    async (action: "play" | "pause" | "next" | "previous" | "seek", positionMs?: number) => {
      if (!settings.liveSpotifyClientId) {
        showError(i18n("configureToEnable"));
        return;
      }
      setPending(true);
      try {
        const body: Record<string, string | number> = { action, clientId: settings.liveSpotifyClientId };
        if (action === "seek" && positionMs !== undefined) body.positionMs = Math.round(positionMs);
        await fetchWorker("/api/spotify/control", { method: "POST", body: JSON.stringify(body) });
      } catch {
        showError(i18n("playbackControlFailed"));
      } finally {
        setPending(false);
      }
    },
    [settings.liveSpotifyClientId, i18n, showError]
  );

  const handlePlayPause = useCallback(() => {
    if (isSpotify) {
      control(nowPlaying?.isPlaying ? "pause" : "play");
    }
  }, [isSpotify, nowPlaying?.isPlaying, control]);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!duration || !isSpotify) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const ms = Math.round(pct * duration);
      setProgress(ms);
      control("seek", ms);
    },
    [duration, isSpotify, control]
  );

  const coverCandidates = useMemo(
    () =>
      [nowPlaying?.cover, nowPlaying?.artworkUrl, ...(nowPlaying?.covers || [])].filter(
        (c): c is string => typeof c === "string" && c.length > 0
      ),
    [nowPlaying?.cover, nowPlaying?.artworkUrl, nowPlaying?.covers]
  );

  const progressPct = useMemo(() => {
    if (!duration) return 0;
    return Math.min(100, (progress / duration) * 100);
  }, [progress, duration]);

  if (!nowPlaying && !loading) {
    return (
      <div className={`w-full rounded-2xl border border-white/10 bg-zinc-950/70 p-4 shadow-2xl shadow-black/80 backdrop-blur-xl ${className}`}>
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[var(--text-primary)]/[0.03]">
            <Music className="h-5 w-5 text-[var(--text-muted)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{i18n("waitingForPlayback")}</p>
            <p className="text-xs text-[var(--text-muted)]">{i18n("connectSpotifyOrJellyfin")}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasSpotify && (
              <button
                type="button"
                onClick={() => router.push("/plugins/spotify/")}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/20"
              >
                <Music className="h-3 w-3" />
                Spotify
              </button>
            )}
            {hasJellyfin && (
              <button
                type="button"
                onClick={() => router.push("/plugins/jellyfin/")}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/20"
              >
                <Server className="h-3 w-3" />
                Jellyfin
              </button>
            )}
            {!hasSpotify && !hasJellyfin && (
              <button
                type="button"
                onClick={() => router.push("/connections/")}
                className="rounded-xl border border-[var(--panel-border)] px-3 py-1.5 text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.05]"
              >
                {i18n("configureConnections")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group w-full rounded-2xl border border-white/10 bg-zinc-950/70 p-4 shadow-2xl shadow-black/80 backdrop-blur-xl ${className}`}>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-white/10 shadow-lg">
            <SafeImage
              candidates={coverCandidates}
              alt={nowPlaying?.title || ""}
              fill
              sizes="96px"
              className="object-cover"
              iconClassName="h-8 w-8"
              loading="eager"
              priority
            />
          </div>
          <div
            className={`absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/10 shadow-sm ${sourceMeta?.color ?? "bg-zinc-500 text-[var(--text-primary)]"}`}
            title={sourceMeta?.label ?? nowPlaying?.source}
          >
            {sourceMeta?.icon ?? <Music className="h-3 w-3" />}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]" title={nowPlaying?.title || ""}>
                {nowPlaying?.title || i18n("noTitle")}
              </p>
              <p className="truncate text-xs text-[var(--text-muted)]" title={nowPlaying?.artist || ""}>
                {nowPlaying?.artist || i18n("noArtist")}
              </p>
            </div>
            {nowPlaying?.isPlaying && <MediaEqualizer className="h-3.5" />}
          </div>

          <div className="space-y-1">
            <div
              onClick={handleSeek}
              className="h-1 w-full cursor-pointer overflow-hidden rounded-xl bg-white/10 transition-all duration-200 hover:h-2"
              aria-label={i18n("seek")}
              role="slider"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={progress}
            >
              <div
                className="h-full rounded-xl bg-white/60 transition-[width] duration-150"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)]">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => control("previous")}
            disabled={!isSpotify || pending}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] disabled:opacity-40"
            aria-label={i18n("previous")}
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handlePlayPause}
            disabled={!isSpotify || pending}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--background)] shadow-lg shadow-[var(--text-primary)]/10 transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
            aria-label={nowPlaying?.isPlaying ? i18n("pause") : i18n("play")}
          >
            {nowPlaying?.isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
          </button>

          <button
            type="button"
            onClick={() => control("next")}
            disabled={!isSpotify || pending}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] disabled:opacity-40"
            aria-label={i18n("next")}
          >
            <SkipForward className="h-4 w-4" />
          </button>

          <div
            className="relative flex items-center"
            onMouseEnter={() => setShowVolume(true)}
            onMouseLeave={() => setShowVolume(false)}
          >
            <button
              type="button"
              onClick={() => setVolume((v) => (v > 0 ? 0 : 80))}
              className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
              aria-label={i18n("volume")}
            >
              {volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            {showVolume && (
              <div className="absolute right-0 top-1/2 z-10 flex w-24 -translate-y-1/2 items-center rounded-xl border border-white/10 bg-zinc-900/95 px-2 py-1.5 shadow-xl backdrop-blur-md">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="h-1 w-full cursor-pointer appearance-none rounded-xl bg-white/10 accent-white"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
