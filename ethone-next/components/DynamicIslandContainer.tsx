"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SafeImage from "@/components/SafeImage";
import { useRouter } from "next/navigation";
import { Icon } from "@/lib/icons";

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
import { useActivityJournal } from "@/lib/hooks/useActivityJournal";
import { cn } from "@/lib/utils";
import VolumeSlider from "@/components/VolumeSlider";

type View = "spotify" | "pomodoro" | "brain" | "sync";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const VIEW_PRIORITY: Record<View, number> = {
  brain: 5, // critical / activity
  pomodoro: 4, // action required / activity
  sync: 3, // activité en cours
  spotify: 2, // information contextuelle
};
const VIEW_ORDER: View[] = (Object.keys(VIEW_PRIORITY) as View[]).sort(
  (a, b) => VIEW_PRIORITY[b] - VIEW_PRIORITY[a],
);

function viewLabel(view: View, i18n: (key: string, fallback?: string) => string) {
  switch (view) {
    case "spotify":
      return i18n("spotify", "Spotify");
    case "pomodoro":
      return i18n("pomodoro", "Pomodoro");
    case "brain":
      return i18n("brain", "Brain");
    case "sync":
      return i18n("sync", "Synchronisation");
    default:
      return "";
  }
}

function useIslandClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return useMemo(
    () => now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
    [now],
  );
}

function SpotifyCompact({
  title,
  artist,
  coverCandidates,
  clock,
  fallback,
}: {
  title?: string;
  artist?: string;
  coverCandidates: (string | undefined)[];
  clock: string;
  fallback: string;
}) {
  const trackTitle = title || fallback;
  const shouldMarquee = trackTitle.length > 24;

  return (
    <div className="flex min-h-[48px] min-w-[min(88vw,340px)] items-center gap-2.5 px-3">
      <SafeImage
        candidates={coverCandidates}
        alt={trackTitle}
        size={32}
        className="h-8 w-8 shrink-0 rounded-lg object-cover shadow-[0_0_14px_var(--glow-color)] ring-1 ring-[var(--accent-primary)]/25"
        iconClassName="h-4 w-4 text-[var(--accent-primary)]"
        loading="eager"
        priority
        timeoutMs={3000}
      />
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="ethone-track-title text-[11px] font-semibold leading-tight text-[var(--text-primary)]" title={trackTitle}>
          <span className={cn("inline-block whitespace-nowrap", shouldMarquee && "ethone-track-title--marquee")}>
            {trackTitle}
          </span>
        </p>
        <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">{artist || fallback}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1 rounded-md border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.04] px-1.5 py-1 font-mono text-[10px] tabular-nums text-[var(--text-muted)]">
        <Icon name="clock" pack="phosphor" className="h-3 w-3" />
        {clock}
      </span>
    </div>
  );
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
      ? "bg-[var(--text-primary)]/[0.12] text-[var(--text-primary)] ring-1 ring-[var(--text-primary)]/20 shadow-[0_0_12px_rgba(255,255,255,0.08)]"
      : "bg-[var(--text-primary)]/[0.05] text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.1] hover:text-[var(--text-primary)]",
    view === "spotify" && !active && "text-[--accent-primary] hover:text-[--accent-primary]",
    view === "pomodoro" && !active && "text-[var(--accent)]",
    view === "brain" && !active && "text-[var(--info)] hover:text-[var(--info)]",
    view === "sync" && !active && "text-[var(--info)] hover:text-[var(--info)]",
  );

  const icon =
    view === "spotify" ? (
      <Icon name="music" pack="phosphor" className={iconClass} />
    ) : view === "pomodoro" ? (
      <Icon name="timer" pack="phosphor" className={iconClass} />
    ) : view === "brain" ? (
      <Icon name="brain" pack="phosphor" className={iconClass} />
    ) : view === "sync" ? (
      <Icon name="arrows-clockwise" pack="phosphor" className={iconClass} />
    ) : (
      <Icon name="sparkles" pack="phosphor" className={iconClass} />
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
      <Icon name="music" pack="phosphor" className="h-3.5 w-3.5 text-[--accent-primary]" />
    ) : selected === "pomodoro" ? (
      <Icon name="timer" pack="phosphor" className="h-3.5 w-3.5 text-[var(--accent)]" />
    ) : selected === "brain" ? (
      <Icon name="brain" pack="phosphor" className="h-3.5 w-3.5 text-[var(--info)]" />
    ) : selected === "sync" ? (
      <Icon name="arrows-clockwise" pack="phosphor" className="h-3.5 w-3.5 text-[var(--info)]" />
    ) : (
      <Icon name="sparkles" pack="phosphor" className="h-3.5 w-3.5 text-[var(--text-muted)]" />
    );
  return (
    <div className={cn("-mx-6 -mt-4 mb-4 flex w-full items-center justify-between gap-3 border-b border-[var(--text-primary)]/[0.06] px-6 pt-4 pb-3", className)}>
      <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
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
      <span className="text-[10px] font-medium text-[var(--text-muted)]">{viewLabel(selected, i18n)}</span>
    </div>
  );
}

