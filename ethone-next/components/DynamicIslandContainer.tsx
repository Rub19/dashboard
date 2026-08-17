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
import Slider from "@/components/ui/Slider";
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

function SpotifyCompact({ track, remainingMs, playing }: { track: NowPlaying; remainingMs: number; playing: boolean }) {
  const display = playing
    ? `-${formatMs(remainingMs)}`
    : track.title
    ? track.title.length > 18
      ? `${track.title.slice(0, 16)}…`
      : track.title
    : "Spotify";

  return (
    <div className="flex w-full items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-2">
        <Music className={cn("h-4 w-4", playing ? "text-emerald-400" : "text-zinc-400")} />
        <AudioWave playing={playing} />
      </div>
      <span className={cn("text-xs font-medium tabular-nums", playing ? "text-emerald-300" : "text-zinc-300")}>
        {display}
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
  const [pendingSpotify, setPendingSpotify] = useState(false);

  useEffect(() => {
    setLocalProgress(nowPlaying?.progressMs ?? 0);
  }, [nowPlaying?.progressMs]);

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
    collapseTimer.current = setTimeout(() => setExpanded(false), 700);
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
    async (action: "play" | "pause" | "next" | "previous" | "seek", positionMs?: number) => {
      const clientId = settings.liveSpotifyClientId;
      if (!clientId) {
        showError(i18n("configureToEnable"));
        return;
      }
      setPendingSpotify(true);
      try {
        const body: Record<string, string | number> = { action, clientId };
        if (action === "seek" && positionMs !== undefined) body.positionMs = Math.round(positionMs);
        await fetchWorker("/api/spotify/control", {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (action === "play") setLocalProgress((p) => p);
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
    spotifyControl(action as "play" | "pause").then(() => {
      setLocalProgress((p) => p);
    });
  }, [nowPlaying?.isPlaying, spotifyControl]);

  const onSpotifySeek = useCallback(
    (value: number) => {
      setLocalProgress(value);
      void spotifyControl("seek", value);
    },
    [spotifyControl],
  );

  const remainingMs = useMemo(() => {
    const duration = nowPlaying?.durationMs ?? 0;
    return Math.max(0, duration - localProgress);
  }, [nowPlaying?.durationMs, localProgress]);

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
          className="fixed left-1/2 top-4 z-50 -translate-x-1/2 pointer-events-auto select-none"
        >
          <DynamicIsland
            view={expanded ? activeView : null}
            compact={compact}
            onClick={toggleExpanded}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            aria-label={i18n("dynamicIsland")}
          >
            <DynamicIslandView id="spotify" className="w-[320px] sm:w-[380px]">
              <div onClick={stopPropagation} className="flex w-full flex-col gap-3">
                <div className="flex items-center gap-3">
                  {nowPlaying?.cover || nowPlaying?.artworkUrl ? (
                    <Image
                      src={nowPlaying.cover || nowPlaying.artworkUrl || ""}
                      alt={nowPlaying.title || i18n("spotify")}
                      width={64}
                      height={64}
                      className="rounded-lg object-cover shadow-lg"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white/[0.05]">
                      <Music className="h-6 w-6 text-emerald-400" />
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <p className="truncate text-sm font-semibold text-white">
                      {nowPlaying?.title || i18n("spotify")}
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                      {nowPlaying?.artist || i18n("spotifyPlaying")}
                    </p>
                  </div>
                </div>

                {nowPlaying?.durationMs !== undefined && (
                  <div className="space-y-1.5" onPointerDown={stopPropagation}>
                    <Slider
                      value={localProgress}
                      onChange={onSpotifySeek}
                      min={0}
                      max={nowPlaying.durationMs}
                      step={1000}
                      showValue={false}
                      aria-label={i18n("seek")}
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500">
                      <span>{formatMs(localProgress)}</span>
                      <span>{formatMs(nowPlaying.durationMs)}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => spotifyControl("previous")}
                    disabled={pendingSpotify || npLoading}
                    className="rounded-xl p-2 text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
                    aria-label={i18n("previous")}
                  >
                    <SkipBack className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={pendingSpotify || npLoading}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400 disabled:opacity-40"
                    aria-label={nowPlaying?.isPlaying ? i18n("pause") : i18n("play")}
                  >
                    {nowPlaying?.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => spotifyControl("next")}
                    disabled={pendingSpotify || npLoading}
                    className="rounded-xl p-2 text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
                    aria-label={i18n("next")}
                  >
                    <SkipForward className="h-5 w-5" />
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
