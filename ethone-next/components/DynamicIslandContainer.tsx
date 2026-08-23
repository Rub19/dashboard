"use client";

import * as React from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SafeImage from "@/components/SafeImage";
import { useRouter } from "next/navigation";
import {
  Brain,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Sparkles,
  Timer,
  ChevronRight,
  Heart,
  Music,
} from "lucide-react";

import LiveMediaProgress from "@/components/LiveMediaProgress";
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

type View = "spotify" | "pomodoro" | "brain";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const VIEW_ORDER: View[] = ["spotify", "brain", "pomodoro"];

function viewLabel(view: View, i18n: (key: string, fallback?: string) => string) {
  switch (view) {
    case "spotify":
      return i18n("spotify", "Spotify");
    case "pomodoro":
      return i18n("pomodoro", "Pomodoro");
    case "brain":
      return i18n("brain", "Brain");
    default:
      return "";
  }
}

function IslandBubble({
  view,
  active,
  onClick,
  size = "sm",
  pulse,
}: {
  view: View;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  size?: "sm" | "md";
  pulse?: boolean;
}) {
  const iconClass = cn(size === "md" ? "h-4 w-4" : "h-3.5 w-3.5");
  const buttonClass = cn(
    "relative flex shrink-0 items-center justify-center rounded-full transition-all",
    size === "md" ? "h-8 w-8" : "h-7 w-7",
    active
      ? "bg-white/[0.12] text-white ring-1 ring-white/20 shadow-[0_0_12px_rgba(255,255,255,0.08)]"
      : "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.1] hover:text-white",
    view === "spotify" && !active && "text-[--accent-primary] hover:text-[--accent-primary]",
    view === "pomodoro" && !active && "text-[var(--accent)]",
    view === "brain" && !active && "text-purple-400 hover:text-purple-300",
  );

  const icon =
    view === "spotify" ? (
      <Music className={iconClass} />
    ) : view === "pomodoro" ? (
      <Timer className={iconClass} />
    ) : view === "brain" ? (
      <Brain className={iconClass} />
    ) : (
      <Sparkles className={iconClass} />
    );

  return (
    <button type="button" onClick={onClick} className={buttonClass} aria-label={view}>
      {pulse && view === "pomodoro" && (
        <span className="absolute inset-0 rounded-full bg-[var(--accent)]/20 animate-ping" />
      )}
      {icon}
    </button>
  );
}

