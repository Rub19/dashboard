"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { fetchWorker } from "@/lib/api";
import LiveWidgets from "./LiveWidgets";

export default function LiveOverlay() {
  const i18n = useI18n();
  const { nowPlaying, lanyard, loading } = useLiveData();
  const { settings, update } = useSettings();
  const { error: showError } = useToast();
  const [minimized, setMinimized] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const enabled = settings.liveOverlay !== false;

  if (!enabled) return null;

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

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {!minimized && (
          <motion.div
            drag
            dragMomentum={false}
            dragConstraints={typeof window !== "undefined" ? { left: -window.innerWidth + (expanded ? 760 : 280), right: 0, top: -window.innerHeight + (expanded ? 480 : 160), bottom: 0 } : undefined}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`cursor-grab overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]/95 p-3 shadow-2xl backdrop-blur-md active:cursor-grabbing ${
              expanded ? "w-[720px]" : "w-64"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                <Icon name="grip" className="h-3.5 w-3.5 text-[var(--muted)]" />
                <Icon name="radio" className="h-3 w-3 text-emerald-400" /> Live
              </span>
              <div className="flex gap-1">
                <button type="button" aria-label={expanded ? i18n("minimize") : i18n("expand")} onClick={() => setExpanded((v) => !v)} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface)]">
                  {expanded ? <Icon name="minimize" className="h-3.5 w-3.5" /> : <Icon name="maximize" className="h-3.5 w-3.5" />}
                </button>
                <button type="button" aria-label={i18n("minimize")} onClick={() => setMinimized(true)} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface)]">
                  <Icon name="chevronUp" className="h-3.5 w-3.5" />
                </button>
                <button type="button" aria-label={i18n("close")} onClick={() => update({ liveOverlay: false })} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-red-400">
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {expanded ? (
              <div className="max-h-[440px] overflow-auto pr-1">
                <LiveWidgets />
              </div>
            ) : (
              <div className="space-y-3">
                {nowPlaying?.isPlaying ? (
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                      <Icon name="disc" className={`h-5 w-5 ${nowPlaying.isPlaying ? "animate-spin" : ""}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{nowPlaying.title}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{nowPlaying.artist}</p>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="h-8 w-2/3 animate-pulse rounded bg-[var(--border)]" />
                ) : null}

                {nowPlaying && (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-[var(--surface)] p-1">
                    <button type="button" aria-label={i18n("previous")} onClick={() => controlSpotify("previous")} className="rounded p-1 text-[var(--foreground)] hover:bg-[var(--surface-raised)]">
                      <Icon name="skipBack" className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={nowPlaying.isPlaying ? i18n("pause") : i18n("play")} onClick={() => controlSpotify(nowPlaying.isPlaying ? "pause" : "play")} className="rounded p-1 text-[var(--foreground)] hover:bg-[var(--surface-raised)]">
                      {nowPlaying.isPlaying ? <Icon name="pause" className="h-4 w-4" /> : <Icon name="play" className="h-4 w-4" />}
                    </button>
                    <button type="button" aria-label={i18n("next")} onClick={() => controlSpotify("next")} className="rounded p-1 text-[var(--foreground)] hover:bg-[var(--surface-raised)]">
                      <Icon name="skipForward" className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {lanyard?.discord_status && (
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      lanyard.discord_status === "online" ? "bg-emerald-500/10 text-emerald-400" :
                      lanyard.discord_status === "idle" ? "bg-amber-500/10 text-amber-400" :
                      lanyard.discord_status === "dnd" ? "bg-rose-500/10 text-rose-400" :
                      "bg-zinc-500/10 text-zinc-400"
                    }`}>
                      <Icon name="monitor" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium capitalize">{lanyard.discord_status}</p>
                      {activity && (
                        <p className="truncate text-xs text-[var(--muted)]">
                          {activity.name}{activity.details ? ` — ${activity.details}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {minimized && (
        <motion.button
          type="button"
          aria-label={i18n("expand")}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setMinimized(false)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] shadow-lg hover:border-[var(--accent)]"
        >
          <Icon name="radio" className="h-4 w-4 text-emerald-400" />
        </motion.button>
      )}
    </div>
  );
}
