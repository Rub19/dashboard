"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Brain,
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Sparkles,
  Timer,
  Clock,
  ChevronRight,
  Heart,
} from "lucide-react";

import { DynamicIsland, DynamicIslandView } from "@/components/ui/DynamicIsland";
import { useNowPlaying } from "@/lib/hooks/useNowPlaying";
import { useFocus } from "@/components/FocusProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { fetchWorker } from "@/lib/api";
import { useDynamicIslandStore } from "@/lib/stores/dynamic-island";
import { useBrainActivityStore } from "@/lib/stores/brain-activity";
import { cn } from "@/lib/utils";
import VolumeSlider from "@/components/VolumeSlider";
import type { NowPlaying } from "@/lib/hooks/useLiveData";

type View = "spotify" | "pomodoro" | "brain";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const VIEW_ORDER: View[] = ["brain", "pomodoro", "spotify"];

function formatMs(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function formatClock(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function useNowClock() {
  const [date, setDate] = useState<Date | null>(null);

  useEffect(() => {
    setDate(new Date());
    const id = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return date;
}

function AudioWave({ playing, className = "" }: { playing: boolean; className?: string }) {
  return (
    <div className={cn("flex items-end gap-[3px]", className)}>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-emerald-400"
          initial={{ height: "30%" }}
          animate={
            playing
              ? { height: ["30%", "80%", "40%", "70%", "30%"] }
              : { height: "30%" }
          }
          transition={
            playing
              ? {
                  duration: 0.8 + i * 0.15,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.08,
                }
              : { duration: 0.2 }
          }
        />
      ))}
    </div>
  );
}

function MediaProgress({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const next = Math.round(pct * max / 1000) * 1000;
      onChange(Math.min(max, Math.max(0, next)));
    },
    [max, onChange],
  );

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: PointerEvent) => updateFromClientX(e.clientX);
    const handleUp = () => setDragging(false);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging, updateFromClientX]);

  return (
    <div className="space-y-1.5">
      <div
        ref={trackRef}
        onPointerDown={(e) => {
          (e.target as HTMLDivElement).setPointerCapture?.(e.pointerId);
          setDragging(true);
          updateFromClientX(e.clientX);
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="group relative h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-white/[0.10] transition-all duration-200 hover:h-2"
      >
        <div
          className="pointer-events-none h-full rounded-full bg-emerald-400 transition-all"
          style={{ width: `${percentage}%` }}
        />
        <div
          className={cn(
            "pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-emerald-400 bg-zinc-950 shadow-md transition-transform duration-150",
            dragging || hovered ? "scale-125" : "scale-100",
          )}
          style={{ left: `calc(${percentage}% - 7px)` }}
        />
      </div>
      <div className="flex justify-between font-mono text-[10px] text-zinc-500">
        <span>{formatMs(value)}</span>
        <span>-{formatMs(Math.max(0, max - value))}</span>
      </div>
    </div>
  );
}

function SpotifyCompact({
  track,
  remainingMs,
  playing,
  date,
}: {
  track: NowPlaying;
  remainingMs: number;
  playing: boolean;
  date: Date | null;
}) {
  const time = date ? formatClock(date) : "--:--";
  const title = track.title || "Spotify";
  const remaining = `-${formatMs(remainingMs)}`;

  return (
    <div className="flex h-[38px] w-full min-w-[200px] items-center gap-2.5 px-3 py-1.5">
      <div className="flex items-center gap-1.5 text-zinc-300">
        <Clock className="h-3 w-3 text-zinc-500" />
        <span className="text-[10px] font-medium tabular-nums">{time}</span>
      </div>

      {track.cover || track.artworkUrl ? (
        <Image
          src={track.cover || track.artworkUrl || ""}
          alt={track.title || "Spotify"}
          width={20}
          height={20}
          className="h-5 w-5 shrink-0 rounded-md object-cover"
          unoptimized
        />
      ) : (
        <Music className={cn("h-4 w-4 shrink-0", playing ? "text-emerald-400" : "text-zinc-400")} />
      )}

      <AudioWave playing={playing} className="shrink-0" />

      <span className="min-w-0 flex-1 truncate text-xs font-medium text-white" title={title}>
        {title}
      </span>

      <span className={cn("shrink-0 text-[10px] font-medium tabular-nums", playing ? "text-emerald-300" : "text-zinc-400")}>
        {remaining}
      </span>
    </div>
  );
}

function PomodoroCompact({ remaining, phase }: { remaining: string; phase: string }) {
  return (
    <div className="flex w-full items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-2">
        <Timer className="h-4 w-4 text-[var(--accent)]" />
        <span className="text-[10px] capitalize text-zinc-400">{phase}</span>
      </div>
      <span className="text-xs font-semibold tabular-nums text-white">{remaining}</span>
    </div>
  );
}

function BrainCompact() {
  return (
    <div className="flex w-full items-center justify-center gap-2 px-1">
      <Sparkles className="h-3.5 w-3.5 animate-pulse text-purple-400" />
      <span className="text-xs font-medium text-purple-200">Brain</span>
    </div>
  );
}

function IdleCompact({ date }: { date: Date | null }) {
  const time = date ? formatClock(date) : "--:--";
  return (
    <div className="flex w-full items-center justify-center gap-2 px-1 text-zinc-300">
      <Clock className="h-3.5 w-3.5 text-zinc-500" />
      <span className="text-xs font-medium tabular-nums">{time}</span>
    </div>
  );
}

export default function DynamicIslandContainer() {
  const i18n = useI18n();
  const router = useRouter();
  const { settings } = useSettings();
  const { error: showError } = useToast();
  const focus = useFocus();
  const { nowPlaying, loading: npLoading } = useNowPlaying(15000);
  const isThinking = useBrainActivityStore((s) => s.isThinking);
  const { visible } = useDynamicIslandStore();

  const [expanded, setExpanded] = useState(false);
  const [activeView, setActiveView] = useState<View | null>(null);
  const prevActiveRef = useRef<Set<View>>(new Set());
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clock = useNowClock();

  // Local progress for Spotify
  const [localProgress, setLocalProgress] = useState(nowPlaying?.progressMs ?? 0);
  const [localVolume, setLocalVolume] = useState(nowPlaying?.volumePercent ?? 50);
  const [pendingSpotify, setPendingSpotify] = useState(false);
  const [isSaved, setIsSaved] = useState(nowPlaying?.isSaved ?? false);
  const [likeLoading, setLikeLoading] = useState(false);

  useEffect(() => {
    setLocalProgress(nowPlaying?.progressMs ?? 0);
    setLocalVolume(nowPlaying?.volumePercent ?? 50);
    setIsSaved(nowPlaying?.isSaved ?? false);
  }, [nowPlaying?.progressMs, nowPlaying?.volumePercent, nowPlaying?.isSaved, nowPlaying?.id]);

  useEffect(() => {
    if (!nowPlaying?.isPlaying) return;
    const id = setInterval(() => {
      setLocalProgress((p) => {
        const duration = nowPlaying?.durationMs ?? 0;
        const next = Math.min(duration, p + 1000);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [nowPlaying?.isPlaying, nowPlaying?.durationMs]);

  const spotifyActive = !!nowPlaying?.title || !!nowPlaying?.isPlaying;
  const pomodoroActive = focus.state.phase !== "idle";
  const brainActive = isThinking;

  useEffect(() => {
    const nextActive = new Set<View>();
    if (brainActive) nextActive.add("brain");
    if (pomodoroActive) nextActive.add("pomodoro");
    if (spotifyActive) nextActive.add("spotify");

    const newViews = VIEW_ORDER.filter(
      (v) => nextActive.has(v) && !prevActiveRef.current.has(v),
    );

    if (newViews.length > 0) {
      setActiveView(newViews[0]);
    } else if (activeView && !nextActive.has(activeView)) {
      const fallback = VIEW_ORDER.find((v) => nextActive.has(v)) ?? null;
      setActiveView(fallback);
      if (!fallback) setExpanded(false);
    } else if (!activeView && nextActive.size > 0) {
      const fallback = VIEW_ORDER.find((v) => nextActive.has(v)) ?? null;
      setActiveView(fallback);
    }

    prevActiveRef.current = nextActive;
  }, [brainActive, pomodoroActive, spotifyActive, activeView]);

  // Collapse when no view is active
  useEffect(() => {
    if (!activeView) setExpanded(false);
  }, [activeView]);

  // Escape collapses
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleEnter = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
    if (activeView) setExpanded(true);
  }, [activeView]);

  const handleLeave = useCallback(() => {
    if (!activeView) return;
    collapseTimer.current = setTimeout(() => setExpanded(false), 200);
  }, [activeView]);

  const toggleExpanded = useCallback(() => {
    if (!activeView) return;
    setExpanded((v) => !v);
  }, [activeView]);

  const compact = useMemo(() => {
    if (activeView === "spotify" && nowPlaying) {
      const duration = nowPlaying.durationMs ?? 0;
      const remaining = Math.max(0, duration - localProgress);
      return (
        <SpotifyCompact
          track={nowPlaying}
          remainingMs={remaining}
          playing={!!nowPlaying.isPlaying}
          date={clock}
        />
      );
    }
    if (activeView === "pomodoro") {
      return (
        <PomodoroCompact
          remaining={focus.state.format(focus.state.remaining)}
          phase={focus.state.phase}
        />
      );
    }
    if (activeView === "brain") {
      return <BrainCompact />;
    }
    return <IdleCompact date={clock} />;
  }, [activeView, nowPlaying, localProgress, focus.state, clock]);

  // Spotify controls
  const spotifyControl = useCallback(
    async (action: string, extras?: Record<string, string | number>) => {
      const clientId = settings.liveSpotifyClientId;
      if (!clientId) {
        showError(i18n("configureToEnable"));
        return;
      }
      setPendingSpotify(true);
      try {
        const body: Record<string, string | number> = { action, clientId };
        if (extras) {
          Object.entries(extras).forEach(([k, v]) => {
            body[k] = v;
          });
        }
        await fetchWorker("/api/spotify/control", {
          method: "POST",
          body: JSON.stringify(body),
        });
      } catch {
        showError(i18n("playbackControlFailed"));
      } finally {
        setPendingSpotify(false);
      }
    },
    [settings.liveSpotifyClientId, i18n, showError],
  );

  const togglePlay = useCallback(() => {
    const action = nowPlaying?.isPlaying ? "pause" : "play";
    spotifyControl(action).then(() => {
      setLocalProgress((p) => p);
    });
  }, [nowPlaying?.isPlaying, spotifyControl]);

  const onSpotifyVolume = useCallback(
    (value: number) => {
      setLocalVolume(value);
      void spotifyControl("volume", {
        volumePercent: Math.round(value),
        deviceId: nowPlaying?.deviceId || "",
      });
    },
    [spotifyControl, nowPlaying?.deviceId],
  );

  const toggleLike = useCallback(async () => {
    const clientId = settings.liveSpotifyClientId;
    const trackId = nowPlaying?.id;
    if (!clientId || !trackId) {
      showError(i18n("configureToEnable"));
      return;
    }
    setLikeLoading(true);
    try {
      const action = isSaved ? "unsave" : "save";
      await fetchWorker("/api/spotify/control", {
        method: "POST",
        body: JSON.stringify({ action, clientId, trackId }),
      });
      setIsSaved((s) => !s);
    } catch {
      showError(i18n("playbackControlFailed"));
    } finally {
      setLikeLoading(false);
    }
  }, [settings.liveSpotifyClientId, nowPlaying?.id, isSaved, i18n, showError]);

  const onSpotifySeek = useCallback(
    (value: number) => {
      setLocalProgress(value);
      void spotifyControl("seek", { positionMs: Math.round(value) });
    },
    [spotifyControl],
  );

  const phaseLabels: Record<string, string> = {
    focus: i18n("focus"),
    shortBreak: i18n("shortBreak"),
    longBreak: i18n("longBreak"),
    idle: i18n("ready"),
  };

  const pomodoroPct = useMemo(() => {
    if (!focus.state.total) return 0;
    return Math.min(100, Math.max(0, (1 - focus.state.remaining / focus.state.total) * 100));
  }, [focus.state.total, focus.state.remaining]);

  const stopPropagation = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="dynamic-island"
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          className="fixed left-1/2 top-14 z-40 -translate-x-1/2 pointer-events-auto select-none"
        >
          <DynamicIsland
            view={expanded ? activeView : null}
            compact={compact}
            onClick={toggleExpanded}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            aria-label={i18n("dynamicIsland")}
          >
            <DynamicIslandView id="spotify" className="w-[340px] sm:w-[400px]">
              <div onClick={stopPropagation} className="flex w-full flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-medium tabular-nums text-zinc-500">
                    {clock ? formatClock(clock) : "--:--"}
                  </span>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                    {nowPlaying?.source || "Spotify"}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {nowPlaying?.cover || nowPlaying?.artworkUrl ? (
                    <Image
                      src={nowPlaying.cover || nowPlaying.artworkUrl || ""}
                      alt={nowPlaying.title || "Spotify"}
                      width={56}
                      height={56}
                      className="h-14 w-14 shrink-0 rounded-xl object-cover shadow-lg ring-1 ring-white/10"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] ring-1 ring-white/10">
                      <Music className="h-6 w-6 text-emerald-400" />
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                    <p className="truncate text-sm font-semibold text-white">
                      {nowPlaying?.title || "Spotify"}
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                      {nowPlaying?.artist || i18n("spotifyPlaying")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleLike}
                    disabled={likeLoading || !nowPlaying?.id}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
                      isSaved
                        ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                        : "text-zinc-400 hover:bg-white/10 hover:text-white",
                    )}
                    aria-label={isSaved ? i18n("unlike") : i18n("like")}
                    title={isSaved ? i18n("unlike") : i18n("like")}
                  >
                    <motion.div
                      whileTap={{ scale: 1.2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
                    </motion.div>
                  </button>
                </div>

                {nowPlaying?.durationMs !== undefined && (
                  <div className="space-y-2" onPointerDown={stopPropagation}>
                    <MediaProgress
                      value={localProgress}
                      max={nowPlaying.durationMs}
                      onChange={onSpotifySeek}
                    />
                  </div>
                )}

                <div className="flex items-center justify-center" onPointerDown={stopPropagation}>
                  <VolumeSlider value={localVolume} onChange={onSpotifyVolume} />
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => spotifyControl("previous")}
                    disabled={pendingSpotify || npLoading}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                    aria-label={i18n("previous")}
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={pendingSpotify || npLoading}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-950 shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
                    aria-label={nowPlaying?.isPlaying ? i18n("pause") : i18n("play")}
                  >
                    {nowPlaying?.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => spotifyControl("next")}
                    disabled={pendingSpotify || npLoading}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                    aria-label={i18n("next")}
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </DynamicIslandView>

            <DynamicIslandView id="pomodoro" className="w-[260px]">
              <div onClick={stopPropagation} className="flex w-full flex-col items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-4xl font-semibold tabular-nums text-white">
                    {focus.state.format(focus.state.remaining)}
                  </span>
                  <span className="text-xs font-medium text-zinc-400">
                    {phaseLabels[focus.state.phase] || focus.state.phase}
                  </span>
                </div>

                <div className="h-1.5 w-full rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                    style={{ width: `${pomodoroPct}%` }}
                  />
                </div>

                <div className="flex items-center gap-3">
                  {focus.state.paused ? (
                    <button
                      type="button"
                      onClick={() => focus.resume()}
                      className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:opacity-90"
                    >
                      <Play className="h-3.5 w-3.5" />
                      {i18n("resume")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => focus.pause()}
                      className="flex items-center gap-1.5 rounded-xl bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/[0.12]"
                    >
                      <Pause className="h-3.5 w-3.5" />
                      {i18n("pause")}
                    </button>
                  )}
                  {(focus.state.phase === "shortBreak" || focus.state.phase === "longBreak") && (
                    <button
                      type="button"
                      onClick={() => focus.skipBreak()}
                      className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                      {i18n("skip")}
                    </button>
                  )}
                </div>
              </div>
            </DynamicIslandView>

            <DynamicIslandView id="brain" className="w-[260px]">
              <div onClick={stopPropagation} className="flex w-full flex-col items-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/15">
                  <Brain className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{i18n("brainGenerating", "Génération en cours…")}</p>
                  <p className="text-xs text-zinc-400">{i18n("brainGeneratingHint", "Le Brain réfléchit à votre demande.")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/brain")}
                  className="flex items-center gap-1.5 rounded-xl bg-purple-500/15 px-3 py-1.5 text-xs font-medium text-purple-300 transition-colors hover:bg-purple-500/25"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {i18n("openBrain", "Ouvrir le Brain")}
                </button>
              </div>
            </DynamicIslandView>
          </DynamicIsland>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
