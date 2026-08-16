"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, Radio, Maximize2, ChevronDown, X } from "lucide-react";
import { useLiveWidgetStore } from "@/lib/hooks/useLiveWidgetStore";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { fetchWorker } from "@/lib/api";
import { Icon } from "@/lib/icons";
import LiveWidgets from "./LiveWidgets";

export default function LiveWidget() {
  const i18n = useI18n();
  const { settings } = useSettings();
  const { error: showError } = useToast();
  const { nowPlaying, lanyard, loading } = useLiveData();

  const {
    isOpen,
    isMinimized,
    expanded,
    liveSource,
    closeLive,
    toggleMinimize,
    toggleExpand,
    setLiveSource,
  } = useLiveWidgetStore();

  const activity = lanyard?.activities?.[0];

  async function controlSpotify(action: "play" | "pause" | "next" | "previous") {
    if (!settings.liveSpotifyClientId) {
      showError(i18n("configureToEnable"));
      return;
    }
    try {
      await fetchWorker("/api/spotify/control", {
        method: "POST",
        body: JSON.stringify({ action, clientId: settings.liveSpotifyClientId }),
      });
    } catch {
      // ignore
    }
  }

  const streamUrl = liveSource || (settings as { liveStreamUrl?: string }).liveStreamUrl || "";

  const isSecureStream = useMemo(() => {
    try {
      const url = new URL(streamUrl);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, [streamUrl]);

  return (
    <div className="fixed bottom-12 right-6 z-40 flex flex-col items-end gap-2">
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            drag
            dragMomentum={false}
            dragConstraints={
              typeof window !== "undefined"
                ? {
                    left: -window.innerWidth + (expanded ? 760 : 320),
                    right: 0,
                    top: -window.innerHeight + (expanded ? 500 : 200),
                    bottom: 0,
                  }
                : undefined
            }
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`w-80 cursor-grab overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/90 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl active:cursor-grabbing ${
              expanded ? "w-[720px]" : ""
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-zinc-500 cursor-grab" />
                <span className="relative flex h-4 w-4 items-center justify-center">
                  <span className="absolute h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-xs font-bold text-white tracking-wider">LIVE</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={expanded ? i18n("shrink") || "Réduire" : i18n("expand") || "Agrandir"}
                  onClick={() => toggleExpand()}
                  className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={i18n("minimize") || "Minimiser"}
                  onClick={() => toggleMinimize()}
                  className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={i18n("close") || "Fermer"}
                  onClick={() => closeLive()}
                  className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-red-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-3">
              {expanded ? (
                <div className="max-h-[440px] overflow-auto pr-1">
                  <LiveWidgets />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Stream area */}
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/[0.06] bg-black">
                    {streamUrl && isSecureStream ? (
                      <iframe
                        src={streamUrl}
                        title="Live stream"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        className="h-full w-full border-0"
                        sandbox="allow-same-origin allow-scripts allow-presentation"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-500">
                        <Radio className="h-8 w-8 animate-pulse text-emerald-400" />
                        <p className="text-[11px] text-center px-4">
                          {i18n("liveStreamWaiting") || "En attente du flux direct..."}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Now playing */}
                  {nowPlaying?.isPlaying ? (
                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                        <Icon name="disc" className={`h-5 w-5 ${nowPlaying.isPlaying ? "animate-spin" : ""}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-100">{nowPlaying.title}</p>
                        <p className="truncate text-xs text-zinc-500">{nowPlaying.artist}</p>
                      </div>
                    </div>
                  ) : loading ? (
                    <div className="h-8 w-2/3 animate-pulse rounded bg-white/[0.04]" />
                  ) : null}

                  {/* Spotify controls */}
                  {nowPlaying && (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1.5">
                      <button
                        type="button"
                        aria-label={i18n("previous")}
                        onClick={() => controlSpotify("previous")}
                        className="rounded p-1.5 text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                      >
                        <Icon name="skipBack" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={nowPlaying.isPlaying ? i18n("pause") : i18n("play")}
                        onClick={() => controlSpotify(nowPlaying.isPlaying ? "pause" : "play")}
                        className="rounded p-1.5 text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                      >
                        <Icon name={nowPlaying.isPlaying ? "pause" : "play"} className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={i18n("next")}
                        onClick={() => controlSpotify("next")}
                        className="rounded p-1.5 text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                      >
                        <Icon name="skipForward" className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Lanyard status */}
                  {lanyard?.discord_status && (
                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          lanyard.discord_status === "online"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : lanyard.discord_status === "idle"
                              ? "bg-amber-500/10 text-amber-400"
                              : lanyard.discord_status === "dnd"
                                ? "bg-rose-500/10 text-rose-400"
                                : "bg-zinc-500/10 text-zinc-400"
                        }`}
                      >
                        <Icon name="monitor" className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-100 capitalize">{lanyard.discord_status}</p>
                        {activity && (
                          <p className="truncate text-xs text-zinc-500">
                            {activity.name}
                            {activity.details ? ` — ${activity.details}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Source input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={streamUrl}
                      onChange={(e) => setLiveSource(e.target.value)}
                      placeholder={i18n("liveStreamUrlPlaceholder") || "URL du flux (HLS/WebRTC/iframe)..."}
                      className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && isMinimized && (
        <motion.button
          type="button"
          aria-label={i18n("expand") || "Agrandir"}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => toggleMinimize()}
          className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 shadow-lg transition-all hover:bg-emerald-500/25"
        >
          <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
          <span>Live</span>
        </motion.button>
      )}
    </div>
  );
}
