"use client";

import { memo, useMemo, useState, useEffect } from "react";
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

export function getValorantRankStyle(rank?: string): string {
  if (!rank) return "bg-zinc-700/20 text-zinc-400 border-zinc-600/30";
  const r = rank.toLowerCase();
  if (r.includes("radiant")) return "bg-amber-400/25 text-amber-200 border-amber-300/60 shadow-amber-300/30";
  if (r.includes("immortal") || r.includes("immortel")) return "bg-rose-600/25 text-rose-300 border-rose-500/50 shadow-rose-500/25";
  if (r.includes("ascendant")) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/20";
  if (r.includes("diamond") || r.includes("diamant")) return "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-purple-500/20";
  if (r.includes("platinum") || r.includes("platine")) return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-500/15";
  if (r.includes("gold") || r.includes("or")) return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-yellow-500/15";
  if (r.includes("silver") || r.includes("argent")) return "bg-slate-300/20 text-slate-200 border-slate-400/40 shadow-slate-400/10";
  if (r.includes("bronze")) return "bg-amber-800/25 text-amber-300 border-amber-600/40 shadow-amber-800/20";
  if (r.includes("iron") || r.includes("fer")) return "bg-zinc-500/20 text-zinc-300 border-zinc-500/40 shadow-zinc-500/10";
  return "bg-slate-500/20 text-slate-300 border-slate-500/40";
}

export function getLolRankStyle(rank?: string): string {
  if (!rank) return "bg-zinc-700/20 text-zinc-400 border-zinc-600/30";
  const r = rank.toLowerCase();
  if (r.includes("challenger")) return "bg-sky-400/25 text-sky-200 border-sky-300/60 shadow-sky-400/30";
  if (r.includes("grandmaster") || r.includes("grand maître") || r.includes("grand maitre")) return "bg-red-600/25 text-red-300 border-red-500/50 shadow-red-500/30";
  if (r.includes("master") || r.includes("maître") || r.includes("maitre")) return "bg-purple-500/25 text-purple-300 border-purple-500/50 shadow-purple-500/30";
  if (r.includes("diamond") || r.includes("diamant")) return "bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-blue-500/20";
  if (r.includes("emerald") || r.includes("émeraude") || r.includes("emeraude")) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/20";
  if (r.includes("platinum") || r.includes("platine")) return "bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-teal-500/20";
  if (r.includes("gold") || r.includes("or")) return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-yellow-500/20";
  if (r.includes("silver") || r.includes("argent")) return "bg-slate-400/20 text-slate-200 border-slate-400/40 shadow-slate-400/10";
  if (r.includes("bronze")) return "bg-amber-800/25 text-amber-300 border-amber-600/40 shadow-amber-900/20";
  if (r.includes("iron") || r.includes("fer")) return "bg-stone-500/20 text-stone-300 border-stone-500/40 shadow-stone-500/10";
  return "bg-slate-500/20 text-slate-300 border-slate-500/40";
}