function IslandExpandedHeader({
  activeViews,
  selected,
  onSelect,
  className,
}: {
  activeViews: View[];
  selected: View;
  onSelect: (view: View) => void;
  className?: string;
}) {
  const i18n = useI18n();
  const icon =
    selected === "spotify" ? (
      <Music className="h-3.5 w-3.5 text-[--accent-primary]" />
    ) : selected === "pomodoro" ? (
      <Timer className="h-3.5 w-3.5 text-[var(--accent)]" />
    ) : selected === "brain" ? (
      <Brain className="h-3.5 w-3.5 text-purple-400" />
    ) : (
      <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
    );
  return (
    <div className={cn("-mx-6 -mt-4 mb-4 flex w-full items-center justify-between gap-3 border-b border-white/[0.06] px-6 pt-4 pb-3", className)}>
      <div className="flex items-center gap-1.5 text-zinc-300">
        {icon}
        <span className="text-[10px] font-medium tabular-nums">{viewLabel(selected, i18n)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {activeViews.map((v) => (
          <IslandBubble
            key={v}
            view={v}
            active={selected === v}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(v);
            }}
            size="md"
            pulse={v === "pomodoro"}
          />
        ))}
      </div>
      <span className="text-[10px] font-medium text-zinc-500">{viewLabel(selected, i18n)}</span>
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
  const [selectedView, setSelectedView] = useState<View | null>(null);
  const [activeViews, setActiveViews] = useState<View[]>([]);
  const prevActiveRef = useRef<Set<View>>(new Set());
  const isInitialMount = useRef(true);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mount lock: ignore the first mouseenter events on mount/refresh so the
  // island does not auto-expand if the cursor happens to be over it.
  const mountLockUntil = useRef(0);

  useLayoutEffect(() => {
    mountLockUntil.current = Date.now() + 500;
  }, []);

  const [localVolume, setLocalVolume] = useState(nowPlaying?.volumePercent ?? 50);
  const [pendingSpotify, setPendingSpotify] = useState(false);
  const [isSaved, setIsSaved] = useState(nowPlaying?.isSaved ?? false);
  const [likeLoading, setLikeLoading] = useState(false);

  useEffect(() => {
    setLocalVolume(nowPlaying?.volumePercent ?? 50);
    setIsSaved(nowPlaying?.isSaved ?? false);
  }, [nowPlaying?.volumePercent, nowPlaying?.isSaved, nowPlaying?.id]);

  const spotifyActive = !!nowPlaying?.title || !!nowPlaying?.isPlaying;
  const pomodoroActive = focus.state.phase !== "idle";
  const brainActive = isThinking;

  useEffect(() => {
    // Don't react to activity changes while now-playing data is still
    // loading. Otherwise a refetch that temporarily clears the track would
    // be treated as "new activity" when the data comes back and the island
    // would auto-expand.
    if (npLoading) return;

    const nextActive = new Set<View>();
    if (brainActive) nextActive.add("brain");
    if (pomodoroActive) nextActive.add("pomodoro");
    if (spotifyActive) nextActive.add("spotify");

    const nextActiveViews = VIEW_ORDER.filter((v) => nextActive.has(v));
    setActiveViews(nextActiveViews);

    // On initial mount/refresh, select the first active view but do not
    // auto-expand the island. Only expand when an activity starts while
    // the component is already mounted. Wait for the now-playing data to
    // settle so that an already-active Spotify session doesn't trigger an
    // expansion once it loads.
    if (isInitialMount.current) {
      if (!selectedView && nextActive.size > 0) {
        setSelectedView(nextActiveViews[0] ?? null);
      }
      // Force the island closed on every mount/refresh. It should only open
      // on a deliberate hover or click.
      setExpanded(false);
      prevActiveRef.current = nextActive;
      isInitialMount.current = false;
      return;
    }

    const newViews = VIEW_ORDER.filter(
      (v) => nextActive.has(v) && !prevActiveRef.current.has(v),
    );

    if (newViews.length > 0) {
      // A new activity just started: surface it in the expanded view.
      setSelectedView(newViews[0]);
      setExpanded(true);
    } else if (selectedView && !nextActive.has(selectedView)) {
      const fallback = nextActiveViews[0] ?? null;
      setSelectedView(fallback);
      if (!fallback) setExpanded(false);
    } else if (!selectedView && nextActive.size > 0) {
      const fallback = nextActiveViews[0] ?? null;
      setSelectedView(fallback);
    }

    if (nextActive.size === 0) setExpanded(false);

    prevActiveRef.current = nextActive;
  }, [brainActive, pomodoroActive, spotifyActive, selectedView, npLoading]);

  // Escape collapses
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selectView = useCallback((view: View) => {
    setSelectedView(view);
    setExpanded(true);
  }, []);

  const handleEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (collapseTimer.current) {
        clearTimeout(collapseTimer.current);
        collapseTimer.current = null;
      }
      if (!selectedView) return;
      // Ignore the synthetic mouseenter that can fire on mount/refresh when the
      // cursor is already over the island. Also ignore the mount-lock window.
      if (e.relatedTarget === null) return;
      if (Date.now() < mountLockUntil.current) return;
      setExpanded(true);
    },
    [selectedView],
  );

  const handleLeave = useCallback(() => {
    if (!selectedView) return;
    collapseTimer.current = setTimeout(() => setExpanded(false), 200);
  }, [selectedView]);

  const toggleExpanded = useCallback(() => {
    if (!selectedView) return;
    setExpanded((v) => !v);
  }, [selectedView]);

  const pomodoroPct = useMemo(() => {
    if (!focus.state.total) return 0;
    return Math.min(100, Math.max(0, (1 - focus.state.remaining / focus.state.total) * 100));
  }, [focus.state.total, focus.state.remaining]);

  // The compact pill shows the active activity (Spotify, Pomodoro, Brain).
  // Keep an idle capsule visible while the feature is enabled so the island
  // does not appear broken when there is no active activity yet.
  const compact = useMemo(() => {
    const base = "flex h-[38px] w-full items-center justify-center gap-2 px-1 text-zinc-300";
    if (!selectedView) {
      return (
        <div className={cn(base)}>
          <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs font-medium">{i18n("dynamicIsland", "Dynamic Island")}</span>
        </div>
      );
    }
    switch (selectedView) {
      case "spotify":
        return (
          <div className={cn(base)}>
            <Music className="h-3.5 w-3.5 text-[--accent-primary]" />
            <span className="max-w-[80px] truncate text-xs font-medium tabular-nums">
              {nowPlaying?.title || i18n("spotify", "Spotify")}
            </span>
          </div>
        );
      case "pomodoro":
        return (
          <div className={cn(base)}>
            <Timer className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="text-xs font-medium tabular-nums">
              {focus.format(focus.state.remaining)}
            </span>
          </div>
        );
      case "brain":
        return (
          <div className={cn(base)}>
            <Brain className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-xs font-medium">{i18n("brain", "Brain")}</span>
          </div>
        );
      default:
        return null;
    }
  }, [selectedView, nowPlaying, focus, i18n]);

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
    spotifyControl(action);
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
          className="fixed left-1/2 top-16 z-40 -translate-x-1/2 pointer-events-none select-none"
        >
          <DynamicIsland
            view={expanded && selectedView ? selectedView : null}
            compact={compact}
            onClick={toggleExpanded}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            aria-label={i18n("dynamicIsland")}
          >
            <DynamicIslandView id="spotify" data-testid="dynamic-island-spotify" className="w-[340px] sm:w-[400px]">
              <div onClick={stopPropagation} className="flex w-full flex-col gap-4">
                <IslandExpandedHeader
                  activeViews={activeViews}
                  selected={selectedView ?? "spotify"}
                  onSelect={selectView}
                />
                <div className="flex items-start justify-end">
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-[--accent-primary]">
                    {nowPlaying?.source || "Spotify"}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <SafeImage
                    candidates={[nowPlaying?.cover, nowPlaying?.artworkUrl, ...(nowPlaying?.covers || [])]}
                    alt={nowPlaying?.title || "Spotify"}
                    size={56}
                    className="h-14 w-14 shrink-0 rounded-xl object-cover shadow-lg ring-1 ring-white/10"
                    iconClassName="h-6 w-6 text-[--accent-primary]"
                    loading="eager"
                    priority
                    timeoutMs={3000}
                  />
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
                      "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200",
                      isSaved
                        ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/25"
                        : "text-[var(--muted)] hover:bg-[var(--text-primary)]/10 hover:text-[var(--accent-contrast)]",
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
                    <LiveMediaProgress
                      progressMs={nowPlaying.progressMs ?? 0}
                      durationMs={nowPlaying.durationMs}
                      isPlaying={!!nowPlaying.isPlaying}
                      onSeek={onSpotifySeek}
                      data-testid="dynamic-island-progress"
                    />
                  </div>
                )}

                <div className="flex items-center justify-center" onPointerDown={stopPropagation}>
                  <VolumeSlider value={localVolume} onChange={onSpotifyVolume} data-testid="dynamic-island-volume" />
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => spotifyControl("previous")}
                    disabled={pendingSpotify || npLoading}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] disabled:opacity-40"
                    aria-label={i18n("previous")}
                  >
                    <SkipBack className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={pendingSpotify || npLoading}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--background)] shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
                    aria-label={nowPlaying?.isPlaying ? i18n("pause") : i18n("play")}
                  >
                    {nowPlaying?.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => spotifyControl("next")}
                    disabled={pendingSpotify || npLoading}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] disabled:opacity-40"
                    aria-label={i18n("next")}
                  >
                    <SkipForward className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </DynamicIslandView>

            <DynamicIslandView id="pomodoro" className="w-[260px]">
              <div onClick={stopPropagation} className="flex w-full flex-col items-center gap-4">
                <IslandExpandedHeader
                  activeViews={activeViews}
                  selected={selectedView ?? "pomodoro"}
                  onSelect={selectView}
                />
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
                      className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] transition-colors hover:opacity-90"
                    >
                      <Play className="h-3.5 w-3.5" />
                      {i18n("resume")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => focus.pause()}
                      className="flex items-center gap-1.5 rounded-xl bg-[var(--text-primary)]/[0.08] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.12]"
                    >
                      <Pause className="h-3.5 w-3.5" />
                      {i18n("pause")}
                    </button>
                  )}
                  {(focus.state.phase === "shortBreak" || focus.state.phase === "longBreak") && (
                    <button
                      type="button"
                      onClick={() => focus.skipBreak()}
                      className="flex items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/[0.08] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--text-primary)]/20 hover:text-[var(--text-primary)]"
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
                <IslandExpandedHeader
                  activeViews={activeViews}
                  selected={selectedView ?? "brain"}
                  onSelect={selectView}
                />
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
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)]/15 px-3 py-1.5 text-xs font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/25"
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
