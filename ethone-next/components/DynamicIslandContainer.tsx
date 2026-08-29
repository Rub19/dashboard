"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import SafeImage from "@/components/SafeImage";
import { useRouter } from "next/navigation";
import { Icon, type IconPack } from "@/lib/icons";

import LiveMediaProgress from "@/components/LiveMediaProgress";
import AudioVisualizer from "@/components/AudioVisualizer";
import { DynamicIsland, DynamicIslandView } from "@/components/ui/DynamicIsland";
import { useNowPlaying } from "@/lib/hooks/useNowPlaying";
import { useFocus } from "@/components/FocusProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { fetchWorker } from "@/lib/api";
import { useUploadQueue } from "@/lib/upload-queue";
import { OAUTH_APP_CLIENT_IDS } from "@/lib/oauth";
import { useDynamicIslandStore } from "@/lib/stores/dynamic-island";
import { useBrainActivityStore } from "@/lib/stores/brain-activity";
import { useActivityJournal } from "@/lib/hooks/useActivityJournal";
import { cn } from "@/lib/utils";
import VolumeSlider from "@/components/VolumeSlider";
import UploadIslandView from "@/components/UploadIslandView";
import { useDynamicIslandQueue, type IslandView, type IslandEvent } from "@/lib/hooks/useDynamicIslandQueue";
import { sendSpotifyCommand } from "@/lib/spotify-client";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

function viewLabel(view: IslandView, i18n: (key: string, fallback?: string) => string) {
  switch (view) {
    case "spotify":
      return i18n("spotify", "Spotify");
    case "pomodoro":
      return i18n("pomodoro", "Pomodoro");
    case "brain":
      return i18n("brain", "Brain");
    case "sync":
      return i18n("sync", "Synchronisation");
    case "upload":
      return i18n("upload", "Upload");
    case "mail":
      return i18n("mail", "Mail");
    case "notification":
      return i18n("notification", "Notification");
    default:
      return "";
  }
}

const IslandLiveClock = React.memo(function IslandLiveClock() {
  const [timeStr, setTimeStr] = useState(() => {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  });

  useEffect(() => {
    const updateTime = () => {
      const formatted = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      setTimeStr((prev) => (prev === formatted ? prev : formatted));
    };
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] tabular-nums text-zinc-400">
      <Icon name="clock" pack="phosphor" className="h-3 w-3 text-zinc-400" />
      {timeStr}
    </span>
  );
});

