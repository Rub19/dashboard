"use client";

import { useMemo, useState } from "react";
import { Music } from "lucide-react";
import type { LanyardPresence } from "@/lib/hooks/useLiveData";

type NowPlayingMeta = {
  isPlaying?: boolean;
  title?: string;
  artist?: string;
  cover?: string;
};

type SocialDiscordCardProps = {
  lanyard?: LanyardPresence | null;
  nowPlaying?: NowPlayingMeta | null;
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
      return "bg-emerald-400";
    case "idle":
      return "bg-amber-400";
    case "dnd":
      return "bg-rose-400";
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

export default function SocialDiscordCard({ lanyard, nowPlaying, className = "" }: SocialDiscordCardProps) {
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
    }
  }

  const status = lanyard?.discord_status || "offline";
  const color = statusColor(status);
  const label = statusLabel(status);
  const displayName = lanyard?.displayName || lanyard?.username || "Discord";
  const activity = lanyard?.activities?.[0];

  return (
    <div
      className={`h-auto min-h-0 rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-4 shadow-xl shadow-black/50 backdrop-blur-2xl transition-all hover:border-white/15 flex flex-col justify-between gap-3 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Social & Media</span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            status === "dnd"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
              : status === "online"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : status === "idle"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
              : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
          {label}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0">
          {errored && !src ? (
            <div className="flex h-full w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xs font-bold text-zinc-300">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
          ) : (
            <img
              src={src}
              alt={displayName}
              onError={handleError}
              className="h-full w-full rounded-xl object-cover"
            />
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-zinc-950 ${color}`}
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{displayName}</p>
          <p className="truncate text-[11px] text-zinc-400">{label}</p>
        </div>
      </div>

      {activity && (
        <div className="space-y-0.5">
          <p className="text-[10px] font-medium text-zinc-300">{activity.name}</p>
          {activity.details && (
            <p className="text-[10px] leading-snug text-zinc-400 line-clamp-2">{activity.details}</p>
          )}
          {activity.state && (
            <p className="text-[10px] leading-snug text-zinc-500 line-clamp-2">{activity.state}</p>
          )}
        </div>
      )}

      {nowPlaying?.isPlaying && (
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2">
          {nowPlaying.cover ? (
            <img
              src={nowPlaying.cover}
              alt={nowPlaying.title || ""}
              className="h-9 w-9 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Music className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">{nowPlaying.title || "—"}</p>
            <p className="truncate text-[10px] text-zinc-400">{nowPlaying.artist || "—"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
