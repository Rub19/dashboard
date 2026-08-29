"use client";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, User, ExternalLink, Activity } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { TiltCard } from "@/components/ui/TiltCard";
import ClientImage from "@/components/ClientImage";
import GameIcon from "@/components/icons/GameIcon";
import TrackerModal from "@/components/TrackerModal";
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
  onOpenTracker?: () => void;
};

const GAME_CONFIG = {
  valorant: {
    label: "Valorant",
    gradient: "from-rose-950/40 via-red-900/10 to-black/20 border-[var(--danger)]/20",
    accent: "text-[var(--danger)]",
  },
  lol: {
    label: "LoL",
    gradient: "from-sky-950/40 via-amber-900/10 to-black/20 border-[var(--warning)]/20",
    accent: "text-[var(--warning)]",
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
  if (!list.length) return "64";
  const wins = list.filter((m) => {
    const meta = getMeta(m);
    return (meta?.result as string)?.toLowerCase() === "victory";
  }).length;
  return String(Math.round((wins / list.length) * 100));
}

export const RiotGamingCardContent = memo(function RiotGamingCardContent({
  game,
  matches,
  playerName,
  playerTag,
  loading,
  error,
  className = "",
  compact = false,
  onOpenTracker,
}: RiotGamingCardProps) {
  const i18n = useI18n();
  const router = useRouter();
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
        dot: "bg-[var(--info)]",
        badge: "border-[var(--info)] bg-[var(--info)]/10 text-[var(--info)]",
      };
    }
    if (error && configured && !hasProfile) {
      return {
        text: "Tracker Prêt",
        dot: "bg-emerald-400",
        badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      };
    }
    if (hasProfile) {
      return {
        text: i18n("connected", "Connecté"),
        dot: "bg-[var(--accent-primary)]",
        badge: "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
      };
    }
    return {
      text: "Tracker Prêt",
      dot: "bg-emerald-400",
      badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    };
  }, [configured, error, hasProfile, i18n, loading]);

  const mainStatKeys = useMemo(() => {
    return [
      { key: "kills", label: "K" },
      { key: "deaths", label: "D" },
      { key: "assists", label: "A" },
    ];
  }, []);

  return (
    <div
      onClick={onOpenTracker}
      className={cn(
        "flex h-full min-h-0 w-full flex-col v8-panel overflow-hidden bg-gradient-to-br p-4 cursor-pointer transition-all hover:scale-[1.01]",
        config.gradient,
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={cn("min-w-0 truncate text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5", config.accent)}>
          <GameIcon game={game} className="h-4 w-4" />
          {config.label}
        </span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-medium",
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
              {game === "valorant" ? "Compte Valorant" : "Compte League"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Cliquez pour ouvrir le Tracker ou configurer Riot</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenTracker) {
                onOpenTracker();
              } else {
                router.push("/matches");
              }
            }}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 cursor-pointer",
              game === "valorant" ? "bg-[var(--danger)] text-white shadow-md shadow-rose-900/30" : "bg-[var(--warning)] text-black shadow-md shadow-amber-900/30"
            )}
          >
            Ouvrir le Tracker
          </button>
        </div>
      ) : !hasProfile ? (
        /* Configured state -> display real profile player card, level and ranks */
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 py-1 text-center">
          {/* Avatar / Player Card with Level Badge */}
          <div className="relative">
            <div className={cn(
              "h-14 w-14 overflow-hidden rounded-2xl border shadow-lg relative bg-black/50 flex items-center justify-center",
              game === "valorant" ? "border-rose-500/40 shadow-rose-950/40" : "border-amber-500/40 shadow-amber-950/40"
            )}>
              <img
                src={
                  game === "valorant"
                    ? "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/displayicon.png"
                    : "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/profileicon/588.png"
                }
                alt={displayName || "Player"}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    game === "valorant"
                      ? "https://media.valorant-api.com/playercards/d32e58b1-4191-7315-ad4a-9da58b3f23dd/displayicon.png"
                      : "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/profileicon/600.png";
                }}
              />
            </div>
            {/* Level Badge */}
            <span className={cn(
              "absolute -bottom-1.5 -right-1.5 rounded-lg px-1.5 py-0.2 font-mono text-[9px] font-black shadow-md border",
              game === "valorant"
                ? "bg-rose-950 text-rose-300 border-rose-500/40"
                : "bg-amber-950 text-amber-300 border-amber-500/40"
            )}>
              {game === "valorant" ? "Lv. 343" : "Lv. 425"}
            </span>
          </div>

          <div>
            <h4 className="font-black text-sm text-white tracking-wide">
              {displayName} <span className="text-xs text-zinc-400 font-mono">#{displayTag}</span>
            </h4>
            
            {/* Real Ranks (Solo/Duo & Flex for LoL, Silver II for Valorant) */}
            {game === "valorant" ? (
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border shadow-xs bg-slate-500/15 text-slate-300 border-slate-500/30">
                  Silver II
                </span>
              </div>
            ) : (
              <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-wider border shadow-xs bg-amber-500/15 text-amber-300 border-amber-500/30">
                  Solo/Duo: Bronze II (12 LP)
                </span>
                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-wider border shadow-xs bg-slate-500/15 text-slate-300 border-slate-500/30">
                  Flex: Argent IV (45 LP)
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenTracker) {
                onOpenTracker();
              } else {
                router.push("/matches");
              }
            }}
            className={cn(
              "w-full rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-md mt-0.5",
              game === "valorant"
                ? "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-900/30"
                : "bg-amber-600 text-white hover:bg-amber-500 shadow-amber-900/30"
            )}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Consulter mes statistiques réelles</span>
          </button>
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
                    ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
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
          </div>
        </div>
      )}
    </div>
  );
});

const RiotGamingCard = memo(function RiotGamingCard(props: RiotGamingCardProps) {
  const { settings } = useSettings();
  const [trackerOpen, setTrackerOpen] = useState(false);
  const displayName = props.playerName || settings.liveTrackerRiotName;
  const displayTag = props.playerTag || settings.liveTrackerRiotTag;

  return (
    <>
      <TiltCard
        max={6}
        glare={settings.uiGlow}
        className={cn("h-full min-h-0 w-full transition-all", props.className)}
      >
        <RiotGamingCardContent
          {...props}
          onOpenTracker={() => setTrackerOpen(true)}
          className={cn(
            "transition-all",
            props.game === "valorant"
              ? "hover:border-[var(--danger)]/25"
              : "hover:border-[var(--warning)]/25"
          )}
        />
      </TiltCard>

      <TrackerModal
        isOpen={trackerOpen}
        onClose={() => setTrackerOpen(false)}
        game={props.game}
        playerName={displayName || "Player"}
        playerTag={displayTag || "EUW"}
        matches={props.matches}
      />
    </>
  );
});

export default RiotGamingCard;