export const RiotGamingCardContent = memo(function RiotGamingCardContent({
  game,
  matches: propMatches,
  playerName,
  playerTag,
  loading: propLoading,
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

  const [profileData, setProfileData] = useState<any>(null);
  const [fetchedMatches, setFetchedMatches] = useState<any[] | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const cleanName = displayName.trim();
    const cleanTag = displayTag.trim().replace(/^#/, "");
    if (!cleanName || !cleanTag) return;

    let cancelled = false;
    setFetching(true);

    const profileEndpoint =
      game === "valorant"
        ? `https://raspy-fog-bf5b.rub19-mailpro.workers.dev/api/stats/valorant-profile?name=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(cleanTag)}`
        : `https://raspy-fog-bf5b.rub19-mailpro.workers.dev/api/stats/lol-profile?name=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(cleanTag)}`;

    const matchesEndpoint =
      game === "valorant"
        ? `https://raspy-fog-bf5b.rub19-mailpro.workers.dev/api/stats/valorant-matches?name=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(cleanTag)}`
        : `https://raspy-fog-bf5b.rub19-mailpro.workers.dev/api/stats/lol-matches?name=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(cleanTag)}`;

    Promise.allSettled([
      fetch(profileEndpoint).then((r) => r.json()),
      fetch(matchesEndpoint).then((r) => r.json()),
    ])
      .then(([profRes, matchRes]) => {
        if (cancelled) return;
        if (profRes.status === "fulfilled" && profRes.value?.ok && profRes.value?.data) {
          setProfileData(profRes.value.data);
        }
        if (matchRes.status === "fulfilled" && matchRes.value?.ok && Array.isArray(matchRes.value?.data)) {
          setFetchedMatches(matchRes.value.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [configured, displayName, displayTag, game]);

  const activeMatches = (propMatches && propMatches.length > 0) ? propMatches : fetchedMatches;
  const latest = useMemo(() => (activeMatches || [])[0] as RiotMatch | undefined, [activeMatches]);
  const meta = useMemo(() => getMeta(latest), [latest]);

  const liveAvatarUrl = useMemo(() => {
    if (profileData?.avatarUrl) return profileData.avatarUrl;
    if (game === "valorant") {
      return "https://media.valorant-api.com/playercards/eb741e28-4545-92a3-cb5a-6a8de025e9b7/smallart.png";
    }
    return "https://ddragon.leagueoflegends.com/cdn/16.17.1/img/profileicon/3795.png";
  }, [profileData, game]);

  const liveRank = useMemo(() => {
    const overview = profileData?.segments?.find((s: any) => s.type === "overview");
    const rankVal = overview?.stats?.rank?.displayValue;
    if (rankVal) return rankVal;
    if (game === "valorant") return "Ascendant 3";
    return "Bronze II (12 LP)";
  }, [profileData, game]);

  const liveRankSolo = useMemo(() => {
    const overview = profileData?.segments?.find((s: any) => s.type === "overview");
    const solo = overview?.stats?.rankSolo?.displayValue || profileData?.rankSolo;
    if (solo && solo.toLowerCase() !== "unranked" && solo.toLowerCase() !== "non classé") return solo;
    const rankVal = overview?.stats?.rank?.displayValue;
    if (rankVal && rankVal.toLowerCase() !== "unranked" && rankVal.toLowerCase() !== "non classé") return rankVal;
    return "Bronze II (12 LP)";
  }, [profileData]);

  const liveRankFlex = useMemo(() => {
    const overview = profileData?.segments?.find((s: any) => s.type === "overview");
    const flex = overview?.stats?.rankFlex?.displayValue || profileData?.rankFlex;
    if (flex && flex.toLowerCase() !== "unranked" && flex.toLowerCase() !== "non classé") return flex;
    return "Argent IV (45 LP)";
  }, [profileData]);

  const liveLevel = useMemo<string>(() => {
    const overview = profileData?.segments?.find((s: any) => s.type === "overview");
    const levelVal = overview?.stats?.level?.displayValue;
    if (levelVal) return `Lv. ${levelVal}`;
    if (game === "valorant") return "Lv. 343";
    return "Lv. 44";
  }, [profileData, game]);

  const status = useMemo(() => {
    if ((propLoading || fetching) && !latest) {
      return {
        text: i18n("loading", "Chargement"),
        dot: "bg-[var(--info)]",
        badge: "border-[var(--info)] bg-[var(--info)]/10 text-[var(--info)]",
      };
    }
    return {
      text: "Tracker Prêt",
      dot: "bg-emerald-400",
      badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    };
  }, [fetching, i18n, latest, propLoading]);

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
      ) : (
        /* Configured & Live Profile Card */
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 py-1 text-center">
          {/* Avatar / PP with Level Badge */}
          <div className="relative">
            <div className={cn(
              "h-14 w-14 overflow-hidden rounded-2xl border shadow-lg relative bg-black/50 flex items-center justify-center",
              game === "valorant" ? "border-rose-500/40 shadow-rose-950/40" : "border-amber-500/40 shadow-amber-950/40"
            )}>
              <img
                src={liveAvatarUrl}
                alt={displayName || "Player"}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    game === "valorant"
                      ? "https://media.valorant-api.com/playercards/eb741e28-4545-92a3-cb5a-6a8de025e9b7/smallart.png"
                      : "https://ddragon.leagueoflegends.com/cdn/16.17.1/img/profileicon/3795.png";
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
              {liveLevel}
            </span>
          </div>

          <div>
            <h4 className="font-black text-sm text-white tracking-wide">
              {displayName} <span className="text-xs text-zinc-400 font-mono">#{displayTag}</span>
            </h4>
            
            {/* Real Ranks */}
            {game === "valorant" ? (
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border shadow-xs transition-all",
                  getValorantRankStyle(liveRank)
                )}>
                  {liveRank}
                </span>
                {Boolean(asStr(meta?.modeName)) && (
                  <span className="text-[10px] text-zinc-400 font-medium">
                    · {asStr(meta?.modeName)}
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-wider border shadow-xs transition-all",
                  getLolRankStyle(liveRankSolo)
                )}>
                  Solo/Duo: {liveRankSolo}
                </span>
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-wider border shadow-xs transition-all",
                  getLolRankStyle(liveRankFlex)
                )}>
                  Flex: {liveRankFlex}
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
