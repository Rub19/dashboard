"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { fetchWorker } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import type { NowPlaying } from "@/lib/hooks/useLiveData";
import VolumeSlider from "@/components/VolumeSlider";
import MediaProgress from "@/components/MediaProgress";
import SafeImage from "@/components/SafeImage";

export type DockMediaFlyoutProps = {
  nowPlaying: NowPlaying | null;
  clientId?: string;
};

export default function DockMediaFlyout({ nowPlaying, clientId }: DockMediaFlyoutProps) {
  const i18n = useI18n();
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [isLiked, setIsLiked] = useState(!!nowPlaying?.isSaved);
  const [isPlaying, setIsPlaying] = useState(!!nowPlaying?.isPlaying);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef(nowPlaying?.progressMs || 0);
  const volumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasClientId = !!clientId;
  const hasTrack = !!nowPlaying;
  const title = nowPlaying?.title || "";
  const artist = nowPlaying?.artist || "";
  const album = nowPlaying?.album || "";
  const artwork = nowPlaying?.cover || nowPlaying?.artworkUrl || "";
  const duration = nowPlaying?.durationMs || 0;
  const trackId = nowPlaying?.id || "";

  const [localProgress, setLocalProgress] = useState(nowPlaying?.progressMs || 0);
  const [localVolume, setLocalVolume] = useState(nowPlaying?.volumePercent ?? 50);

  useEffect(() => {
    setLocalProgress(nowPlaying?.progressMs || 0);
    progressRef.current = nowPlaying?.progressMs || 0;
    setIsPlaying(!!nowPlaying?.isPlaying);
    setIsLiked(!!nowPlaying?.isSaved);
    setLocalVolume(nowPlaying?.volumePercent ?? 50);
  }, [nowPlaying?.progressMs, nowPlaying?.isPlaying, nowPlaying?.isSaved, nowPlaying?.volumePercent, nowPlaying?.id]);

  useEffect(() => {
    if (!isPlaying) return;
    const step = 250;
    const interval = setInterval(() => {
      progressRef.current = Math.min(duration, progressRef.current + step);
      setLocalProgress(progressRef.current);
    }, step);
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  function handleEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }

  function handleLeave() {
    timeoutRef.current = setTimeout(() => setOpen(false), 250);
  }

  const control = useCallback(
    async (action: string, extras?: Record<string, unknown>) => {
      if (!clientId) {
        showError(i18n("configureToEnable"));
        return;
      }
      setPending(true);
      try {
        const body: Record<string, string | number> = { action, clientId };
        if (extras) {
          Object.entries(extras).forEach(([k, v]) => (body[k] = v as string | number));
        }
        await fetchWorker("/api/spotify/control", { method: "POST", body: JSON.stringify(body) });
        success(i18n("ok"));
      } catch (err) {
        showError(err instanceof Error ? err.message : i18n("playbackControlFailed"));
      } finally {
        setPending(false);
      }
    },
    [clientId, i18n, showError, success],
  );

  async function toggleLike() {
    if (!clientId || !trackId) return;
    const action = isLiked ? "unsave" : "save";
    await control(action, { trackId });
    setIsLiked((v) => !v);
  }

  async function togglePlay() {
    const action = isPlaying ? "pause" : "play";
    await control(action);
    setIsPlaying((v) => !v);
  }

  async function skipNext() {
    await control("next");
  }

  async function skipPrevious() {
    await control("previous");
  }

  const setVolume = useCallback(
    (value: number) => {
      setLocalVolume(value);
      if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
      volumeTimeoutRef.current = setTimeout(() => {
        void control("volume", {
          volumePercent: Math.round(value),
          deviceId: nowPlaying?.deviceId || "",
        });
      }, 120);
    },
    [nowPlaying?.deviceId, control],
  );

  async function seek(deltaMs: number) {
    if (!duration) return;
    const next = Math.min(duration, Math.max(0, (nowPlaying?.progressMs || 0) + deltaMs));
    await control("seek", { positionMs: next });
    progressRef.current = next;
    setLocalProgress(next);
  }

  const handleSeek = useCallback(
    (next: number) => {
      progressRef.current = next;
      setLocalProgress(next);
      void control("seek", { positionMs: next });
    },
    [control],
  );

  const buttonLabel = hasTrack ? `${title} - ${artist}` : i18n("media");

  return (
    <div
      className="group relative flex flex-col items-center"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        aria-label={buttonLabel}
        className="relative flex h-11 w-11 flex-col items-center justify-center rounded-xl text-emerald-400 transition-all hover:bg-white/[0.08] active:scale-95"
      >
        <SafeImage
          src={hasTrack ? artwork : undefined}
          alt={title}
          size={48}
          className="h-5 w-5 rounded object-cover transition-transform group-hover:scale-110"
          iconClassName="h-3 w-3"
          loading="eager"
          priority
        />

        {isPlaying && hasTrack && (
          <span className="absolute bottom-1.5 flex h-1.5 items-end gap-0.5" aria-hidden="true">
            <span className="h-1 w-0.5 animate-pulse rounded-lg bg-emerald-400" />
            <span
              className="h-2.5 w-0.5 animate-pulse rounded-lg bg-emerald-400"
              style={{ animationDelay: "75ms" }}
            />
            <span
              className="h-1 w-0.5 animate-pulse rounded-lg bg-emerald-400"
              style={{ animationDelay: "150ms" }}
            />
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: -12, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full left-0 z-50 w-80 -translate-x-6 rounded-xl border border-white/10 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-2xl"
          >
            {!hasTrack ? (
              <div className="flex items-center gap-3">
                <SafeImage
                  className="h-12 w-12 shrink-0 rounded-xl border border-white/10 bg-white/[0.05]"
                  iconClassName="h-5 w-5"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-xs font-bold text-white">{i18n("noLive")}</h4>
                  <p className="truncate text-[11px] text-zinc-400">
                    {hasClientId ? i18n("spotifyNoPlayback") : i18n("spotifyNotConfigured")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/settings?tab=integrations&service=spotify")}
                  className="shrink-0 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 transition hover:bg-emerald-500/20"
                >
                  {hasClientId ? i18n("reconnect") : i18n("configure")}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <SafeImage
                    src={artwork}
                    alt={title}
                    size={96}
                    className="h-12 w-12 shrink-0 rounded-xl border border-white/10 object-cover shadow-md"
                    iconClassName="h-6 w-6"
                    loading="eager"
                    priority
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-xs font-bold text-white">{title || "—"}</h4>
                    <p className="truncate text-[11px] text-zinc-300">{artist || "—"}</p>
                    {album && <p className="truncate text-[10px] text-zinc-500">{album}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={toggleLike}
                    disabled={pending || !hasClientId || !trackId}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                    aria-label={isLiked ? i18n("unlike") : i18n("like")}
                  >
                    <Heart
                      className={`h-4 w-4 transition-colors ${
                        isLiked ? "fill-emerald-400 text-emerald-400" : ""
                      }`}
                    />
                  </button>
                </div>

                <MediaProgress
                  value={localProgress}
                  max={duration}
                  onChange={handleSeek}
                  disabled={!hasClientId}
                  data-testid="dock-progress"
                />

                <div className="flex items-center justify-between border-t border-white/[0.04] px-2 pt-2">
                  <button
                    type="button"
                    onClick={skipPrevious}
                    disabled={pending || !hasClientId}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                    aria-label={i18n("previous")}
                  >
                    <SkipBack className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => seek(-10000)}
                    disabled={pending || !hasClientId}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                    aria-label="-10s"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={pending || !hasClientId}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-950 shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                    aria-label={isPlaying ? i18n("pause") : i18n("play")}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4 fill-current" />
                    ) : (
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => seek(10000)}
                    disabled={pending || !hasClientId}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                    aria-label="+10s"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={skipNext}
                    disabled={pending || !hasClientId}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                    aria-label={i18n("next")}
                  >
                    <SkipForward className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex items-center justify-center">
                  <VolumeSlider value={localVolume} onChange={setVolume} data-testid="dock-volume" />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