function SpotifyCompact({
  title,
  artist,
  coverCandidates,
  fallback,
  isPlaying,
}: {
  title?: string;
  artist?: string;
  coverCandidates: (string | undefined)[];
  fallback: string;
  isPlaying?: boolean;
}) {
  const trackTitle = title || fallback;

  return (
    <div className="flex h-10 min-w-[130px] max-w-[260px] items-center gap-2.5 px-0.5 select-none">
      <div className="relative shrink-0">
        <SafeImage
          candidates={coverCandidates}
          alt={trackTitle}
          size={24}
          className={cn(
            "h-6 w-6 shrink-0 rounded-lg object-cover bg-[var(--surface-raised)] transition-all duration-200",
            isPlaying
              ? "ring-1 ring-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.35)]"
              : "ring-1 ring-white/10"
          )}
          iconClassName="h-3.5 w-3.5 text-emerald-400"
          loading="eager"
          priority
          timeoutMs={8000}
          crossOrigin="anonymous"
        />
      </div>
      <div className="min-w-0 flex-1 truncate text-xs font-semibold tracking-tight text-white flex items-center gap-1.5" title={artist ? `${trackTitle} • ${artist}` : trackTitle}>
        <span className="truncate">{trackTitle}</span>
        {artist && (
          <span className="truncate text-[11px] font-normal text-zinc-400 shrink-0">
            • {artist}
          </span>
        )}
      </div>
      <AudioVisualizer
        isPlaying={!!isPlaying}
        bars={5}
        barWidth={2}
        gap={1.5}
        minHeight={0.25}
        className="h-3.5 w-5 shrink-0 opacity-95 drop-shadow-[0_0_4px_rgba(16,185,129,0.4)]"
        color="#10b981"
        seed={trackTitle}
      />
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
  view: IslandView;
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
      ? "bg-[var(--text-primary)]/[0.12] text-[var(--text-primary)] ring-1 ring-[var(--text-primary)]/20 shadow-[0_0_12px_var(--glow-color)]"
      : "bg-[var(--text-primary)]/[0.05] text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.1] hover:text-[var(--text-primary)]",
    view === "spotify" && !active && "text-[var(--accent-primary)] hover:text-[var(--accent-primary)]",
    view === "pomodoro" && !active && "text-[var(--accent)]",
    view === "brain" && !active && "text-[var(--info)] hover:text-[var(--info)]",
    view === "sync" && !active && "text-[var(--info)] hover:text-[var(--info)]",
    view === "upload" && !active && "text-[var(--info)] hover:text-[var(--info)]",
    view === "mail" && !active && "text-[var(--accent-primary)] hover:text-[var(--accent-primary)]",
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
    ) : view === "upload" ? (
      <Icon name="upload-cloud" pack="phosphor" className={iconClass} />
    ) : view === "mail" ? (
      <Icon name="envelope-simple" pack="phosphor" className={iconClass} />
    ) : view === "notification" ? (
      <Icon name="bell" pack="phosphor" className={iconClass} />
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
  activeViews: IslandView[];
  selected: IslandView;
  onSelect: (view: IslandView) => void;
  className?: string;
}) {
  const i18n = useI18n();
  const icon =
    selected === "spotify" ? (
      <Icon name="music" pack="phosphor" className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
    ) : selected === "pomodoro" ? (
      <Icon name="timer" pack="phosphor" className="h-3.5 w-3.5 text-[var(--accent)]" />
    ) : selected === "brain" ? (
      <Icon name="brain" pack="phosphor" className="h-3.5 w-3.5 text-[var(--info)]" />
    ) : selected === "sync" ? (
      <Icon name="arrows-clockwise" pack="phosphor" className="h-3.5 w-3.5 text-[var(--info)]" />
    ) : selected === "upload" ? (
      <Icon name="upload-cloud" pack="phosphor" className="h-3.5 w-3.5 text-[var(--info)]" />
    ) : selected === "mail" ? (
      <Icon name="envelope-simple" pack="phosphor" className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
    ) : selected === "notification" ? (
      <Icon name="bell" pack="phosphor" className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
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
    </div>
  );
}

