"use client";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import {
  Gamepad2,
  Loader2,
  User,
  Copy,
  Check,
  ExternalLink,
  Download,
  Shield,
  Sparkles,
  Swords,
  Box,
} from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import type { MinecraftProfile } from "@/lib/hooks/useMinecraftLive";
import { TiltCard } from "@/components/ui/TiltCard";
import ClientImage from "@/components/ClientImage";
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
  return id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

type GamingCardProps = {
  minecraft?: Record<string, unknown> | null;
  loading?: boolean;
  error?: Error | null;
  className?: string;
};

const GamingCard = memo(function GamingCard({
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
  const uuidWithDashes = profile?.uuidWithDashes || uuid;
  const hasProfile = Boolean(username && (uuid || profile?.uuidWithDashes));
  const hasUsername = Boolean(username);
  const configured = Boolean(settings.liveMinecraftUsername);

  const [copied, setCopied] = useState(false);

  const playerName = profile?.username || profile?.name || username;

  const avatarCandidates = useMemo(() => {
    const list: string[] = [];
    if (profile?.avatarUrl) list.push(profile.avatarUrl);
    if (uuidWithDashes) {
      list.push(`https://nmsr.nickac.dev/face/${encodeURIComponent(uuidWithDashes)}`);
      list.push(`https://crafatar.com/avatars/${uuidWithDashes}?overlay&size=128`);
    }
    if (playerName) list.push(`https://mc-heads.net/avatar/${encodeURIComponent(playerName)}/128`);
    return [...new Set(list)];
  }, [profile, playerName, uuidWithDashes]);

  const bodyCandidates = useMemo(() => {
    const list: string[] = [];
    if (profile?.bodyUrl) list.push(profile.bodyUrl);
    if (uuidWithDashes) {
      list.push(`https://nmsr.nickac.dev/fullbody/${encodeURIComponent(uuidWithDashes)}`);
      list.push(`https://crafatar.com/renders/body/${uuidWithDashes}?overlay&scale=10&size=256`);
    }
    if (playerName) list.push(`https://mc-heads.net/body/${encodeURIComponent(playerName)}/200`);
    return [...new Set(list)];
  }, [profile, playerName, uuidWithDashes]);

  const capeCandidates = useMemo(() => {
    const list: string[] = [];
    if (profile?.capeUrl) list.push(profile.capeUrl);
    if (uuidWithDashes) {
      list.push(`https://crafatar.com/capes/${uuidWithDashes}`);
    }
    if (playerName) list.push(`https://mc-heads.net/cape/${encodeURIComponent(playerName)}`);
    return [...new Set(list)];
  }, [profile, playerName, uuidWithDashes]);

  const renderCandidates = useMemo(
    () => [...new Set([...bodyCandidates, ...avatarCandidates])],
    [bodyCandidates, avatarCandidates]
  );

  const server = profile?.server;

  const { statusText, statusClass, statusDot } = useMemo(() => {
    if (loading && !hasProfile) {
      return {
        statusText: i18n("loading", "Chargement"),
        statusClass: "border-sky-500/30 bg-sky-500/10 text-sky-300",
        statusDot: "bg-sky-400 animate-pulse",
      };
    }
    if (error && configured && !hasProfile) {
      return {
        statusText: i18n("error", "Erreur"),
        statusClass: "border-rose-500/30 bg-rose-500/10 text-rose-300",
        statusDot: "bg-rose-400",
      };
    }
    if (hasProfile || hasUsername) {
      return {
        statusText: i18n("online", "En ligne"),
        statusClass: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
        statusDot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
      };
    }
    return {
      statusText: i18n("offline", "Hors ligne"),
      statusClass: "border-zinc-700 bg-zinc-800/40 text-zinc-400",
      statusDot: "bg-zinc-500",
    };
  }, [configured, error, hasProfile, hasUsername, i18n, loading]);

  const handleCopyUuid = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!uuidWithDashes) return;
    await navigator.clipboard.writeText(uuidWithDashes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nameMcUrl = playerName ? `https://namemc.com/profile/${encodeURIComponent(playerName)}` : null;
  const skinDownloadUrl = uuidWithDashes
    ? `https://crafatar.com/skins/${uuidWithDashes}`
    : playerName
    ? `https://minotar.net/skin/${encodeURIComponent(playerName)}`
    : null;

  return (
    <TiltCard
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden no-scrollbar select-none rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#1b2d18]/95 via-[#131d10]/98 to-[#0a0f08]/98 p-4 shadow-xl shadow-emerald-950/40 backdrop-blur-2xl transition-all duration-300 hover:border-emerald-500/40 group",
        className
      )}
    >
      {/* Background Ambient Minecraft Glow & Pattern */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-lime-500/10 blur-3xl transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />

      {/* Header: Title + Gaming Badge + Live Status */}
      <div className="relative z-10 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-sm">
            <Box className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300/90">
              Minecraft 3D
            </span>
          </div>
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold shadow-xs",
            statusClass
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", statusDot)} />
          {statusText}
        </span>
      </div>

      {hasUsername ? (
        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-between gap-2 pt-2 overflow-hidden no-scrollbar">
          {/* Center: 3D Skin with Radial Glowing Pedestal */}
          <div className="relative flex w-full flex-1 items-center justify-center min-h-[5.5rem] py-1">
            {/* Glowing Ground Pedestal */}
            <div
              className="pointer-events-none absolute bottom-1 h-6 w-24 rounded-full bg-emerald-500/25 blur-md"
              aria-hidden="true"
            />

            <div className="relative h-28 w-28 sm:h-32 sm:w-32 transition-transform duration-300 group-hover:scale-105">
              <ClientImage
                candidates={renderCandidates}
                alt={username || playerName || ""}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.6)]"
                style={{ objectFit: "contain" }}
                fallback={(
                  <div className="flex h-full w-full items-center justify-center">
                    {loading && !hasProfile ? (
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                    ) : (
                      <Gamepad2 className="h-8 w-8 text-emerald-400" />
                    )}
                  </div>
                )}
                priority
              />
            </div>
          </div>

          {/* Player Info & Quick Badges */}
          <div className="w-full text-center space-y-1 shrink-0">
            <div className="flex items-center justify-center gap-1.5">
              <h4 className="truncate text-base font-black tracking-tight text-white drop-shadow-sm">
                {username}
              </h4>
              <span className="rounded bg-emerald-500/20 border border-emerald-500/30 px-1 py-0.2 text-[9px] font-extrabold uppercase text-emerald-300">
                Java
              </span>
            </div>

            {/* UUID with Copy */}
            {uuidWithDashes ? (
              <button
                type="button"
                onClick={handleCopyUuid}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Copier le UUID"
              >
                <span>ID: {truncateId(uuidWithDashes)}</span>
                {copied ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5 opacity-60" />}
              </button>
            ) : null}
          </div>

          {/* Feature Badges & Quick Action Links */}
          <div className="w-full flex items-center justify-center gap-2 pt-1 shrink-0">
            {/* Model Badge */}
            <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-zinc-300">
              {profile?.model === "slim" ? "Slim (Alex)" : "Classic (Steve)"}
            </span>

            {/* Cape Badge */}
            {profile?.capeUrl || capeCandidates.length > 0 ? (
              <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                <span>Cape</span>
              </span>
            ) : null}

            {/* NameMC Link */}
            {nameMcUrl && (
              <a
                href={nameMcUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1"
                title="Voir sur NameMC"
              >
                <span>NameMC</span>
                <ExternalLink className="h-2.5 w-2.5 opacity-70" />
              </a>
            )}

            {/* Skin Download */}
            {skinDownloadUrl && (
              <a
                href={skinDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/10 bg-white/5 p-1 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                title="Télécharger le Skin PNG"
              >
                <Download className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{i18n("minecraftNotLinked", "Aucun compte Minecraft lié")}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{i18n("minecraftConfigureHint", "Ajoute ton pseudo pour voir ton skin 3D")}</p>
          </div>
          <Link
            href="/connections"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition-all active:scale-95 cursor-pointer"
          >
            {i18n("configureMinecraft", "Configurer Minecraft")}
          </Link>
        </div>
      )}
    </TiltCard>
  );
});

export default GamingCard;
