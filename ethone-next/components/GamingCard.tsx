"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Gamepad2, Loader2, User } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import type { MinecraftProfile } from "@/lib/hooks/useMinecraftLive";
import { TiltCard } from "@/components/ui/TiltCard";
import { useClientImage } from "@/components/ClientImage";
import { cn } from "@/lib/utils";

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

type GamingCardProps = {
  minecraft?: Record<string, unknown> | null;
  loading?: boolean;
  error?: Error | null;
  className?: string;
};

export default function GamingCard({
  minecraft,
  loading,
  error,
  className = "",
}: GamingCardProps) {
  const { settings } = useSettings();
  const i18n = useI18n();
  const profile = useMemo(() => (minecraft ?? {}) as unknown as GamingMinecraft, [minecraft]);
  const username = profile?.username || profile?.name || settings.liveMinecraftUsername;
  const uuid = profile?.uuid;
  const uuidWithDashes = profile?.uuidWithDashes;
  const hasProfile = Boolean(username && (uuid || profile?.uuidWithDashes));
  const hasUsername = Boolean(username);
  const configured = Boolean(settings.liveMinecraftUsername);

  const playerName = profile?.username || profile?.name || username;

  const avatarCandidates = useMemo(() => {
    const list: string[] = [];
    if (profile?.avatarUrl) list.push(profile.avatarUrl);
    if (profile?.uuidWithDashes) {
      list.push(`https://nmsr.nickac.dev/face/${encodeURIComponent(profile.uuidWithDashes)}?width=128&height=128`);
      list.push(`https://crafatar.com/avatars/${profile.uuidWithDashes}?overlay&size=128`);
    }
    if (playerName) list.push(`https://mc-heads.net/avatar/${encodeURIComponent(playerName)}/128`);
    return [...new Set(list)];
  }, [profile, playerName]);

  const bodyCandidates = useMemo(() => {
    const list: string[] = [];
    if (profile?.bodyUrl) list.push(profile.bodyUrl);
    if (profile?.uuidWithDashes) {
      list.push(`https://nmsr.nickac.dev/fullbody/${encodeURIComponent(profile.uuidWithDashes)}?width=256&height=256`);
      list.push(`https://crafatar.com/renders/body/${profile.uuidWithDashes}?overlay&scale=10&size=256`);
    }
    if (playerName) list.push(`https://mc-heads.net/body/${encodeURIComponent(playerName)}/200`);
    return [...new Set(list)];
  }, [profile, playerName]);

  const renderCandidates = useMemo(
    () => [...new Set([...bodyCandidates, ...avatarCandidates])],
    [bodyCandidates, avatarCandidates]
  );

  const bodySet = useMemo(() => new Set(bodyCandidates), [bodyCandidates]);

  const { src: renderSrc, loading: imageLoading } = useClientImage(renderCandidates);
  const isBody = renderSrc ? bodySet.has(renderSrc) : true;

  const server = profile?.server;
  const isOnline = server?.online ?? hasProfile;

  const { statusText, statusClass, statusDot } = useMemo(() => {
    if (loading && !hasProfile) {
      return {
        statusText: i18n("loading", "Chargement"),
        statusClass: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
        statusDot: "bg-cyan-400",
      };
    }
    if (error && configured && !hasProfile) {
      return {
        statusText: i18n("error", "Erreur"),
        statusClass: "border-rose-500/30 bg-rose-500/10 text-rose-300",
        statusDot: "bg-rose-400",
      };
    }
    if (hasProfile) {
      return {
        statusText: isOnline ? i18n("online", "En ligne") : i18n("offline", "Hors ligne"),
        statusClass: isOnline
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
        statusDot: isOnline ? "bg-emerald-400" : "bg-zinc-500",
      };
    }
    if (configured) {
      return {
        statusText: i18n("offline", "Hors ligne"),
        statusClass: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
        statusDot: "bg-zinc-500",
      };
    }
    return {
      statusText: i18n("offline", "Hors ligne"),
      statusClass: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
      statusDot: "bg-zinc-500",
    };
  }, [configured, error, hasProfile, isOnline, i18n, loading]);

  const playerCount =
    server?.players !== undefined && server?.maxPlayers !== undefined ? `${server.players}/${server.maxPlayers}` : null;
  const ping = server?.ping !== undefined ? `${server.ping} ms` : null;
  const serverVersion = server?.version || null;

  return (
    <TiltCard
      className={cn(
        "flex h-full min-h-0 flex-col v8-panel p-4 shadow-xl shadow-black/50 backdrop-blur-2xl transition-all hover:border-white/15",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Gaming</span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-medium",
            statusClass
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", statusDot)} />
          {statusText}
        </span>
      </div>

      {hasUsername ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-2">
          <div className="relative w-full flex-1 min-h-[5rem]">
            {renderSrc ? (
              <Image
                key={renderSrc}
                src={renderSrc}
                alt={username || playerName || ""}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                unoptimized
                className={cn(
                  "object-contain drop-shadow-2xl",
                  isBody ? "" : "[image-rendering:pixelated]"
                )}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                {imageLoading && !hasProfile ? (
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                ) : error && configured && !hasProfile ? (
                  <AlertCircle className="h-8 w-8 text-rose-400" />
                ) : (
                  <Gamepad2 className="h-8 w-8 text-zinc-400" />
                )}
              </div>
            )}
          </div>

          <div className="w-full text-center">
            <h4 className="truncate text-lg font-bold text-white">{username}</h4>
            {hasProfile && (
              <p className="text-[10px] font-mono text-zinc-500">ID: {truncateId(uuid || uuidWithDashes)}</p>
            )}
          </div>

          {hasProfile && server && (
            <div className="w-full rounded-xl border border-white/[0.05] bg-white/[0.02] p-2">
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
            <div className="flex flex-wrap justify-center gap-1.5">
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
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <User className="h-7 w-7 text-zinc-400" />
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
    </TiltCard>
  );
}
