"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Music, Radio, RadioOff, ExternalLink } from "lucide-react";
import type { LanyardPresence, NowPlaying } from "@/lib/hooks/useLiveData";

type SocialDiscordCardProps = {
  lanyard?: LanyardPresence | null;
  nowPlaying?: NowPlaying | null;
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

export default function SocialDiscordCard({ lanyard, nowPlaying, className = "" }: SocialDiscordCardProps) {
  const router = useRouter();

  const userId = lanyard?.userId;
  const avatarHash = lanyard?.avatarHash;
  const discriminator = lanyard?.discriminator;
  const avatarUrl = lanyard?.avatarUrl;

  const primaryAvatar = useMemo(() => {
    if (avatarHash && userId) {
      const ext = avatarHash.startsWith("a_") ? "gif" : "png";
      return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=128`;
    }
    if (avatarUrl) return avatarUrl;
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
  const displayName = lanyard?.displayName || lanyard?.username || "Discord";
  const activity = lanyard?.activities?.[0];
  const hasMusic = !!nowPlaying?.isPlaying;
  const isSocialActive = status !== "offline" || !!activity;

  const progressPct =
    nowPlaying?.durationMs && nowPlaying.durationMs > 0
      ? Math.min(100, Math.max(0, ((nowPlaying.progressMs || 0) / nowPlaying.durationMs) * 100))
      : 0;

  return (
    <div
      className={`flex h-full min-h-0 flex-col justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-2xl transition-all hover:border-zinc-300/80 dark:border-white/[0.08] dark:bg-zinc-950/70 dark:shadow-xl dark:hover:border-white/15 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Social & Media</span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-medium ${statusTone(
            status
          )}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
          {label}
        </span>
      </div>

      {!isSocialActive && !hasMusic ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200/60 bg-zinc-100/80 p-4 text-center dark:border-white/[0.04] dark:bg-white/[0.02]">
          <RadioOff className="h-5 w-5 text-zinc-500" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Aucune session sociale active</p>
          <p className="text-[11px] text-zinc-500">Connectez Discord ou Spotify pour voir l&apos;activité ici.</p>
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200/60 bg-zinc-100/80 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200/80 hover:text-zinc-950 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            <ExternalLink className="h-3 w-3" />
            Connecter Spotify / Discord
          </button>
        </div>
      ) : (
        <>
          {status !== "offline" && (
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0">
                {errored && !src ? (
                  <div className="flex h-full w-full items-center justify-center rounded-xl border border-zinc-200/60 bg-zinc-100/80 text-xs font-bold text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300">
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                ) : (
                  <img src={src} alt={displayName} onError={handleError} className="h-full w-full rounded-xl object-cover" />
                )}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-950 ${color}`}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{displayName}</p>
                <p className="truncate text-[11px] text-zinc-600 dark:text-zinc-400">{label}</p>
              </div>
            </div>
          )}

          {activity && (
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">{activity.name}</p>
              {activity.details && (
                <p className="line-clamp-2 text-[10px] leading-snug text-zinc-600 dark:text-zinc-400">{activity.details}</p>
              )}
              {activity.state && (
                <p className="line-clamp-2 text-[10px] leading-snug text-zinc-500">{activity.state}</p>
              )}
            </div>
          )}
        </>
      )}

      {hasMusic && (
        <div className="mt-auto flex flex-col gap-2 rounded-xl border border-zinc-200/60 bg-zinc-100/80 p-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
          <div className="flex items-center gap-2">
            {nowPlaying?.cover ? (
              <Image
                src={nowPlaying.cover}
                alt={nowPlaying.title || ""}
                width={40}
                height={40}
                unoptimized
                className="h-10 w-10 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Music className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-zinc-900 dark:text-white">{nowPlaying?.title || "—"}</p>
              <p className="truncate text-[10px] text-zinc-600 dark:text-zinc-400">{nowPlaying?.artist || "—"}</p>
            </div>
          </div>

          {nowPlaying?.durationMs && nowPlaying.durationMs > 0 && (
            <div className="flex flex-col gap-1">
              <div className="h-1 w-full overflow-hidden rounded-xl bg-zinc-200 dark:bg-white/[0.08]">
                <div className="h-full rounded-xl bg-emerald-500 dark:bg-emerald-400" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>{formatMs(nowPlaying.progressMs)}</span>
                <span>{formatMs(nowPlaying.durationMs)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {isSocialActive && !hasMusic && !activity && (
        <div className="mt-auto flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200/60 bg-zinc-100/80 p-4 text-center dark:border-white/[0.04] dark:bg-white/[0.02]">
          <Radio className="h-5 w-5 text-zinc-500" />
          <p className="text-[11px] text-zinc-500">Aucune activité en cours.</p>
        </div>
      )}
    </div>
  );
}
