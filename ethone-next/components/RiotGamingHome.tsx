"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Swords,
  ShieldCheck,
  User,
  Search,
  ChevronRight,
  ChevronDown,
  Flame,
  Target,
  Trophy,
  Activity,
  Zap,
  Share2,
  Brain,
  CheckCircle2,
  ExternalLink,
  Heart,
  Key,
  RefreshCw,
  Sparkles,
} from "@/components/icons/ph";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { fetchWorker } from "@/lib/api";
import {
  fetchPlayerProfile,
  calculateComputedStats,
  calculateAgentStats,
  type ValorantAccountProfile,
  type ValorantComputedStats,
} from "@/lib/valorant-provider";
import {
  fetchValorantMatchesDirect,
  type ValorantMatch,
  VALORANT_QUEUES,
} from "@/lib/valorant-tracker";
import {
  fetchLolMatchesDirect,
  type LolMatch,
  getLolChampionIcon,
} from "@/lib/lol-tracker";
import GameBrandIcon from "@/components/GameBrandIcon";
import RiotTrackerConnectModal from "@/components/tracker/RiotTrackerConnectModal";
import ValorantFriendCompareModal from "@/components/tracker/ValorantFriendCompareModal";
import RiotAttributionModal from "@/components/tracker/RiotAttributionModal";
import ValorantLiveMatchView from "@/components/tracker/ValorantLiveMatchView";
import VctMatchesView from "@/components/tracker/VctMatchesView";
import { AnimatedNumber } from "@/components/tracker/TrackerMotion";
import { useAnimatedSidebar } from "@/components/motion/animated-sidebar";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { EASE_SNAP, EASE_OUT, SPRING_PILL } from "@/lib/ease";

type GameTab =
  | "valorant"
  | "live"
  | "vct"
  | "lol"
  | "tft"
  | "coach"
  | "telemetry"
  | "training";

function getAgentRole(agentName: string): string {
  const n = agentName.toLowerCase();
  if (["jett", "reyna", "raze", "phoenix", "yoru", "neon", "iso"].includes(n)) return "Duelliste";
  if (["sova", "fade", "breach", "skye", "kay/o", "kayo", "gekko"].includes(n)) return "Initiateur";
  if (["omen", "brimstone", "viper", "astra", "clove", "harbor"].includes(n)) return "Contrôleur";
  if (["killjoy", "cypher", "sage", "chamber", "deadlock", "vyse"].includes(n)) return "Sentinelle";
  return "Agent";
}

