"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ExternalLink, Loader2, Music, Radio, RadioOff } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import type { LanyardPresence, NowPlaying } from "@/lib/hooks/useLiveData";
import ClientImage from "@/components/ClientImage";
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
      const tail = userId.slice(-6);
      const index = Number(tail) % 6;
      return Number.isFinite(index) && index >= 0 ? index : 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

function statusColor(status?: string) {
  switch (status) {
    case "online":
      return "bg-[--accent-primary]";
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
      return "border-[--accent-primary] bg-[--accent-primary]/10 text-[--accent-primary] dark:border-[--accent-primary] dark:bg-[--accent-primary] dark:text-[--accent-primary]";
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
  const { settings, update } = useSettings();
  const { profile: oauthProfile } = useDiscordOAuth();

  const isOAuth = Boolean(oauthProfile?.connected);
  const oauthUserId = oauthProfile?.user?.id;

  useEffect(() => {
    if (isOAuth && oauthUserId && !settings.liveLanyardUserId) {
      update({ liveLanyardUserId: oauthUserId });
    }
  }, [isOAuth, oauthUserId, settings.liveLanyardUserId, update]);

  const userId = lanyard?.userId || oauthProfile?.user?.id;
  const avatarHash = lanyard?.avatarHash;
  const discriminator = lanyard?.discriminator;
  const avatarUrl = lanyard?.avatarUrl || oauthProfile?.user?.avatarUrl;
  const avatarUrlSmall = oauthProfile?.user?.avatarUrlSmall;
  const username = lanyard?.username || oauthProfile?.user?.username;
  const displayName = lanyard?.displayName || lanyard?.username || oauthProfile?.user?.displayName || oauthProfile?.user?.username || "Discord";

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

  const avatarCandidates = useMemo(
    () => [primaryAvatar, avatarUrlSmall, fallbackAvatar].filter(Boolean),
    [primaryAvatar, avatarUrlSmall, fallbackAvatar]
  );

  const rawStatus = lanyard?.discord_status || "offline";
  const status = rawStatus;
  const color = statusColor(status);
  const label = statusLabel(status);

  const isLanyardConfigured = Boolean(settings.liveLanyardUserId);
  const isNowPlayingSourceConfigured =
    settings.liveNowPlayingSource === "lanyard"
      ? Boolean(settings.liveLanyardUserId)
      : settings.liveNowPlayingSource === "lastfm"
        ? Boolean(settings.liveLastfmUsername)
        : Boolean(settings.liveSpotifyClientId);

  const hasAnyConnection = isLanyardConfigured || isNowPlayingSourceConfigured || isOAuth;
  const hasLanyard = Boolean(lanyard?.userId);
  const hasOAuth = isOAuth;

  const { badgeColor, badgeLabel, badgeTone } = useMemo(() => {
    if (loading && !hasLanyard && hasAnyConnection) {
      return {
        badgeColor: "bg-[--info]",
        badgeLabel: i18n("loading", "Chargement"),
        badgeTone: "border-[--info] bg-[--info]/10 text-[--info]",
      };
    }
    if (error && hasAnyConnection && !hasLanyard) {
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
        badgeColor: "bg-[--accent-primary]",
        badgeLabel: i18n("connected", "Connecté"),
        badgeTone: "border-[--accent-primary] bg-[--accent-primary]/10 text-[--accent-primary]",
      };
    }
    return { badgeColor: color, badgeLabel: label, badgeTone: statusTone(status) };
  }, [color, error, hasAnyConnection, hasLanyard, i18n, label, loading, status]);

  const activities = lanyard?.activities ?? [];
  const customStatus = activities.find((activity) => activity.name === "Custom Status")?.state;
  const gameActivity = activities.find(
    (activity) => activity.name !== "Custom Status" && activity.name !== "Spotify"
  );

  // Keep the widget visible when Spotify returns a track without the playback
  // flag (for example during device handoff or with a delayed API payload).
  const hasMusic = Boolean(nowPlaying?.title || nowPlaying?.isPlaying);
  const lanyardSpotify = lanyard?.spotify;
  const lanyardMusic: NowPlaying | null =
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
  const activeMusic = nowPlaying?.title ? nowPlaying : lanyardMusic;

  const coverCandidates = useMemo(
    () => (activeMusic
      ? [activeMusic.cover, activeMusic.artworkUrl, ...(activeMusic.covers || [])].filter(Boolean)
      : []),
    [activeMusic]
  );

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
        "flex h-full min-h-0 flex-col v8-panel overflow-hidden bg-gradient-to-br from-indigo-950/40 via-purple-900/10 to-black/20 p-4 shadow-xl shadow-black/50 backdrop-blur-2xl transition-all hover:border-indigo-500/25",
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

      {!hasLanyard && !hasOAuth && !hasMusic ? (
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)]"
            >
              <ExternalLink className="h-3 w-3" />
              Connecter Spotify / Discord
            </button>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-hidden">
          {(hasLanyard || hasOAuth) && (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="relative h-16 w-16 shrink-0">
                <ClientImage
                  candidates={avatarCandidates}
                  alt={displayName}
                  fill
                  className="h-full w-full rounded-2xl border border-white/10"
                  priority
                  fallback={
                    <div className="flex h-full w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-lg font-bold text-zinc-300">
                      {displayName.slice(0, 2).toUpperCase()}
                    </div>
                  }
                />
                <span
                  className={cn(
                    "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-[3px] border-zinc-950",
                    color
                  )}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-white">{displayName}</p>
                {handle && (
                  <p className="truncate text-[11px] text-zinc-400">{handle}</p>
                )}
                <p className="truncate text-[10px] text-zinc-500">{label}</p>
              </div>
            </div>
          )}

          {customStatus && (
            <p className="max-w-full truncate rounded-lg bg-white/[0.04] px-3 py-1 text-[11px] text-zinc-300">
              {customStatus}
            </p>
          )}

          {gameActivity && (
            <div className="w-full shrink-0 space-y-0 rounded-xl border border-white/[0.05] bg-white/[0.02] p-2 text-center">
              <p className="text-[11px] font-semibold text-zinc-200">{gameActivity.name}</p>
              {gameActivity.details && (
                <p className="line-clamp-2 text-[10px] text-zinc-400">{gameActivity.details}</p>
              )}
              {gameActivity.state && (
                <p className="line-clamp-2 text-[9px] text-zinc-500">{gameActivity.state}</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeMusic && (
        <div className="mt-auto flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
          <div className="flex items-center gap-3">
            <ClientImage
              candidates={coverCandidates}
              alt={activeMusic.title || ""}
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-lg"
              fallback={
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[--accent-primary]/10 text-[--accent-primary]">
                  <Music className="h-4 w-4" />
                </div>
              }
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{activeMusic.title || "—"}</p>
              <p className="truncate text-[10px] text-zinc-400">{activeMusic.artist || "—"}</p>
            </div>
          </div>

          {activeMusic.durationMs && activeMusic.durationMs > 0 && (
            <div className="flex flex-col gap-1">
              <div className="h-1 w-full overflow-hidden rounded-xl bg-white/[0.08]">
                <div className="h-full rounded-xl bg-[--accent-primary]" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>{formatMs(activeMusic.progressMs)}</span>
                <span>{formatMs(activeMusic.durationMs)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {(hasLanyard || hasOAuth) && !customStatus && !gameActivity && !activeMusic && (
        <div className="mt-auto flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-center">
          <Radio className="h-4 w-4 text-zinc-500" />
          <p className="text-[10px] text-zinc-500">Aucune activité en cours.</p>
        </div>
      )}
    </TiltCard>
  );
}
