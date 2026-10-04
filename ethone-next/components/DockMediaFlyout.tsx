"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
} from "@/components/icons/ph";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { OAUTH_APP_CLIENT_IDS } from "@/lib/oauth";
import type { NowPlaying } from "@/lib/hooks/useLiveData";
import VolumeSlider from "@/components/VolumeSlider";
import { sendSpotifyCommand } from "@/lib/spotify-client";
import MediaProgress from "@/components/MediaProgress";
import SafeImage from "@/components/SafeImage";
import ServiceIcon from "@/components/ServiceIcon";
import { hapticLightImpact } from "@/lib/haptics";

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export type DockMediaFlyoutProps = {
  nowPlaying: NowPlaying | null;
  clientId?: string;
};

export default function DockMediaFlyout({ nowPlaying, clientId }: DockMediaFlyoutProps) {
  const i18n = useI18n();
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, bottom: 0 });
  const [pending, setPending] = useState(false);
  const [isLiked, setIsLiked] = useState(!!nowPlaying?.isSaved);
  const [isPlaying, setIsPlaying] = useState(!!nowPlaying?.isPlaying);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const progressRef = useRef(nowPlaying?.progressMs || 0);
  const volumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveClientId =
    clientId ||
    (typeof window !== "undefined" ? localStorage.getItem("ethone:cred:spotify:clientId") : null) ||
    OAUTH_APP_CLIENT_IDS.spotify;
  const hasClientId = !!effectiveClientId;
  const hasTrack = !!nowPlaying;
  const title = nowPlaying?.title || "";
  const artist = nowPlaying?.artist || "";
  const album = nowPlaying?.album || "";
  const coverCandidates = useMemo(
    () =>
      [nowPlaying?.cover, nowPlaying?.artworkUrl, ...(nowPlaying?.covers || [])].filter(
        (c): c is string => typeof c === "string" && c.length > 0
      ),
    [nowPlaying?.cover, nowPlaying?.artworkUrl, nowPlaying?.covers]
  );
  const duration = nowPlaying?.durationMs || 0;
  const trackId = nowPlaying?.id || "";

  const [localProgress, setLocalProgress] = useState(nowPlaying?.progressMs || 0);
  const [localVolume, setLocalVolume] = useState(nowPlaying?.volumePercent ?? 50);

  useEffect(() => {
    setIsPlaying(!!nowPlaying?.isPlaying);
    setIsLiked(!!nowPlaying?.isSaved);
    setLocalVolume(nowPlaying?.volumePercent ?? 50);
  }, [nowPlaying?.isPlaying, nowPlaying?.isSaved, nowPlaying?.volumePercent]);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    progressRef.current = nowPlaying?.progressMs || 0;
    setLocalProgress(nowPlaying?.progressMs || 0);
  }, [nowPlaying?.id]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!isPlaying) return;
    const step = 250;
    const interval = setInterval(() => {
      progressRef.current = Math.min(duration, progressRef.current + step);
      setLocalProgress(progressRef.current);
    }, step);
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const popoverRef = useRef<HTMLDivElement | null>(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const padding = 12;
    const gap = 10;
    const width = 340; // w-85
    const left = Math.min(rect.left, window.innerWidth - width - padding);
    const bottom = window.innerHeight - rect.top + gap;
    setPos({ left: Math.max(padding, left), bottom });
  }, []);

  function handleEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    updatePosition();
    setOpen(true);
  }

  function handleLeave() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(false), 300);
  }

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const control = useCallback(
    async (action: string, extras?: Record<string, unknown>) => {
      setPending(true);
      try {
        await sendSpotifyCommand(
          action as "play" | "pause" | "next" | "previous" | "volume" | "seek" | "save" | "unsave",
          {
            clientId: effectiveClientId,
            ...extras,
          }
        );
        success(i18n("ok"));
      } catch (err) {
        showError(err instanceof Error ? err.message : i18n("playbackControlFailed"));
      } finally {
        setPending(false);
      }
    },
    [effectiveClientId, i18n, showError, success]
  );

  async function toggleLike() {
    if (!trackId) return;
    hapticLightImpact();
    const action = isLiked ? "unsave" : "save";
    await sendSpotifyCommand(action, { trackId });
    setIsLiked((v) => !v);
  }

  async function togglePlay() {
    hapticLightImpact();
    const action = isPlaying ? "pause" : "play";
    await control(action);
    setIsPlaying((v) => !v);
  }

  async function skipNext() {
    hapticLightImpact();
    await control("next");
  }

  async function skipPrevious() {
    hapticLightImpact();
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
    [nowPlaying?.deviceId, control]
  );

  async function seek(deltaMs: number) {
    if (!duration) return;
    hapticLightImpact();
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
    [control]
  );

  const buttonLabel = hasTrack ? `${title} - ${artist}` : i18n("media");

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const update = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const padding = 12;
      const gap = 10;
      const width = 340;
      const left = Math.min(rect.left, window.innerWidth - width - padding);
      const bottom = window.innerHeight - rect.top + gap;
      setPos({ left: Math.max(padding, left), bottom });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  return (
    <div
      className="group relative flex flex-col items-center"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Dock Icon Button */}
      <motion.button
        ref={buttonRef}
        type="button"
        aria-label={buttonLabel}
        whileHover={{ scale: 1.15, y: -2 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 450, damping: 22 }}
        onClick={(e) => {
          e.stopPropagation();
          hapticLightImpact();
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          updatePosition();
          setOpen((v) => !v);
        }}
        className="group/media relative flex h-10 w-10 cursor-pointer flex-col items-center justify-center rounded-xl transition-all duration-200 ease-out hover:bg-white/[0.08]"
      >
        <div
          className={`relative flex items-center justify-center overflow-hidden rounded-lg transition-all ${
            isPlaying && hasTrack
              ? "ring-2 ring-[var(--accent-primary)]/80 shadow-[0_0_12px_var(--glow-color)]"
              : "ring-1 ring-white/10"
          }`}
        >
          {hasTrack && coverCandidates.length > 0 ? (
            <SafeImage
              candidates={coverCandidates}
              alt={title}
              size={48}
              className="h-6 w-6 rounded-lg object-cover transition-transform group-hover/media:scale-105"
              iconClassName="h-3.5 w-3.5"
              loading="eager"
              priority
              crossOrigin="anonymous"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/40">
              <ServiceIcon id="spotify" icon="music" className="h-4 w-4" colored />
            </div>
          )}
        </div>

        {/* Dynamic Equalizer Bars */}
        {isPlaying && hasTrack ? (
          <span className="absolute -bottom-1 flex h-2 items-end gap-0.5" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="w-0.5 rounded-full bg-[var(--accent-primary)] shadow-[0_0_4px_var(--accent-primary)]"
                animate={{
                  height: [2.5, 8 + (i % 2) * 3, 3.5, 9 - (i % 2) * 2, 2.5],
                }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: i * 0.14,
                  ease: "easeInOut",
                }}
              />
            ))}
          </span>
        ) : null}
      </motion.button>

      {/* Flyout Card */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 440, damping: 28, mass: 0.75 }}
            onMouseEnter={() => {
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
            }}
            onMouseLeave={handleLeave}
            style={{ position: "fixed", left: pos.left, bottom: pos.bottom }}
            className="z-[var(--z-popover)] w-84 max-w-[calc(100vw-1.5rem)] rounded-3xl border border-white/[0.09] bg-[#0c1017]/92 dark:bg-[#070b13]/95 p-4.5 text-[var(--text-primary)] shadow-[0_30px_70px_-10px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-3xl pointer-events-auto origin-bottom overflow-hidden"
          >
            {/* Dynamic ambient music aura */}
            <motion.div
              animate={{
                scale: isPlaying ? [1, 1.15, 1] : 1,
                opacity: isPlaying ? [0.6, 0.85, 0.6] : 0.4,
              }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-500/25 via-[var(--accent-primary)]/20 to-sky-500/15 blur-3xl"
              aria-hidden="true"
            />

            {!hasTrack ? (
              <div className="relative flex items-center gap-3 py-1">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-md">
                  <ServiceIcon id="spotify" icon="music" className="h-6 w-6" colored />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-xs font-bold text-[var(--text-primary)]">Spotify</h4>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">
                    {hasClientId
                      ? i18n("spotifyNoPlayback", "En attente de lecture")
                      : i18n("spotifyNotConfigured", "Non configuré")}
                  </p>
                </div>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push("/settings?category=integrations&service=spotify")}
                  className="shrink-0 rounded-xl bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 px-3 py-1.5 text-[11px] font-semibold text-[var(--accent-primary)] transition hover:bg-[var(--accent-primary)]/25 cursor-pointer shadow-sm"
                >
                  {hasClientId ? i18n("reconnect", "Gérer") : i18n("configure", "Connecter")}
                </motion.button>
              </div>
            ) : (
              <div className="relative flex flex-col gap-3.5">
                {/* Hero track row */}
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: isPlaying ? [1, 1.03, 1] : 1 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="relative shrink-0"
                  >
                    {coverCandidates.length > 0 ? (
                      <SafeImage
                        candidates={coverCandidates}
                        alt={title}
                        size={96}
                        className="h-13 w-13 shrink-0 rounded-2xl border border-white/[0.1] object-cover shadow-[0_8px_20px_rgba(0,0,0,0.5)]"
                        iconClassName="h-6 w-6"
                        loading="eager"
                        priority
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] shadow-md">
                        <ServiceIcon id="spotify" icon="music" className="h-6 w-6" colored />
                      </div>
                    )}
                  </motion.div>

                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-xs font-bold tracking-tight text-[var(--text-primary)]">
                      {title || "Spotify"}
                    </h4>
                    <p className="truncate text-[11px] font-medium text-[var(--text-primary)]/80">
                      {artist || "Prêt"}
                    </p>
                    {album && (
                      <p className="truncate text-[10px] text-[var(--text-muted)] opacity-75">
                        {album}
                      </p>
                    )}
                  </div>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.85 }}
                    onClick={toggleLike}
                    disabled={pending || !hasClientId || !trackId}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-white/[0.08] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer"
                    aria-label={isLiked ? i18n("unlike") : i18n("like")}
                  >
                    <motion.div
                      animate={{ scale: isLiked ? [1, 1.35, 1] : 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    >
                      <Heart
                        className={`h-4 w-4 transition-colors ${
                          isLiked
                            ? "fill-[var(--accent-primary)] text-[var(--accent-primary)]"
                            : ""
                        }`}
                      />
                    </motion.div>
                  </motion.button>
                </div>

                {/* Progress bar and timestamps */}
                <div className="space-y-1">
                  <MediaProgress
                    value={localProgress}
                    max={duration}
                    onChange={handleSeek}
                    disabled={!hasClientId}
                    data-testid="dock-progress"
                  />
                  <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] tabular-nums px-0.5">
                    <span>{formatMs(localProgress)}</span>
                    <span>{duration > 0 ? formatMs(duration) : "--:--"}</span>
                  </div>
                </div>

                {/* Playback controls row */}
                <div className="flex items-center justify-between border-t border-white/[0.06] px-1 pt-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={skipPrevious}
                    disabled={pending || !hasClientId}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-40 cursor-pointer"
                    aria-label={i18n("previous")}
                  >
                    <SkipBack className="h-4.5 w-4.5" />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => seek(-10000)}
                    disabled={pending || !hasClientId}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-40 cursor-pointer"
                    aria-label="-10s"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </motion.button>

                  {/* Prominent Play/Pause Button */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    onClick={togglePlay}
                    disabled={pending || !hasClientId}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-[0_4px_18px_rgba(255,255,255,0.35)] hover:shadow-[0_6px_25px_rgba(255,255,255,0.55)] transition-shadow disabled:opacity-50 cursor-pointer"
                    aria-label={isPlaying ? i18n("pause") : i18n("play")}
                  >
                    {isPlaying ? (
                      <Pause className="h-4.5 w-4.5 fill-current" />
                    ) : (
                      <Play className="h-4.5 w-4.5 fill-current ml-0.5" />
                    )}
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => seek(10000)}
                    disabled={pending || !hasClientId}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-40 cursor-pointer"
                    aria-label="+10s"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={skipNext}
                    disabled={pending || !hasClientId}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-40 cursor-pointer"
                    aria-label={i18n("next")}
                  >
                    <SkipForward className="h-4.5 w-4.5" />
                  </motion.button>
                </div>

                {/* Volume slider */}
                <div className="flex items-center justify-center pt-0.5">
                  <VolumeSlider
                    value={localVolume}
                    onChange={setVolume}
                    data-testid="dock-volume"
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
