"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { GripVertical, Radio, Maximize2, ChevronDown, X, Music, ClipboardPaste } from "lucide-react";
import { useLiveWidgetStore } from "@/lib/hooks/useLiveWidgetStore";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { fetchWorker } from "@/lib/api";
import { Icon } from "@/lib/icons";
import Input from "@/components/Input";
import FormField from "@/components/FormField";
import { cn } from "@/lib/utils";
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

  const discordUserId = lanyard?.userId;
  const discordAvatarHash = lanyard?.avatarHash;
  const discordAvatarUrl = useMemo(() => {
    if (lanyard?.avatarUrl) return lanyard.avatarUrl;
    if (discordUserId && discordAvatarHash) {
      const ext = discordAvatarHash.startsWith("a_") ? "gif" : "png";
      return `https://cdn.discordapp.com/avatars/${discordUserId}/${discordAvatarHash}.${ext}?size=128`;
    }
    return null;
  }, [lanyard?.avatarUrl, discordUserId, discordAvatarHash]);

  const discordDisplayName = lanyard?.displayName || lanyard?.username || "Discord";
  const discordHandle = lanyard?.username ? (lanyard?.discriminator ? `${lanyard.username}#${lanyard.discriminator}` : `@${lanyard.username}`) : null;

  const statusTone = {
    online: "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] ring-[var(--accent-primary)]",
    idle: "bg-[var(--warning)]/10 text-[var(--warning)] ring-[var(--warning)]/30",
    dnd: "bg-[var(--danger)]/10 text-[var(--danger)] ring-[var(--danger)]/30",
    offline: "bg-[var(--text-muted)]/10 text-[var(--text-muted)] ring-[var(--text-muted)]/30",
  }[lanyard?.discord_status || "offline"];

  const statusLabel = {
    online: i18n("statusOnline", "En ligne"),
    idle: i18n("statusAway", "Absent"),
    dnd: i18n("statusBusy", "Occupé"),
    offline: i18n("statusOffline", "Hors ligne"),
  }[lanyard?.discord_status || "offline"];

  const lanyardSpotify = lanyard?.spotify;

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

  const { embedUrl, isYouTube } = useMemo(() => {
    const raw = streamUrl.trim();
    if (!raw) return { embedUrl: "", isYouTube: false };
    try {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      const isYouTubeHost = host === "youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be" || host === "music.youtube.com";
      if (isYouTubeHost) {
        let id = "";
        if (host === "youtu.be") id = url.pathname.split("/")[1] || "";
        else if (url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] || "";
        else if (url.pathname.startsWith("/live/")) id = url.pathname.split("/")[2] || "";
        else if (url.pathname.startsWith("/shorts/")) id = url.pathname.split("/")[2] || "";
        else id = url.searchParams.get("v") || "";
        if (id && /^[a-zA-Z0-9_-]{11,}$/.test(id)) {
          return { embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`, isYouTube: true };
        }
      }
      return { embedUrl: raw, isYouTube: false };
    } catch {
      return { embedUrl: raw, isYouTube: false };
    }
  }, [streamUrl]);

  const isSecureStream = useMemo(() => {
    try {
      const url = new URL(embedUrl);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, [embedUrl]);

  return (
    <div className="fixed bottom-[calc(3rem+env(safe-area-inset-bottom))] right-6 z-40 flex flex-col items-end gap-2">
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
            className={`w-80 cursor-grab overflow-hidden rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--background)]/90 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl active:cursor-grabbing ${
              expanded ? "w-[720px]" : ""
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] px-3 py-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-[var(--text-muted)] cursor-grab" />
                <span className="relative flex h-4 w-4 items-center justify-center">
                  <span className="absolute h-2 w-2 rounded-full bg-[var(--accent-primary)] animate-ping" />
                  <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
                </span>
                <span className="text-xs font-bold text-[var(--text-primary)] tracking-wider">LIVE</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={expanded ? i18n("shrink") || "Réduire" : i18n("expand") || "Agrandir"}
                  onClick={() => toggleExpand()}
                  className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={i18n("minimize") || "Minimiser"}
                  onClick={() => toggleMinimize()}
                  className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={i18n("close") || "Fermer"}
                  onClick={() => closeLive()}
                  className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--danger)]"
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
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                        {i18n("liveDirectStream", "Flux direct")}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {i18n("liveStreamHint", "HLS / WebRTC / iframe")}
                      </span>
                    </div>
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--background)]">
                      {streamUrl && isSecureStream ? (
                        <iframe
                          src={embedUrl}
                          title="Live stream"
                          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                          className="h-full w-full border-0"
                          sandbox={isYouTube ? "allow-scripts allow-presentation allow-popups" : "allow-same-origin allow-scripts allow-presentation"}
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-[var(--text-muted)]">
                          <Radio className="h-8 w-8 animate-pulse text-[var(--accent-primary)]" />
                          <p className="text-center text-[11px]">
                            {i18n("liveStreamWaiting", "En attente du flux direct...")}
                          </p>
                          <p className="max-w-[220px] text-center text-[10px] text-[var(--text-muted)]">
                            {i18n("liveStreamHelp", "Collez une URL de flux vidéo dans le champ ci-dessous.")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Now playing */}
                  {nowPlaying?.isPlaying ? (
                    <div className="flex items-center gap-3 rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] p-2">
                      {nowPlaying.cover || nowPlaying.artworkUrl ? (
                        <Image
                          src={nowPlaying.cover || nowPlaying.artworkUrl || ""}
                          alt={nowPlaying.title || ""}
                          width={36}
                          height={36}
                          unoptimized
                          className="h-9 w-9 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                          <Icon name="disc" className={`h-5 w-5 ${nowPlaying.isPlaying ? "animate-spin" : ""}`} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{nowPlaying.title}</p>
                        <p className="truncate text-xs text-[var(--text-muted)]">
                          <span className="text-[var(--accent-primary)]">{nowPlaying.source || "Spotify"}</span>
                          {nowPlaying.artist ? ` — ${nowPlaying.artist}` : ""}
                        </p>
                      </div>
                    </div>
                  ) : loading ? (
                    <div className="h-8 w-2/3 animate-pulse rounded bg-[var(--text-primary)]/[0.04]" />
                  ) : null}

                  {/* Spotify controls */}
                  {nowPlaying && (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] p-1.5">
                      <button
                        type="button"
                        aria-label={i18n("previous")}
                        onClick={() => controlSpotify("previous")}
                        className="rounded p-1.5 text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
                      >
                        <Icon name="skipBack" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={nowPlaying.isPlaying ? i18n("pause") : i18n("play")}
                        onClick={() => controlSpotify(nowPlaying.isPlaying ? "pause" : "play")}
                        className="rounded p-1.5 text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
                      >
                        <Icon name={nowPlaying.isPlaying ? "pause" : "play"} className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={i18n("next")}
                        onClick={() => controlSpotify("next")}
                        className="rounded p-1.5 text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
                      >
                        <Icon name="skipForward" className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Lanyard status */}
                  {lanyard?.discord_status && (
                    <div className="flex items-center gap-3 rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] p-2.5">
                      <div className="relative h-10 w-10 shrink-0">
                        {discordAvatarUrl ? (
                          <Image
                            src={discordAvatarUrl}
                            alt={discordDisplayName}
                            width={40}
                            height={40}
                            unoptimized
                            className="h-full w-full rounded-xl object-cover ring-1 ring-[var(--text-primary)]/10"
                          />
                        ) : (
                          <span className={cn("flex h-full w-full items-center justify-center rounded-xl text-sm font-bold", statusTone)}>
                            {discordDisplayName.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--background)]",
                            lanyard.discord_status === "online"
                              ? "bg-[var(--accent-primary)]"
                              : lanyard.discord_status === "idle"
                                ? "bg-[var(--warning)]"
                                : lanyard.discord_status === "dnd"
                                  ? "bg-[var(--danger)]"
                                  : "bg-[var(--text-muted)]",
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{discordDisplayName}</p>
                        <p className="truncate text-xs text-[var(--text-muted)]">
                          <span className="text-[var(--text-muted)]">{discordHandle || "Discord"}</span>
                          {discordHandle ? <span className="mx-1.5 text-[var(--text-muted)]">·</span> : null}
                          <span className="text-[var(--text-muted)]">{statusLabel}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Discord Spotify activity */}
                  {lanyardSpotify?.playing && (
                    <div className="flex items-center gap-3 rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] p-2.5">
                      {lanyardSpotify.artworkUrl || lanyardSpotify.artwork ? (
                        <Image
                          src={lanyardSpotify.artworkUrl || lanyardSpotify.artwork || ""}
                          alt={lanyardSpotify.title || ""}
                          width={36}
                          height={36}
                          unoptimized
                          className="h-9 w-9 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                          <Music className="h-5 w-5" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{lanyardSpotify.title || "—"}</p>
                        <p className="truncate text-xs text-[var(--text-muted)]">
                          <span className="text-[var(--accent-primary)]">Spotify</span>
                          {lanyardSpotify.artist ? ` — ${lanyardSpotify.artist}` : ""}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Source input */}
                  <FormField label={i18n("liveStreamInputLabel", "URL du flux direct")} className="space-y-1.5">
                    <Input
                      type="text"
                      value={streamUrl}
                      onChange={(e) => setLiveSource(e.target.value)}
                      placeholder={i18n("liveStreamUrlPlaceholder") || "URL du flux (HLS/WebRTC/iframe)..."}
                      icon="link"
                      inputSize="compact"
                      className="w-full"
                      right={
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const text = await navigator.clipboard.readText();
                                if (text) setLiveSource(text.trim());
                              } catch {
                                showError(i18n("clipboardDenied", "Impossible d'accéder au presse-papiers. Collez manuellement."));
                              }
                            }}
                            title={i18n("paste", "Coller")}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.03] text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
                          >
                            <ClipboardPaste className="h-3.5 w-3.5" />
                          </button>
                          {streamUrl && (
                            <button
                              type="button"
                              onClick={() => setLiveSource("")}
                              title={i18n("clear", "Effacer")}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.03] text-[var(--text-muted)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      }
                    />
                  </FormField>
                  <p className="px-0.5 text-[10px] text-[var(--text-muted)]">
                    {i18n("liveStreamInputHelp", "Colle une URL HLS (.m3u8), WebRTC ou iframe de caméra/stream.")}
                  </p>
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
          className="flex items-center gap-1.5 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15 px-3 py-1.5 text-xs font-medium text-[var(--accent-primary)] shadow-lg transition-all hover:bg-[var(--accent-primary)]/25"
        >
          <Radio className="h-3.5 w-3.5 animate-pulse text-[var(--accent-primary)]" />
          <span>Live</span>
        </motion.button>
      )}
    </div>
  );
}
