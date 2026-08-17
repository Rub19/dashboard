"use client";

import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import type { MinecraftProfile } from "@/lib/hooks/useMinecraftLive";

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
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

type GamingCardProps = {
  minecraft?: Record<string, unknown> | null;
  className?: string;
};

export default function GamingCard({ minecraft, className = "" }: GamingCardProps) {
  const { settings } = useSettings();
  const i18n = useI18n();
  const profile = (minecraft ?? {}) as unknown as GamingMinecraft;
  const username = profile?.username || profile?.name || settings.liveMinecraftUsername || "—";
  const uuid = profile?.uuid || "";
  const hasProfile = Boolean(username && username !== "—");

  const server = profile?.server;
  const isOnline = server?.online ?? hasProfile;

  const [avatarSrc, setAvatarSrc] = useState(
    `https://mc-heads.net/avatar/${encodeURIComponent(username || "Rub19")}/64`
  );
  const [errored, setErrored] = useState(false);

  function handleError() {
    if (!errored) {
      setErrored(true);
      setAvatarSrc(`https://minotar.net/avatar/${encodeURIComponent(username || "char")}/64`);
    } else {
      setAvatarSrc("");
    }
  }

  const playerCount =
    server?.players !== undefined && server?.maxPlayers !== undefined
      ? `${server.players}/${server.maxPlayers}`
      : "—";
  const ping = server?.ping !== undefined ? `${server.ping} ms` : "—";
  const version = server?.version || "—";

  return (
    <div
      className={`flex h-full min-h-0 flex-col justify-between gap-4 rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 shadow-xl shadow-black/50 backdrop-blur-2xl transition-all hover:border-white/15 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Gaming</span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            isOnline
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-zinc-500"}`} />
          {isOnline ? "En ligne" : "Hors ligne"}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
          {errored && !avatarSrc ? (
            <Gamepad2 className="h-5 w-5 text-zinc-400" />
          ) : (
            <img
              src={avatarSrc}
              alt={username}
              onError={handleError}
              className="h-full w-full object-cover [image-rendering:pixelated]"
            />
          )}
        </div>
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold text-white">{username}</h4>
          <p className="text-[10px] font-mono text-zinc-500">
            {uuid ? `ID: ${truncateId(uuid)}` : i18n("notConnected")}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Serveur Minecraft
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="font-mono text-xs font-semibold text-zinc-200">{playerCount}</p>
            <p className="text-[9px] text-zinc-500">Joueurs</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-xs font-semibold text-zinc-200">{ping}</p>
            <p className="text-[9px] text-zinc-500">Ping</p>
          </div>
          <div className="text-center">
            <p className="truncate font-mono text-xs font-semibold text-zinc-200">{version}</p>
            <p className="text-[9px] text-zinc-500">Version</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {profile?.model && (
          <span className="rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-300">
            {profile.model === "slim" ? "Slim" : "Classic"}
          </span>
        )}
        {profile?.capeUrl && (
          <span className="rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-300">
            Cape
          </span>
        )}
        {isOnline && (
          <span className="rounded-md border border-emerald-500/[0.15] bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
            Serveur actif
          </span>
        )}
      </div>
    </div>
  );
}
