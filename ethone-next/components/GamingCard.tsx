"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Gamepad2, User } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import type { MinecraftProfile } from "@/lib/hooks/useMinecraftLive";
import { TiltCard } from "@/components/ui/TiltCard";

type MinecraftServer = {
  players?: number;
  maxPlayers?: number;
  ping?: number;
  version?: string;
  online?: boolean;
};

type GamingMinecraft = MinecraftProfile & {
  server?: MinecraftServer;
};

function truncateId(id?: string) {
  if (!id) return "";
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

export default function GamingCard({ minecraft, className = "" }: { minecraft?: Record<string, unknown> | null; className?: string }) {
  const { settings } = useSettings();
  const i18n = useI18n();
  const profile = useMemo(() => (minecraft ?? {}) as unknown as GamingMinecraft, [minecraft]);
  const username = profile?.username || profile?.name || settings.liveMinecraftUsername;
  const uuid = profile?.uuid;
  const hasProfile = Boolean(username && uuid);

  const [avatarErrored, setAvatarErrored] = useState(false);

  const avatarUrl = useMemo(() => {
    if (avatarErrored) return null;
    if (profile?.avatarUrl) return profile.avatarUrl;
    if (profile?.uuidWithDashes) return `https://crafatar.com/avatars/${profile.uuidWithDashes}?overlay&size=128`;
    if (username) return `https://mc-heads.net/avatar/${encodeURIComponent(username)}/64`;
    return null;
  }, [profile?.avatarUrl, profile?.uuidWithDashes, username, avatarErrored]);

  const server = profile?.server;
  const isOnline = server?.online ?? hasProfile;

  const playerCount =
    server?.players !== undefined && server?.maxPlayers !== undefined ? `${server.players}/${server.maxPlayers}` : null;
  const ping = server?.ping !== undefined ? `${server.ping} ms` : null;
  const serverVersion = server?.version || null;

  return (
    <TiltCard
      className={`flex h-full min-h-0 flex-col justify-between gap-4 border border-white/[0.08] bg-zinc-950/70 p-5 shadow-xl shadow-black/50 backdrop-blur-2xl transition-all hover:border-white/15 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Gaming</span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-medium ${
            isOnline
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-zinc-500"}`} />
          {isOnline ? "En ligne" : "Hors ligne"}
        </span>
      </div>

      {hasProfile ? (
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={username}
                fill
                sizes="48px"
                unoptimized
                onError={() => setAvatarErrored(true)}
                className="object-cover [image-rendering:pixelated]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Gamepad2 className="h-5 w-5 text-zinc-400" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-bold text-white">{username}</h4>
            <p className="text-[10px] font-mono text-zinc-500">ID: {truncateId(uuid)}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <User className="h-5 w-5 text-zinc-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">{i18n("minecraftNotLinked", "Aucun compte Minecraft lié")}</p>
            <p className="text-xs text-zinc-500">{i18n("minecraftConfigureHint", "Ajoute ton pseudo pour voir ton skin")}</p>
          </div>
          <Link
            href="/settings?tab=integrations"
            className="rounded-lg bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
          >
            {i18n("configureMinecraft", "Configurer Minecraft")}
          </Link>
        </div>
      )}

      {hasProfile && server && (
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            {i18n("minecraftServer", "Serveur Minecraft")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {playerCount !== null && (
              <div className="text-center">
                <p className="font-mono text-xs font-semibold text-zinc-200">{playerCount}</p>
                <p className="text-[9px] text-zinc-500">{i18n("players", "Joueurs")}</p>
              </div>
            )}
            {ping !== null && (
              <div className="text-center">
                <p className="font-mono text-xs font-semibold text-zinc-200">{ping}</p>
                <p className="text-[9px] text-zinc-500">{i18n("ping", "Ping")}</p>
              </div>
            )}
            {serverVersion !== null && (
              <div className="text-center">
                <p className="truncate font-mono text-xs font-semibold text-zinc-200">{serverVersion}</p>
                <p className="text-[9px] text-zinc-500">{i18n("version", "Version")}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {hasProfile && (
        <div className="flex flex-wrap gap-1.5">
          {profile?.model && (
            <span className="rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-300">
              {profile.model === "slim" ? "Slim" : "Classic"}
            </span>
          )}
          {profile?.capeUrl && (
            <span className="rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-300">
              {i18n("cape", "Cape")}
            </span>
          )}
          {isOnline && (
            <span className="rounded-md border border-emerald-500/[0.15] bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
              {i18n("serverActive", "Serveur actif")}
            </span>
          )}
        </div>
      )}
    </TiltCard>
  );
}
