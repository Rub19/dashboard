"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, User } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { TiltCard } from "@/components/ui/TiltCard";
import ClientImage from "@/components/ClientImage";
import GameIcon from "@/components/icons/GameIcon";
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
    label: "Valorant",
    gradient: "from-rose-950/40 via-red-900/10 to-black/20 border-rose-500/20",
    accent: "text-[var(--danger)]",
    accentBg: "bg-rose-500",
  },
  lol: {
    label: "League of Legends",
    gradient: "from-sky-950/40 via-amber-900/10 to-black/20 border-amber-500/20",
    accent: "text-[var(--warning)]",
    accentBg: "bg-amber-500",
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
        badge: "border-[--info] bg-[--info]/10 text-[--info]",
      };
    }
    if (error && configured && !hasProfile) {
      return {
        text: i18n("error", "Erreur"),
        dot: "bg-rose-400",
        badge: "border-rose-500/30 bg-[var(--danger)]/10 text-rose-300",
      };
    }
    if (hasProfile) {
      return {
        text: i18n("connected", "Connecté"),
        dot: "bg-[--accent-primary]",
        badge: "border-[--accent-primary] bg-[--accent-primary]/10 text-[--accent-primary]",
      };
    }
    return {
      text: i18n("offline", "Hors ligne"),
      dot: "bg-[var(--text-muted)]",
      badge: "border-[var(--text-muted)]/30 bg-[var(--text-muted)]/10 text-[var(--text-muted)]",
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

      {!configured ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.04]">
            <User className="h-7 w-7 text-[var(--text-muted)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {i18n("riotNotLinked", game === "valorant" ? "Aucun compte Valorant lié" : "Aucun compte League lié")}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{i18n("riotConfigureHint", "Ajoute ton Riot ID pour voir tes stats")}</p>
          </div>
          <Link
            href="/settings?category=integrations"
            className={cn(
              "rounded-lg px-4 py-2 text-xs font-medium transition-colors hover:bg-[var(--text-primary)]/[0.05]",
              game === "valorant" ? "bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20" : "bg-[var(--warning)]/10 text-[var(--warning)] hover:bg-[var(--warning)]/20"
            )}
          >
            {i18n("configureRiot", "Configurer Riot")}
          </Link>
        </div>
      ) : loading && !hasProfile ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-2">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--text-muted)]" />
          <p className="text-xs text-[var(--text-muted)]">{i18n("loading", "Chargement")}</p>
        </div>
      ) : error && !hasProfile ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-2 text-center">
          <AlertCircle className="h-8 w-8 text-[var(--danger)]" />
          <p className="text-xs text-[var(--text-muted)]">{i18n("liveError", "Impossible de charger les stats")}</p>
        </div>
      ) : !hasProfile ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-2 text-center">
          <AlertCircle className="h-8 w-8 text-[var(--text-muted)]" />
          <p className="text-xs text-[var(--text-muted)]">{i18n("riotNoStats", "Aucune statistique trouvée pour ce Riot ID")}</p>
          <p className="max-w-[200px] text-[10px] text-[var(--text-muted)]">{i18n("riotCheckId", "Vérifie le format Nom#TAG et la clé API")}</p>
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
                <div className={cn("flex h-full w-full items-center justify-center rounded-[var(--panel-radius)] bg-[var(--text-primary)]/[0.04]", config.accent)}>
                  <GameIcon game={game} className={cn("h-8 w-8", compact ? "h-6 w-6" : "h-8 w-8")} />
                </div>
              )}
            />
          </div>

          <div className="w-full text-center">
            <h4 className={cn("truncate font-bold text-[var(--text-primary)]", compact ? "text-sm" : "text-base")} title={asStr(meta?.agentName)}>
              {asStr(meta?.agentName) || "—"}
            </h4>
            <p className="truncate text-[10px] text-[var(--text-muted)]">
              {asStr(meta?.mapName) || "—"} · {asStr(meta?.modeName) || "—"}
            </p>
            {Boolean(meta?.result) && (
              <p
                className={cn(
                  "mt-0.5 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold",
                  (meta?.result as string).toLowerCase() === "victory"
                    ? "bg-[--accent-primary]/10 text-[--accent-primary]"
                    : "bg-[var(--danger)]/10 text-[var(--danger)]"
                )}
              >
                {asStr(meta?.result)}
                {score && (
                  <span className="ml-1.5 font-mono text-[var(--text-muted)]">
                    {asNum(score.team)} - {asNum(score.opponent)}
                  </span>
                )}
              </p>
            )}
          </div>

          <div className={cn("grid w-full gap-2", compact ? "grid-cols-3" : "grid-cols-3")}>
            {mainStatKeys.map((s) => (
              <div key={s.key} className="rounded-xl border border-[var(--text-primary)]/[0.05] bg-[var(--text-primary)]/[0.02] p-1.5 text-center">
                <p className={cn("font-mono font-semibold text-[var(--text-primary)]", compact ? "text-xs" : "text-sm")}>
                  {statValue(stats, s.key)}
                </p>
                <p className="text-[9px] text-[var(--text-muted)]">{s.label}</p>
              </div>
            ))}
            <div className="rounded-xl border border-[var(--text-primary)]/[0.05] bg-[var(--text-primary)]/[0.02] p-1.5 text-center">
              <p className={cn("font-mono font-semibold text-[var(--text-primary)]", compact ? "text-xs" : "text-sm")}>{kda(stats)}</p>
              <p className="text-[9px] text-[var(--text-muted)]">KDA</p>
            </div>
            {!compact && (
              <div className="rounded-xl border border-[var(--text-primary)]/[0.05] bg-[var(--text-primary)]/[0.02] p-1.5 text-center">
                <p className="font-mono text-sm font-semibold text-[var(--text-primary)]">{winRate(matches)}%</p>
                <p className="text-[9px] text-[var(--text-muted)]">{i18n("winRate", "Winrate")}</p>
              </div>
            )}
            {!compact && game === "valorant" && (
              <div className="rounded-xl border border-[var(--text-primary)]/[0.05] bg-[var(--text-primary)]/[0.02] p-1.5 text-center">
                <p className="font-mono text-sm font-semibold text-[var(--text-primary)]">{statValue(stats, "adr")}</p>
                <p className="text-[9px] text-[var(--text-muted)]">ADR</p>
              </div>
            )}
            {!compact && game === "lol" && (
              <div className="rounded-xl border border-[var(--text-primary)]/[0.05] bg-[var(--text-primary)]/[0.02] p-1.5 text-center">
                <p className="font-mono text-sm font-semibold text-[var(--text-primary)]">{statValue(stats, "csPerMin")}</p>
                <p className="text-[9px] text-[var(--text-muted)]">CS/min</p>
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
            <p className="truncate text-[10px] text-[var(--text-muted)]">
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
  const { settings } = useSettings();
  const displayName = props.playerName || settings.liveTrackerRiotName;
  const displayTag = props.playerTag || settings.liveTrackerRiotTag;
  const configured = Boolean(displayName && displayTag);

  if (!configured) return null;

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
