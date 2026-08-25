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
      return "bg-[var(--accent-primary)]";
    case "idle":
      return "bg-[var(--warning)]";
    case "dnd":
      return "bg-[var(--danger)]";
    default:
      return "bg-[var(--text-muted)]";
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
      return "border-[var(--danger)]/20 bg-[var(--danger)]/15 text-[var(--danger)] dark:border-[var(--danger)]/30 dark:bg-[var(--danger)]/10 dark:text-[var(--danger)]";
    case "online":
      return "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] dark:border-[var(--accent-primary)] dark:bg-[var(--accent-primary)] dark:text-[var(--accent-primary)]";
    case "idle":
      return "border-[var(--warning)]/20 bg-[var(--warning)]/15 text-[var(--warning)] dark:border-[var(--warning)]/30 dark:bg-[var(--warning)]/10 dark:text-[var(--warning)]";
    default:
      return "border-[var(--text-muted)]/20 bg-[var(--text-muted)]/10 text-[var(--text-primary)] dark:border-[var(--text-muted)]/30 dark:bg-[var(--text-muted)]/10 dark:text-[var(--text-muted)]";
  }
}

function formatMs(ms?: number): string {
  if (typeof ms !== "number" || ms < 0) return "0:00";
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
  const displayName = lanyard?.displayName || lanyard?.username || oauthProfile?.user?.displayName || oauthProfile?.user?.username || "Discord";

  const primaryAvatar = useMemo(() => {
    if (avatarUrl) return avatarUrl;
    if (avatarHash && userId) {
      const ext = avatarHash.startsWith("a_") ? "gif" : "png";
      return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=256`;
    }
    return "";
  }, [avatarHash, userId, avatarUrl]);

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
        badgeColor: "bg-[var(--info)]",
        badgeLabel: i18n("loading", "Chargement"),
        badgeTone: "border-[var(--info)] bg-[var(--info)]/10 text-[var(--info)]",
      };
    }
    if (error && hasAnyConnection && !hasLanyard) {
      return {
        badgeColor: "bg-[var(--danger)]",
        badgeLabel: i18n("error", "Erreur"),
        badgeTone: "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]",
      };
    }
    if (hasLanyard) {
      return { badgeColor: color, badgeLabel: label, badgeTone: statusTone(status) };
    }
    if (hasAnyConnection) {
      return {
        badgeColor: "bg-[var(--accent-primary)]",
        badgeLabel: i18n("connected", "Connecté"),
        badgeTone: "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
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
        "relative flex h-full min-h-0 flex-col v8-panel overflow-hidden bg-gradient-to-br from-indigo-950/40 via-purple-900/10 to-black/20 p-4 shadow-xl shadow-black/50 backdrop-blur-2xl transition-all hover:border-indigo-500/25",
        className
      )}
    >
      {activeMusic?.cover && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <ClientImage
            candidates={[activeMusic.cover]}
            alt=""
            fill
            className="!z-0 object-cover opacity-20 blur-sm"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
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
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-[var(--text-primary)]/[0.05] bg-[var(--text-primary)]/[0.02] p-4 text-center">
          {loading && hasAnyConnection ? (
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
          ) : error && hasAnyConnection ? (
            <AlertCircle className="h-6 w-6 text-[var(--danger)]" />
          ) : (
            <RadioOff className="h-6 w-6 text-[var(--text-muted)]" />
          )}
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {hasAnyConnection
              ? i18n("socialStandby", "Connecté — en attente d'activité")
              : i18n("socialNoSession", "Aucune session sociale active")}
          </p>
          {!hasAnyConnection ? (
            <button
              type="button"
              onClick={handleConnectIntegrations}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--text-primary)]/[0.08] active:scale-95"
            >
              <ExternalLink className="h-3 w-3" />
              {i18n("connectSpotifyDiscord", "Connecter Spotify / Discord")}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnectIntegrations}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-all hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)] active:scale-95"
            >
              <ExternalLink className="h-3 w-3" />
              {i18n("manageIntegrations", "Gérer les connexions")}
            </button>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-hidden">
          {(hasLanyard || hasOAuth) && (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="relative h-16 w-16 shrink-0">
                <ClientImage
                  candidates={[primaryAvatar]}
                  alt={displayName}
                  fill
                  className="rounded-2xl border border-white/10"
                  priority
                  fallback={
                    <div className="flex h-full w-full items-center justify-center rounded-2xl border border-white/10 bg-[var(--text-primary)]/[0.04] text-lg font-bold text-[var(--text-primary)]">
                      {displayName.slice(0, 2).toUpperCase()}
                    </div>
                  }
                />
                <span
                  className={cn(
                    "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-[3px] border-[var(--background)]",
                    color
                  )}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-[var(--text-primary)]">{displayName}</p>
                {handle && (
                  <p className="truncate text-[11px] text-[var(--text-muted)]">{handle}</p>
                )}
                <p className="truncate text-[10px] text-[var(--text-muted)]">{label}</p>
              </div>
            </div>
          )}

          {customStatus && (
            <p className="max-w-full truncate rounded-lg bg-[var(--text-primary)]/[0.04] px-3 py-1 text-[11px] text-[var(--text-primary)]">
              {customStatus}
            </p>
          )}

          {gameActivity && (
            <div className="w-full shrink-0 rounded-xl border border-[var(--text-primary)]/[0.05] bg-[var(--text-primary)]/[0.02] p-2 text-center">
              <div className="flex items-center justify-center gap-1.5">
                {gameActivity.name === "VALORANT" ? (
                  <Icon pack="brand" name="valorant" className="h-4 w-4 text-[var(--danger)]" />
                ) : (
                  <Icon pack="lucide" name="gamepad-2" className="h-4 w-4 text-[var(--text-muted)]" />
                )}
                <p className="text-[11px] font-semibold text-[var(--text-primary)]">{gameActivity.name}</p>
              </div>
              {gameActivity.details && (
                <p className="line-clamp-2 text-[10px] text-[var(--text-muted)]">{gameActivity.details}</p>
              )}
              {gameActivity.state && (
                <p className="line-clamp-2 text-[9px] text-[var(--text-muted)]">{gameActivity.state}</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeMusic && (
        <div className="mt-auto flex flex-col gap-2 rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.03] p-3">
          <div className="flex items-center gap-3">
            <ClientImage
              candidates={coverCandidates}
              alt={activeMusic.title || ""}
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-lg"
              fallback={
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                  <Music className="h-4 w-4" />
                </div>
              }
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{activeMusic.title || "—"}</p>
              <p className="truncate text-[10px] text-[var(--text-muted)]">{activeMusic.artist || "—"}</p>
            </div>
          </div>

          {activeMusic.durationMs && activeMusic.durationMs > 0 && (
            <div className="flex flex-col gap-1">
              <div className="h-1 w-full overflow-hidden rounded-xl bg-[var(--text-primary)]/[0.08]">
                <div className="h-full rounded-xl bg-[var(--accent-primary)]" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                <span>{formatMs(activeMusic.progressMs)}</span>
                <span>{formatMs(activeMusic.durationMs)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {(hasLanyard || hasOAuth) && !customStatus && !gameActivity && !activeMusic && (
        <div className="mt-auto flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--text-primary)]/[0.05] bg-[var(--text-primary)]/[0.02] p-3 text-center">
          <Radio className="h-4 w-4 text-[var(--text-muted)]" />
          <p className="text-[10px] text-[var(--text-muted)]">Aucune activité en cours.</p>
        </div>
      )}
    </TiltCard>
  );
});

export default SocialDiscordCard;
