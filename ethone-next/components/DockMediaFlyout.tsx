"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  Music,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { fetchWorker } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import type { NowPlaying } from "@/lib/hooks/useLiveData";
import Image from "next/image";

export type DockMediaFlyoutProps = {
  nowPlaying: NowPlaying | null;
  clientId?: string;
};

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function DockMediaFlyout({ nowPlaying, clientId }: DockMediaFlyoutProps) {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [isLiked, setIsLiked] = useState(!!nowPlaying?.isSaved);
  const [isPlaying, setIsPlaying] = useState(!!nowPlaying?.isPlaying);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef(nowPlaying?.progressMs || 0);

  const hasClientId = !!clientId;
  const hasTrack = !!nowPlaying;
  const title = nowPlaying?.title || "";
  const artist = nowPlaying?.artist || "";
  const album = nowPlaying?.album || "";
  const artwork = nowPlaying?.cover || nowPlaying?.artworkUrl || "";
  const duration = nowPlaying?.durationMs || 0;
  const trackId = nowPlaying?.id || "";

  const [localProgress, setLocalProgress] = useState(nowPlaying?.progressMs || 0);

  useEffect(() => {
    setLocalProgress(nowPlaying?.progressMs || 0);
    progressRef.current = nowPlaying?.progressMs || 0;
    setIsPlaying(!!nowPlaying?.isPlaying);
    setIsLiked(!!nowPlaying?.isSaved);
  }, [nowPlaying?.progressMs, nowPlaying?.isPlaying, nowPlaying?.isSaved]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      progressRef.current = Math.min(duration, progressRef.current + 1000);
      setLocalProgress(progressRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const progressPct = useMemo(() => {
    if (!duration) return 0;
    return Math.min(100, Math.max(0, (localProgress / duration) * 100));
  }, [localProgress, duration]);

  function handleEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }

  function handleLeave() {
    timeoutRef.current = setTimeout(() => setOpen(false), 250);
  }

  async function control(action: string, extras?: Record<string, unknown>) {
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
  }

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

  async function seek(deltaMs: number) {
    if (!duration) return;
    const next = Math.min(duration, Math.max(0, (nowPlaying?.progressMs || 0) + deltaMs));
    await control("seek", { positionMs: next });
    progressRef.current = next;
    setLocalProgress(next);
  }

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
        {artwork && hasTrack ? (
          <Image
            src={artwork}
            alt={title}
            width={20}
            height={20}
            unoptimized
            className="h-5 w-5 rounded object-cover transition-transform group-hover:scale-110"
          />
        ) : (
          <Music className="h-5 w-5 text-emerald-400 transition-transform group-hover:scale-110" />
        )}

        {isPlaying && hasTrack && (
          <span className="absolute bottom-1.5 flex h-2.5 items-end gap-0.5" aria-hidden="true">
            <span className="h-1 w-0.5 animate-pulse rounded-full bg-emerald-400" />
            <span
              className="h-2.5 w-0.5 animate-pulse rounded-full bg-emerald-400"
              style={{ animationDelay: "75ms" }}
            />
            <span
              className="h-1 w-0.5 animate-pulse rounded-full bg-emerald-400"
              style={{ animationDelay: "150ms" }}
            />
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-2xl border border-white/10 bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur-2xl"
          >
            {!hasTrack ? (
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
                  <Music className="h-5 w-5 text-zinc-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-xs font-bold text-white">{i18n("noLive")}</h4>
                  <p className="truncate text-[11px] text-zinc-400">{i18n("notConnected")}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-3">
                  {artwork ? (
                    <Image
                      src={artwork}
                      alt={title}
                      width={96}
                      height={96}
                      unoptimized
                      className="h-12 w-12 shrink-0 rounded-xl border border-white/10 object-cover shadow-md"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
                      <Music className="h-5 w-5 text-zinc-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-xs font-bold text-white">{title || "—"}</h4>
                    <p className="truncate text-[11px] text-zinc-300">{artist || "—"}</p>
                    {album && <p className="truncate text-[10px] text-zinc-500">{album}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={toggleLike}
                    disabled={pending || !hasClientId || !trackId}
                    className="rounded p-1 text-zinc-400 transition-colors hover:text-white disabled:opacity-40"
                    aria-label={isLiked ? i18n("unlike") : i18n("like")}
                  >
                    <Heart
                      className={`h-4 w-4 transition-colors ${
                        isLiked ? "fill-emerald-400 text-emerald-400" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <div
                    className="relative h-1 w-full cursor-pointer overflow-hidden rounded-full bg-white/[0.08]"
                    onClick={(e) => {
                      if (!duration || !clientId) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                      const next = Math.round(duration * pct);
                      control("seek", { positionMs: next });
                      progressRef.current = next;
                      setLocalProgress(next);
                    }}
                  >
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span>{formatMs(localProgress)}</span>
                    <span className="text-zinc-500">
                      -{formatMs(Math.max(0, duration - localProgress))}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/[0.04] px-2 pt-2">
                  <button
                    type="button"
                    onClick={skipPrevious}
                    disabled={pending || !hasClientId}
                    className="text-zinc-400 transition-colors hover:text-white disabled:opacity-40"
                    aria-label={i18n("previous")}
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => seek(-10000)}
                    disabled={pending || !hasClientId}
                    className="text-zinc-400 transition-colors hover:text-white disabled:opacity-40"
                    aria-label="-10s"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={pending || !hasClientId}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-zinc-950 shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                    aria-label={isPlaying ? i18n("pause") : i18n("play")}
                  >
                    {isPlaying ? (
                      <Pause className="h-3.5 w-3.5 fill-current" />
                    ) : (
                      <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => seek(10000)}
                    disabled={pending || !hasClientId}
                    className="text-zinc-400 transition-colors hover:text-white disabled:opacity-40"
                    aria-label="+10s"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={skipNext}
                    disabled={pending || !hasClientId}
                    className="text-zinc-400 transition-colors hover:text-white disabled:opacity-40"
                    aria-label={i18n("next")}
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
