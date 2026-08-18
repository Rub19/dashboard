"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AlertCircle, ExternalLink, Loader2, Music, Radio, RadioOff } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import type { LanyardPresence, NowPlaying } from "@/lib/hooks/useLiveData";
import { TiltCard } from "@/components/ui/TiltCard";
import { cn } from "@/lib/utils";

type SocialDiscordCardProps = {
  lanyard?: LanyardPresence | null;
  nowPlaying?: NowPlaying | null;
  loading?: boolean;
  error?: Error | null;
  className?: string;
};

function defaultAvatarIndex(userId?: string, discriminator?: string): number {
  if (discriminator && /^\d{1,4}$/.test(discriminator)) {
    return parseInt(discriminator, 10) % 5;
  }
  if (userId && /^\d+$/.test(userId)) {
    try {
      return (Number(userId) >> 22) % 6;
    } catch {
      return 0;
    }
  }
  return 0;
}

function statusColor(status?: string) {
  switch (status) {
    case "online":
      return "bg-emerald-500";
    case "idle":
      return "bg-amber-400";
    case "dnd":
      return "bg-rose-500";
    default:
      return "bg-zinc-400";
  }
}

function statusLabel(status?: string) {
  switch (status) {
    case "online":
      return "En ligne";
    case "idle":
      return "Absent";
    case "dnd":
      return "Occupé";
    default:
      return "Hors ligne";
  }
}

function statusTone(status?: string) {
  switch (status) {
    case "dnd":
      return "border-rose-600/20 bg-rose-500/15 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300";
    case "online":
      return "border-emerald-600/20 bg-emerald-500/15 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "idle":
      return "border-amber-600/20 bg-amber-500/15 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
    default:
      return "border-zinc-500/20 bg-zinc-500/10 text-zinc-700 dark:border-zinc-500/30 dark:bg-zinc-500/10 dark:text-zinc-400";
  }
}

