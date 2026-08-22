"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertCircle, Crosshair, Loader2, Swords, User } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { TiltCard } from "@/components/ui/TiltCard";
import ClientImage from "@/components/ClientImage";
import { cn } from "@/lib/utils";

type RiotMatch = Record<string, unknown>;

export type RiotGamingCardProps = {
  game: "valorant" | "lol";
  matches?: RiotMatch[] | null;
  playerName?: string | null;
  playerTag?: string | null;
  loading?: boolean;
  error?: Error | null;
  className?: string;
  compact?: boolean;
};

const GAME_CONFIG = {
  valorant: {
    icon: "crosshair",
    label: "Valorant",
    gradient: "from-rose-950/40 via-red-900/10 to-black/20 border-rose-500/20",
    accent: "text-rose-400",
    accentBg: "bg-rose-500",
    fallbackIcon: Crosshair,
  },
  lol: {
    icon: "swords",
    label: "League of Legends",
    gradient: "from-sky-950/40 via-amber-900/10 to-black/20 border-amber-500/20",
    accent: "text-amber-400",
    accentBg: "bg-amber-500",
    fallbackIcon: Swords,
  },
};

function asStr(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function asNum(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function getLatest(matches?: RiotMatch[] | null) {
  return (matches || [])[0];
}

function getMeta(match?: RiotMatch) {
  if (!match) return null;
  return (match.metadata || {}) as Record<string, unknown>;
}

function getStats(match?: RiotMatch) {
  if (!match) return null;
  const segments = (match.segments || []) as Array<Record<string, unknown>>;
  const overview = segments.find((s) => s.type === "overview");
  return ((overview?.stats || {}) as Record<string, { value?: unknown; displayValue?: string }>) || null;
}

function statValue(stats: Record<string, { value?: unknown; displayValue?: string }> | null, key: string): string {
  return stats?.[key]?.displayValue ?? asStr(stats?.[key]?.value) ?? "0";
}

function kda(stats: Record<string, { value?: unknown; displayValue?: string }> | null): string {
  const kills = asNum(stats?.kills?.value ?? stats?.kills?.displayValue);
  const deaths = asNum(stats?.deaths?.value ?? stats?.deaths?.displayValue);
  const assists = asNum(stats?.assists?.value ?? stats?.assists?.displayValue);
  const ratio = (kills + assists) / Math.max(1, deaths);
  return ratio.toFixed(2);
}

function winRate(matches?: RiotMatch[] | null, count = 5): string {
  const list = (matches || []).slice(0, count);
  if (!list.length) return "0";
  const wins = list.filter((m) => {
    const meta = getMeta(m);
    return (meta?.result as string)?.toLowerCase() === "victory";
  }).length;
  return String(Math.round((wins / list.length) * 100));
}

export function RiotGamingCardContent({
  game,
  matches,
  playerName,
  playerTag,
  loading,
  error,
  className = "",
  compact = false,
}: RiotGamingCardProps) {
  const i18n = useI18n();
  const { settings } = useSettings();
  const config = GAME_CONFIG[game];
  const IconFallback = config.fallbackIcon;

  const displayName = playerName || settings.liveTrackerRiotName;
  const displayTag = playerTag || settings.liveTrackerRiotTag;
  const configured = Boolean(displayName && displayTag);

  const latest = useMemo(() => getLatest(matches), [matches]);
  const meta = useMemo(() => getMeta(latest), [latest]);
  const stats = useMemo(() => getStats(latest), [latest]);

  const hasProfile = Boolean(latest && meta);

  const imageCandidates = useMemo(() => {
    const list: string[] = [];
    const url = asStr(meta?.agentImageUrl);
    if (url) list.push(url);
    const fallback = asStr(meta?.agentImageFallback);
    if (fallback) list.push(fallback);
    return list;
  }, [meta]);

  const score = (meta?.score as Record<string, unknown>) || null;

  const status = useMemo(() => {
    if (loading && !hasProfile) {
      return {
        text: i18n("loading", "Chargement"),
        dot: "bg-[--info]",
        badge: "border-[--info] bg-[--info] text-[--info]",
      };
    }
    if (error && configured && !hasProfile) {
      return {
        text: i18n("error", "Erreur"),
        dot: "bg-rose-400",
        badge: "border-rose-500/30 bg-rose-500/10 text-rose-300",
      };
    }
    if (hasProfile) {
      return {
        text: i18n("connected", "Connecté"),
        dot: "bg-[--accent-primary]",
        badge: "border-[--accent-primary] bg-[--accent-primary] text-[--accent-primary]",
      };
    }
    return {
      text: i18n("offline", "Hors ligne"),
      dot: "bg-zinc-500",
      badge: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
    };
  }, [configured, error, hasProfile, i18n, loading]);

  const mainStatKeys = useMemo(() => {
    if (game === "valorant") {
      return [
        { key: "kills", label: "K" },
        { key: "deaths", label: "D" },
        { key: "assists", label: "A" },
      ];
    }
    return [
      { key: "kills", label: "K" },
      { key: "deaths", label: "D" },
      { key: "assists", label: "A" },
    ];
  }, [game]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col v8-panel overflow-hidden bg-gradient-to-br p-4", config.gradient, className)}>
      <div className="flex items-center justify-between">
        <span className={cn("text-[11px] font-semibold uppercase tracking-wider", config.accent)}>
          {config.label}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-medium",
            status.badge
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
          {status.text}
        </span>
      </div>

      {!configured || (!hasProfile && !loading) ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <User className="h-7 w-7 text-zinc-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">
              {i18n("riotNotLinked", game === "valorant" ? "Aucun compte Valorant lié" : "Aucun compte League lié")}
            </p>
            <p className="text-xs text-zinc-500">{i18n("riotConfigureHint", "Ajoute ton Riot ID pour voir tes stats")}</p>
          </div>
          <Link
            href="/settings?category=integrations"
            className={cn(
              "rounded-lg px-4 py-2 text-xs font-medium transition-colors hover:bg-white/5",
              game === "valorant" ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            )}
          >
            {i18n("configureRiot", "Configurer Riot")}
          </Link>
        </div>
      ) : loading && !hasProfile ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-2">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          <p className="text-xs text-zinc-500">{i18n("loading", "Chargement")}</p>
        </div>
      ) : error && !hasProfile ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-2 text-center">
          <AlertCircle className="h-8 w-8 text-rose-400" />
          <p className="text-xs text-zinc-500">{i18n("liveError", "Impossible de charger les stats")}</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 py-1">
          <div className={cn("relative shrink-0", compact ? "h-16 w-16" : "h-20 w-20")}>
            <ClientImage
              candidates={imageCandidates}
              alt={asStr(meta?.agentName) || config.label}
              fill
              className="rounded-[var(--panel-radius)] object-cover shadow-lg"
              fallback={(
                <div className={cn("flex h-full w-full items-center justify-center rounded-[var(--panel-radius)] bg-white/[0.04]", config.accent)}>
                  <IconFallback className={cn("h-8 w-8", compact ? "h-6 w-6" : "h-8 w-8")} />
                </div>
              )}
            />
          </div>

          <div className="w-full text-center">
            <h4 className={cn("truncate font-bold text-white", compact ? "text-sm" : "text-base")} title={asStr(meta?.agentName)}>
              {asStr(meta?.agentName) || "—"}
            </h4>
            <p className="truncate text-[10px] text-zinc-400">
              {asStr(meta?.mapName) || "—"} · {asStr(meta?.modeName) || "—"}
            </p>
            {Boolean(meta?.result) && (
              <p
                className={cn(
                  "mt-0.5 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold",
                  (meta?.result as string).toLowerCase() === "victory"
                    ? "bg-[--accent-primary] text-[--accent-primary]"
                    : "bg-rose-500/10 text-rose-400"
                )}
              >
                {asStr(meta?.result)}
                {score && (
                  <span className="ml-1.5 font-mono text-zinc-400">
                    {asNum(score.team)} - {asNum(score.opponent)}
                  </span>
                )}
              </p>
            )}
          </div>

          <div className={cn("grid w-full gap-2", compact ? "grid-cols-3" : "grid-cols-3")}>
            {mainStatKeys.map((s) => (
              <div key={s.key} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-1.5 text-center">
                <p className={cn("font-mono font-semibold text-white", compact ? "text-xs" : "text-sm")}>
                  {statValue(stats, s.key)}
                </p>
                <p className="text-[9px] text-zinc-500">{s.label}</p>
              </div>
            ))}
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-1.5 text-center">
              <p className={cn("font-mono font-semibold text-white", compact ? "text-xs" : "text-sm")}>{kda(stats)}</p>
              <p className="text-[9px] text-zinc-500">KDA</p>
            </div>
            {!compact && (
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-1.5 text-center">
                <p className="font-mono text-sm font-semibold text-white">{winRate(matches)}%</p>
                <p className="text-[9px] text-zinc-500">{i18n("winRate", "Winrate")}</p>
              </div>
            )}
            {!compact && game === "valorant" && (
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-1.5 text-center">
                <p className="font-mono text-sm font-semibold text-white">{statValue(stats, "adr")}</p>
                <p className="text-[9px] text-zinc-500">ADR</p>
              </div>
            )}
            {!compact && game === "lol" && (
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-1.5 text-center">
                <p className="font-mono text-sm font-semibold text-white">{statValue(stats, "csPerMin")}</p>
                <p className="text-[9px] text-zinc-500">CS/min</p>
              </div>
            )}
          </div>

          {(matches || []).length > 1 && (
            <div className="flex w-full items-center justify-center gap-1 pt-1">
              {(matches || []).slice(0, compact ? 5 : 7).map((m, i) => {
                const r = getMeta(m)?.result as string;
                return (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full",
                      r?.toLowerCase() === "victory" ? "w-3 bg-[--accent-primary]" : "w-1.5 bg-rose-500"
                    )}
                    title={asStr(getMeta(m)?.agentName)}
                  />
                );
              })}
            </div>
          )}

          {displayName && (
            <p className="truncate text-[10px] text-zinc-500">
              {displayName}#{displayTag || "—"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function RiotGamingCard(props: RiotGamingCardProps) {
  const config = GAME_CONFIG[props.game];

  return (
    <TiltCard
      className={cn(
        "h-full min-h-0 transition-all",
        props.game === "valorant" ? "hover:border-rose-500/25" : "hover:border-amber-500/25"
      )}
    >
      <RiotGamingCardContent {...props} className={cn(config.gradient, props.className)} />
    </TiltCard>
  );
}