export default function DynamicIslandContainer() {
  const i18n = useI18n();
  const router = useRouter();
  const { settings } = useSettings();
  const { success: showSuccess, error: showError } = useToast();
  const focus = useFocus();
  const { nowPlaying, loading: npLoading, refetch: refetchNowPlaying } = useNowPlaying(3000);
  const isThinking = useBrainActivityStore((s) => s.isThinking);
  const { visible } = useDynamicIslandStore();
  const { pendingCount, syncing, lastSync, syncError, sync } = useActivityJournal();
  const queue = useUploadQueue();
  const uploadingCount = queue.items.filter((it) => it.status === "uploading" || it.status === "queued").length;
  const completedCount = queue.items.filter((it) => it.status === "completed").length;
  const errorCount = queue.items.filter((it) => it.status === "error").length;
  const uploadActive = queue.items.length > 0;

  type IslandMode = "IDLE" | "COMPACT" | "EXPANDED" | "INTERACTIVE";
  const [mode, setMode] = useState<IslandMode>("IDLE");
  const expanded = mode === "EXPANDED" || mode === "INTERACTIVE";
  const [selectedView, setSelectedView] = useState<IslandView | null>(null);
  const [userSelected, setUserSelected] = useState(false);
  const { activeViews, top, register, unregister } = useDynamicIslandQueue();
  const isInitialMount = useRef(true);
  const islandLeaveTimer = useRef<number | null>(null);
  const islandRef = useRef<HTMLDivElement | null>(null);

  const [localVolume, setLocalVolume] = useState(nowPlaying?.volumePercent ?? 50);
  const [pendingSpotify, setPendingSpotify] = useState(false);
  const [isSaved, setIsSaved] = useState(nowPlaying?.isSaved ?? false);
  const [likeLoading, setLikeLoading] = useState(false);

  useEffect(() => {
    setLocalVolume(nowPlaying?.volumePercent ?? 50);
    setIsSaved(nowPlaying?.isSaved ?? false);
  }, [nowPlaying?.volumePercent, nowPlaying?.isSaved, nowPlaying?.id]);

  const isSpotifyConnected =
    typeof window !== "undefined" &&
    (localStorage.getItem("ethone:connected:spotify") === "true" ||
      Boolean(localStorage.getItem("ethone:token:spotify")));

  const spotifyActive = !!nowPlaying?.title || !!nowPlaying?.isPlaying || isSpotifyConnected;
  const pomodoroActive = focus.state.phase !== "idle";
  const brainActive = isThinking;
  const syncActive = syncing || pendingCount > 0;

  // Register / unregister island events from the priority queue.
  useEffect(() => {
    if (npLoading) return;

    if (brainActive) register({ id: "brain", type: "brain" } as IslandEvent);
    else unregister("brain");

    if (pomodoroActive) register({ id: "pomodoro", type: "pomodoro" } as IslandEvent);
    else unregister("pomodoro");

    if (uploadActive) register({ id: "upload", type: "upload" } as IslandEvent);
    else unregister("upload");

    if (syncActive) register({ id: "sync", type: "sync" } as IslandEvent);
    else unregister("sync");

    if (spotifyActive) register({ id: "spotify", type: "spotify" } as IslandEvent);
    else unregister("spotify");
  }, [brainActive, pomodoroActive, syncActive, spotifyActive, uploadActive, npLoading, register, unregister]);

  // Sync selected view with the top of the queue.
  useEffect(() => {
    const topView = top?.type ?? null;

    if (isInitialMount.current) {
      setMode(activeViews.length > 0 ? "COMPACT" : "IDLE");
      isInitialMount.current = false;
      if (topView !== selectedView) setSelectedView(topView);
      return;
    }

    if (activeViews.length === 0) {
      setMode("IDLE");
      if (selectedView !== null) setSelectedView(null);
      return;
    }

    if (mode === "IDLE") {
      setMode("COMPACT");
    }

    if (!userSelected) {
      if (topView !== selectedView) setSelectedView(topView);
    } else if (selectedView && !activeViews.includes(selectedView)) {
      setUserSelected(false);
      if (topView !== selectedView) setSelectedView(topView);
    }
  }, [activeViews, top, selectedView, userSelected, mode]);

  // Escape collapses
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMode(activeViews.length > 0 ? "COMPACT" : "IDLE");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeViews.length]);

  const selectView = useCallback((view: IslandView) => {
    setUserSelected(true);
    setSelectedView(view);
    setMode("EXPANDED");
  }, []);

  const toggleExpanded = useCallback(() => {
    if (!selectedView) return;
    setMode((m) => (m === "COMPACT" ? "EXPANDED" : "COMPACT"));
  }, [selectedView]);

  const onIslandEnter = useCallback(() => {
    if (islandLeaveTimer.current) window.clearTimeout(islandLeaveTimer.current);
    if (mode === "EXPANDED" || mode === "INTERACTIVE") {
      setMode("INTERACTIVE");
    }
  }, [mode]);

  const onIslandLeave = useCallback(() => {
    if (islandLeaveTimer.current) window.clearTimeout(islandLeaveTimer.current);
    if (mode === "EXPANDED" && !userSelected) {
      islandLeaveTimer.current = window.setTimeout(() => setMode("COMPACT"), 400);
    } else if (mode === "INTERACTIVE") {
      islandLeaveTimer.current = window.setTimeout(() => setMode("EXPANDED"), 400);
    }
  }, [mode, userSelected]);

  const pomodoroPct = useMemo(() => {
    if (!focus.state.total) return 0;
    return Math.min(100, Math.max(0, (1 - focus.state.remaining / focus.state.total) * 100));
  }, [focus.state.total, focus.state.remaining]);

  const spotifyPct = useMemo(() => {
    if (!nowPlaying?.durationMs || !nowPlaying.progressMs) return 0;
    return Math.min(100, Math.max(0, (nowPlaying.progressMs / nowPlaying.durationMs) * 100));
  }, [nowPlaying]);

  const activeProgress = useMemo(() => {
    if (selectedView === "spotify" && nowPlaying?.isPlaying) return spotifyPct;
    if (selectedView === "pomodoro" && focus.state.phase !== "idle") return pomodoroPct;
    return 0;
  }, [selectedView, nowPlaying?.isPlaying, spotifyPct, pomodoroPct, focus.state.phase]);

  // The compact pill shows the active activity, or a default ETHONE clock
  // capsule when the island is visible but no specific activity is present.
  const compact = useMemo(() => {
    const base = "flex h-full w-full items-center justify-center gap-2 whitespace-nowrap px-1 text-[var(--text-primary)]";
    if (!selectedView) {
      return (
        <div className="flex h-full w-full items-center justify-center px-4">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]/60 shadow-[0_0_8px_var(--glow-color)]" aria-hidden="true" />
        </div>
      );
    }

    // Split Island when Pomodoro is active along with Spotify or Brain
    if (pomodoroActive && (spotifyActive || brainActive)) {
      return (
        <div className="flex h-10 items-center justify-between gap-3 px-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              selectView("pomodoro");
            }}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          >
            <Icon name="timer" pack="phosphor" className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="text-xs font-semibold tabular-nums">
              {focus.format(focus.state.remaining)}
            </span>
          </button>

          <span className="h-3.5 w-[1px] bg-[var(--text-primary)]/20" />

          {spotifyActive ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                selectView("spotify");
              }}
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            >
              <AudioVisualizer
                isPlaying={!!nowPlaying?.isPlaying}
                bars={4}
                barWidth={1.5}
                gap={1}
                minHeight={0.2}
                className="h-3 w-3.5"
                color="var(--accent-primary)"
              />
              <span className="text-xs font-semibold max-w-[80px] truncate text-[var(--accent-primary)]">
                {nowPlaying?.title || "Spotify"}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                selectView("brain");
              }}
              className="flex items-center gap-1 hover:opacity-80 transition-opacity"
            >
              <Icon name="brain" pack="phosphor" className="h-3.5 w-3.5 text-[var(--info)] animate-pulse" />
              <span className="text-xs font-semibold text-[var(--info)]">Brain</span>
            </button>
          )}
        </div>
      );
    }

    switch (selectedView) {
      case "spotify":
        return (
          <SpotifyCompact
            title={nowPlaying?.title}
            artist={nowPlaying?.artist}
            coverCandidates={[nowPlaying?.cover, nowPlaying?.artworkUrl, ...(nowPlaying?.covers || [])]}
            fallback={i18n("spotify", "Spotify")}
            isPlaying={nowPlaying?.isPlaying}
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
            <span className="text-xs leading-none font-medium tabular-nums">
              {syncing
                ? i18n("syncing", "Synchronisation")
                : pendingCount > 0
                  ? i18n("syncPending", "En attente")
                  : i18n("synced", "Synchronisé")}
            </span>
            {pendingCount > 0 && (
              <span className="ml-1 inline-flex h-5 items-center rounded-full bg-[var(--info)]/20 px-1.5 text-[10px] leading-none text-[var(--info)]">
                {pendingCount}
              </span>
            )}
          </div>
        );
      case "upload":
        return (
          <div className={cn(base)}>
            <Icon name="upload-cloud" pack="phosphor" className={cn("h-3.5 w-3.5 text-[var(--info)]", uploadingCount > 0 && "animate-pulse")} />
            <span className="text-xs font-medium tabular-nums">
              {uploadingCount > 0 ? `${uploadingCount} ...` : i18n("upload", "Upload")}
            </span>
            {completedCount > 0 && (
              <span className="ml-1 rounded-full bg-[var(--success)]/20 px-1.5 py-0.5 text-[10px] text-[var(--success)]">
                +{completedCount}
              </span>
            )}
            {errorCount > 0 && (
              <span className="ml-1 rounded-full bg-[var(--danger)]/20 px-1.5 py-0.5 text-[10px] text-[var(--danger)]">
                {errorCount}
              </span>
            )}
          </div>
        );
      case "mail": {
        const mailContent = (top?.content as {
          icon?: string;
          title?: string;
          sender?: string;
          subject?: string;
          unreadCount?: number;
          status?: "sending" | "sent" | "error" | "syncing" | "received";
        } | undefined) || {};

        return (
          <div className={cn(base)}>
            <Icon
              name={
                mailContent.status === "syncing"
                  ? "arrows-clockwise"
                  : mailContent.status === "sending"
                  ? "paper-plane-tilt"
                  : mailContent.status === "error"
                  ? "warning-circle"
                  : "envelope-simple"
              }
              pack="phosphor"
              className={cn(
                "h-3.5 w-3.5",
                mailContent.status === "error"
                  ? "text-[var(--danger)]"
                  : mailContent.status === "syncing"
                  ? "animate-spin text-[var(--info)]"
                  : mailContent.status === "sending"
                  ? "animate-pulse text-[var(--accent-primary)]"
                  : "text-[var(--accent-primary)]"
              )}
            />
            <span className="max-w-[140px] truncate text-xs font-medium tabular-nums">
              {mailContent.sender || mailContent.title || (mailContent.status === "sending" ? "Envoi..." : mailContent.status === "syncing" ? "Synchro..." : i18n("mail", "Mail"))}
            </span>
            {(mailContent.unreadCount ?? 0) > 0 && (
              <span className="ml-1 rounded-full bg-[var(--accent-primary)] px-1.5 py-0.2 text-[10px] font-bold text-[var(--accent-contrast)]">
                {mailContent.unreadCount}
              </span>
            )}
          </div>
        );
      }
      case "notification": {
        const note = (top?.content as { icon?: string; pack?: string; title?: string; message?: string; variant?: string } | undefined) || {};
        const noteColor =
          note.variant === "success"
            ? "text-[var(--success)]"
            : note.variant === "warning"
              ? "text-[var(--warning)]"
              : note.variant === "error"
                ? "text-[var(--danger)]"
                : "text-[var(--accent-primary)]";
        return (
          <div className={cn(base)}>
            <Icon
              name={note.icon || "sparkles"}
              pack={(note.pack as IconPack) || "phosphor"}
              className={cn("h-3.5 w-3.5", noteColor)}
            />
            <span className="text-xs font-medium tabular-nums">{note.title || i18n("notification", "Notification")}</span>
          </div>
        );
      }
      default:
        return null;
    }
  }, [selectedView, top, nowPlaying, focus, i18n, syncing, pendingCount, uploadingCount, completedCount, errorCount]);

  // Spotify controls
  const spotifyControl = useCallback(
    async (action: string, extras?: Record<string, string | number>) => {
      const clientId =
        settings.liveSpotifyClientId ||
        (typeof window !== "undefined" ? localStorage.getItem("ethone:cred:spotify:clientId") : null) ||
        OAUTH_APP_CLIENT_IDS.spotify;
      if (!clientId) {
        showError(i18n("configureToEnable"));
        return;
      }
      setPendingSpotify(true);
      try {
        await sendSpotifyCommand(action as "play" | "pause" | "next" | "previous" | "volume" | "seek" | "save" | "unsave", {
          clientId,
          ...extras,
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
    const trackId = nowPlaying?.id;
    if (!trackId) {
      showError(i18n("configureToEnable"));
      return;
    }
    setLikeLoading(true);
    try {
      const action = isSaved ? "unsave" : "save";
      await sendSpotifyCommand(action, { trackId });
      setIsSaved((s) => !s);
      refetchNowPlaying();
    } catch {
      showError(i18n("playbackControlFailed"));
    } finally {
      setLikeLoading(false);
    }
  }, [nowPlaying?.id, isSaved, i18n, refetchNowPlaying, showError]);

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

  // Always promote a IDLE island to COMPACT as soon as an activity appears,
  // but never auto-expand beyond the compact capsule.
  useEffect(() => {
    if (mode === "IDLE" && activeViews.length > 0) {
      setMode("COMPACT");
    }
  }, [mode, activeViews]);

  useEffect(() => {
    return () => {
      if (islandLeaveTimer.current) window.clearTimeout(islandLeaveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (mode !== "EXPANDED" && mode !== "INTERACTIVE") return;
    function handlePointerDown(e: PointerEvent) {
      if (!islandRef.current || islandRef.current.contains(e.target as Node)) return;
      setMode(activeViews.length > 0 ? "COMPACT" : "IDLE");
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [mode, activeViews]);

  const islandContent = (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="dynamic-island"
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          className="fixed left-0 right-0 top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)] z-[var(--z-dynamic-island)] flex justify-center pointer-events-none select-none"
        >
          <DynamicIsland
            ref={islandRef}
            data-testid="dynamic-island"
            view={expanded && selectedView ? selectedView : null}
            compact={compact}
            progressPercent={activeProgress}
            onClick={toggleExpanded}
            onKeyDown={handleKeyDown}
            onMouseEnter={onIslandEnter}
            onMouseLeave={onIslandLeave}
            data-island-mode={mode}
            aria-label={i18n("dynamicIsland")}
            aria-expanded={expanded}
            tabIndex={0}
            role="button"
          >
            <DynamicIslandView id="spotify" data-testid="dynamic-island-spotify" className="w-[min(94vw,340px)] sm:w-[400px]">
              <div onClick={stopPropagation} className="flex w-full flex-col gap-3.5 p-1.5">
                <IslandExpandedHeader
                  activeViews={activeViews}
                  selected={selectedView ?? "spotify"}
                  onSelect={selectView}
                />

                {/* Sub-Header: Source Badge & Live Time */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 shadow-xs">
                    <span className={cn("h-1.5 w-1.5 rounded-full bg-emerald-400", nowPlaying?.isPlaying && "animate-pulse")} />
                    <span>{nowPlaying?.source || "Spotify"}</span>
                    <span className="text-emerald-500/50">•</span>
                    <span className="font-normal opacity-90">{nowPlaying?.isPlaying ? "Lecture en cours" : "En pause"}</span>
                  </div>

                  <IslandLiveClock />
                </div>

                {/* Main Track Details Card */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={nowPlaying?.id || nowPlaying?.title || "spotify"}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: EASE_OUT }}
                    className="relative flex items-center gap-3.5 rounded-2xl border border-white/5 bg-white/[0.03] p-2.5 backdrop-blur-md"
                  >
                    <div className="relative shrink-0">
                      <SafeImage
                        candidates={[nowPlaying?.cover, nowPlaying?.artworkUrl, ...(nowPlaying?.covers || [])]}
                        alt={nowPlaying?.title || "Spotify"}
                        size={68}
                        className="h-[68px] w-[68px] rounded-xl object-cover shadow-lg ring-1 ring-white/15"
                        iconClassName="h-6 w-6 text-emerald-400"
                        loading="eager"
                        priority
                        timeoutMs={8000}
                        crossOrigin="anonymous"
                      />
                      {nowPlaying?.isPlaying && (
                        <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 border border-emerald-500/40 shadow-xs">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                      <p className="line-clamp-1 text-sm font-bold tracking-tight text-white" title={nowPlaying?.title}>
                        {nowPlaying?.title || "Aucun titre"}
                      </p>
                      <p className="truncate text-xs font-medium text-zinc-300" title={nowPlaying?.artist}>
                        {nowPlaying?.artist || i18n("spotifyPlaying")}
                      </p>
                      <p className="truncate text-[10px] font-semibold text-emerald-400/90" title={nowPlaying?.album}>
                        {nowPlaying?.album || "Spotify"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={toggleLike}
                      disabled={likeLoading || !nowPlaying?.id}
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-150 active:scale-90 cursor-pointer",
                        isSaved
                          ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 hover:scale-110"
                          : "text-zinc-400 hover:bg-white/10 hover:text-white hover:scale-110",
                      )}
                      aria-label={isSaved ? i18n("unlike") : i18n("like")}
                      title={isSaved ? i18n("unlike") : i18n("like")}
                    >
                      <Icon name="heart" pack="phosphor" className={cn("h-4 w-4 transition-transform", isSaved && "fill-current text-rose-500")} />
                    </button>
                  </motion.div>
                </AnimatePresence>

                {/* Animated Audio Equalizer */}
                <div className="py-0.5">
                  <AudioVisualizer
                    seed={nowPlaying?.id || nowPlaying?.title || ""}
                    isPlaying={!!nowPlaying?.isPlaying}
                    bars={24}
                    barWidth={2}
                    gap={2}
                    className="h-3.5 opacity-90"
                    color="#10b981"
                  />
                </div>

                {/* Progress Slider with Timestamps */}
                {nowPlaying?.durationMs !== undefined && (
                  <div className="space-y-1" onPointerDown={stopPropagation}>
                    <LiveMediaProgress
                      progressMs={nowPlaying.progressMs ?? 0}
                      durationMs={nowPlaying.durationMs}
                      isPlaying={!!nowPlaying?.isPlaying}
                      onSeek={onSpotifySeek}
                      data-testid="dynamic-island-progress"
                    />
                  </div>
                )}

                {/* Volume Slider */}
                <div className="flex items-center justify-center pt-0.5" onPointerDown={stopPropagation}>
                  <VolumeSlider value={localVolume} onChange={onSpotifyVolume} data-testid="dynamic-island-volume" />
                </div>

                {/* Media Playback Controls */}
                <div className="flex items-center justify-center gap-5 pt-1">
                  <button
                    type="button"
                    onClick={() => spotifyControl("previous")}
                    disabled={pendingSpotify}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition-all duration-150 hover:scale-110 hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-40 cursor-pointer"
                    aria-label={i18n("previous")}
                    title="Piste précédente"
                  >
                    <Icon name="skipBack" pack="phosphor" className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={pendingSpotify}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/30 transition-all duration-150 hover:scale-105 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 cursor-pointer"
                    aria-label={nowPlaying?.isPlaying ? i18n("pause") : i18n("play")}
                    title={nowPlaying?.isPlaying ? "Mettre en pause" : "Lire"}
                  >
                    {nowPlaying?.isPlaying ? (
                      <Icon name="pause" pack="phosphor" className="h-5 w-5 fill-current" />
                    ) : (
                      <Icon name="play" pack="phosphor" className="h-5 w-5 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => spotifyControl("next")}
                    disabled={pendingSpotify}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition-all duration-150 hover:scale-110 hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-40 cursor-pointer"
                    aria-label={i18n("next")}
                    title="Piste suivante"
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

                <div className="flex items-center gap-2">
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
                  <button
                    type="button"
                    onClick={() => focus.stop()}
                    className="flex items-center gap-1.5 rounded-xl border border-[var(--danger)]/20 px-3 py-1.5 text-xs font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                  >
                    <Icon name="stop" pack="phosphor" className="h-3.5 w-3.5" />
                    {i18n("stop")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/focus");
                      setMode("COMPACT");
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)]"
                  >
                    <Icon name="arrow-square-out" pack="phosphor" className="h-3.5 w-3.5" />
                    Ouvrir Focus
                  </button>
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
                    {syncing
                      ? i18n("syncing", "Synchronisation…")
                      : pendingCount > 0
                        ? i18n("syncPending", "En attente")
                        : i18n("synced", "Synchronisé")}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {pendingCount > 0
                      ? i18n("itemsPending", "{count} éléments en attente").replace("{count}", String(pendingCount))
                      : i18n("allUpToDate", "Tout est à jour")}
                  </p>
                  {lastSync && !syncing && pendingCount === 0 && (
                    <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                      {i18n("lastSync", "Dernier sync")}: {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                  {pendingCount > 0 && !syncing && (
                    <button
                      type="button"
                      disabled={syncing}
                      onClick={async (e) => {
                        e.stopPropagation();
                        const res = await sync();
                        if (res.ok) {
                          showSuccess(
                            i18n("synced", "Synchronisé"),
                            i18n("syncItemsOk", `${res.count} éléments synchronisés`)
                          );
                        }
                      }}
                      className="mt-2 rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-primary)]/90 disabled:opacity-50"
                    >
                      {i18n("syncNow", "Synchroniser maintenant")}
                    </button>
                  )}
                  {syncError && !syncing && (
                    <p className="mt-1 max-w-[220px] text-center text-[10px] text-[var(--danger)]">
                      {syncError.message}
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

            <DynamicIslandView id="upload" className="w-[min(92vw,280px)] sm:w-[340px]">
              <div onClick={stopPropagation} className="flex w-full flex-col items-center gap-3">
                <IslandExpandedHeader
                  activeViews={activeViews}
                  selected={selectedView ?? "upload"}
                  onSelect={selectView}
                />
                <UploadIslandView />
              </div>
            </DynamicIslandView>

            <DynamicIslandView id="mail" className="w-[min(92vw,280px)] sm:w-[340px]">
              {(() => {
                const mail = (top?.content as {
                  title?: string;
                  sender?: string;
                  subject?: string;
                  unreadCount?: number;
                  status?: "sending" | "sent" | "error" | "syncing" | "received";
                  actionUrl?: string;
                } | undefined) || {};

                return (
                  <div onClick={stopPropagation} className="flex w-full flex-col items-center gap-3 text-center">
                    <IslandExpandedHeader
                      activeViews={activeViews}
                      selected={selectedView ?? "mail"}
                      onSelect={selectView}
                    />
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shadow-sm">
                      <Icon
                        name={
                          mail.status === "syncing"
                            ? "arrows-clockwise"
                            : mail.status === "sending"
                            ? "paper-plane-tilt"
                            : mail.status === "error"
                            ? "warning-circle"
                            : "envelope-simple"
                        }
                        pack="phosphor"
                        className={cn("h-6 w-6", mail.status === "syncing" && "animate-spin")}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {mail.sender || mail.title || (mail.status === "sending" ? "Envoi du message..." : mail.status === "syncing" ? "Synchronisation..." : "Boîte de réception")}
                      </p>
                      {mail.subject && (
                        <p className="line-clamp-2 max-w-[280px] text-xs text-[var(--text-muted)]">
                          {mail.subject}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push("/mail")}
                      className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] transition-all hover:scale-105"
                    >
                      <Icon name="envelope-simple" pack="phosphor" className="h-3.5 w-3.5" />
                      <span>{i18n("openMail", "Ouvrir Mail")}</span>
                    </button>
                  </div>
                );
              })()}
            </DynamicIslandView>

            <DynamicIslandView id="notification" className="w-[min(92vw,260px)] sm:w-[320px]">
              {(() => {
                const note = (top?.content as { icon?: string; pack?: string; title?: string; message?: string; variant?: string } | undefined) || {};
                const noteVariant =
                  note.variant === "success"
                    ? { color: "text-[var(--success)]", bg: "bg-[var(--success)]/15" }
                    : note.variant === "warning"
                      ? { color: "text-[var(--warning)]", bg: "bg-[var(--warning)]/15" }
                      : note.variant === "error"
                        ? { color: "text-[var(--danger)]", bg: "bg-[var(--danger)]/15" }
                        : { color: "text-[var(--accent-primary)]", bg: "bg-[var(--accent-primary)]/15" };
                return (
                  <div onClick={stopPropagation} className="flex w-full flex-col items-center gap-3 text-center">
                    <IslandExpandedHeader
                      activeViews={activeViews}
                      selected={selectedView ?? "notification"}
                      onSelect={selectView}
                    />
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", noteVariant.bg)}>
                      <Icon
                        name={note.icon || "sparkles"}
                        pack={(note.pack as IconPack) || "phosphor"}
                        className={cn("h-6 w-6", noteVariant.color)}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{note.title || i18n("notification", "Notification")}</p>
                      {note.message && <p className="text-xs text-[var(--text-muted)]">{note.message}</p>}
                    </div>
                  </div>
                );
              })()}
            </DynamicIslandView>
          </DynamicIsland>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined" || !document.body) return null;
  return createPortal(islandContent, document.body);
}