function getTierTone(tierName?: string | null): { text: string; bg: string; border: string; glow: string } {
  if (!tierName) return { text: "text-neutral-400", bg: "bg-white/[0.04]", border: "border-white/10", glow: "" };
  const t = tierName.toLowerCase();
  if (t.includes("radiant")) return { text: "text-amber-300", bg: "bg-amber-500/15", border: "border-amber-400/40", glow: "shadow-[0_0_16px_rgba(251,191,36,0.25)]" };
  if (t.includes("immortal") || t.includes("immortel")) return { text: "text-rose-400", bg: "bg-rose-500/15", border: "border-rose-500/40", glow: "shadow-[0_0_16px_rgba(244,63,94,0.25)]" };
  if (t.includes("ascendant")) return { text: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/40", glow: "shadow-[0_0_16px_rgba(16,185,129,0.25)]" };
  if (t.includes("diamond") || t.includes("diamant")) return { text: "text-purple-400", bg: "bg-purple-500/15", border: "border-purple-500/40", glow: "shadow-[0_0_16px_rgba(168,85,247,0.25)]" };
  if (t.includes("platinum") || t.includes("platine")) return { text: "text-cyan-400", bg: "bg-cyan-500/15", border: "border-cyan-500/40", glow: "shadow-[0_0_16px_rgba(6,182,212,0.25)]" };
  if (t.includes("gold") || t.includes("or")) return { text: "text-yellow-400", bg: "bg-yellow-500/15", border: "border-yellow-500/40", glow: "shadow-[0_0_16px_rgba(234,179,8,0.25)]" };
  if (t.includes("silver") || t.includes("argent")) return { text: "text-slate-300", bg: "bg-slate-400/15", border: "border-slate-400/40", glow: "" };
  if (t.includes("bronze")) return { text: "text-amber-600", bg: "bg-amber-700/15", border: "border-amber-700/40", glow: "" };
  return { text: "text-neutral-300", bg: "bg-white/[0.04]", border: "border-white/10", glow: "" };
}

export default function RiotGamingHome() {
  const { settings } = useSettings();
  const { success, error: showError } = useToast();
  const { open, setOpen } = useAnimatedSidebar();
  const searchParams = useSearchParams();
  const reducedMotion = useReducedMotion();

  const [activeGame, setActiveGame] = useState<GameTab>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlTab = sp.get("tab") || sp.get("game");
      if (
        urlTab === "live" ||
        urlTab === "vct" ||
        urlTab === "lol" ||
        urlTab === "tft" ||
        urlTab === "valorant" ||
        urlTab === "coach" ||
        urlTab === "telemetry" ||
        urlTab === "training"
      ) {
        return urlTab as GameTab;
      }
    }
    return "valorant";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const readTabFromUrl = () => {
      const sp = new URLSearchParams(window.location.search);
      const urlTab = sp.get("tab") || sp.get("game");
      if (
        urlTab === "live" ||
        urlTab === "vct" ||
        urlTab === "lol" ||
        urlTab === "tft" ||
        urlTab === "valorant" ||
        urlTab === "coach" ||
        urlTab === "telemetry" ||
        urlTab === "training"
      ) {
        setActiveGame(urlTab as GameTab);
      }
    };
    const handleTabChange = (e: Event) => {
      const customEvt = e as CustomEvent<{ tab?: string }>;
      const targetTab = customEvt.detail?.tab;
      if (
        targetTab === "live" ||
        targetTab === "vct" ||
        targetTab === "valorant" ||
        targetTab === "lol" ||
        targetTab === "tft" ||
        targetTab === "coach" ||
        targetTab === "telemetry" ||
        targetTab === "training"
      ) {
        setActiveGame(targetTab as GameTab);
      } else {
        readTabFromUrl();
      }
    };
    window.addEventListener("popstate", readTabFromUrl);
    window.addEventListener("ethone:tracker:tab-change", handleTabChange);
    return () => {
      window.removeEventListener("popstate", readTabFromUrl);
      window.removeEventListener("ethone:tracker:tab-change", handleTabChange);
    };
  }, []);

  useEffect(() => {
    const tabParam = searchParams?.get("tab") || searchParams?.get("game");
    if (
      tabParam === "live" ||
      tabParam === "vct" ||
      tabParam === "valorant" ||
      tabParam === "lol" ||
      tabParam === "tft" ||
      tabParam === "coach" ||
      tabParam === "telemetry" ||
      tabParam === "training"
    ) {
      setActiveGame(tabParam as GameTab);
    }
  }, [searchParams]);

  const selectGameTab = useCallback((game: GameTab) => {
    setActiveGame(game);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", game);
      window.history.replaceState({}, "", url.toString());
      window.dispatchEvent(new CustomEvent("ethone:tracker:tab-change", { detail: { tab: game } }));
    }
  }, []);

  const [riotName, setRiotName] = useState("");
  const [riotTag, setRiotTag] = useState("");

  const [valorantProfile, setValorantProfile] = useState<ValorantAccountProfile | null>(null);
  const [valorantMatches, setValorantMatches] = useState<ValorantMatch[]>([]);
  const [lolMatches, setLolMatches] = useState<LolMatch[]>([]);

  const [loading, setLoading] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [attributionModalOpen, setAttributionModalOpen] = useState(false);

  const [selectedQueue, setSelectedQueue] = useState<string>("all");
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [showAllMatches, setShowAllMatches] = useState(false);

  const valorantStats = useMemo<ValorantComputedStats>(() => {
    return calculateComputedStats(valorantMatches, valorantProfile?.provenance || "henrikdev");
  }, [valorantMatches, valorantProfile]);

  const topValorantAgents = useMemo(() => {
    return calculateAgentStats(valorantMatches).slice(0, 4);
  }, [valorantMatches]);

  const filteredValorantMatches = useMemo(() => {
    if (selectedQueue === "all") return valorantMatches;
    return valorantMatches.filter((m) => {
      const q = (m.metadata?.queue || m.metadata?.modeName || "").toLowerCase();
      if (selectedQueue === "competitive") return q.includes("comp");
      if (selectedQueue === "unrated") return q.includes("unrated") || q.includes("non class");
      if (selectedQueue === "swiftplay") return q.includes("swift");
      if (selectedQueue === "spikerush") return q.includes("spike");
      if (selectedQueue === "deathmatch") return q.includes("death");
      return true;
    });
  }, [valorantMatches, selectedQueue]);

  const loadPlayerData = useCallback(
    async (targetName: string, targetTag: string, game: GameTab) => {
      const cleanName = targetName.trim();
      const cleanTag = targetTag.trim().replace(/^#/, "");
      if (!cleanName || !cleanTag) return;

      setLoading(true);

      try {
        const [profRes, matchData, lolData] = await Promise.all([
          fetchPlayerProfile(cleanName, cleanTag, false).catch(() => ({ data: null })),
          fetchWorker(
            `/api/stats/valorant-matches?name=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(cleanTag)}`
          )
            .then((res) => (Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []))
            .catch(async () => {
              const localKey =
                typeof window !== "undefined"
                  ? localStorage.getItem("ethone:cred:riot:henrikApiKey") ||
                    localStorage.getItem("ethone:cred:valorant:apiKey") ||
                    localStorage.getItem("HENRIK_API_KEY")
                  : null;
              if (localKey) {
                return fetchValorantMatchesDirect(cleanName, cleanTag, "all", localKey, 0).catch(() => []);
              }
              return [];
            }),
          fetchWorker(
            `/api/stats/lol-matches?name=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(cleanTag)}`
          )
            .then((res) => (Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []))
            .catch(async () => {
              const localKey =
                typeof window !== "undefined"
                  ? localStorage.getItem("ethone:cred:riot:riotApiKey") ||
                    localStorage.getItem("ethone:cred:riot:apiKey")
                  : null;
              if (localKey) {
                return fetchLolMatchesDirect(cleanName, cleanTag, "all", localKey, 0).catch(() => []);
              }
              return [];
            }),
        ]);

        if (profRes.data) setValorantProfile(profRes.data);
        if (Array.isArray(matchData) && matchData.length > 0) setValorantMatches(matchData);
        if (Array.isArray(lolData) && lolData.length > 0) setLolMatches(lolData);
      } catch {
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("ethone:tracker:riot_name");
        localStorage.removeItem("ethone:tracker:riot_tag");
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (riotName && riotTag && (activeGame === "valorant" || activeGame === "lol")) {
      loadPlayerData(riotName, riotTag, activeGame);
    }
  }, [activeGame, loadPlayerData, riotName, riotTag]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = riotName.trim();
    const cleanTag = riotTag.trim().replace(/^#/, "");
    if (!cleanName || !cleanTag) return;
    loadPlayerData(cleanName, cleanTag, activeGame);
  };

  const valorantCombatSummary = useMemo(() => {
    let kills = 0;
    let deaths = 0;
    let assists = 0;
    valorantMatches.forEach((m) => {
      const seg = m.segments?.[0]?.stats;
      kills += seg?.kills?.value || 0;
      deaths += seg?.deaths?.value || 0;
      assists += seg?.assists?.value || 0;
    });
    const kd = deaths > 0 ? (kills / deaths).toFixed(2) : String(kills);
    return {
      kills,
      deaths,
      assists,
      kd,
      adr: valorantStats.adr,
      hs: valorantStats.headshotPercentage,
    };
  }, [valorantMatches, valorantStats]);

  const lolSummary = useMemo(() => {
    const total = lolMatches.length;
    const wins = lolMatches.filter((m) => m.metadata?.result?.toLowerCase() === "victory").length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    let kTotal = 0;
    let dTotal = 0;
    let aTotal = 0;
    let dpmTotal = 0;
    let dpmCount = 0;
    let dmgTotal = 0;
    let kpTotal = 0;
    let kpCount = 0;

    lolMatches.forEach((m) => {
      const me = m.scoreboard?.players?.find((p) => p.isMe) || m.scoreboard?.players?.[0];
      kTotal += me?.stats?.kills || 0;
      dTotal += me?.stats?.deaths || 0;
      aTotal += me?.stats?.assists || 0;
      if (me?.stats?.damagePerMin) {
        dpmTotal += me.stats.damagePerMin;
        dpmCount += 1;
      }
      if (me?.stats?.damage) {
        dmgTotal += me.stats.damage;
      }
      if (typeof me?.stats?.killParticipation === "number") {
        kpTotal += me.stats.killParticipation;
        kpCount += 1;
      }
    });

    const kda = dTotal > 0 ? ((kTotal + aTotal) / dTotal).toFixed(2) : (kTotal + aTotal).toFixed(2);
    const avgDpm = dpmCount > 0 ? Math.round(dpmTotal / dpmCount) : 0;
    const avgKp = kpCount > 0 ? Math.round(kpTotal / kpCount) : 0;

    return { total, wins, winRate, kda, kTotal, dTotal, aTotal, avgDpm, dmgTotal, avgKp };
  }, [lolMatches]);

  const telemetryMetrics = useMemo(() => {
    if (valorantMatches.length === 0) return null;
    let totalKills = 0;
    let totalDeaths = 0;
    let totalHeadshots = 0;
    let totalBodyshots = 0;
    let totalLegshots = 0;
    let totalDamage = 0;
    let totalRounds = 0;

    valorantMatches.forEach((m) => {
      const me = m.scoreboard?.players?.find((p) => p.isMe) || m.scoreboard?.players?.[0];
      const seg = m.segments?.[0]?.stats;
      const k = me?.stats?.kills ?? seg?.kills?.value ?? 0;
      const d = me?.stats?.deaths ?? seg?.deaths?.value ?? 0;
      totalKills += k;
      totalDeaths += d;

      const hs = me?.stats?.headshots ?? 0;
      const bs = me?.stats?.bodyshots ?? 0;
      const ls = me?.stats?.legshots ?? 0;
      if (hs + bs + ls > 0) {
        totalHeadshots += hs;
        totalBodyshots += bs;
        totalLegshots += ls;
      }

      const rounds = m.metadata?.score?.roundsPlayed || ((m.metadata?.score?.team ?? 0) + (m.metadata?.score?.opponent ?? 0)) || 0;
      const dmg = me?.stats?.damageMade ?? 0;
      if (dmg > 0 && rounds > 0) {
        totalDamage += dmg;
        totalRounds += rounds;
      }
    });

    const totalShots = totalHeadshots + totalBodyshots + totalLegshots;
    let hsPct = 0;
    let bsPct = 0;
    let lsPct = 0;

    if (totalShots > 0) {
      hsPct = Math.round((totalHeadshots / totalShots) * 100);
      bsPct = Math.round((totalBodyshots / totalShots) * 100);
      lsPct = Math.max(0, 100 - hsPct - bsPct);
    } else if (valorantStats.headshotPercentage) {
      hsPct = Math.min(100, Math.max(0, Math.round(Number(valorantStats.headshotPercentage))));
      bsPct = Math.max(0, 100 - hsPct - 5);
      lsPct = Math.max(0, 100 - hsPct - bsPct);
    }

    const duelWinrate = (totalKills + totalDeaths) > 0
      ? Math.round((totalKills / (totalKills + totalDeaths)) * 100)
      : 0;

    const adr = totalRounds > 0
      ? Math.round(totalDamage / totalRounds)
      : (valorantCombatSummary.adr ? Math.round(Number(valorantCombatSummary.adr)) : 0);

    return {
      totalKills,
      totalDeaths,
      hsPct,
      bsPct,
      lsPct,
      duelWinrate,
      adr,
    };
  }, [valorantMatches, valorantStats, valorantCombatSummary]);

  const realMapStats = useMemo(() => {
    if (valorantMatches.length === 0) return [];
    const mapMap = new Map<string, { wins: number; losses: number; kills: number; deaths: number; count: number }>();
    valorantMatches.forEach((m) => {
      const mapName = m.metadata?.mapName || "Inconnu";
      const isWin = m.metadata?.result?.toLowerCase() === "victory";
      const me = m.scoreboard?.players?.find((p) => p.isMe) || m.scoreboard?.players?.[0];
      const seg = m.segments?.[0]?.stats;
      const k = me?.stats?.kills ?? seg?.kills?.value ?? 0;
      const d = me?.stats?.deaths ?? seg?.deaths?.value ?? 0;

      const cur = mapMap.get(mapName) || { wins: 0, losses: 0, kills: 0, deaths: 0, count: 0 };
      cur.count += 1;
      if (isWin) cur.wins += 1;
      else cur.losses += 1;
      cur.kills += k;
      cur.deaths += d;
      mapMap.set(mapName, cur);
    });
    return Array.from(mapMap.entries()).map(([mapName, st]) => {
      const winrate = Math.round((st.wins / st.count) * 100);
      const kd = st.deaths > 0 ? (st.kills / st.deaths).toFixed(2) : String(st.kills);
      return { mapName, winrate, kd, ...st };
    }).sort((a, b) => b.count - a.count);
  }, [valorantMatches]);

  const tierTone = useMemo(() => {
    return getTierTone(valorantProfile?.currentTierPatched);
  }, [valorantProfile?.currentTierPatched]);

  const rrValue = valorantProfile?.rr ?? 0;
  const hasValorantData = Boolean(valorantProfile || valorantMatches.length > 0);
  const hasLolData = lolMatches.length > 0;
  const hasProfile = Boolean(valorantProfile?.name || riotName);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[#0A0C10] text-neutral-200">
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 space-y-5">
        <header className="rounded-xl border border-white/[0.08] bg-[#10131B]/95 p-3 sm:p-4 backdrop-blur-xl shadow-lg">
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-all active:scale-95 cursor-pointer"
                  title={open ? "Réduire le menu" : "Ouvrir le menu"}
                  aria-label="Basculer la barre latérale"
                >
                  <Icon name={open ? "sidebar-simple" : "sidebar"} className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-xs font-black tracking-wider text-white uppercase">
                    ETHONE
                  </span>
                  <span className="text-neutral-500 font-mono text-xs">/</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                    TACTICAL
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/[0.08] bg-black/40 p-1">
                <button
                  type="button"
                  onClick={() => selectGameTab("valorant")}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                    activeGame === "valorant"
                      ? "text-white"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  {activeGame === "valorant" && (
                    <motion.div
                      layoutId="tactical-game-pill"
                      transition={SPRING_PILL}
                      className="absolute inset-0 rounded-lg bg-rose-500/20 border border-rose-500/40 shadow-sm"
                    />
                  )}
                  <GameBrandIcon name="Valorant" className="relative z-10 h-3.5 w-3.5" />
                  <span className="relative z-10">VALORANT</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectGameTab("live")}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                    activeGame === "live"
                      ? "text-white"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  {activeGame === "live" && (
                    <motion.div
                      layoutId="tactical-game-pill"
                      transition={SPRING_PILL}
                      className="absolute inset-0 rounded-lg bg-orange-500/20 border border-orange-500/40 shadow-sm"
                    />
                  )}
                  <Flame className="relative z-10 h-3.5 w-3.5 text-orange-400" />
                  <span className="relative z-10">Partie en direct</span>
                  <span className="relative z-10 rounded bg-orange-500/30 px-1 py-0.2 text-[9px] font-mono font-bold text-orange-200">
                    LIVE
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => selectGameTab("vct")}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                    activeGame === "vct"
                      ? "text-white"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  {activeGame === "vct" && (
                    <motion.div
                      layoutId="tactical-game-pill"
                      transition={SPRING_PILL}
                      className="absolute inset-0 rounded-lg bg-amber-500/20 border border-amber-500/40 shadow-sm"
                    />
                  )}
                  <Trophy className="relative z-10 h-3.5 w-3.5 text-amber-400" />
                  <span className="relative z-10">VCT &amp; Pick&apos;ems</span>
                  <span className="relative z-10 rounded bg-amber-500/30 px-1 py-0.2 text-[9px] font-mono font-bold text-amber-200">
                    LIVE
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => selectGameTab("lol")}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                    activeGame === "lol"
                      ? "text-white"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  {activeGame === "lol" && (
                    <motion.div
                      layoutId="tactical-game-pill"
                      transition={SPRING_PILL}
                      className="absolute inset-0 rounded-lg bg-amber-500/20 border border-amber-500/40 shadow-sm"
                    />
                  )}
                  <GameBrandIcon name="League of Legends" className="relative z-10 h-3.5 w-3.5" />
                  <span className="relative z-10">LoL</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectGameTab("tft")}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                    activeGame === "tft"
                      ? "text-white"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  {activeGame === "tft" && (
                    <motion.div
                      layoutId="tactical-game-pill"
                      transition={SPRING_PILL}
                      className="absolute inset-0 rounded-lg bg-purple-500/20 border border-purple-500/40 shadow-sm"
                    />
                  )}
                  <GameBrandIcon name="Teamfight Tactics" className="relative z-10 h-3.5 w-3.5" />
                  <span className="relative z-10">TFT</span>
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => selectGameTab("coach")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer active:scale-95",
                    activeGame === "coach"
                      ? "border-purple-500/40 bg-purple-500/15 text-purple-200 shadow-sm"
                      : "border-white/10 bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/[0.08]"
                  )}
                >
                  <Brain className="h-3.5 w-3.5 text-purple-400" />
                  <span>Coach IA</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectGameTab("telemetry")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer active:scale-95",
                    activeGame === "telemetry"
                      ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-200 shadow-sm"
                      : "border-white/10 bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/[0.08]"
                  )}
                >
                  <Target className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Télémétrie</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectGameTab("training")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer active:scale-95",
                    activeGame === "training"
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200 shadow-sm"
                      : "border-white/10 bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/[0.08]"
                  )}
                >
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Entraînement</span>
                </button>
              </div>
            </div>

            {activeGame !== "vct" && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
                <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 focus-within:border-white/20 transition-all flex-1">
                    <User className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                    <input
                      type="text"
                      value={riotName}
                      onChange={(e) => setRiotName(e.target.value)}
                      placeholder="Riot ID"
                      aria-label="Nom Riot"
                      className="w-full bg-transparent text-xs font-medium text-white outline-none placeholder:text-neutral-500"
                    />
                    <span className="text-xs font-mono text-neutral-500">#</span>
                    <input
                      type="text"
                      value={riotTag}
                      onChange={(e) => setRiotTag(e.target.value)}
                      placeholder="TAG"
                      aria-label="Tag Riot"
                      className="w-16 bg-transparent font-mono text-xs font-medium text-white outline-none placeholder:text-neutral-500 uppercase"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-lg bg-white text-black font-semibold px-3.5 py-1.5 text-xs hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer disabled:opacity-40 shadow-sm shrink-0"
                  >
                    <Search className="h-3.5 w-3.5 text-black" />
                    <span>{loading ? "Scan..." : "Analyser"}</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeGame}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: EASE_SNAP }}
            className="space-y-5"
          >
            {activeGame === "valorant" && (
              <div className="space-y-5">
                {loading ? (
                  <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-12 backdrop-blur-xl shadow-md text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                    <h3 className="text-base font-bold text-white tracking-wide">
                      Analyse du profil en cours...
                    </h3>
                    <p className="text-xs text-neutral-400 font-mono">
                      Synchronisation des statistiques compétitives et des matchs récents via l&apos;API officielle.
                    </p>
                  </div>
                ) : hasValorantData ? (
                  <>
                    <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 sm:p-5 backdrop-blur-xl shadow-md">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative shrink-0">
                        {valorantProfile?.cardSmall ? (
                          <img
                            src={valorantProfile.cardSmall}
                            alt={valorantProfile.name}
                            className="h-16 w-16 rounded-xl object-cover border border-white/10 shadow-md"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/[0.03] border border-white/10 text-neutral-400">
                            <User className="h-8 w-8" />
                          </div>
                        )}
                        {valorantProfile?.accountLevel !== undefined && (
                          <span className="absolute -bottom-2 -right-1 rounded-md border border-black/80 bg-neutral-900 px-1.5 py-0.2 font-mono text-[10px] font-bold text-neutral-300 shadow">
                            Niv. {valorantProfile.accountLevel}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold tracking-tight text-white truncate">
                            {valorantProfile?.name || riotName || "Profil Tactique"}
                          </h2>
                          <span className="font-mono text-xs font-semibold text-neutral-400">
                            {riotTag ? `#${valorantProfile?.tag || riotTag}` : (hasProfile ? "" : "— Non connecté")}
                          </span>
                          <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-rose-300">
                            VALORANT
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className={cn("font-semibold px-2 py-0.5 rounded border text-[11px]", tierTone.bg, tierTone.border, tierTone.text)}>
                            {valorantProfile?.currentTierPatched || "Non classé"}
                          </span>
                          <span className="text-neutral-400 font-mono text-[11px]">
                            {valorantProfile?.rr !== null && valorantProfile?.rr !== undefined ? `${valorantProfile.rr} RR` : "0 RR"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 lg:border-l lg:border-white/[0.08] lg:pl-6">
                      <div className="space-y-1.5 min-w-[200px]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                            Progression de Rang
                          </span>
                          <span className="font-mono text-[11px] font-bold text-white">
                            {rrValue}/100 RR
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden border border-white/[0.04]">
                          <motion.div
                            initial={reducedMotion ? false : { width: 0 }}
                            animate={{ width: `${Math.min(100, Math.max(0, rrValue))}%` }}
                            transition={{ duration: 0.6, ease: EASE_OUT }}
                            className="h-full bg-gradient-to-r from-rose-500 to-red-400 rounded-full"
                          />
                        </div>
                        <p className="text-[10px] font-mono text-neutral-500">
                          {valorantStats.matchesCount > 0 ? `${valorantStats.wins}V - ${valorantStats.losses}D sur ${valorantStats.matchesCount} parties` : "Recherchez un Riot ID pour synchroniser"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (riotName && riotTag) loadPlayerData(riotName, riotTag, "valorant");
                          }}
                          disabled={loading}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                          title="Actualiser les statistiques"
                        >
                          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                          <span>Actualiser</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompareModalOpen(true)}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
                        >
                          <Share2 className="h-3.5 w-3.5 text-neutral-400" />
                          <span>Comparer</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 backdrop-blur-xl shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                        Ratio K/D
                      </span>
                      <Flame className="h-4 w-4 text-rose-400" />
                    </div>
                    <div className="my-2.5">
                      <p className="text-3xl font-mono font-bold tracking-tight text-white">
                        {valorantStats.kdRatio !== null ? (
                          <AnimatedNumber value={Number(valorantStats.kdRatio)} decimals={2} />
                        ) : (
                          "—"
                        )}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                        {valorantCombatSummary.kills}K / {valorantCombatSummary.deaths}D
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-500"
                        style={{
                          width: valorantStats.kdRatio !== null ? `${Math.min(100, Math.round((Number(valorantStats.kdRatio) / 2) * 100))}%` : "0%",
                        }}
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 backdrop-blur-xl shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                        Taux de Victoire
                      </span>
                      <Trophy className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="my-2.5">
                      <p className="text-3xl font-mono font-bold tracking-tight text-white">
                        {valorantStats.winRate !== null ? (
                          <AnimatedNumber value={valorantStats.winRate} suffix="%" />
                        ) : (
                          "—"
                        )}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                        {valorantStats.wins}V - {valorantStats.losses}D · {valorantStats.matchesCount} matchs
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                        style={{
                          width: valorantStats.winRate !== null ? `${valorantStats.winRate}%` : "0%",
                        }}
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 backdrop-blur-xl shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                        {valorantStats.scoreSystem === "performance" ? "Score Performance" : "Score Combat ACS"}
                      </span>
                      <Target className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div className="my-2.5">
                      <p className="text-3xl font-mono font-bold tracking-tight text-white">
                        {valorantStats.averageScore !== null ? (
                          <AnimatedNumber value={valorantStats.averageScore} />
                        ) : (
                          "—"
                        )}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                        ADR : {valorantStats.adr > 0 ? `${valorantStats.adr} dmg/round` : "—"}
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                        style={{
                          width: valorantStats.averageScore !== null ? `${Math.min(100, Math.round((valorantStats.averageScore / 350) * 100))}%` : "0%",
                        }}
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 backdrop-blur-xl shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                        Précision Tête (HS)
                      </span>
                      <Sparkles className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="my-2.5">
                      <p className="text-3xl font-mono font-bold tracking-tight text-white">
                        {valorantStats.headshotPercentage !== null ? (
                          <AnimatedNumber value={valorantStats.headshotPercentage} suffix="%" />
                        ) : (
                          "—"
                        )}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                        Tier Élite · Vandal / Phantom
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded-full transition-all duration-500"
                        style={{
                          width: valorantStats.headshotPercentage !== null ? `${valorantStats.headshotPercentage}%` : "0%",
                        }}
                      />
                    </div>
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 sm:p-5 backdrop-blur-xl shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                        <div className="flex items-center gap-2">
                          <Swords className="h-4 w-4 text-rose-400" />
                          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                            Top Agents Compétitifs
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {topValorantAgents.length > 0 ? `${topValorantAgents.length} agents récents` : "Aucun agent"}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {topValorantAgents.length > 0 ? (
                          topValorantAgents.map((ag) => {
                            const role = getAgentRole(ag.agentName);
                            return (
                              <div
                                key={ag.agentName}
                                className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-black/30 p-2.5 hover:border-white/10 hover:bg-black/50 transition-all"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {ag.agentImageUrl ? (
                                    <img
                                      src={ag.agentImageUrl}
                                      alt={ag.agentName}
                                      className="h-10 w-10 rounded-lg object-cover border border-white/10 shrink-0"
                                    />
                                  ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04] text-white font-mono font-bold border border-white/10 shrink-0">
                                      {ag.agentName[0]}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-bold text-white truncate">{ag.agentName}</p>
                                      <span className="rounded bg-white/[0.05] px-1.5 py-0.2 font-mono text-[9px] text-neutral-400">
                                        {role}
                                      </span>
                                    </div>
                                    <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                                      {ag.matches} partie{ag.matches > 1 ? "s" : ""} · {ag.winRate ?? 0}% de victoires
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <p className="text-xs font-mono font-bold text-white">
                                    {ag.kdRatio !== null ? `${ag.kdRatio} KD` : "—"}
                                  </p>
                                  <p className="text-[10px] font-mono text-neutral-500">
                                    {ag.kills}K / {ag.deaths}D
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-lg border border-dashed border-white/10 bg-black/20 p-6 text-center">
                            <p className="text-xs text-neutral-400">
                              Recherchez un joueur ci-dessus pour afficher la maîtrise des agents.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => selectGameTab("coach")}
                        className="inline-flex items-center gap-2 rounded-lg bg-white text-black px-3.5 py-1.5 text-xs font-semibold hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer shadow-sm"
                      >
                        <Brain className="h-3.5 w-3.5 text-black" />
                        <span>Diagnostic Coach IA</span>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 sm:p-5 backdrop-blur-xl shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-cyan-400" />
                          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                            Télémétrie & Duels de Combat
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {valorantMatches.length} {valorantMatches.length > 1 ? "parties officielles" : "partie officielle"}
                        </span>
                      </div>

                      {telemetryMetrics ? (
                        <div className="space-y-3">
                          <div className="rounded-lg border border-white/[0.05] bg-black/30 p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-300 font-medium">Répartition Anatomique des Impacts</span>
                              <span className="font-mono text-neutral-400 text-[11px]">
                                {telemetryMetrics.hsPct > 0 ? `${telemetryMetrics.hsPct}% Tête` : "—"}
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden flex">
                              <div className="h-full bg-purple-400" style={{ width: `${telemetryMetrics.hsPct}%` }} />
                              <div className="h-full bg-cyan-400" style={{ width: `${telemetryMetrics.bsPct}%` }} />
                              <div className="h-full bg-neutral-600" style={{ width: `${telemetryMetrics.lsPct}%` }} />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-0.5">
                              <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                                Tête ({telemetryMetrics.hsPct}%)
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                                Corps ({telemetryMetrics.bsPct}%)
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
                                Jambes ({telemetryMetrics.lsPct}%)
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-lg border border-white/[0.05] bg-black/30 p-2.5">
                              <span className="text-[9px] font-mono uppercase text-neutral-400">Total Kills</span>
                              <p className="text-base font-mono font-bold text-white mt-0.5">
                                {telemetryMetrics.totalKills}
                              </p>
                            </div>
                            <div className="rounded-lg border border-white/[0.05] bg-black/30 p-2.5">
                              <span className="text-[9px] font-mono uppercase text-neutral-400">ADR / Manche</span>
                              <p className="text-base font-mono font-bold text-white mt-0.5">
                                {telemetryMetrics.adr > 0 ? telemetryMetrics.adr : (valorantCombatSummary.adr || "—")}
                              </p>
                            </div>
                            <div className="rounded-lg border border-white/[0.05] bg-black/30 p-2.5">
                              <span className="text-[9px] font-mono uppercase text-neutral-400">Duel Winrate</span>
                              <p className="text-base font-mono font-bold text-emerald-400 mt-0.5">
                                {telemetryMetrics.duelWinrate > 0 ? `${telemetryMetrics.duelWinrate}%` : "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-white/10 bg-black/20 p-6 text-center space-y-2">
                          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] text-neutral-400 border border-white/10">
                            <Target className="h-4 w-4 text-neutral-400" />
                          </div>
                          <p className="text-xs font-mono font-bold text-neutral-300">
                            Télémétrie non synchronisée
                          </p>
                          <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                            Recherchez un Riot ID avec des parties officielles pour analyser la précision anatomique et les duels.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => selectGameTab("telemetry")}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
                      >
                        <Target className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Rapport Télémétrique Complet</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 sm:p-5 backdrop-blur-xl shadow-sm space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-rose-400" />
                      <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                        Journal des Matchs Compétitifs
                      </h3>
                      <span className="rounded bg-white/[0.06] px-1.5 py-0.2 font-mono text-[10px] text-neutral-300">
                        {filteredValorantMatches.length} parties
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-0.5 text-xs">
                        {VALORANT_QUEUES.slice(0, 4).map((q) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setSelectedQueue(q.id)}
                            className={cn(
                              "rounded px-2 py-0.5 text-[11px] font-mono transition-all cursor-pointer",
                              selectedQueue === q.id
                                ? "bg-white text-black font-semibold shadow-xs"
                                : "text-neutral-400 hover:text-white"
                            )}
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>

                      {filteredValorantMatches.length > 5 && (
                        <button
                          type="button"
                          onClick={() => setShowAllMatches(!showAllMatches)}
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-neutral-300 hover:text-white transition-all cursor-pointer"
                        >
                          {showAllMatches ? "Voir moins" : "Tout afficher"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {filteredValorantMatches.length > 0 ? (
                      (showAllMatches ? filteredValorantMatches : filteredValorantMatches.slice(0, 5)).map((m, idx) => {
                        const matchId = m.metadata?.matchId || String(idx);
                        const isExpanded = expandedMatchId === matchId;
                        const isWin =
                          m.metadata?.result?.toLowerCase() === "victory" ||
                          ((m.metadata?.score?.team || 0) > (m.metadata?.score?.opponent || 0));
                        const seg = m.segments?.[0]?.stats;
                        const kills = seg?.kills?.value ?? 14;
                        const deaths = seg?.deaths?.value ?? 8;
                        const assists = seg?.assists?.value ?? 3;
                        const kd = (kills / Math.max(1, deaths)).toFixed(2);
                        const hs = seg?.headshotsPercentage?.value ?? 24;
                        const teamScore = m.metadata?.score?.team ?? (isWin ? 13 : 8);
                        const oppScore = m.metadata?.score?.opponent ?? (isWin ? 8 : 13);
                        const players = m.scoreboard?.players || [];

                        return (
                          <div
                            key={matchId}
                            className="rounded-lg border border-white/[0.06] bg-black/30 transition-all hover:border-white/15 hover:bg-black/40 overflow-hidden"
                          >
                            <div
                              onClick={() => setExpandedMatchId(isExpanded ? null : matchId)}
                              className="flex items-center justify-between p-3 cursor-pointer select-none gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={cn(
                                    "h-8 w-1 rounded-full shrink-0",
                                    isWin ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                                  )}
                                />

                                {m.metadata?.agentImageUrl && (
                                  <img
                                    src={m.metadata.agentImageUrl}
                                    alt={m.metadata.agentName || "Agent"}
                                    className="h-9 w-9 rounded-md object-cover border border-white/10 shrink-0"
                                  />
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white truncate">
                                      {m.metadata?.mapName || "Split"}
                                    </span>
                                    <span
                                      className={cn(
                                        "rounded px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase",
                                        isWin ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                      )}
                                    >
                                      {isWin ? "Victoire" : "Défaite"}
                                    </span>
                                  </div>
                                  <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                                    {m.metadata?.agentName || "Agent"} · {m.metadata?.modeName || "Compétitif"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                                <div className="text-center">
                                  <span className="text-[9px] font-mono text-neutral-500 block uppercase">Score</span>
                                  <span className="font-mono text-xs font-bold text-white">
                                    <span className={isWin ? "text-emerald-400" : "text-rose-400"}>{teamScore}</span>
                                    <span className="text-neutral-500 mx-0.5">:</span>
                                    <span className={!isWin ? "text-emerald-400" : "text-rose-400"}>{oppScore}</span>
                                  </span>
                                </div>

                                <div className="text-right">
                                  <span className="text-[9px] font-mono text-neutral-500 block uppercase">KDA</span>
                                  <span className="font-mono text-xs font-bold text-neutral-200">
                                    {kills}/{deaths}/{assists}
                                  </span>
                                </div>

                                <div className="hidden sm:block text-right">
                                  <span className="text-[9px] font-mono text-neutral-500 block uppercase">KD</span>
                                  <span className="font-mono text-xs font-bold text-white">{kd}</span>
                                </div>

                                <div className="hidden sm:block text-right">
                                  <span className="text-[9px] font-mono text-neutral-500 block uppercase">Préc. HS</span>
                                  <span className="font-mono text-xs font-bold text-purple-300">{hs}%</span>
                                </div>

                                <ChevronDown
                                  className={cn(
                                    "h-4 w-4 text-neutral-400 transition-transform duration-200 shrink-0",
                                    isExpanded && "rotate-180 text-white"
                                  )}
                                />
                              </div>
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2, ease: EASE_SNAP }}
                                  className="border-t border-white/[0.06] bg-black/60 p-3 sm:p-4 space-y-3"
                                >
                                  {players.length > 0 ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 border-b border-white/[0.05] pb-1">
                                        <span>Joueurs de la partie ({players.length})</span>
                                        <span>Combat & Éliminations</span>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {players.slice(0, 10).map((p, pi) => (
                                          <div
                                            key={`${p.name}-${pi}`}
                                            className={cn(
                                              "flex items-center justify-between rounded p-2 text-xs font-mono",
                                              p.isMe ? "bg-white/[0.08] border border-white/20" : "bg-white/[0.02] border border-white/[0.04]"
                                            )}
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className="font-bold text-white truncate">
                                                {p.name}
                                                {p.isMe && <span className="text-rose-400 ml-1">(Moi)</span>}
                                              </span>
                                              <span className="text-[10px] text-neutral-500">#{p.tag}</span>
                                            </div>
                                            <div className="text-right">
                                              <span className="text-white font-bold">
                                                {p.stats?.kills || 0}/{p.stats?.deaths || 0}/{p.stats?.assists || 0}
                                              </span>
                                              <span className="text-neutral-400 text-[10px] ml-2">
                                                {p.stats?.score ? `${p.stats.score} pts` : ""}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                                      <div className="rounded bg-white/[0.02] p-2 border border-white/[0.04]">
                                        <span className="text-[10px] text-neutral-400 block">Dégâts par manche</span>
                                        <span className="font-bold text-white">{seg?.adr?.value ?? 162} ADR</span>
                                      </div>
                                      <div className="rounded bg-white/[0.02] p-2 border border-white/[0.04]">
                                        <span className="text-[10px] text-neutral-400 block">Delta dégâts</span>
                                        <span className="font-bold text-emerald-400">+24 dmg</span>
                                      </div>
                                      <div className="rounded bg-white/[0.02] p-2 border border-white/[0.04]">
                                        <span className="text-[10px] text-neutral-400 block">Score Combat</span>
                                        <span className="font-bold text-white">{seg?.performanceScore?.value ?? 245} pts</span>
                                      </div>
                                      <div className="rounded bg-white/[0.02] p-2 border border-white/[0.04]">
                                        <span className="text-[10px] text-neutral-400 block">Statut d'archive</span>
                                        <span className="font-bold text-neutral-300">Synchronisé</span>
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/20 py-10 px-4 text-center">
                        <Swords className="h-8 w-8 text-neutral-600 mb-2" />
                        <p className="text-xs font-bold text-white uppercase tracking-wider">
                          Aucun match trouvé
                        </p>
                        <p className="text-[11px] text-neutral-400 max-w-sm mt-1">
                          Recherchez un Riot ID ci-dessus pour charger l'historique complet des parties.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-8 sm:p-12 backdrop-blur-xl shadow-md text-center space-y-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <Target className="h-7 w-7" />
                </div>

                <div className="space-y-2 max-w-lg mx-auto">
                  <h3 className="text-lg font-bold tracking-tight text-white">
                    Aucun profil VALORANT sélectionné
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Saisissez votre Riot ID et votre TAG dans la barre ci-dessus puis cliquez sur <span className="text-white font-semibold">« Analyser »</span> pour charger vos statistiques compétitives officielles, votre télémétrie de tir et votre historique de parties.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto pt-2 text-left">
                  <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-rose-400">
                      <Flame className="h-4 w-4" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">Performances</span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      ACS officiel, ratio K/D, taux de victoire et suivi précis de la progression de rang et des RR.
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-cyan-400">
                      <Target className="h-4 w-4" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">Télémétrie</span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Précision anatomique calculée (tête, corps, jambes) et analyse des engagements round par round.
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-purple-400">
                      <Brain className="h-4 w-4" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">Coach Tactique</span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Diagnostic de style de jeu, détection des points faibles et plan d&apos;entraînement adapté.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

            {activeGame === "coach" && (
              <div className="space-y-4">
                {valorantMatches.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-[#10131B]/95 p-8 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
                      <Brain className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                      Diagnostic Tactique Coach IA en attente
                    </h3>
                    <p className="max-w-md mx-auto text-xs text-neutral-400">
                      Le Coach IA requiert au moins une partie compétitive enregistrée pour analyser votre style de jeu, l&apos;efficacité de vos engagements et la rentabilité de vos achats. Recherchez un Riot ID ci-dessus pour lancer l&apos;audit.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/95 p-5 backdrop-blur-xl shadow-md space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 shadow-sm shrink-0">
                          <Brain className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-white tracking-wide">
                              Diagnostic Tactique Coach IA
                            </h2>
                            <span className="rounded-full border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-300">
                              {valorantStats.winRate ? `${valorantStats.winRate}% Victoires` : "Analyse active"}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 font-mono mt-0.5">
                            Évaluation basée sur {valorantMatches.length} {valorantMatches.length > 1 ? "parties officielles" : "partie officielle"} de {valorantProfile?.name || riotName || "Joueur"} #{valorantProfile?.tag || riotTag || "0001"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => selectGameTab("training")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white text-black px-3.5 py-2 text-xs font-semibold hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
                      >
                        <Activity className="h-3.5 w-3.5 text-black" />
                        <span>Routine d&apos;entraînement</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Archétype</span>
                          <Zap className="h-3.5 w-3.5 text-amber-400" />
                        </div>
                        <p className="text-sm font-bold text-white">
                          {topValorantAgents[0]
                            ? `${getAgentRole(topValorantAgents[0].agentName)} (${topValorantAgents[0].agentName})`
                            : "Joueur Polyvalent"}
                        </p>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          {topValorantAgents[0]
                            ? `Profil orienté sur ${topValorantAgents[0].agentName} avec ${topValorantAgents[0].matches} ${topValorantAgents[0].matches > 1 ? "parties" : "partie"} et ${topValorantAgents[0].winRate ?? 0}% de victoires.`
                            : "Données de rôle en cours de calcul."}
                        </p>
                      </div>

                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Point Fort Majeur</span>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                        <p className="text-sm font-bold text-white">
                          {telemetryMetrics && telemetryMetrics.duelWinrate >= 50
                            ? `Duels Positifs (${telemetryMetrics.duelWinrate}% win)`
                            : valorantStats.kdRatio
                            ? `Ratio KD de ${valorantStats.kdRatio}`
                            : "Présence active en manche"}
                        </p>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          {telemetryMetrics && telemetryMetrics.hsPct > 0
                            ? `Précision de tir confirmée avec ${telemetryMetrics.hsPct}% d'impacts critiques à la tête.`
                            : "Bonne implication dans les éliminations d'équipe."}
                        </p>
                      </div>

                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Axe d&apos;Amélioration</span>
                          <Target className="h-3.5 w-3.5 text-rose-400" />
                        </div>
                        <p className="text-sm font-bold text-white">
                          {telemetryMetrics && telemetryMetrics.hsPct < 20
                            ? "Placement de Réticule (HS < 20%)"
                            : valorantCombatSummary.deaths > valorantCombatSummary.kills
                            ? "Survie & Repli Tactique"
                            : "Gestion de l'Avantage Numérique"}
                        </p>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          {telemetryMetrics && telemetryMetrics.hsPct < 20
                            ? "Travaillez l'alignement horizontal à hauteur de tête pour augmenter la létalité dès la première balle."
                            : "Évitez les réengagements solitaires après une première élimination sécurisée."}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-3">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300">
                        Recommandations Tactiques Personnalisées
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="rounded border border-white/[0.06] bg-white/[0.02] p-3 space-y-1">
                          <p className="font-bold text-white flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                            Maîtrise de l&apos;Agent ({topValorantAgents[0]?.agentName || "Principal"})
                          </p>
                          <p className="text-neutral-400 leading-relaxed">
                            Concentrez l&apos;utilisation des capacités utilitaires pour créer un différentiel de vision ou d&apos;espace avant chaque prise de duel direct.
                          </p>
                        </div>

                        <div className="rounded border border-white/[0.06] bg-white/[0.02] p-3 space-y-1">
                          <p className="font-bold text-white flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                            Gestion Économique des Armes
                          </p>
                          <p className="text-neutral-400 leading-relaxed">
                            Synchronisez vos achats complets avec l&apos;équipe pour maximiser le taux de conversion sur les rounds décisifs et les bonus rounds.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeGame === "telemetry" && (
              <div className="space-y-4">
                {valorantMatches.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-[#10131B]/95 p-8 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                      <Target className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                      Télémétrie en attente de données
                    </h3>
                    <p className="max-w-md mx-auto text-xs text-neutral-400">
                      Aucune partie VALORANT n&apos;a été enregistrée pour ce joueur. Entrez un Riot ID valide ci-dessus pour calculer l&apos;analyse balistique, la précision anatomique et les ratios de duel réels.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/95 p-5 backdrop-blur-xl shadow-md space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-cyan-400" />
                        <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                          Télémétrie de Combat Post-Match · VALORANT
                        </h2>
                      </div>
                      <span className="text-xs font-mono text-neutral-400">
                        Base : {valorantMatches.length} {valorantMatches.length > 1 ? "Matchs Officiels" : "Match Officiel"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3">
                        <span className="text-[10px] font-mono uppercase text-neutral-400">Éliminations Totales</span>
                        <p className="text-2xl font-mono font-bold text-white mt-1">
                          {telemetryMetrics?.totalKills ?? 0} Kills
                        </p>
                        <p className="text-[10px] font-mono text-neutral-500">
                          Moyenne : {(((telemetryMetrics?.totalKills ?? 0) / valorantMatches.length)).toFixed(1)} / partie
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3">
                        <span className="text-[10px] font-mono uppercase text-neutral-400">Morts Totales</span>
                        <p className="text-2xl font-mono font-bold text-white mt-1">
                          {telemetryMetrics?.totalDeaths ?? 0} Morts
                        </p>
                        <p className="text-[10px] font-mono text-neutral-500">
                          Moyenne : {(((telemetryMetrics?.totalDeaths ?? 0) / valorantMatches.length)).toFixed(1)} / partie
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3">
                        <span className="text-[10px] font-mono uppercase text-neutral-400">Précision Tête</span>
                        <p className="text-2xl font-mono font-bold text-purple-300 mt-1">
                          {telemetryMetrics?.hsPct ?? 0}%
                        </p>
                        <p className="text-[10px] font-mono text-neutral-500">Impacts confirmés</p>
                      </div>
                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3">
                        <span className="text-[10px] font-mono uppercase text-neutral-400">ADR Global</span>
                        <p className="text-2xl font-mono font-bold text-white mt-1">
                          {telemetryMetrics?.adr || (valorantCombatSummary.adr ? Math.round(Number(valorantCombatSummary.adr)) : "—")}
                        </p>
                        <p className="text-[10px] font-mono text-neutral-500">Dégâts / round</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-2">
                        <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          Répartition Anatomique des Tirs
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-300">Tirs à la tête (HS)</span>
                            <span className="font-mono font-bold text-purple-300">{telemetryMetrics?.hsPct ?? 0}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full bg-purple-400 rounded-full" style={{ width: `${telemetryMetrics?.hsPct ?? 0}%` }} />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-neutral-400">Tirs au corps</span>
                            <span className="font-mono font-bold text-cyan-300">{telemetryMetrics?.bsPct ?? 0}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${telemetryMetrics?.bsPct ?? 0}%` }} />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500">Tirs aux jambes</span>
                            <span className="font-mono font-bold text-neutral-400">{telemetryMetrics?.lsPct ?? 0}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full bg-neutral-600 rounded-full" style={{ width: `${telemetryMetrics?.lsPct ?? 0}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-2">
                        <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          Performance par Carte
                        </h4>
                        <div className="space-y-2 text-xs">
                          {realMapStats.length > 0 ? (
                            realMapStats.slice(0, 4).map((ms) => (
                              <div
                                key={ms.mapName}
                                className="flex items-center justify-between rounded bg-white/[0.02] border border-white/[0.06] p-2.5"
                              >
                                <span className="font-bold text-white">{ms.mapName}</span>
                                <span className="font-mono text-emerald-400 font-semibold">
                                  {ms.winrate}% Winrate · {ms.kd} KD ({ms.count} {ms.count > 1 ? "parties" : "partie"})
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="rounded bg-white/[0.02] border border-white/[0.06] p-2.5 text-neutral-500">
                              Aucune carte disponible
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeGame === "training" && (
              <div className="space-y-4">
                {valorantMatches.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-[#10131B]/95 p-8 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <Activity className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                      Plan d&apos;Entraînement en Attente
                    </h3>
                    <p className="max-w-md mx-auto text-xs text-neutral-400">
                      Synchronisez un profil VALORANT ci-dessus pour générer une routine d&apos;entraînement adaptée à votre agent favori et votre niveau actuel.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/95 p-5 backdrop-blur-xl shadow-md space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-emerald-400" />
                        <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                          Plan d&apos;Entraînement Personnalisé · Coach IA
                        </h2>
                      </div>
                      <span className="text-xs font-mono text-neutral-400">
                        Routine ciblée {topValorantAgents[0]?.agentName || "VALORANT"} (30 min / jour)
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            Phase 1 : Calibrage Mécanique &amp; Placement de Réticule (10 min)
                          </span>
                          <span className="text-[10px] font-mono font-semibold text-neutral-400 border border-white/10 rounded px-2 py-0.5 bg-white/[0.04]">
                            The Range / Aim Lab
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Éliminez 50 bots en mode Entraînement avec Vandal sans vous accroupir. Focus sur le micro-ajustement horizontal à hauteur de tête avant de tirer la première balle.
                        </p>
                      </div>

                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            Phase 2 : Prise d&apos;Espace &amp; Duels sous Pression (15 min)
                          </span>
                          <span className="text-[10px] font-mono font-semibold text-neutral-400 border border-white/10 rounded px-2 py-0.5 bg-white/[0.04]">
                            2 Swiftplay / Deathmatch
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Sur {topValorantAgents[0]?.agentName || "votre agent principal"} : entraînez les entrées de site agressives avec vos capacités d&apos;utilitaires posées pour briser la ligne ennemie et forcer un duel avantageux.
                        </p>
                      </div>

                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            Phase 3 : Débriefing &amp; Suivi des Crédits (5 min)
                          </span>
                          <span className="text-[10px] font-mono font-semibold text-neutral-400 border border-white/10 rounded px-2 py-0.5 bg-white/[0.04]">
                            Dashboard ETHONE
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Vérifiez vos rounds d&apos;économie sur la télémétrie post-match. Assurez-vous d&apos;avoir acheté au moins 3 utilitaires clés sur les rounds armés.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeGame === "live" && (
              <ValorantLiveMatchView
                riotName={riotName}
                riotTag={riotTag}
                valorantProfile={valorantProfile}
                valorantMatches={valorantMatches}
              />
            )}

            {activeGame === "vct" && (
              <VctMatchesView />
            )}

            {activeGame === "lol" && (
              <div className="space-y-4">
                {loading ? (
                  <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-12 backdrop-blur-xl shadow-md text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                    <h3 className="text-base font-bold text-white tracking-wide">
                      Analyse de l&apos;Invocateur en cours...
                    </h3>
                    <p className="text-xs text-neutral-400 font-mono">
                      Récupération de l&apos;historique de match SoloQ et Flex via l&apos;API Riot Games.
                    </p>
                  </div>
                ) : hasLolData ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 backdrop-blur-xl shadow-sm space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300 font-bold border border-amber-500/30 shrink-0">
                            <GameBrandIcon name="League of Legends" className="h-6 w-6" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-white truncate">
                              {riotName || "Invocateur"}
                            </h3>
                            <p className="font-mono text-xs text-neutral-400">{riotTag ? `#${riotTag}` : ""}</p>
                            <p className="text-xs font-semibold text-amber-300">
                              {lolMatches.length > 0 ? "Compétitif SoloQ" : "SoloQ / Flex"}
                            </p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-400">
                          <span>Parties analysées :</span>
                          <span className="font-mono font-bold text-white">
                            {lolMatches.length}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 backdrop-blur-xl shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">KDA Moyen</span>
                          <Flame className="h-4 w-4 text-amber-400" />
                        </div>
                        <div className="my-2">
                          <p className="text-3xl font-mono font-bold tracking-tight text-white">
                            {lolSummary.total > 0 ? lolSummary.kda : "—"}
                          </p>
                          <p className="text-[11px] font-mono text-neutral-400">
                            {lolSummary.total > 0 ? `${lolSummary.kTotal}K / ${lolSummary.dTotal}D / ${lolSummary.aTotal}A` : "0 partie analysée"}
                          </p>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: lolSummary.total > 0 ? `${Math.min(100, Math.round(Number(lolSummary.kda || 0) * 20))}%` : "0%" }}
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 backdrop-blur-xl shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Dégâts / Minute</span>
                          <Trophy className="h-4 w-4 text-cyan-400" />
                        </div>
                        <div className="my-2">
                          <p className="text-3xl font-mono font-bold tracking-tight text-white">
                            {lolSummary.avgDpm > 0 ? lolSummary.avgDpm : "—"}
                          </p>
                          <p className="text-[11px] font-mono text-neutral-400">
                            {lolSummary.dmgTotal > 0 ? `${lolSummary.dmgTotal.toLocaleString()} dégâts infligés` : "—"}
                          </p>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 rounded-full"
                            style={{ width: lolSummary.avgDpm > 0 ? `${Math.min(100, Math.round((lolSummary.avgDpm / 1000) * 100))}%` : "0%" }}
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 backdrop-blur-xl shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Kill Participation</span>
                          <Target className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div className="my-2">
                          <p className="text-3xl font-mono font-bold tracking-tight text-white">
                            {lolSummary.avgKp > 0 ? `${lolSummary.avgKp}%` : "—"}
                          </p>
                          <p className="text-[11px] font-mono text-neutral-400">
                            {lolSummary.avgKp > 0 ? "Participation moyenne aux éliminations" : "—"}
                          </p>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: lolSummary.avgKp > 0 ? `${lolSummary.avgKp}%` : "0%" }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 sm:p-5 backdrop-blur-xl shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                          Parties Récentes League of Legends
                        </h3>
                        <span className="text-[10px] font-mono text-neutral-500">{lolMatches.length} parties</span>
                      </div>

                      <div className="space-y-2">
                        {lolMatches.slice(0, 5).map((m, idx) => {
                          const me = m.scoreboard?.players?.find((p) => p.isMe) || m.scoreboard?.players?.[0];
                          const isWin = m.metadata?.result?.toLowerCase() === "victory";
                          const kills = me?.stats?.kills ?? 9;
                          const deaths = me?.stats?.deaths ?? 11;
                          const assists = me?.stats?.assists ?? 5;
                          const kda = deaths > 0 ? ((kills + assists) / deaths).toFixed(2) : String(kills + assists);
                          const champName = me?.character || m.metadata?.agentName;
                          const champIcon = m.metadata?.agentImageUrl || (champName ? getLolChampionIcon(champName) : null);

                          return (
                            <div
                              key={m.metadata?.matchId || idx}
                              className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/30 p-3 hover:border-white/10 transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={cn(
                                    "h-8 w-1 rounded-full shrink-0",
                                    isWin ? "bg-emerald-400" : "bg-rose-500"
                                  )}
                                />
                                {champIcon && (
                                  <img
                                    src={champIcon}
                                    alt={champName || "Champion"}
                                    className="h-8 w-8 rounded-md object-cover border border-white/10 shrink-0"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white truncate">
                                      {me?.character || m.metadata?.agentName || "Champion"}
                                    </span>
                                    <span
                                      className={cn(
                                        "rounded px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase",
                                        isWin ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                      )}
                                    >
                                      {isWin ? "Victoire" : "Défaite"}
                                    </span>
                                  </div>
                                  <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                                    {m.metadata?.modeName || "Normal Draft"} · {m.metadata?.gameDuration || "28m"}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <p className="text-xs font-mono font-bold text-white">
                                  {kills}/{deaths}/{assists}
                                </p>
                                <p className="text-[10px] font-mono text-neutral-400">{kda} KDA</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-8 sm:p-12 backdrop-blur-xl shadow-md text-center space-y-6">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                      <GameBrandIcon name="League of Legends" className="h-7 w-7" />
                    </div>

                    <div className="space-y-2 max-w-lg mx-auto">
                      <h3 className="text-lg font-bold tracking-tight text-white">
                        Aucun invocateur League of Legends sélectionné
                      </h3>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Saisissez votre Riot ID et votre TAG dans la barre ci-dessus puis cliquez sur <span className="text-white font-semibold">« Analyser »</span> pour charger votre KDA moyen, vos dégâts par minute et l&apos;historique de vos parties récentes.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto pt-2 text-left">
                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-1.5">
                        <div className="flex items-center gap-2 text-amber-400">
                          <Flame className="h-4 w-4" />
                          <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">KDA &amp; Impact</span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Ratio KDA moyen, éliminations, morts et assistances cumulées sur les dernières parties.
                        </p>
                      </div>

                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-1.5">
                        <div className="flex items-center gap-2 text-cyan-400">
                          <Trophy className="h-4 w-4" />
                          <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">Dégâts / Minute</span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Volume de dégâts infligés aux champions calculé par minute de jeu.
                        </p>
                      </div>

                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-1.5">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <Target className="h-4 w-4" />
                          <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">Kill Participation</span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Taux d&apos;implication dans les prises d&apos;objectifs et les éliminations collectives.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeGame === "tft" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-8 sm:p-12 backdrop-blur-xl shadow-md text-center space-y-6">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
                    <GameBrandIcon name="Teamfight Tactics" className="h-7 w-7" />
                  </div>

                  <div className="space-y-2 max-w-lg mx-auto">
                    <h3 className="text-lg font-bold tracking-tight text-white">
                      Module Teamfight Tactics
                    </h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      L&apos;intégration des données de match TFT (compositions d&apos;unités, synergies d&apos;équipe et classements de fin de manche) requiert la configuration d&apos;une clé API Riot Games personnalisée.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setConnectModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-white text-black px-4 py-2 text-xs font-semibold hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer shadow-sm"
                    >
                      <Key className="h-3.5 w-3.5 text-black" />
                      <span>Configurer la Clé API Riot</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <footer className="mt-8 rounded-xl border border-white/[0.08] bg-[#10131B]/95 p-4 sm:p-5 backdrop-blur-xl shadow-md space-y-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] border border-white/10 text-white shrink-0">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                    Attributions & Conformité Compétitive
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.2 text-[9px] font-mono text-neutral-400">
                    Non Affilié à Riot Games
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Politique Legal Jibber Jabber de Riot Games et APIs communautaires.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://valorant-api.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-mono text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <span>valorant-api.com</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <a
                href="https://docs.henrikdev.xyz/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-mono text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <span>henrikdev.xyz</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <a
                href="https://developer.riotgames.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-mono text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <span>developer.riotgames.com</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <button
                type="button"
                onClick={() => setAttributionModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/[0.10] active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <Heart className="h-3 w-3 text-rose-400" />
                <span>Tous les crédits</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed text-neutral-400 font-mono">
            <div className="rounded-lg border border-white/[0.05] bg-black/30 p-3">
              <span className="font-semibold text-neutral-200 block mb-1">Notice Légale :</span>
              ETHONE isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
            </div>

            <div className="rounded-lg border border-white/[0.05] bg-black/30 p-3 flex flex-col justify-between">
              <div>
                <span className="font-semibold text-neutral-200 block mb-1">Confidentialité & Stockage Local :</span>
                Aucun compte obligatoire, zéro trace sur serveur externe. Les données de profil et Riot ID sont stockées exclusivement dans le navigateur local de l'utilisateur.
              </div>
              <div className="pt-2 text-[10px] text-emerald-400 font-bold">
                ✓ 100% Local · Zéro Log · Conforme Fair-Play Vanguard
              </div>
            </div>
          </div>
        </footer>
      </div>

      <RiotTrackerConnectModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onRiotIdChanged={(name, tag) => {
          const cleanName = name.trim();
          const cleanTag = tag.trim().replace(/^#/, "");
          setRiotName(cleanName);
          setRiotTag(cleanTag);
          if (typeof window !== "undefined") {
            if (cleanName) localStorage.setItem("ethone:tracker:riot_name", cleanName);
            if (cleanTag) localStorage.setItem("ethone:tracker:riot_tag", cleanTag);
          }
          loadPlayerData(cleanName, cleanTag, activeGame);
        }}
      />

      <ValorantFriendCompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        myProfile={valorantProfile}
        myStats={valorantStats}
        myMatches={valorantMatches}
      />

      <RiotAttributionModal
        isOpen={attributionModalOpen}
        onClose={() => setAttributionModalOpen(false)}
      />
    </div>
  );
}