function formatMs(ms?: number): string {
  if (typeof ms !== "number" || ms < 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SocialDiscordCard({
  lanyard,
  nowPlaying,
  loading,
  error,
  className = "",
}: SocialDiscordCardProps) {
  const router = useRouter();
  const i18n = useI18n();
  const { settings } = useSettings();

  const userId = lanyard?.userId;
  const avatarHash = lanyard?.avatarHash;
  const discriminator = lanyard?.discriminator;
  const avatarUrl = lanyard?.avatarUrl;
  const username = lanyard?.username;
  const displayName = lanyard?.displayName || username || "Discord";

  const primaryAvatar = useMemo(() => {
    if (avatarUrl) return avatarUrl;
    if (avatarHash && userId) {
      const ext = avatarHash.startsWith("a_") ? "gif" : "png";
      return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=256`;
    }
    return "";
  }, [avatarHash, userId, avatarUrl]);

  const fallbackAvatar = useMemo(
    () => `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex(userId, discriminator)}.png`,
    [userId, discriminator]
  );

  const [src, setSrc] = useState(primaryAvatar || fallbackAvatar);
  const [errored, setErrored] = useState(false);

  function handleError() {
    if (!errored) {
      setErrored(true);
      setSrc(fallbackAvatar);
    } else {
      setSrc("");
    }
  }

  const status = lanyard?.discord_status || "offline";
  const color = statusColor(status);
  const label = statusLabel(status);

  const isLanyardConfigured = Boolean(settings.liveLanyardUserId);
  const isNowPlayingSourceConfigured =
    settings.liveNowPlayingSource === "lanyard"
      ? Boolean(settings.liveLanyardUserId)
      : settings.liveNowPlayingSource === "lastfm"
        ? Boolean(settings.liveLastfmUsername)
        : Boolean(settings.liveSpotifyClientId);

  const hasAnyConnection = isLanyardConfigured || isNowPlayingSourceConfigured;
  const hasLanyard = Boolean(userId);

  const { badgeColor, badgeLabel, badgeTone } = useMemo(() => {
    if (loading && hasAnyConnection) {
      return {
        badgeColor: "bg-cyan-400",
        badgeLabel: i18n("loading", "Chargement"),
        badgeTone: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
      };
    }
    if (error && hasAnyConnection) {
      return {
        badgeColor: "bg-rose-400",
        badgeLabel: i18n("error", "Erreur"),
        badgeTone: "border-rose-500/30 bg-rose-500/10 text-rose-300",
      };
    }
    if (hasLanyard) {
      return { badgeColor: color, badgeLabel: label, badgeTone: statusTone(status) };
    }
    if (hasAnyConnection) {
      return {
        badgeColor: "bg-emerald-400",
        badgeLabel: i18n("connected", "Connecté"),
        badgeTone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      };
    }
    return { badgeColor: color, badgeLabel: label, badgeTone: statusTone(status) };
  }, [color, error, hasAnyConnection, hasLanyard, i18n, label, loading, status]);

  const activity = lanyard?.activities?.[0];
  const customStatus =
    activity?.name === "Custom Status" ? activity.state : undefined;
  const gameActivity =
    activity && activity.name !== "Custom Status" ? activity : undefined;

  const hasMusic = !!nowPlaying?.isPlaying;
  const lanyardSpotify = lanyard?.spotify;
  const lanyardMusic =
    lanyardSpotify && lanyardSpotify.playing
      ? {
          title: lanyardSpotify.title,
          artist: lanyardSpotify.artist,
          cover: lanyardSpotify.artworkUrl || lanyardSpotify.artwork,
          progressMs: 0,
          durationMs: 0,
          isPlaying: true,
        }
      : null;
  const activeMusic = hasMusic ? nowPlaying : lanyardMusic;

  const progressPct =
    activeMusic?.durationMs && activeMusic.durationMs > 0
      ? Math.min(100, Math.max(0, ((activeMusic.progressMs || 0) / activeMusic.durationMs) * 100))
      : 0;

  const handle = useMemo(() => {
    if (discriminator && discriminator !== "0" && username) {
      return `${username}#${discriminator}`;
    }
    if (username) return `@${username}`;
    return null;
  }, [discriminator, username]);

  return (
    <TiltCard
      className={cn(
        "flex h-full min-h-0 flex-col v8-panel p-5 shadow-xl shadow-black/50 backdrop-blur-2xl transition-all hover:border-white/15",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Social & Media
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-medium",
            badgeTone
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", badgeColor)} />
          {badgeLabel}
        </span>
      </div>

      {!hasLanyard && !hasMusic ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-center">
          {loading && hasAnyConnection ? (
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          ) : error && hasAnyConnection ? (
            <AlertCircle className="h-6 w-6 text-rose-500" />
          ) : (
            <RadioOff className="h-6 w-6 text-zinc-500" />
          )}
          <p className="text-sm font-medium text-zinc-300">
            {hasAnyConnection
              ? i18n("socialStandby", "Connecté — en attente d'activité")
              : i18n("socialNoSession", "Aucune session sociale active")}
          </p>
          {!hasAnyConnection && (
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <ExternalLink className="h-3 w-3" />
              Connecter Spotify / Discord
            </button>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 py-2">
          {hasLanyard && (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="relative h-20 w-20 shrink-0">
                {errored && !src ? (
                  <div className="flex h-full w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-lg font-bold text-zinc-300">
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                ) : (
                  <Image
                    src={src}
                    alt={displayName}
                    width={80}
                    height={80}
                    unoptimized
                    onError={handleError}
                    className="h-full w-full rounded-2xl border border-white/10 object-cover"
                  />
                )}
                <span
                  className={cn(
                    "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-[3px] border-zinc-950",
                    color
                  )}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-white">{displayName}</p>
                {handle && (
                  <p className="truncate text-xs text-zinc-400">{handle}</p>
                )}
                <p className="truncate text-[11px] text-zinc-500">{label}</p>
              </div>
            </div>
          )}

          {customStatus && (
            <p className="max-w-full truncate rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300">
              {customStatus}
            </p>
          )}

          {gameActivity && (
            <div className="w-full space-y-0.5 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-center">
              <p className="text-xs font-semibold text-zinc-200">{gameActivity.name}</p>
              {gameActivity.details && (
                <p className="line-clamp-2 text-[11px] text-zinc-400">{gameActivity.details}</p>
              )}
              {gameActivity.state && (
                <p className="line-clamp-2 text-[10px] text-zinc-500">{gameActivity.state}</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeMusic && (
        <div className="mt-auto flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
          <div className="flex items-center gap-3">
            {activeMusic.cover ? (
              <Image
                src={activeMusic.cover}
                alt={activeMusic.title || ""}
                width={40}
                height={40}
                unoptimized
                className="h-10 w-10 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <Music className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{activeMusic.title || "—"}</p>
              <p className="truncate text-[10px] text-zinc-400">{activeMusic.artist || "—"}</p>
            </div>
          </div>

          {activeMusic.durationMs && activeMusic.durationMs > 0 && (
            <div className="flex flex-col gap-1">
              <div className="h-1 w-full overflow-hidden rounded-xl bg-white/[0.08]">
                <div className="h-full rounded-xl bg-emerald-500" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>{formatMs(activeMusic.progressMs)}</span>
                <span>{formatMs(activeMusic.durationMs)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {hasLanyard && !customStatus && !gameActivity && !activeMusic && (
        <div className="mt-auto flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-center">
          <Radio className="h-5 w-5 text-zinc-500" />
          <p className="text-[11px] text-zinc-500">Aucune activité en cours.</p>
        </div>
      )}
    </TiltCard>
  );
}