export default function DynamicIslandContainer() {
  const i18n = useI18n();
  const router = useRouter();
  const { settings } = useSettings();
  const { error: showError } = useToast();
  const focus = useFocus();
  const { nowPlaying, loading: npLoading, refetch: refetchNowPlaying } = useNowPlaying(1000);
  const isThinking = useBrainActivityStore((s) => s.isThinking);
  const { visible } = useDynamicIslandStore();
  const { pendingCount, syncing, lastSync } = useActivityJournal();

  const [expanded, setExpanded] = useState(false);
  const [selectedView, setSelectedView] = useState<View | null>(null);
  const [userSelected, setUserSelected] = useState(false);
  const [activeViews, setActiveViews] = useState<View[]>([]);
  const prevActiveRef = useRef<Set<View>>(new Set());
  const isInitialMount = useRef(true);

  const [localVolume, setLocalVolume] = useState(nowPlaying?.volumePercent ?? 50);
  const [pendingSpotify, setPendingSpotify] = useState(false);
  const [isSaved, setIsSaved] = useState(nowPlaying?.isSaved ?? false);
  const [likeLoading, setLikeLoading] = useState(false);
  const clock = useIslandClock();

  useEffect(() => {
    setLocalVolume(nowPlaying?.volumePercent ?? 50);
    setIsSaved(nowPlaying?.isSaved ?? false);
  }, [nowPlaying?.volumePercent, nowPlaying?.isSaved, nowPlaying?.id]);

  const spotifyActive = !!nowPlaying?.title || !!nowPlaying?.isPlaying;
  const pomodoroActive = focus.state.phase !== "idle";
  const brainActive = isThinking;
  const syncActive = syncing || pendingCount > 0;

  useEffect(() => {
    // Don't react to activity changes while now-playing data is still
    // loading. Otherwise a refetch that temporarily clears the track would
    // be treated as "new activity" when the data comes back and the island
    // would auto-expand.
    if (npLoading) return;

    const nextActive = new Set<View>();
    if (brainActive) nextActive.add("brain");
    if (pomodoroActive) nextActive.add("pomodoro");
    if (syncActive) nextActive.add("sync");
    if (spotifyActive) nextActive.add("spotify");

    const nextActiveViews = VIEW_ORDER.filter((v) => nextActive.has(v));
    setActiveViews(nextActiveViews);

    const newViews = VIEW_ORDER.filter(
      (v) => nextActive.has(v) && !prevActiveRef.current.has(v),
    );

    if (newViews.length > 0) {
      // A new event just started: select it, but stay compact.
      // Priority order guarantees the most important event is selected.
      setSelectedView(newViews[0]);
    }

    // On initial mount, or when the user hasn't explicitly chosen, follow
    // the highest-priority active view.
    if (!userSelected || isInitialMount.current) {
      const top = nextActiveViews[0] ?? null;
      if (top !== selectedView) setSelectedView(top);
    } else if (selectedView && !nextActive.has(selectedView)) {
      const fallback = nextActiveViews[0] ?? null;
      setSelectedView(fallback);
      if (!fallback) setExpanded(false);
    }

    if (isInitialMount.current) {
      setExpanded(false);
      isInitialMount.current = false;
    }

    if (nextActive.size === 0) setExpanded(false);

    prevActiveRef.current = nextActive;
  }, [brainActive, pomodoroActive, syncActive, spotifyActive, selectedView, npLoading, userSelected]);

  // Escape collapses
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selectView = useCallback((view: View) => {
    setUserSelected(true);
    setSelectedView(view);
    setExpanded(true);
  }, []);

  const toggleExpanded = useCallback(() => {
    if (!selectedView) return;
    setExpanded((v) => !v);
  }, [selectedView]);

  const pomodoroPct = useMemo(() => {
    if (!focus.state.total) return 0;
    return Math.min(100, Math.max(0, (1 - focus.state.remaining / focus.state.total) * 100));
  }, [focus.state.total, focus.state.remaining]);

  // The compact pill only shows the currently active activity.
  // No activity ⇒ the island is not rendered at all.
  const compact = useMemo(() => {
    const base = "flex h-[38px] w-full items-center justify-center gap-2 px-1 text-[var(--text-primary)]";
    if (!selectedView) {
      return null;
    }
    switch (selectedView) {
      case "spotify":
        return (
          <SpotifyCompact
            title={nowPlaying?.title}
            artist={nowPlaying?.artist}
            coverCandidates={[nowPlaying?.cover, nowPlaying?.artworkUrl, ...(nowPlaying?.covers || [])]}
            clock={clock}
            fallback={i18n("spotify", "Spotify")}
          />
        );
      case "pomodoro":
        return (
          <div className={cn(base)}>
            <Icon name="timer" pack="phosphor" className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="text-xs font-medium tabular-nums">
              {focus.format(focus.state.remaining)}
            </span>
          </div>
        );
      case "brain":
        return (
          <div className={cn(base)}>
            <Icon name="brain" pack="phosphor" className="h-3.5 w-3.5 text-[var(--info)]" />
            <span className="text-xs font-medium">{i18n("brain", "Brain")}</span>
          </div>
        );
      case "sync":
        return (
          <div className={cn(base)}>
            <Icon name="arrows-clockwise" pack="phosphor" className={cn("h-3.5 w-3.5 text-[var(--info)]", syncing && "animate-spin")} />
            <span className="text-xs font-medium tabular-nums">
              {syncing ? i18n("syncing", "Synchronisation") : i18n("syncReady", "Synchronisé")}
            </span>
            {pendingCount > 0 && (
              <span className="ml-1 rounded-full bg-[var(--info)]/20 px-1.5 py-0.5 text-[10px] text-[var(--info)]">
                {pendingCount}
              </span>
            )}
          </div>
        );
      default:
        return null;
    }
  }, [clock, selectedView, nowPlaying, focus, i18n, syncing, pendingCount]);

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
        refetchNowPlaying();
      } catch {
        showError(i18n("playbackControlFailed"));
      } finally {
        setPendingSpotify(false);
      }
    },
    [settings.liveSpotifyClientId, i18n, refetchNowPlaying, showError],
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
      refetchNowPlaying();
    } catch {
      showError(i18n("playbackControlFailed"));
    } finally {
      setLikeLoading(false);
    }
  }, [settings.liveSpotifyClientId, nowPlaying?.id, isSaved, i18n, refetchNowPlaying, showError]);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleExpanded();
      }
    },
    [toggleExpanded],
  );

  return (
    <AnimatePresence>
      {visible && activeViews.length > 0 && (
        <motion.div
          key="dynamic-island"
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          className="fixed left-0 right-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[var(--z-dynamic-island)] flex justify-center pointer-events-none select-none"
        >
          <DynamicIsland
            view={expanded && selectedView ? selectedView : null}
            compact={compact}
            onClick={toggleExpanded}
            onKeyDown={handleKeyDown}
            aria-label={i18n("dynamicIsland")}
            tabIndex={0}
            role="button"
          >
            <DynamicIslandView id="spotify" data-testid="dynamic-island-spotify" className="w-[min(92vw,340px)] sm:w-[400px]">
              <div onClick={stopPropagation} className="flex w-full flex-col gap-4">
                <IslandExpandedHeader
                  activeViews={activeViews}
                  selected={selectedView ?? "spotify"}
                  onSelect={selectView}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-lg border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 px-2 py-1 text-[10px] font-medium text-[--accent-primary]">
                    {nowPlaying?.source || "Spotify"}
                  </span>
                  <span className="flex items-center gap-1 rounded-lg border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.04] px-2 py-1 font-mono text-[10px] tabular-nums text-[var(--text-muted)]">
                    <Icon name="clock" pack="phosphor" className="h-3 w-3" />
                    {clock}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <SafeImage
                    candidates={[nowPlaying?.cover, nowPlaying?.artworkUrl, ...(nowPlaying?.covers || [])]}
                    alt={nowPlaying?.title || "Spotify"}
                    size={56}
                    className="h-14 w-14 shrink-0 rounded-xl object-cover shadow-lg ring-1 ring-[var(--text-primary)]/10"
                    iconClassName="h-6 w-6 text-[--accent-primary]"
                    loading="eager"
                    priority
                    timeoutMs={3000}
                  />
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                    <p className="break-words text-sm font-semibold leading-snug text-[var(--text-primary)]">
                      {nowPlaying?.title || "Spotify"}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {nowPlaying?.artist || i18n("spotifyPlaying")}
                    </p>
                    <p className="truncate text-[10px] text-[var(--accent-primary)]/80">
                      {nowPlaying?.album || i18n("spotify", "Spotify")}
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
                        : "text-[var(--text-muted)] hover:bg-[var(--text-primary)]/10 hover:text-[var(--accent-contrast)]",
                    )}
                    aria-label={isSaved ? i18n("unlike") : i18n("like")}
                    title={isSaved ? i18n("unlike") : i18n("like")}
                  >
                    <motion.div
                      whileTap={{ scale: 1.2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Icon name="heart" pack="phosphor" className={cn("h-4 w-4", isSaved && "fill-current")} />
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
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] disabled:opacity-40"
                    aria-label={i18n("previous")}
                  >
                    <Icon name="skipBack" pack="phosphor" className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={pendingSpotify || npLoading}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--background)] shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
                    aria-label={nowPlaying?.isPlaying ? i18n("pause") : i18n("play")}
                  >
                    {nowPlaying?.isPlaying ? <Icon name="pause" pack="phosphor" className="h-5 w-5" /> : <Icon name="play" pack="phosphor" className="h-5 w-5 fill-current" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => spotifyControl("next")}
                    disabled={pendingSpotify || npLoading}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] disabled:opacity-40"
                    aria-label={i18n("next")}
                  >
                    <Icon name="skipForward" pack="phosphor" className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </DynamicIslandView>

            <DynamicIslandView id="pomodoro" className="w-[min(92vw,260px)] sm:w-[320px]">
              <div onClick={stopPropagation} className="flex w-full flex-col items-center gap-4">
                <IslandExpandedHeader
                  activeViews={activeViews}
                  selected={selectedView ?? "pomodoro"}
                  onSelect={selectView}
                />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-4xl font-semibold tabular-nums text-[var(--text-primary)]">
                    {focus.state.format(focus.state.remaining)}
                  </span>
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    {phaseLabels[focus.state.phase] || focus.state.phase}
                  </span>
                </div>

                <div className="h-1.5 w-full rounded-full bg-[var(--text-primary)]/[0.08]">
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
                      <Icon name="play" pack="phosphor" className="h-3.5 w-3.5" />
                      {i18n("resume")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => focus.pause()}
                      className="flex items-center gap-1.5 rounded-xl bg-[var(--text-primary)]/[0.08] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.12]"
                    >
                      <Icon name="pause" pack="phosphor" className="h-3.5 w-3.5" />
                      {i18n("pause")}
                    </button>
                  )}
                  {(focus.state.phase === "shortBreak" || focus.state.phase === "longBreak") && (
                    <button
                      type="button"
                      onClick={() => focus.skipBreak()}
                      className="flex items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/[0.08] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--text-primary)]/20 hover:text-[var(--text-primary)]"
                    >
                      <Icon name="chevron-right" pack="phosphor" className="h-3.5 w-3.5" />
                      {i18n("skip")}
                    </button>
                  )}
                </div>
              </div>
            </DynamicIslandView>

            <DynamicIslandView id="sync" className="w-[min(92vw,260px)] sm:w-[320px]">
              <div onClick={stopPropagation} className="flex w-full flex-col items-center gap-3 text-center">
                <IslandExpandedHeader
                  activeViews={activeViews}
                  selected={selectedView ?? "sync"}
                  onSelect={selectView}
                />
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", syncing ? "bg-[var(--info)]/15" : "bg-[var(--surface-raised)]")}>
                  <Icon name="arrows-clockwise" pack="phosphor" className={cn("h-6 w-6 text-[var(--info)]", syncing && "animate-spin")} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {syncing ? i18n("syncing", "Synchronisation…") : i18n("synced", "Synchronisé")}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {pendingCount > 0
                      ? i18n("itemsPending", "{count} éléments en attente").replace("{count}", String(pendingCount))
                      : i18n("allUpToDate", "Tout est à jour")}
                  </p>
                  {lastSync && (
                    <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                      {i18n("lastSync", "Dernier sync")}: {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </div>
            </DynamicIslandView>

            <DynamicIslandView id="brain" className="w-[min(92vw,260px)] sm:w-[320px]">
              <div onClick={stopPropagation} className="flex w-full flex-col items-center gap-3 text-center">
                <IslandExpandedHeader
                  activeViews={activeViews}
                  selected={selectedView ?? "brain"}
                  onSelect={selectView}
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--info)]/15">
                  <Icon name="brain" pack="phosphor" className="h-6 w-6 text-[var(--info)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{i18n("brainGenerating", "Génération en cours…")}</p>
                  <p className="text-xs text-[var(--text-muted)]">{i18n("brainGeneratingHint", "Le Brain réfléchit à votre demande.")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/brain")}
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)]/15 px-3 py-1.5 text-xs font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/25"
                >
                  <Icon name="sparkles" pack="phosphor" className="h-3.5 w-3.5" />
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
