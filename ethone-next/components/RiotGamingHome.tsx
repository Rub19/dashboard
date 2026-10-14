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
  ArrowRight,
  X,
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
import CompareWithFriendView from "@/components/tracker/CompareWithFriendView";
import RiotAttributionModal from "@/components/tracker/RiotAttributionModal";
import ValorantLiveMatchView from "@/components/tracker/ValorantLiveMatchView";
import VctMatchesView from "@/components/tracker/VctMatchesView";
import TacticalCoachChatView from "@/components/tracker/TacticalCoachChatView";
import { AnimatedNumber } from "@/components/tracker/TrackerMotion";
import { useAnimatedSidebar } from "@/components/motion/animated-sidebar";
import FlagIcon from "@/components/FlagIcon";
import { getTrackerI18n, formatStatPercent } from "@/lib/i18n-tracker";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { EASE_SNAP, EASE_OUT, SPRING_PILL } from "@/lib/ease";

type GameTab =
  | "valorant"
  | "compare"
  | "live"
  | "vct"
  | "lol"
  | "tft"
  | "coach"
  | "telemetry"
  | "training";

function getAgentRole(agentName: string, isEn: boolean = false): string {
  const n = agentName.toLowerCase();
  if (["jett", "reyna", "raze", "phoenix", "yoru", "neon", "iso"].includes(n)) return isEn ? "Duelist" : "Duelliste";
  if (["sova", "fade", "breach", "skye", "kay/o", "kayo", "gekko"].includes(n)) return isEn ? "Initiator" : "Initiateur";
  if (["omen", "brimstone", "viper", "astra", "clove", "harbor"].includes(n)) return isEn ? "Controller" : "Contrôleur";
  if (["killjoy", "cypher", "sage", "chamber", "deadlock", "vyse"].includes(n)) return isEn ? "Sentinel" : "Sentinelle";
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
  const { settings, update } = useSettings();
  const { success, error: showError, notify } = useToast();
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
        urlTab === "compare" ||
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
        urlTab === "compare" ||
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
        targetTab === "compare" ||
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
      tabParam === "compare" ||
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

  const [trackerLang, setTrackerLang] = useState<"en" | "fr">(() => {
    if (typeof window !== "undefined") {
      try {
        const sp = new URLSearchParams(window.location.search);
        const urlLang = sp.get("lang");
        if (urlLang === "en" || urlLang === "fr") return urlLang;
        const stored = localStorage.getItem("ethone:tracker:language");
        if (stored === "en") return "en";
        if (stored === "fr") return "fr";
      } catch {}
    }
    return "en";
  });

  const currentLang = trackerLang;
  const isEn = currentLang === "en";
  const tr = useMemo(() => getTrackerI18n(currentLang), [currentLang]);

  const toggleLang = useCallback(
    (lang: "fr" | "en") => {
      setTrackerLang(lang);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ethone:tracker:language", lang);
          window.dispatchEvent(new CustomEvent("ethone:tracker:lang-change", { detail: { lang } }));
        } catch {}
      }
      update({ language: lang });
      notify.language(lang);
    },
    [update, notify]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleLangEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ lang?: string }>;
      const l = customEvent.detail?.lang;
      if (l === "en" || l === "fr") {
        setTrackerLang(l);
      }
    };
    window.addEventListener("ethone:tracker:lang-change", handleLangEvent);
    return () => window.removeEventListener("ethone:tracker:lang-change", handleLangEvent);
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[#0A0C10] text-neutral-200">
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 space-y-5">
        <header className="rounded-xl border border-white/[0.08] bg-[#10131B]/95 p-3 sm:p-4 backdrop-blur-xl shadow-lg">
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-all active:scale-95 cursor-pointer"
                  title={open ? (isEn ? "Collapse menu" : "Réduire le menu") : (isEn ? "Open menu" : "Ouvrir le menu")}
                  aria-label={isEn ? "Toggle sidebar" : "Basculer la barre latérale"}
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
                  <span
                    className="ml-1 inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-300"
                    title="ETHONE Tactical v2.4.0"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    <span>v2.4.0</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-1 sm:justify-end min-w-0">
                {activeGame !== "vct" && (
                  <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-sm min-w-0">
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 focus-within:border-white/20 transition-all flex-1 min-w-0">
                      <User className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                      <input
                        type="text"
                        value={riotName}
                        onChange={(e) => setRiotName(e.target.value)}
                        placeholder={tr.riotIdPlaceholder}
                        aria-label={isEn ? "Riot Name" : "Nom Riot"}
                        className="w-full bg-transparent text-xs font-medium text-white outline-none placeholder:text-neutral-500 min-w-0"
                      />
                      <span className="text-xs font-mono text-neutral-500 shrink-0">#</span>
                      <input
                        type="text"
                        value={riotTag}
                        onChange={(e) => setRiotTag(e.target.value)}
                        placeholder={tr.riotTagPlaceholder}
                        aria-label={isEn ? "Riot Tag" : "Tag Riot"}
                        className="w-14 bg-transparent font-mono text-xs font-medium text-white outline-none placeholder:text-neutral-500 uppercase shrink-0"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-1.5 rounded-lg bg-white text-black font-semibold px-3 py-1.5 text-xs hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer disabled:opacity-40 shadow-sm shrink-0"
                    >
                      <Search className="h-3.5 w-3.5 text-black" />
                      <span className="hidden md:inline">{loading ? tr.scanning : tr.analyze}</span>
                    </button>
                  </form>
                )}

                <div className="flex items-center rounded-lg border border-white/10 bg-black/40 p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleLang("fr")}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-all cursor-pointer",
                      currentLang === "fr"
                        ? "bg-white/[0.12] text-white shadow-sm"
                        : "text-neutral-400 hover:text-neutral-200"
                    )}
                    title="Français"
                    aria-label="Passer en français"
                  >
                    <span className="relative h-3 w-4.5 overflow-hidden rounded-[2px] shrink-0 border border-white/15">
                      <FlagIcon code="fr" className="h-full w-full object-cover" />
                    </span>
                    <span className="font-mono text-[10px] font-bold">FR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLang("en")}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-all cursor-pointer",
                      currentLang === "en"
                        ? "bg-white/[0.12] text-white shadow-sm"
                        : "text-neutral-400 hover:text-neutral-200"
                    )}
                    title="English"
                    aria-label="Switch to English"
                  >
                    <span className="relative h-3 w-4.5 overflow-hidden rounded-[2px] shrink-0 border border-white/15">
                      <FlagIcon code="en" className="h-full w-full object-cover" />
                    </span>
                    <span className="font-mono text-[10px] font-bold">EN</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center overflow-x-auto no-scrollbar scroll-smooth pt-2.5 border-t border-white/[0.06]">
              <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-black/40 p-1 shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => selectGameTab("valorant")}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shrink-0",
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
                  <span className="relative z-10">{tr.valorant}</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectGameTab("compare")}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shrink-0",
                    activeGame === "compare"
                      ? "text-white"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  {activeGame === "compare" && (
                    <motion.div
                      layoutId="tactical-game-pill"
                      transition={SPRING_PILL}
                      className="absolute inset-0 rounded-lg bg-rose-500/20 border border-rose-500/40 shadow-sm"
                    />
                  )}
                  <Swords className="relative z-10 h-3.5 w-3.5 text-rose-400" />
                  <span className="relative z-10">{isEn ? "Compare" : "Comparer"}</span>
                  <span className="relative z-10 rounded bg-rose-500/30 px-1 py-0.2 text-[9px] font-mono font-bold text-rose-200">
                    1v1
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => selectGameTab("live")}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shrink-0",
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
                  <span className="relative z-10">{tr.liveMatch}</span>
                  <span className="relative z-10 rounded bg-orange-500/30 px-1 py-0.2 text-[9px] font-mono font-bold text-orange-200">
                    WIP
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => selectGameTab("vct")}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shrink-0",
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
                  <span className="relative z-10">{tr.vctPickems}</span>
                  <span className="relative z-10 rounded bg-amber-500/30 px-1 py-0.2 text-[9px] font-mono font-bold text-amber-200">
                    {tr.live}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => selectGameTab("lol")}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shrink-0",
                    activeGame === "lol"
                      ? "text-white"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  {activeGame === "lol" && (
                    <motion.div
                      layoutId="tactical-game-pill"
                      transition={SPRING_PILL}
                      className="absolute inset-0 rounded-lg bg-yellow-500/20 border border-yellow-500/40 shadow-sm"
                    />
                  )}
                  <GameBrandIcon name="League of Legends" className="relative z-10 h-3.5 w-3.5" />
                  <span className="relative z-10">{tr.lol}</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectGameTab("tft")}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shrink-0",
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
                  <span className="relative z-10">{tr.tft}</span>
                </button>

                <div className="h-4 w-px bg-white/10 mx-1 shrink-0" aria-hidden="true" />

                <button
                  type="button"
                  onClick={() => selectGameTab("coach")}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shrink-0",
                    activeGame === "coach"
                      ? "text-white"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  {activeGame === "coach" && (
                    <motion.div
                      layoutId="tactical-game-pill"
                      transition={SPRING_PILL}
                      className="absolute inset-0 rounded-lg bg-purple-500/20 border border-purple-500/40 shadow-sm"
                    />
                  )}
                  <Brain className="relative z-10 h-3.5 w-3.5 text-purple-400" />
                  <span className="relative z-10">{tr.coachIa}</span>
                  <span className="relative z-10 rounded bg-purple-500/30 px-1 py-0.2 text-[9px] font-mono font-bold text-purple-200">
                    AI
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => selectGameTab("telemetry")}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shrink-0",
                    activeGame === "telemetry"
                      ? "text-white"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  {activeGame === "telemetry" && (
                    <motion.div
                      layoutId="tactical-game-pill"
                      transition={SPRING_PILL}
                      className="absolute inset-0 rounded-lg bg-cyan-500/20 border border-cyan-500/40 shadow-sm"
                    />
                  )}
                  <Target className="relative z-10 h-3.5 w-3.5 text-cyan-400" />
                  <span className="relative z-10">{tr.telemetry}</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectGameTab("training")}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shrink-0",
                    activeGame === "training"
                      ? "text-white"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  {activeGame === "training" && (
                    <motion.div
                      layoutId="tactical-game-pill"
                      transition={SPRING_PILL}
                      className="absolute inset-0 rounded-lg bg-emerald-500/20 border border-emerald-500/40 shadow-sm"
                    />
                  )}
                  <Activity className="relative z-10 h-3.5 w-3.5 text-emerald-400" />
                  <span className="relative z-10">{tr.training}</span>
                </button>
              </div>
            </div>
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
                      {tr.valLoadingTitle}
                    </h3>
                    <p className="text-xs text-neutral-400 font-mono">
                      {tr.valLoadingDesc}
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
                            {currentLang === "en" ? "Lvl." : "Niv."} {valorantProfile.accountLevel}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold tracking-tight text-white truncate">
                            {valorantProfile?.name || riotName || "Profil Tactique"}
                          </h2>
                          <span className="font-mono text-xs font-semibold text-neutral-400">
                            {riotTag ? `#${valorantProfile?.tag || riotTag}` : (hasProfile ? "" : tr.notConnected)}
                          </span>
                          <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-rose-300">
                            VALORANT
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className={cn("font-semibold px-2 py-0.5 rounded border text-[11px]", tierTone.bg, tierTone.border, tierTone.text)}>
                            {valorantProfile?.currentTierPatched || tr.unrated}
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
                            {tr.rankProgression}
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
                          {valorantStats.matchesCount > 0
                            ? (currentLang === "en"
                                ? `${valorantStats.wins}W - ${valorantStats.losses}L across ${valorantStats.matchesCount} ${valorantStats.matchesCount > 1 ? tr.matches : tr.match}`
                                : `${valorantStats.wins}V - ${valorantStats.losses}D sur ${valorantStats.matchesCount} ${valorantStats.matchesCount > 1 ? tr.matches : tr.match}`)
                            : (currentLang === "en" ? "Search a Riot ID to synchronize" : "Recherchez un Riot ID pour synchroniser")}
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
                          title={tr.refresh}
                        >
                          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                          <span>{tr.refresh}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompareModalOpen(true)}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
                        >
                          <Share2 className="h-3.5 w-3.5 text-neutral-400" />
                          <span>{tr.compare}</span>
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
                        {tr.kdRatio}
                      </span>
                      <Flame className="h-4 w-4 text-rose-400" />
                    </div>
                    <div className="my-2.5">
                      <p className="text-3xl font-mono font-bold tracking-tight text-white tabular-nums">
                        {valorantStats.kdRatio !== null ? (
                          <AnimatedNumber value={Number(valorantStats.kdRatio)} decimals={2} locale={currentLang} />
                        ) : (
                          "—"
                        )}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                        {valorantCombatSummary.kills}K / {valorantCombatSummary.deaths}D
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        initial={reducedMotion ? false : { width: 0 }}
                        animate={{
                          width: valorantStats.kdRatio !== null ? `${Math.min(100, Math.round((Number(valorantStats.kdRatio) / 2) * 100))}%` : "0%",
                        }}
                        transition={{ duration: 0.5, ease: EASE_OUT }}
                        className="h-full bg-rose-500 rounded-full"
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 backdrop-blur-xl shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                        {tr.winRate}
                      </span>
                      <Trophy className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="my-2.5">
                      <p className="text-3xl font-mono font-bold tracking-tight text-white tabular-nums">
                        {valorantStats.winRate !== null ? (
                          <AnimatedNumber value={valorantStats.winRate} suffix={currentLang === "fr" ? " %" : "%"} locale={currentLang} />
                        ) : (
                          "—"
                        )}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                        {valorantStats.wins}{currentLang === "en" ? "W" : "V"} - {valorantStats.losses}{currentLang === "en" ? "L" : "D"} · {valorantStats.matchesCount} {valorantStats.matchesCount > 1 ? tr.matches : tr.match}
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        initial={reducedMotion ? false : { width: 0 }}
                        animate={{
                          width: valorantStats.winRate !== null ? `${valorantStats.winRate}%` : "0%",
                        }}
                        transition={{ duration: 0.5, ease: EASE_OUT }}
                        className="h-full bg-emerald-400 rounded-full"
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 backdrop-blur-xl shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                        {valorantStats.scoreSystem === "performance" ? (currentLang === "en" ? "Performance Score" : "Score Performance") : tr.combatScoreAcs}
                      </span>
                      <Target className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div className="my-2.5">
                      <p className="text-3xl font-mono font-bold tracking-tight text-white tabular-nums">
                        {valorantStats.averageScore !== null ? (
                          <AnimatedNumber value={valorantStats.averageScore} suffix=" pts" />
                        ) : (
                          "—"
                        )}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                        ADR : {valorantStats.adr > 0 ? `${valorantStats.adr} dmg/round` : "—"}
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        initial={reducedMotion ? false : { width: 0 }}
                        animate={{
                          width: valorantStats.averageScore !== null ? `${Math.min(100, Math.round((valorantStats.averageScore / 350) * 100))}%` : "0%",
                        }}
                        transition={{ duration: 0.5, ease: EASE_OUT }}
                        className="h-full bg-cyan-400 rounded-full"
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 backdrop-blur-xl shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                        {tr.headshotPrecision}
                      </span>
                      <Sparkles className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="my-2.5">
                      <p className="text-3xl font-mono font-bold tracking-tight text-white tabular-nums">
                        {valorantStats.headshotPercentage !== null ? (
                          <AnimatedNumber value={valorantStats.headshotPercentage} suffix={currentLang === "fr" ? " %" : "%"} locale={currentLang} />
                        ) : (
                          "—"
                        )}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                        {tr.eliteTier}
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        initial={reducedMotion ? false : { width: 0 }}
                        animate={{
                          width: valorantStats.headshotPercentage !== null ? `${valorantStats.headshotPercentage}%` : "0%",
                        }}
                        transition={{ duration: 0.5, ease: EASE_OUT }}
                        className="h-full bg-purple-400 rounded-full"
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
                            {tr.topCompetitiveAgents}
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {topValorantAgents.length > 0 ? `${topValorantAgents.length} ${tr.recentAgents}` : tr.noAgent}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {topValorantAgents.length > 0 ? (
                          topValorantAgents.map((ag) => {
                            const role = getAgentRole(ag.agentName, isEn);
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
                                      {ag.matches} {ag.matches > 1 ? tr.matches : tr.match} · {formatStatPercent(ag.winRate ?? 0, currentLang)} {currentLang === "en" ? "winrate" : "de victoires"}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right shrink-0 tabular-nums">
                                  <p className="text-xs font-mono font-bold text-white">
                                    {ag.kdRatio !== null ? `${Number(ag.kdRatio).toFixed(2)} KD` : "—"}
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
                              {currentLang === "en" ? "Search a player above to display agent mastery." : "Recherchez un joueur ci-dessus pour afficher la maîtrise des agents."}
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
                        <span>{tr.coachIa}</span>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 sm:p-5 backdrop-blur-xl shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-cyan-400" />
                          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                            {tr.shootingTelemetryImpact}
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {valorantMatches.length} {currentLang === "en" ? (valorantMatches.length > 1 ? "official matches" : "official match") : (valorantMatches.length > 1 ? "parties officielles" : "partie officielle")}
                        </span>
                      </div>

                      {telemetryMetrics ? (
                        <div className="space-y-3">
                          <div className="rounded-lg border border-white/[0.05] bg-black/30 p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-300 font-medium">{tr.impactDistribution}</span>
                              <span className="font-mono text-neutral-400 text-[11px] tabular-nums">
                                {telemetryMetrics.hsPct > 0 ? `${formatStatPercent(telemetryMetrics.hsPct, currentLang)} ${tr.head}` : "—"}
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden flex">
                              <div className="h-full bg-purple-400" style={{ width: `${telemetryMetrics.hsPct}%` }} />
                              <div className="h-full bg-cyan-400" style={{ width: `${telemetryMetrics.bsPct}%` }} />
                              <div className="h-full bg-neutral-600" style={{ width: `${telemetryMetrics.lsPct}%` }} />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-0.5 tabular-nums">
                              <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                                {tr.head} ({formatStatPercent(telemetryMetrics.hsPct, currentLang)})
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                                {tr.body} ({formatStatPercent(telemetryMetrics.bsPct, currentLang)})
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
                                {tr.legs} ({formatStatPercent(telemetryMetrics.lsPct, currentLang)})
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-lg border border-white/[0.05] bg-black/30 p-2.5">
                              <span className="text-[9px] font-mono uppercase text-neutral-400">{tr.telemTotalKills}</span>
                              <p className="text-base font-mono font-bold text-white mt-0.5 tabular-nums">
                                {telemetryMetrics.totalKills}
                              </p>
                            </div>
                            <div className="rounded-lg border border-white/[0.05] bg-black/30 p-2.5">
                              <span className="text-[9px] font-mono uppercase text-neutral-400">{tr.avgPerRound}</span>
                              <p className="text-base font-mono font-bold text-white mt-0.5 tabular-nums">
                                {telemetryMetrics.adr > 0 ? `${Math.round(telemetryMetrics.adr)} ADR` : (valorantCombatSummary.adr ? `${Math.round(Number(valorantCombatSummary.adr))} ADR` : "—")}
                              </p>
                            </div>
                            <div className="rounded-lg border border-white/[0.05] bg-black/30 p-2.5">
                              <span className="text-[9px] font-mono uppercase text-neutral-400">{tr.duelWinrate}</span>
                              <p className="text-base font-mono font-bold text-emerald-400 mt-0.5 tabular-nums">
                                {telemetryMetrics.duelWinrate > 0 ? formatStatPercent(telemetryMetrics.duelWinrate, currentLang) : "—"}
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
                            {currentLang === "en" ? "Telemetry not synchronized" : "Télémétrie non synchronisée"}
                          </p>
                          <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                            {currentLang === "en" ? "Search a Riot ID with official matches to analyze anatomical precision and duels." : "Recherchez un Riot ID avec des parties officielles pour analyser la précision anatomique et les duels."}
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
                        <span>{currentLang === "en" ? "Full Telemetry Report" : "Rapport Télémétrique Complet"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 sm:p-5 backdrop-blur-xl shadow-sm space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-rose-400" />
                      <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                        {tr.competitiveMatchHistory}
                      </h3>
                      <span className="rounded bg-white/[0.06] px-1.5 py-0.2 font-mono text-[10px] text-neutral-300">
                        {filteredValorantMatches.length} {filteredValorantMatches.length > 1 ? tr.matches : tr.match}
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
                            {q.id === "all" ? tr.allQueues : q.id === "competitive" ? tr.competitiveQueue : q.id === "unrated" ? tr.unratedQueue : q.label}
                          </button>
                        ))}
                      </div>

                      {filteredValorantMatches.length > 5 && (
                        <button
                          type="button"
                          onClick={() => setShowAllMatches(!showAllMatches)}
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-neutral-300 hover:text-white transition-all cursor-pointer"
                        >
                          {showAllMatches ? (currentLang === "en" ? "Show less" : "Voir moins") : (currentLang === "en" ? "Show all" : "Tout afficher")}
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
                        const me = m.scoreboard?.players?.find((p) => p.isMe);
                        const seg = m.segments?.[0]?.stats;
                        const kills = me?.stats?.kills ?? seg?.kills?.value ?? 0;
                        const deaths = me?.stats?.deaths ?? seg?.deaths?.value ?? 0;
                        const assists = me?.stats?.assists ?? seg?.assists?.value ?? 0;
                        const kd = deaths > 0 ? (kills / deaths).toFixed(2) : (kills > 0 ? kills.toFixed(2) : "0.00");
                        const totalShots = (me?.stats?.headshots ?? 0) + (me?.stats?.bodyshots ?? 0) + (me?.stats?.legshots ?? 0);
                        const rawHs = seg?.headshotsPercentage?.value !== undefined
                          ? seg.headshotsPercentage.value
                          : (totalShots > 0 ? ((me?.stats?.headshots ?? 0) / totalShots) * 100 : null);
                        const hsFormatted = formatStatPercent(rawHs, currentLang, 1);
                        const teamScore = m.metadata?.score?.team;
                        const oppScore = m.metadata?.score?.opponent;
                        const hasScore = teamScore !== null && teamScore !== undefined && oppScore !== null && oppScore !== undefined;
                        const players = m.scoreboard?.players || [];

                        return (
                          <motion.div
                            key={matchId}
                            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.22,
                              delay: reducedMotion ? 0 : Math.min(idx * 0.03, 0.18),
                              ease: EASE_OUT,
                            }}
                            className={cn(
                              "rounded-xl border bg-black/35 transition-all overflow-hidden",
                              isExpanded
                                ? "border-white/20 bg-black/50 shadow-md"
                                : "border-white/[0.07] hover:border-white/15 hover:bg-black/45"
                            )}
                          >
                            <div
                              onClick={() => setExpandedMatchId(isExpanded ? null : matchId)}
                              className="flex items-center justify-between p-3 sm:px-4 cursor-pointer select-none gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div
                                  className={cn(
                                    "h-9 w-1 rounded-full shrink-0",
                                    isWin
                                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                                      : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                                  )}
                                />

                                {m.metadata?.agentImageUrl ? (
                                  <img
                                    src={m.metadata.agentImageUrl}
                                    alt={m.metadata.agentName || "Agent"}
                                    className="h-9 w-9 rounded-lg object-cover border border-white/10 shrink-0 bg-neutral-900"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] border border-white/10 text-white font-mono text-xs font-bold shrink-0">
                                    {(m.metadata?.agentName || "V")[0]}
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                                      {m.metadata?.mapName || "VALORANT"}
                                    </span>
                                    <span
                                      className={cn(
                                        "rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase shrink-0",
                                        isWin
                                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                          : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                      )}
                                    >
                                      {isWin ? tr.victory : tr.defeat}
                                    </span>
                                  </div>
                                  <p className="text-[10px] font-mono text-neutral-400 mt-0.5 truncate">
                                    {m.metadata?.agentName || "Agent"} · {m.metadata?.modeName || (currentLang === "en" ? "Competitive" : "Compétitif")}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                <div className="w-14 sm:w-16 text-center tabular-nums font-mono">
                                  <span className="text-[9px] text-neutral-500 block uppercase">Score</span>
                                  {hasScore ? (
                                    <span className="text-xs sm:text-sm font-bold">
                                      <span className={isWin ? "text-emerald-400" : "text-rose-400"}>{teamScore}</span>
                                      <span className="text-neutral-500 mx-0.5">:</span>
                                      <span className={!isWin ? "text-emerald-400" : "text-rose-400"}>{oppScore}</span>
                                    </span>
                                  ) : (
                                    <span className="text-xs font-bold text-neutral-400">— : —</span>
                                  )}
                                </div>

                                <div className="w-16 sm:w-20 text-right tabular-nums font-mono">
                                  <span className="text-[9px] text-neutral-500 block uppercase">KDA</span>
                                  <span className="text-xs sm:text-sm font-bold text-neutral-200">
                                    {kills}/{deaths}/{assists}
                                  </span>
                                </div>

                                <div className="hidden sm:block w-12 sm:w-14 text-right tabular-nums font-mono">
                                  <span className="text-[9px] text-neutral-500 block uppercase">KD</span>
                                  <span className={cn("text-xs sm:text-sm font-bold", Number(kd) >= 1.0 ? "text-white" : "text-neutral-400")}>
                                    {kd}
                                  </span>
                                </div>

                                <div className="hidden md:block w-16 sm:w-18 text-right tabular-nums font-mono">
                                  <span className="text-[9px] text-neutral-500 block uppercase">Préc. HS</span>
                                  <span className="text-xs sm:text-sm font-bold text-purple-300">
                                    {hsFormatted}
                                  </span>
                                </div>

                                <div className="w-5 text-right shrink-0 flex items-center justify-end">
                                  <ChevronDown
                                    className={cn(
                                      "h-4 w-4 text-neutral-400 transition-transform duration-200",
                                      isExpanded && "rotate-180 text-white"
                                    )}
                                  />
                                </div>
                              </div>
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                                  transition={{ duration: 0.22, ease: EASE_SNAP }}
                                  className="border-t border-white/[0.06] bg-black/60 p-3 sm:p-4 space-y-3"
                                >
                                  {players.length > 0 ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 border-b border-white/[0.05] pb-1.5">
                                        <span>{currentLang === "en" ? `Match scoreboard (${players.length} players)` : `Tableau des scores (${players.length} joueurs)`}</span>
                                        <span>{currentLang === "en" ? "Combat & Eliminations" : "Combat & Éliminations"}</span>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {players.slice(0, 10).map((p, pi) => (
                                          <div
                                            key={`${p.name}-${pi}`}
                                            className={cn(
                                              "flex items-center justify-between rounded-lg p-2 text-xs font-mono transition-colors",
                                              p.isMe
                                                ? "bg-rose-500/10 border border-rose-500/30 text-white"
                                                : "bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04]"
                                            )}
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className="font-bold text-white truncate max-w-[140px] sm:max-w-[180px]">
                                                {p.name}
                                                {p.isMe && (
                                                  <span className="text-rose-400 ml-1 font-semibold">
                                                    {currentLang === "en" ? "(Me)" : "(Moi)"}
                                                  </span>
                                                )}
                                              </span>
                                              <span className="text-[10px] text-neutral-500 shrink-0">#{p.tag}</span>
                                            </div>
                                            <div className="text-right shrink-0 tabular-nums">
                                              <span className="text-white font-bold">
                                                {p.stats?.kills ?? 0}/{p.stats?.deaths ?? 0}/{p.stats?.assists ?? 0}
                                              </span>
                                              {typeof p.stats?.score === "number" && (
                                                <span className="text-neutral-400 text-[10px] ml-2">
                                                  {Math.round(p.stats.score)} pts
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                                      <div className="rounded-lg bg-white/[0.02] p-2.5 border border-white/[0.05]">
                                        <span className="text-[10px] text-neutral-400 block uppercase">{tr.avgPerRound}</span>
                                        <span className="font-bold text-white mt-0.5 block tabular-nums">
                                          {seg?.adr?.value !== undefined ? `${Math.round(seg.adr.value)} ADR` : "—"}
                                        </span>
                                      </div>
                                      <div className="rounded-lg bg-white/[0.02] p-2.5 border border-white/[0.05]">
                                        <span className="text-[10px] text-neutral-400 block uppercase">{currentLang === "en" ? "Damage delta" : "Delta dégâts"}</span>
                                        <span
                                          className={cn(
                                            "font-bold mt-0.5 block tabular-nums",
                                            (seg?.damageDeltaPerRound?.value ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                                          )}
                                        >
                                          {seg?.damageDeltaPerRound?.value !== undefined
                                            ? `${seg.damageDeltaPerRound.value > 0 ? "+" : ""}${Math.round(seg.damageDeltaPerRound.value)} dmg`
                                            : "—"}
                                        </span>
                                      </div>
                                      <div className="rounded-lg bg-white/[0.02] p-2.5 border border-white/[0.05]">
                                        <span className="text-[10px] text-neutral-400 block uppercase">{currentLang === "en" ? "Combat Score" : "Score Combat"}</span>
                                        <span className="font-bold text-white mt-0.5 block tabular-nums">
                                          {seg?.performanceScore?.value !== undefined
                                            ? `${Math.round(seg.performanceScore.value)} pts`
                                            : seg?.scorePerRound?.value !== undefined
                                            ? `${Math.round(seg.scorePerRound.value)} pts`
                                            : "—"}
                                        </span>
                                      </div>
                                      <div className="rounded-lg bg-white/[0.02] p-2.5 border border-white/[0.05]">
                                        <span className="text-[10px] text-neutral-400 block uppercase">{currentLang === "en" ? "Archive Status" : "Statut d'archive"}</span>
                                        <span className="font-bold text-neutral-300 mt-0.5 block">
                                          {currentLang === "en" ? "Synchronized" : "Synchronisé"}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/20 py-10 px-4 text-center">
                        <Swords className="h-8 w-8 text-neutral-600 mb-2" />
                        <p className="text-xs font-bold text-white uppercase tracking-wider">
                          {tr.noMatchFound}
                        </p>
                        <p className="text-[11px] text-neutral-400 max-w-sm mt-1">
                          {tr.searchPrompt}
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
                    {tr.valEmptyTitle}
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {tr.valEmptyDesc}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto pt-2 text-left">
                  <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-rose-400">
                      <Flame className="h-4 w-4" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">{tr.valPerfTitle}</span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {tr.valPerfDesc}
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-cyan-400">
                      <Target className="h-4 w-4" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">{tr.valTelemTitle}</span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {tr.valTelemDesc}
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-purple-400">
                      <Brain className="h-4 w-4" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">{tr.valCoachTitle}</span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {tr.valCoachDesc}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

            {activeGame === "coach" && (
              <TacticalCoachChatView
                valorantProfile={valorantProfile}
                valorantStats={valorantStats}
                valorantMatches={valorantMatches}
                valorantCombatSummary={valorantCombatSummary}
                topValorantAgents={topValorantAgents}
                telemetryMetrics={telemetryMetrics}
                riotName={riotName}
                riotTag={riotTag}
                onSelectTab={selectGameTab}
                currentLang={currentLang}
              />
            )}

            {activeGame === "telemetry" && (
              <div className="space-y-4">
                {valorantMatches.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-[#10131B]/95 p-8 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                      <Target className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                      {tr.telemPendingTitle}
                    </h3>
                    <p className="max-w-md mx-auto text-xs text-neutral-400">
                      {tr.telemPendingDesc}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/95 p-5 backdrop-blur-xl shadow-md space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-cyan-400" />
                        <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                          {tr.telemHeaderTitle}
                        </h2>
                      </div>
                      <span className="text-xs font-mono text-neutral-400">
                        {currentLang === "en" ? "Sample: " : "Base : "} {valorantMatches.length} {currentLang === "en" ? (valorantMatches.length > 1 ? "Official Matches" : "Official Match") : (valorantMatches.length > 1 ? "Matchs Officiels" : "Match Officiel")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3">
                        <span className="text-[10px] font-mono uppercase text-neutral-400">{tr.telemTotalKills}</span>
                        <p className="text-2xl font-mono font-bold text-white mt-1 tabular-nums">
                          {telemetryMetrics?.totalKills ?? 0} Kills
                        </p>
                        <p className="text-[10px] font-mono text-neutral-500 tabular-nums">
                          {currentLang === "en" ? "Average: " : "Moyenne : "}
                          {currentLang === "fr"
                            ? (valorantMatches.length > 0 ? ((telemetryMetrics?.totalKills ?? 0) / valorantMatches.length).toFixed(1).replace(".", ",") : "0,0")
                            : (valorantMatches.length > 0 ? ((telemetryMetrics?.totalKills ?? 0) / valorantMatches.length).toFixed(1) : "0.0")}{" "}
                          {currentLang === "en" ? "/ match" : "/ partie"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3">
                        <span className="text-[10px] font-mono uppercase text-neutral-400">{tr.telemTotalDeaths}</span>
                        <p className="text-2xl font-mono font-bold text-white mt-1 tabular-nums">
                          {telemetryMetrics?.totalDeaths ?? 0} {currentLang === "en" ? "Deaths" : "Morts"}
                        </p>
                        <p className="text-[10px] font-mono text-neutral-500 tabular-nums">
                          {currentLang === "en" ? "Average: " : "Moyenne : "}
                          {currentLang === "fr"
                            ? (valorantMatches.length > 0 ? ((telemetryMetrics?.totalDeaths ?? 0) / valorantMatches.length).toFixed(1).replace(".", ",") : "0,0")
                            : (valorantMatches.length > 0 ? ((telemetryMetrics?.totalDeaths ?? 0) / valorantMatches.length).toFixed(1) : "0.0")}{" "}
                          {currentLang === "en" ? "/ match" : "/ partie"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3">
                        <span className="text-[10px] font-mono uppercase text-neutral-400">{tr.telemHeadPrecision}</span>
                        <p className="text-2xl font-mono font-bold text-purple-300 mt-1 tabular-nums">
                          {formatStatPercent(telemetryMetrics?.hsPct, currentLang, 1)}
                        </p>
                        <p className="text-[10px] font-mono text-neutral-500">{currentLang === "en" ? "Confirmed impacts" : "Impacts confirmés"}</p>
                      </div>
                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3">
                        <span className="text-[10px] font-mono uppercase text-neutral-400">{tr.telemOverallAdr}</span>
                        <p className="text-2xl font-mono font-bold text-white mt-1 tabular-nums">
                          {telemetryMetrics?.adr ? `${Math.round(telemetryMetrics.adr)} ADR` : (valorantCombatSummary.adr ? `${Math.round(Number(valorantCombatSummary.adr))} ADR` : "—")}
                        </p>
                        <p className="text-[10px] font-mono text-neutral-500">{currentLang === "en" ? "Damage / round" : "Dégâts / round"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-2">
                        <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          {tr.telemSpreadTitle}
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-300">{tr.telemHeadshots}</span>
                            <span className="font-mono font-bold text-purple-300 tabular-nums">
                              {formatStatPercent(telemetryMetrics?.hsPct ?? 0, currentLang)}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full bg-purple-400 rounded-full" style={{ width: `${telemetryMetrics?.hsPct ?? 0}%` }} />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-neutral-400">{tr.telemBodyshots}</span>
                            <span className="font-mono font-bold text-cyan-300 tabular-nums">
                              {formatStatPercent(telemetryMetrics?.bsPct ?? 0, currentLang)}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${telemetryMetrics?.bsPct ?? 0}%` }} />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500">{tr.telemLegshots}</span>
                            <span className="font-mono font-bold text-neutral-400 tabular-nums">
                              {formatStatPercent(telemetryMetrics?.lsPct ?? 0, currentLang)}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full bg-neutral-600 rounded-full" style={{ width: `${telemetryMetrics?.lsPct ?? 0}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-2">
                        <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          {tr.telemMapTitle}
                        </h4>
                        <div className="space-y-2 text-xs">
                          {realMapStats.length > 0 ? (
                            realMapStats.slice(0, 4).map((ms) => (
                              <div
                                key={ms.mapName}
                                className="flex items-center justify-between rounded bg-white/[0.02] border border-white/[0.06] p-2.5"
                              >
                                <span className="font-bold text-white">{ms.mapName}</span>
                                <span className="font-mono text-emerald-400 font-semibold tabular-nums">
                                  {formatStatPercent(ms.winrate, currentLang)} Winrate · {ms.kd} KD ({ms.count} {ms.count > 1 ? tr.matches : tr.match})
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="rounded bg-white/[0.02] border border-white/[0.06] p-2.5 text-neutral-500">
                              {tr.telemNoMap}
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
                      {tr.trainingPendingTitle}
                    </h3>
                    <p className="max-w-md mx-auto text-xs text-neutral-400">
                      {tr.trainingPendingDesc}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/95 p-5 backdrop-blur-xl shadow-md space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-emerald-400" />
                        <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                          {tr.trainingPlanTitle}
                        </h2>
                      </div>
                      <span className="text-xs font-mono text-neutral-400">
                        {tr.trainingRoutineFor} {topValorantAgents[0]?.agentName || "VALORANT"} (30 min / {currentLang === "en" ? "day" : "jour"})
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            {tr.phase1Title}
                          </span>
                          <span className="text-[10px] font-mono font-semibold text-neutral-400 border border-white/10 rounded px-2 py-0.5 bg-white/[0.04]">
                            The Range / Aim Lab
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          {tr.phase1Desc}
                        </p>
                      </div>

                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            {tr.phase2Title}
                          </span>
                          <span className="text-[10px] font-mono font-semibold text-neutral-400 border border-white/10 rounded px-2 py-0.5 bg-white/[0.04]">
                            2 Swiftplay / Deathmatch
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          {topValorantAgents[0]?.agentName
                            ? (currentLang === "en"
                                ? `On ${topValorantAgents[0].agentName}: practice aggressive site entries using utility to break enemy crossfires and force an advantageous duel.`
                                : `Sur ${topValorantAgents[0].agentName} : entraînez les entrées de site agressives avec vos capacités d'utilitaires posées pour briser la ligne ennemie et forcer un duel avantageux.`)
                            : tr.phase2Desc}
                        </p>
                      </div>

                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            {tr.phase3Title}
                          </span>
                          <span className="text-[10px] font-mono font-semibold text-neutral-400 border border-white/10 rounded px-2 py-0.5 bg-white/[0.04]">
                            Dashboard ETHONE
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          {tr.phase3Desc}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeGame === "compare" && (
              <CompareWithFriendView
                myProfile={valorantProfile}
                myStats={valorantStats}
                myMatches={valorantMatches}
                myRiotName={riotName}
                myRiotTag={riotTag}
                isEn={isEn}
              />
            )}

            {activeGame === "live" && (
              <ValorantLiveMatchView
                riotName={riotName}
                riotTag={riotTag}
                valorantProfile={valorantProfile}
                valorantMatches={valorantMatches}
                lang={currentLang}
              />
            )}

            {activeGame === "vct" && (
              <VctMatchesView lang={currentLang} />
            )}

            {activeGame === "lol" && (
              <div className="space-y-4">
                {loading ? (
                  <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-12 backdrop-blur-xl shadow-md text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                    <h3 className="text-base font-bold text-white tracking-wide">
                      {tr.lolLoadingTitle}
                    </h3>
                    <p className="text-xs text-neutral-400 font-mono">
                      {tr.lolLoadingDesc}
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
                              {riotName || (currentLang === "en" ? "Summoner" : "Invocateur")}
                            </h3>
                            <p className="font-mono text-xs text-neutral-400">{riotTag ? `#${riotTag}` : ""}</p>
                            <p className="text-xs font-semibold text-amber-300">
                              {lolMatches.length > 0 ? (currentLang === "en" ? "Competitive SoloQ" : "Compétitif SoloQ") : "SoloQ / Flex"}
                            </p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-400">
                          <span>{tr.lolMatchesAnalyzed}</span>
                          <span className="font-mono font-bold text-white">
                            {lolMatches.length}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 backdrop-blur-xl shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">{tr.lolAverageKda}</span>
                          <Flame className="h-4 w-4 text-amber-400" />
                        </div>
                        <div className="my-2">
                          <p className="text-3xl font-mono font-bold tracking-tight text-white">
                            {lolSummary.total > 0 ? lolSummary.kda : "—"}
                          </p>
                          <p className="text-[11px] font-mono text-neutral-400">
                            {lolSummary.total > 0 ? `${lolSummary.kTotal}K / ${lolSummary.dTotal}D / ${lolSummary.aTotal}A` : (currentLang === "en" ? "0 matches analyzed" : "0 partie analysée")}
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
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">{tr.lolDpm}</span>
                          <Trophy className="h-4 w-4 text-cyan-400" />
                        </div>
                        <div className="my-2">
                          <p className="text-3xl font-mono font-bold tracking-tight text-white">
                            {lolSummary.avgDpm > 0 ? lolSummary.avgDpm : "—"}
                          </p>
                          <p className="text-[11px] font-mono text-neutral-400">
                            {lolSummary.dmgTotal > 0 ? `${lolSummary.dmgTotal.toLocaleString()} ${currentLang === "en" ? "damage dealt" : "dégâts infligés"}` : "—"}
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
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">{tr.lolKp}</span>
                          <Target className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div className="my-2">
                          <p className="text-3xl font-mono font-bold tracking-tight text-white tabular-nums">
                            {lolSummary.avgKp > 0 ? formatStatPercent(lolSummary.avgKp, currentLang) : "—"}
                          </p>
                          <p className="text-[11px] font-mono text-neutral-400">
                            {lolSummary.avgKp > 0 ? (currentLang === "en" ? "Average kill involvement" : "Participation moyenne aux éliminations") : "—"}
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
                          {tr.lolRecentMatches}
                        </h3>
                        <span className="text-[10px] font-mono text-neutral-500">{lolMatches.length} {lolMatches.length > 1 ? tr.matches : tr.match}</span>
                      </div>

                      <div className="space-y-2">
                        {lolMatches.slice(0, 5).map((m, idx) => {
                          const me = m.scoreboard?.players?.find((p) => p.isMe) || m.scoreboard?.players?.[0];
                          const isWin = m.metadata?.result?.toLowerCase() === "victory";
                          const kills = me?.stats?.kills ?? 0;
                          const deaths = me?.stats?.deaths ?? 0;
                          const assists = me?.stats?.assists ?? 0;
                          const kda = deaths > 0 ? ((kills + assists) / deaths).toFixed(2) : (kills + assists > 0 ? (kills + assists).toFixed(2) : "0.00");
                          const champName = me?.character || m.metadata?.agentName;
                          const champIcon = m.metadata?.agentImageUrl || (champName ? getLolChampionIcon(champName) : null);

                          return (
                            <motion.div
                              key={m.metadata?.matchId || idx}
                              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: 0.22,
                                delay: reducedMotion ? 0 : Math.min(idx * 0.03, 0.18),
                                ease: EASE_OUT,
                              }}
                              className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-black/35 p-3 sm:px-4 hover:border-white/15 hover:bg-black/45 transition-all gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
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
                                      {isWin ? tr.victory : tr.defeat}
                                    </span>
                                  </div>
                                  <p className="text-[10px] font-mono text-neutral-400 mt-0.5 truncate">
                                    {m.metadata?.modeName || "Normal Draft"} · {m.metadata?.gameDuration || "28m"}
                                  </p>
                                </div>
                              </div>

                              <div className="w-20 text-right shrink-0 tabular-nums font-mono">
                                <p className="text-xs sm:text-sm font-bold text-white">
                                  {kills}/{deaths}/{assists}
                                </p>
                                <p className="text-[10px] text-neutral-400">{kda} KDA</p>
                              </div>
                            </motion.div>
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
                        {tr.lolEmptyTitle}
                      </h3>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {tr.lolEmptyDesc}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto pt-2 text-left">
                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-1.5">
                        <div className="flex items-center gap-2 text-amber-400">
                          <Flame className="h-4 w-4" />
                          <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">{tr.lolKdaTitle}</span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          {tr.lolKdaDesc}
                        </p>
                      </div>

                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-1.5">
                        <div className="flex items-center gap-2 text-cyan-400">
                          <Trophy className="h-4 w-4" />
                          <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">{tr.lolDpmTitle}</span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          {tr.lolDpmDesc}
                        </p>
                      </div>

                      <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-1.5">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <Target className="h-4 w-4" />
                          <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">{tr.lolKpTitle}</span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          {tr.lolKpDesc}
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
                      {tr.tftModuleTitle}
                    </h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {tr.tftModuleDesc}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setConnectModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-white text-black px-4 py-2 text-xs font-semibold hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer shadow-sm"
                    >
                      <Key className="h-3.5 w-3.5 text-black" />
                      <span>{tr.tftConfigKeyBtn}</span>
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
                    {tr.footerCompliance}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.2 text-[9px] font-mono text-neutral-400">
                    {tr.footerNotAffiliated}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {tr.footerLegalDesc}
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
                <span>{tr.footerCreditsBtn}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed text-neutral-400 font-mono">
            <div className="rounded-lg border border-white/[0.05] bg-black/30 p-3">
              <span className="font-semibold text-neutral-200 block mb-1">
                {isEn ? "Legal Notice:" : tr.footerNoticeTitle}
              </span>
              {isEn
                ? "ETHONE isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc."
                : tr.footerNoticeBody}
            </div>

            <div className="rounded-lg border border-white/[0.05] bg-black/30 p-3 flex flex-col justify-between">
              <div>
                <span className="font-semibold text-neutral-200 block mb-1">
                  {isEn ? "Privacy & Local Storage:" : tr.footerPrivacyTitle}
                </span>
                {isEn
                  ? "No mandatory account, zero trace on external servers. Profile data and Riot ID are stored exclusively in the user's local browser."
                  : tr.footerPrivacyBody}
              </div>
              <div className="pt-2 text-[10px] text-emerald-400 font-bold">
                {isEn
                  ? "✓ 100% Local · Zero Log · Vanguard Fair-Play Compliant"
                  : tr.footerPrivacyBadge}
              </div>
            </div>
          </div>
        </footer>
      </div>

      <RiotTrackerConnectModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        isEn={isEn}
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
        isEn={isEn}
      />

      <RiotAttributionModal
        isOpen={attributionModalOpen}
        onClose={() => setAttributionModalOpen(false)}
        isEn={isEn}
      />
    </div>
  );
}
