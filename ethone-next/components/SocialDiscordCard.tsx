"use client";

import { memo, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ExternalLink, Loader2, Music, Radio, RadioOff } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { Icon } from "@/lib/icons";
import type { LanyardPresence, NowPlaying } from "@/lib/hooks/useLiveData";
import ClientImage from "@/components/ClientImage";
import { TiltCard } from "@/components/ui/TiltCard";
import { GameBrandIcon } from "@/components/GameBrandIcon";
import { cn } from "@/lib/utils";

type SocialDiscordCardProps = {
  lanyard?: LanyardPresence | null;
  nowPlaying?: NowPlaying | null;
  loading?: boolean;
  error?: Error | null;
  className?: string;
};

function statusColor(status?: string) {
  switch (status) {
    case "online":
      return "bg-emerald-400 shadow-sm shadow-emerald-500/50";
    case "idle":
      return "bg-amber-400 shadow-sm shadow-amber-500/50";
    case "dnd":
      return "bg-rose-500 shadow-sm shadow-rose-500/50";
    default:
      return "bg-zinc-500";
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
      return "border-rose-500/30 bg-rose-500/10 text-rose-400";
    case "online":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    case "idle":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";
    default:
      return "border-white/10 bg-white/5 text-zinc-400";
  }
}

function formatMs(ms?: number): string {
  if (typeof ms !== "number" || ms < 0 || isNaN(ms)) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SocialDiscordCard = memo(function SocialDiscordCard({
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

  const handleConnectIntegrations = useCallback(() => {
    router.push("/settings?category=integrations");
  }, [router]);

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
  const username = lanyard?.username || oauthProfile?.user?.username;
  const displayName =
    lanyard?.displayName ||
    lanyard?.username ||
    oauthProfile?.user?.displayName ||
    oauthProfile?.user?.username ||
    "Discord";

  const primaryAvatar = useMemo(() => {
    if (avatarUrl) return avatarUrl;
    if (avatarHash && userId) {
      const ext = avatarHash.startsWith("a_") ? "gif" : "png";
      return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=256`;
    }
    return "";
  }, [avatarHash, userId, avatarUrl]);

  const rawStatus = lanyard?.discord_status || (isOAuth ? "online" : "offline");
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
    if (hasLanyard) {
      return { badgeColor: color, badgeLabel: label, badgeTone: statusTone(status) };
    }
    if (hasAnyConnection) {
      return {
        badgeColor: "bg-emerald-400",
        badgeLabel: i18n("connected", "Connecté"),
        badgeTone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      };
    }
    if (loading) {
      return {
        badgeColor: "bg-sky-400",
        badgeLabel: i18n("loading", "Chargement"),
        badgeTone: "border-sky-500/30 bg-sky-500/10 text-sky-300",
      };
    }
    return { badgeColor: color, badgeLabel: label, badgeTone: statusTone(status) };
  }, [color, hasAnyConnection, hasLanyard, i18n, label, loading, status]);

  const activities = lanyard?.activities ?? [];
  const customStatus = activities.find((activity) => activity.name === "Custom Status")?.state;
  const gameActivity = activities.find(
    (activity) => activity.name !== "Custom Status" && activity.name !== "Spotify"
  );

  const lanyardSpotify = lanyard?.spotify;
  const lanyardMusic: NowPlaying | null =
    lanyardSpotify && lanyardSpotify.playing
      ? {
          title: lanyardSpotify.title,
          artist: lanyardSpotify.artist,
          cover: lanyardSpotify.artworkUrl || lanyardSpotify.artwork,
          progressMs: lanyardSpotify.progressMs ?? 0,
          durationMs: lanyardSpotify.durationMs ?? 0,
          isPlaying: true,
        }
      : null;
  const activeMusic = nowPlaying?.title ? nowPlaying : lanyardMusic;

  const coverCandidates = useMemo(
    () =>
      activeMusic
        ? [activeMusic.cover, activeMusic.artworkUrl, ...(activeMusic.covers || [])].filter(Boolean)
        : [],
    [activeMusic]
  );

  const primaryCover = coverCandidates[0] || "";

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
        "relative flex h-full min-h-0 flex-col overflow-hidden no-scrollbar select-none rounded-2xl border border-white/[0.06] bg-[#0c0d14]/95 p-4 shadow-2xl backdrop-blur-2xl transition-all duration-300 hover:border-white/[0.12] group",
        className
      )}
    >
      {/* 3D Glossy Background Cover Art Effect */}
      {primaryCover && (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20 blur-2xl transition-opacity duration-700 group-hover:opacity-30 scale-125"
            style={{ backgroundImage: `url(${primaryCover})` }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c0d14] via-[#0c0d14]/85 to-transparent"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl"
            aria-hidden="true"
          />
        </>
      )}

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shadow-sm">
              <Icon name="message-square" className="h-3.5 w-3.5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Social & Media
            </span>
          </div>

          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold shadow-xs",
              badgeTone
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", badgeColor)} />
            {badgeLabel}
          </span>
        </div>

        {!hasLanyard && !hasOAuth && !activeMusic ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-center">
            {loading && hasAnyConnection ? (
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            ) : hasAnyConnection ? (
              <Radio className="h-6 w-6 text-emerald-400 animate-pulse" />
            ) : (
              <RadioOff className="h-6 w-6 text-zinc-500" />
            )}
            <p className="text-sm font-medium text-white">
              {hasAnyConnection
                ? i18n("socialStandby", "Connecté — en attente d'activité")
                : i18n("socialNoSession", "Aucune session sociale active")}
            </p>
            {!hasAnyConnection ? (
              <button
                type="button"
                onClick={handleConnectIntegrations}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-white/[0.08] active:scale-95 cursor-pointer"
              >
                <ExternalLink className="h-3 w-3" />
                {i18n("connectSpotifyDiscord", "Connecter Spotify / Discord")}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectIntegrations}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition-all hover:bg-white/[0.08] hover:text-white active:scale-95 cursor-pointer"
              >
                <ExternalLink className="h-3 w-3" />
                {i18n("manageIntegrations", "Gérer les connexions")}
              </button>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 overflow-hidden">
            {(hasLanyard || hasOAuth) && (
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="relative h-16 w-16 shrink-0">
                  <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/[0.08] shadow-lg">
                    <ClientImage
                      candidates={[primaryAvatar]}
                      alt={displayName}
                      fill
                      className="object-cover"
                      priority
                      fallback={
                        <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-lg font-bold text-white">
                          {displayName.slice(0, 2).toUpperCase()}
                        </div>
                      }
                    />
                  </div>
                  {/* Official Discord Status Badge with Cutout Ring */}
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0c0d14] p-0.5 shadow-md">
                    {status === "dnd" ? (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-rose-500 shadow-sm shadow-rose-500/50">
                        <div className="h-0.5 w-2 rounded-full bg-white" />
                      </div>
                    ) : status === "idle" ? (
                      <div className="relative h-full w-full rounded-full bg-amber-400 shadow-sm shadow-amber-500/50">
                        <div className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#0c0d14]" />
                      </div>
                    ) : status === "online" ? (
                      <div className="h-full w-full rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50" />
                    ) : (
                      <div className="h-full w-full rounded-full border-2 border-zinc-500 bg-[#0c0d14]" />
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-white">{displayName}</p>
                  {handle && <p className="truncate text-[11px] text-zinc-400">{handle}</p>}
                  <p className="truncate text-[10px] text-zinc-500 font-medium">{label}</p>
                </div>
              </div>
            )}

            {customStatus && (
              <p className="max-w-full truncate rounded-lg bg-white/[0.04] px-3 py-1 text-[11px] text-zinc-200 border border-white/[0.05]">
                {customStatus}
              </p>
            )}

            {gameActivity && (
              <div className="w-full shrink-0 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-center shadow-inner backdrop-blur-md">
                <div className="flex items-center justify-center gap-2">
                  <GameBrandIcon name={gameActivity.name} className="h-5 w-5" />
                  <p className="text-xs font-bold text-white tracking-wide">{gameActivity.name}</p>
                </div>
                {gameActivity.details && (
                  <p className="line-clamp-2 text-[10px] text-zinc-400 mt-0.5 font-medium">
                    {gameActivity.details}
                  </p>
                )}
                {gameActivity.state && (
                  <p className="line-clamp-2 text-[9px] text-zinc-500">{gameActivity.state}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Spotify / Media Player with Glossy Styling */}
        {activeMusic && (
          <div className="mt-auto flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-black/40 p-3 backdrop-blur-xl shadow-lg relative overflow-hidden">
            <div className="flex items-center gap-3 relative z-10">
              <ClientImage
                candidates={coverCandidates}
                alt={activeMusic.title || ""}
                width={42}
                height={42}
                className="h-10 w-10 shrink-0 rounded-lg shadow-md border border-white/10"
                fallback={
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    <Music className="h-4 w-4" />
                  </div>
                }
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">{activeMusic.title || "—"}</p>
                <p className="truncate text-[10px] text-zinc-400 font-medium">
                  {activeMusic.artist || "—"}
                </p>
              </div>
            </div>

            {typeof activeMusic.durationMs === "number" && activeMusic.durationMs > 0 && (
              <div className="flex flex-col gap-1.5 relative z-10 pt-0.5">
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.1]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
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
            <p className="text-[10px] text-zinc-400">Aucune activité en cours.</p>
          </div>
        )}
      </div>
    </TiltCard>
  );
});

export default SocialDiscordCard;
