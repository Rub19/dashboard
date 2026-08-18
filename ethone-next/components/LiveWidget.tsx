"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { GripVertical, Radio, Maximize2, ChevronDown, X, Music, Link as LinkIcon, ClipboardPaste, X as XIcon } from "lucide-react";
import { useLiveWidgetStore } from "@/lib/hooks/useLiveWidgetStore";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { fetchWorker } from "@/lib/api";
import { Icon } from "@/lib/icons";
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
    online: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
    idle: "bg-amber-500/10 text-amber-400 ring-amber-500/30",
    dnd: "bg-rose-500/10 text-rose-400 ring-rose-500/30",
    offline: "bg-zinc-500/10 text-zinc-400 ring-zinc-500/30",
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
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                        {i18n("liveDirectStream", "Flux direct")}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        {i18n("liveStreamHint", "HLS / WebRTC / iframe")}
                      </span>
                    </div>
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/[0.06] bg-black">
                      {streamUrl && isSecureStream ? (
                        <iframe
                          src={embedUrl}
                          title="Live stream"
                          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                          className="h-full w-full border-0"
                          sandbox={isYouTube ? "allow-scripts allow-presentation allow-popups" : "allow-same-origin allow-scripts allow-presentation"}
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-zinc-500">
                          <Radio className="h-8 w-8 animate-pulse text-emerald-400" />
                          <p className="text-center text-[11px]">
                            {i18n("liveStreamWaiting", "En attente du flux direct...")}
                          </p>
                          <p className="max-w-[220px] text-center text-[10px] text-zinc-600">
                            {i18n("liveStreamHelp", "Collez une URL de flux vidéo dans le champ ci-dessous.")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Now playing */}
                  {nowPlaying?.isPlaying ? (
                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
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
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                          <Icon name="disc" className={`h-5 w-5 ${nowPlaying.isPlaying ? "animate-spin" : ""}`} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-100">{nowPlaying.title}</p>
                        <p className="truncate text-xs text-zinc-500">
                          <span className="text-emerald-400">{nowPlaying.source || "Spotify"}</span>
                          {nowPlaying.artist ? ` — ${nowPlaying.artist}` : ""}
                        </p>
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
                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                      <div className="relative h-10 w-10 shrink-0">
                        {discordAvatarUrl ? (
                          <Image
                            src={discordAvatarUrl}
                            alt={discordDisplayName}
                            width={40}
                            height={40}
                            unoptimized
                            className="h-full w-full rounded-xl object-cover ring-1 ring-white/10"
                          />
                        ) : (
                          <span className={cn("flex h-full w-full items-center justify-center rounded-xl text-sm font-bold", statusTone)}>
                            {discordDisplayName.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-zinc-950",
                            lanyard.discord_status === "online"
                              ? "bg-emerald-400"
                              : lanyard.discord_status === "idle"
                                ? "bg-amber-400"
                                : lanyard.discord_status === "dnd"
                                  ? "bg-rose-400"
                                  : "bg-zinc-400",
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-100">{discordDisplayName}</p>
                        <p className="truncate text-xs text-zinc-500">
                          <span className="text-zinc-400">{discordHandle || "Discord"}</span>
                          {discordHandle ? <span className="mx-1.5 text-zinc-700">·</span> : null}
                          <span className="text-zinc-400">{statusLabel}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Discord Spotify activity */}
                  {lanyardSpotify?.playing && (
                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
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
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                          <Music className="h-5 w-5" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-100">{lanyardSpotify.title || "—"}</p>
                        <p className="truncate text-xs text-zinc-500">
                          <span className="text-emerald-400">Spotify</span>
                          {lanyardSpotify.artist ? ` — ${lanyardSpotify.artist}` : ""}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Source input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                      {i18n("liveStreamInputLabel", "URL du flux direct")}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                        <input
                          type="text"
                          value={streamUrl}
                          onChange={(e) => setLiveSource(e.target.value)}
                          placeholder={i18n("liveStreamUrlPlaceholder") || "URL du flux (HLS/WebRTC/iframe)..."}
                          className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] pl-8 pr-2.5 py-1.5 text-[11px] text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/50"
                        />
                      </div>
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
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                      >
                        <ClipboardPaste className="h-3.5 w-3.5" />
                      </button>
                      {streamUrl && (
                        <button
                          type="button"
                          onClick={() => setLiveSource("")}
                          title={i18n("clear", "Effacer")}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-zinc-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                        >
                          <XIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="px-0.5 text-[10px] text-zinc-600">
                      {i18n("liveStreamInputHelp", "Colle une URL HLS (.m3u8), WebRTC ou iframe de caméra/stream.")}
                    </p>
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
          className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 shadow-lg transition-all hover:bg-emerald-500/25"
        >
          <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
          <span>Live</span>
        </motion.button>
      )}
    </div>
  );
}
