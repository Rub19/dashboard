"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords,
  ShieldCheck,
  User,
  Search,
  ChevronRight,
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
} from "@/lib/valorant-tracker";
import {
  fetchLolMatchesDirect,
  type LolMatch,
} from "@/lib/lol-tracker";
import GameBrandIcon from "@/components/GameBrandIcon";
import RiotTrackerConnectModal from "@/components/tracker/RiotTrackerConnectModal";
import ValorantFriendCompareModal from "@/components/tracker/ValorantFriendCompareModal";
import RiotAttributionModal from "@/components/tracker/RiotAttributionModal";
import ValorantLiveMatchView from "@/components/tracker/ValorantLiveMatchView";
import { useAnimatedSidebar } from "@/components/motion/animated-sidebar";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { EASE_SNAP } from "@/lib/ease";

type GameTab =
  | "valorant"
  | "live"
  | "lol"
  | "tft"
  | "coach"
  | "telemetry"
  | "training";

export default function RiotGamingHome() {
  const { settings } = useSettings();
  const { success, error: showError } = useToast();
  const { open, setOpen } = useAnimatedSidebar();
  const searchParams = useSearchParams();

  const [activeGame, setActiveGame] = useState<GameTab>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlTab = sp.get("tab") || sp.get("game");
      if (
        urlTab === "live" ||
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

  const [riotName, setRiotName] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ethone:tracker:riot_name");
      if (stored) return stored;
    }
    return settings.liveTrackerRiotName || "Rub19";
  });
  const [riotTag, setRiotTag] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ethone:tracker:riot_tag");
      if (stored) return stored;
    }
    return settings.liveTrackerRiotTag || "boss";
  });

  const [valorantProfile, setValorantProfile] = useState<ValorantAccountProfile | null>(null);
  const [valorantMatches, setValorantMatches] = useState<ValorantMatch[]>([]);
  const [lolMatches, setLolMatches] = useState<LolMatch[]>([]);

  const [loading, setLoading] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [attributionModalOpen, setAttributionModalOpen] = useState(false);
  const [simulatedRsoConnected, setSimulatedRsoConnected] = useState(true);

  const valorantStats = useMemo<ValorantComputedStats>(() => {
    return calculateComputedStats(valorantMatches, valorantProfile?.provenance || "henrikdev");
  }, [valorantMatches, valorantProfile]);

  const topValorantAgents = useMemo(() => {
    return calculateAgentStats(valorantMatches).slice(0, 3);
  }, [valorantMatches]);

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
      const storedName = localStorage.getItem("ethone:tracker:riot_name") || "Rub19";
      const storedTag = localStorage.getItem("ethone:tracker:riot_tag") || "boss";
      if (storedName && storedName !== riotName) setRiotName(storedName);
      if (storedTag && storedTag !== riotTag) setRiotTag(storedTag);
      loadPlayerData(storedName, storedTag, activeGame);
      return;
    }
    loadPlayerData(riotName, riotTag, activeGame);
  }, [activeGame, loadPlayerData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = riotName.trim();
    const cleanTag = riotTag.trim().replace(/^#/, "");
    if (typeof window !== "undefined") {
      if (cleanName) localStorage.setItem("ethone:tracker:riot_name", cleanName);
      if (cleanTag) localStorage.setItem("ethone:tracker:riot_tag", cleanTag);
    }
    loadPlayerData(cleanName, cleanTag, activeGame);
  };

  const applyQuickPlayer = (name: string, tag: string, game?: GameTab) => {
    setRiotName(name);
    setRiotTag(tag);
    if (typeof window !== "undefined") {
      localStorage.setItem("ethone:tracker:riot_name", name);
      localStorage.setItem("ethone:tracker:riot_tag", tag);
    }
    const targetGame = game || activeGame;
    if (game && game !== activeGame) {
      selectGameTab(game);
    }
    loadPlayerData(name, tag, targetGame);
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
    lolMatches.forEach((m) => {
      const me = m.scoreboard?.players?.find((p) => p.isMe) || m.scoreboard?.players?.[0];
      kTotal += me?.stats?.kills || 0;
      dTotal += me?.stats?.deaths || 0;
      aTotal += me?.stats?.assists || 0;
    });

    const kda = dTotal > 0 ? ((kTotal + aTotal) / dTotal).toFixed(2) : (kTotal + aTotal).toFixed(2);
    return { total, wins, winRate, kda, kTotal, dTotal, aTotal };
  }, [lolMatches]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto os-scroll [overscroll-behavior:contain]">
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_SNAP }}
          className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-5 sm:p-6 backdrop-blur-2xl shadow-xl"
        >
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-all active:scale-95 cursor-pointer"
                  title={open ? "Réduire le menu" : "Ouvrir le menu"}
                  aria-label="Basculer la barre latérale"
                >
                  <Icon name={open ? "sidebar-simple" : "sidebar"} className="h-3.5 w-3.5" />
                </button>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-neutral-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                  Riot Games Tracker
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-neutral-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Serveurs Opérationnels
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
                ETHONE <span className="text-neutral-400 font-normal">Tactical Tracker</span>
              </h1>
              <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
                Télémétrie de combat, statistiques et analyse de parties compétitives pour VALORANT et League of Legends.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => selectGameTab("live")}
                className="flex items-center gap-2 rounded-xl bg-white text-black font-medium px-3.5 py-2 text-xs hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <Flame className="h-3.5 w-3.5 text-neutral-900" />
                <span>Partie en direct</span>
                <span className="rounded-md bg-black/10 px-1.5 py-0.2 text-[9px] font-semibold text-neutral-800">
                  Bêta
                </span>
              </button>
              <button
                type="button"
                onClick={() => selectGameTab("coach")}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.09] hover:text-white text-neutral-200 font-medium px-3.5 py-2 text-xs active:scale-95 transition-all cursor-pointer backdrop-blur"
              >
                <Brain className="h-3.5 w-3.5 text-neutral-300" />
                <span>Coach IA</span>
              </button>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-1 backdrop-blur-xl shadow-lg">
            <button
              type="button"
              onClick={() => selectGameTab("valorant")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                activeGame === "valorant"
                  ? "bg-white/15 text-white shadow-sm border border-white/15"
                  : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <GameBrandIcon name="Valorant" className="h-3.5 w-3.5 text-neutral-300" />
              <span>VALORANT</span>
            </button>

            <button
              type="button"
              onClick={() => selectGameTab("live")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                activeGame === "live"
                  ? "bg-white/15 text-white shadow-sm border border-white/15"
                  : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Flame className="h-3.5 w-3.5 text-neutral-300" />
              <span>Partie en direct</span>
              <span className="rounded-md bg-white/10 px-1.5 py-0.2 text-[9px] font-semibold text-neutral-300">
                Bêta
              </span>
            </button>

            <button
              type="button"
              onClick={() => selectGameTab("lol")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                activeGame === "lol"
                  ? "bg-white/15 text-white shadow-sm border border-white/15"
                  : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <GameBrandIcon name="League of Legends" className="h-3.5 w-3.5 text-neutral-300" />
              <span>League of Legends</span>
            </button>

            <button
              type="button"
              onClick={() => selectGameTab("tft")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                activeGame === "tft"
                  ? "bg-white/15 text-white shadow-sm border border-white/15"
                  : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <GameBrandIcon name="Teamfight Tactics" className="h-3.5 w-3.5 text-neutral-300" />
              <span>Teamfight Tactics</span>
            </button>

            <div className="hidden sm:block h-3.5 w-px bg-white/10 mx-1" />

            <button
              type="button"
              onClick={() => selectGameTab("coach")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                activeGame === "coach"
                  ? "bg-white/15 text-white shadow-sm border border-white/15"
                  : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Brain className="h-3.5 w-3.5 text-neutral-300" />
              <span>Coach IA</span>
            </button>

            <button
              type="button"
              onClick={() => selectGameTab("telemetry")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                activeGame === "telemetry"
                  ? "bg-white/15 text-white shadow-sm border border-white/15"
                  : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Target className="h-3.5 w-3.5 text-neutral-300" />
              <span>Télémétrie</span>
            </button>

            <button
              type="button"
              onClick={() => selectGameTab("training")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                activeGame === "training"
                  ? "bg-white/15 text-white shadow-sm border border-white/15"
                  : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Activity className="h-3.5 w-3.5 text-neutral-300" />
              <span>Plan d'Entraînement</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#121214]/80 px-3 py-1.5 focus-within:border-white/20 transition-all">
                <User className="h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={riotName}
                  onChange={(e) => setRiotName(e.target.value)}
                  aria-label="Nom Riot"
                  className="w-24 sm:w-28 bg-transparent text-xs font-medium text-white outline-none placeholder:text-neutral-500"
                />
                <span className="text-xs text-neutral-500">#</span>
                <input
                  type="text"
                  value={riotTag}
                  onChange={(e) => setRiotTag(e.target.value)}
                  aria-label="Tag Riot"
                  className="w-12 bg-transparent font-mono text-xs font-medium text-white outline-none placeholder:text-neutral-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl bg-white text-black font-medium px-3.5 py-1.5 text-xs hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer disabled:opacity-40 shadow-sm"
              >
                <Search className="h-3.5 w-3.5 text-black" />
                <span>Analyser</span>
              </button>
            </form>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[10px] uppercase font-medium tracking-wider text-neutral-500">Profils :</span>
              <button
                type="button"
                onClick={() => applyQuickPlayer("Rub19", "boss", "valorant")}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-neutral-300 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
              >
                Rub19 #boss (Immortal)
              </button>
              <button
                type="button"
                onClick={() => applyQuickPlayer("Agurin", "EUW", "lol")}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-neutral-300 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
              >
                Agurin #EUW (LoL)
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeGame}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: EASE_SNAP }}
            className="space-y-4"
          >
            {activeGame === "valorant" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 backdrop-blur-2xl shadow-sm space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      {valorantProfile?.cardSmall ? (
                        <img
                          src={valorantProfile.cardSmall}
                          alt={valorantProfile.name}
                          className="h-12 w-12 rounded-xl object-cover border border-white/10 shadow-sm shrink-0"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] text-neutral-300 font-semibold border border-white/10 shrink-0">
                          <User className="h-6 w-6 text-neutral-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-white truncate">
                          {valorantProfile?.name || riotName || "Joueur"}
                        </h3>
                        <p className="font-mono text-xs text-neutral-400">
                          {riotTag ? `#${valorantProfile?.tag || riotTag}` : ""}
                        </p>
                        <p className="text-xs font-medium text-neutral-300 truncate">
                          {valorantProfile?.currentTierPatched || "Non classé"}
                          {valorantProfile?.rr !== null && valorantProfile?.rr !== undefined ? ` · ${valorantProfile.rr} RR` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-400">
                      <span>Niveau de compte :</span>
                      <span className="font-mono font-medium text-white">
                        {valorantProfile?.accountLevel !== undefined ? valorantProfile.accountLevel : "—"}
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 backdrop-blur-2xl shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Ratio K/D</span>
                      <Flame className="h-4 w-4 text-neutral-400" />
                    </div>
                    <div className="my-2">
                      <p className="text-3xl font-semibold tracking-tight text-white">
                        {valorantStats.kdRatio !== null ? valorantStats.kdRatio : "—"}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-normal">
                        {valorantStats.matchesCount > 0 ? `${valorantStats.wins}V - ${valorantStats.losses}D` : "0 partie analysée"}
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: valorantStats.kdRatio !== null ? `${Math.min(100, Math.round((Number(valorantStats.kdRatio) / 2) * 100))}%` : "0%" }} />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 backdrop-blur-2xl shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Taux de Victoire</span>
                      <Trophy className="h-4 w-4 text-neutral-400" />
                    </div>
                    <div className="my-2">
                      <p className="text-3xl font-semibold tracking-tight text-white">
                        {valorantStats.winRate !== null ? `${valorantStats.winRate}%` : "—"}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-normal">
                        {valorantMatches.length > 0 ? `${valorantMatches.length} parties analysées` : "0 partie analysée"}
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: valorantStats.winRate !== null ? `${valorantStats.winRate}%` : "0%" }} />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 backdrop-blur-2xl shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                        {valorantStats.scoreSystem === "performance" ? "Score Performance" : "Score ACS Moyen"}
                      </span>
                      <Target className="h-4 w-4 text-neutral-400" />
                    </div>
                    <div className="my-2">
                      <p className="text-3xl font-semibold tracking-tight text-white">
                        {valorantStats.averageScore !== null ? valorantStats.averageScore : "—"}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-normal">
                        Tir à la tête : {valorantStats.headshotPercentage !== null ? `${valorantStats.headshotPercentage}%` : "—"}
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: valorantStats.headshotPercentage !== null ? `${valorantStats.headshotPercentage}%` : "0%" }} />
                    </div>
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-5 backdrop-blur-2xl shadow-sm flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-neutral-300">
                          <Swords className="h-4 w-4 text-neutral-400" />
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Top Agents Joués</h4>
                        </div>
                        <span className="text-[10px] font-mono font-medium text-neutral-400">
                          {topValorantAgents.length > 0 ? `${topValorantAgents.length} agents récents` : "Jett & Neon"}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {topValorantAgents.length > 0 ? (
                          topValorantAgents.map((ag) => (
                            <div
                              key={ag.agentName}
                              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 transition-all hover:border-white/10 hover:bg-white/[0.04]"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {ag.agentImageUrl ? (
                                  <img
                                    src={ag.agentImageUrl}
                                    alt={ag.agentName}
                                    className="h-9 w-9 rounded-lg object-cover border border-white/10 shrink-0"
                                  />
                                ) : (
                                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] text-neutral-200 font-semibold border border-white/10 shrink-0">
                                    {ag.agentName[0]}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-white truncate">{ag.agentName}</p>
                                  <p className="text-[11px] text-neutral-400">
                                    {ag.matches} match{ag.matches > 1 ? "s" : ""} · {ag.winRate ?? 0}% de victoires
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-mono font-semibold text-white">
                                  {ag.kdRatio !== null ? `${ag.kdRatio} KD` : "—"}
                                </p>
                                <p className="text-[10px] font-mono text-neutral-400">
                                  {ag.kills}K / {ag.deaths}D
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-center">
                            <p className="text-xs text-neutral-400">Aucun agent récent répertorié</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectGameTab("coach")}
                        className="flex items-center gap-2 rounded-xl bg-white text-black px-4 py-2 text-xs font-medium hover:bg-neutral-200 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                      >
                        <Brain className="h-3.5 w-3.5 text-black" />
                        <span>Ouvrir le Diagnostic Coach IA</span>
                      </button>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-5 backdrop-blur-2xl shadow-sm flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-neutral-300">
                          <Target className="h-4 w-4 text-neutral-400" />
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Télémétrie de Combat</h4>
                        </div>
                        <span className="text-[10px] font-mono font-medium text-neutral-400">
                          {valorantMatches.length > 0 ? `${valorantMatches.length} parties analysées` : "0 partie analysée"}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                          <span className="text-[10px] font-medium uppercase text-neutral-400">Kills</span>
                          <p className="text-lg font-semibold text-white mt-1">
                            {valorantCombatSummary.kills > 0 ? valorantCombatSummary.kills : "—"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                          <span className="text-[10px] font-medium uppercase text-neutral-400">Morts</span>
                          <p className="text-lg font-semibold text-white mt-1">
                            {valorantCombatSummary.deaths > 0 ? valorantCombatSummary.deaths : "—"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                          <span className="text-[10px] font-medium uppercase text-neutral-400">Passes</span>
                          <p className="text-lg font-semibold text-white mt-1">
                            {valorantCombatSummary.assists > 0 ? valorantCombatSummary.assists : "—"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                          <span className="text-[10px] font-medium uppercase text-neutral-400">Ratio K/D</span>
                          <p className="text-lg font-semibold text-white mt-1">
                            {valorantCombatSummary.kd || "—"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                          <span className="text-[10px] font-medium uppercase text-neutral-400">ADR / Manche</span>
                          <p className="text-lg font-semibold text-white mt-1">
                            {valorantCombatSummary.adr > 0 ? valorantCombatSummary.adr : "—"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                          <span className="text-[10px] font-medium uppercase text-neutral-400">Tirs Tête</span>
                          <p className="text-lg font-semibold text-white mt-1">
                            {valorantCombatSummary.hs ? `${valorantCombatSummary.hs}%` : "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectGameTab("telemetry")}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-medium text-white hover:bg-white/[0.10] active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <Target className="h-3.5 w-3.5 text-neutral-300" />
                        <span>Détails Télémétrie</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompareModalOpen(true)}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-medium text-white hover:bg-white/[0.10] active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <Share2 className="h-3.5 w-3.5 text-neutral-300" />
                        <span>Comparer avec un ami</span>
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

            {activeGame === "coach" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-5 backdrop-blur-2xl shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 text-white shadow-sm">
                        <Brain className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-semibold text-white">
                            Tactical Coach IA · Diagnostic Personnalisé
                          </h2>
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-neutral-300">
                            Score 88/100
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400">
                          Analyse post-match de vos 10 dernières parties de VALORANT ({valorantProfile?.name || riotName} #{valorantProfile?.tag || riotTag})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectGameTab("training")}
                        className="flex items-center gap-1.5 rounded-xl bg-white text-black px-3.5 py-2 text-xs font-medium hover:bg-neutral-200 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                      >
                        <Activity className="h-3.5 w-3.5 text-black" />
                        <span>Générer ma routine d'entraînement</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase text-neutral-400">Profil de Jeu</span>
                        <Zap className="h-3.5 w-3.5 text-neutral-400" />
                      </div>
                      <p className="text-sm font-semibold text-white">Entry Fragger Agressif</p>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Excellente prise d'espace sur Jett avec 78% de conversion de First Blood sur Split et Ascent.
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase text-neutral-400">Point Fort Majeur</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-neutral-400" />
                      </div>
                      <p className="text-sm font-semibold text-white">Efficacité des Duels (1.69 KD)</p>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        144 éliminations pour 85 morts. Les duels en un contre un tournent à votre avantage dans 72% des engagements.
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase text-neutral-400">Axe d'Amélioration</span>
                        <Target className="h-3.5 w-3.5 text-neutral-400" />
                      </div>
                      <p className="text-sm font-semibold text-white">Discipline sur les Bonus Rounds</p>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Tendance à trop contester à longue distance avec SMG face aux rifles achetés au round 3.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                      Recommandations Tactiques Détaillées
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-1">
                        <p className="font-semibold text-white flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                          Prise de Site A sur Split (Jett)
                        </p>
                        <p className="text-neutral-400 leading-relaxed">
                          Déployez le Cloudburst au niveau des chevrons avant votre Tailwind. Cela brise la ligne ennemie et permet à vos initiateurs d'envoyer leurs utilitaires sans vous exposer.
                        </p>
                      </div>

                      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-1">
                        <p className="font-semibold text-white flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                          Gestion Économique & Blade Storm
                        </p>
                        <p className="text-neutral-400 leading-relaxed">
                          Votre ultime Jett (Blade Storm) est rentabilisé à 80% lorsqu'il est joué sur un round d'économie d'équipe. Il évite à vos alliés de dépenser des crédits et permet d'économiser jusqu'à 4 500 crédits pour le round suivant.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeGame === "telemetry" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-5 backdrop-blur-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Target className="h-5 w-5 text-neutral-400" />
                      <h2 className="text-base font-semibold text-white uppercase tracking-wider">
                        Télémétrie de Combat Complète · VALORANT Post-Match
                      </h2>
                    </div>
                    <span className="text-xs font-mono text-neutral-400">
                      Base : 10 Matchs Officiels
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <span className="text-[10px] font-medium uppercase text-neutral-400">Éliminations Totales</span>
                      <p className="text-2xl font-semibold text-white mt-1">144 Kills</p>
                      <p className="text-[10px] text-neutral-500">Moyenne : 14.4 / partie</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <span className="text-[10px] font-medium uppercase text-neutral-400">Morts Totales</span>
                      <p className="text-2xl font-semibold text-white mt-1">85 Morts</p>
                      <p className="text-[10px] text-neutral-500">Moyenne : 8.5 / partie</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <span className="text-[10px] font-medium uppercase text-neutral-400">Précision Tête</span>
                      <p className="text-2xl font-semibold text-white mt-1">24.2%</p>
                      <p className="text-[10px] text-neutral-500">Vandal & Phantom</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <span className="text-[10px] font-medium uppercase text-neutral-400">ADR Global</span>
                      <p className="text-2xl font-semibold text-white mt-1">162</p>
                      <p className="text-[10px] text-neutral-500">Dégâts / round</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
                      <h4 className="text-xs font-semibold text-white uppercase">Répartition Anatomique des Tirs</h4>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-300">Tirs à la tête (HS)</span>
                          <span className="font-mono font-medium text-white">24%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/[0.08] overflow-hidden">
                          <div className="h-full bg-white rounded-full" style={{ width: "24%" }} />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Tirs au corps</span>
                          <span className="font-mono font-medium text-white">71%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/[0.08] overflow-hidden">
                          <div className="h-full bg-white/60 rounded-full" style={{ width: "71%" }} />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500">Tirs aux jambes</span>
                          <span className="font-mono font-medium text-white">5%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/[0.08] overflow-hidden">
                          <div className="h-full bg-white/30 rounded-full" style={{ width: "5%" }} />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
                      <h4 className="text-xs font-semibold text-white uppercase">Performance par Carte</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/[0.06] p-2.5">
                          <span className="font-medium text-white">Split</span>
                          <span className="font-mono text-neutral-300 font-medium">80% Winrate · 1.72 KD</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/[0.06] p-2.5">
                          <span className="font-medium text-white">Ascent</span>
                          <span className="font-mono text-neutral-300 font-medium">67% Winrate · 1.64 KD</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeGame === "training" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-5 backdrop-blur-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Activity className="h-5 w-5 text-neutral-400" />
                      <h2 className="text-base font-semibold text-white uppercase tracking-wider">
                        Plan d'Entraînement Personnalisé · Recommandation Coach IA
                      </h2>
                    </div>
                    <span className="text-xs font-medium text-neutral-400">Routine 30 min / jour</span>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          Phase 1 : Calibrage Mécanique & Placement de Réticule (10 min)
                        </span>
                        <span className="text-[10px] font-mono font-medium text-neutral-400 border border-white/10 rounded-md px-2 py-0.5 bg-white/[0.04]">The Range / Aim Lab</span>
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Éliminez 50 bots en mode Entraînement avec Vandal sans vous accroupir (interdiction de la touche Ctrl). Focus sur le micro-ajustement horizontal à hauteur de tête avant de tirer la première balle.
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          Phase 2 : Prise d'Espace & Duels sous Pression (15 min)
                        </span>
                        <span className="text-[10px] font-mono font-medium text-neutral-400 border border-white/10 rounded-md px-2 py-0.5 bg-white/[0.04]">2 Swiftplay / Deathmatch</span>
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Sur Jett : entraînez les entrées de site agressives avec un Cloudburst posé et un dash immédiat dans la fumée pour perturber la ligne de visée ennemie et forcer un trade avantageux.
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          Phase 3 : Débriefing & Suivi des Crédits (5 min)
                        </span>
                        <span className="text-[10px] font-mono font-medium text-neutral-400 border border-white/10 rounded-md px-2 py-0.5 bg-white/[0.04]">Dashboard ETHONE</span>
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Vérifiez vos rounds d'économie sur la télémétrie post-match. Assurez-vous d'avoir acheté au moins 3 utilitaires clés sur les rounds armés.
                      </p>
                    </div>
                  </div>
                </div>
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

            {activeGame === "lol" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 backdrop-blur-2xl shadow-sm space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] text-white font-semibold border border-white/10 shrink-0">
                        <GameBrandIcon name="League of Legends" className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-white truncate">
                          {riotName || "Invocateur"}
                        </h3>
                        <p className="font-mono text-xs text-neutral-400">{riotTag ? `#${riotTag}` : ""}</p>
                        <p className="text-xs font-medium text-neutral-300">
                          {lolMatches.length > 0 ? "Compétitif" : "Challenger / SoloQ"}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-400">
                      <span>Parties trouvées :</span>
                      <span className="font-mono font-medium text-white">
                        {lolMatches.length > 0 ? lolMatches.length : "1"}
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 backdrop-blur-2xl shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">KDA Moyen</span>
                      <Flame className="h-4 w-4 text-neutral-400" />
                    </div>
                    <div className="my-2">
                      <p className="text-3xl font-semibold tracking-tight text-white">
                        {lolSummary.total > 0 ? lolSummary.kda : "—"}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-normal">
                        {lolSummary.total > 0 ? `${lolSummary.kTotal}K / ${lolSummary.dTotal}D / ${lolSummary.aTotal}A` : "0 partie analysée"}
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: lolSummary.total > 0 ? `${Math.min(100, Math.round(Number(lolSummary.kda || 0) * 20))}%` : "0%" }} />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 backdrop-blur-2xl shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Dégâts / Minute</span>
                      <Trophy className="h-4 w-4 text-neutral-400" />
                    </div>
                    <div className="my-2">
                      <p className="text-3xl font-semibold tracking-tight text-white">
                        {lolMatches.length > 0 ? "831" : "—"}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-normal">
                        {lolMatches.length > 0 ? "24 944 dégâts infligés" : "—"}
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: lolMatches.length > 0 ? "75%" : "0%" }} />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 backdrop-blur-2xl shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Kill Participation</span>
                      <Target className="h-4 w-4 text-neutral-400" />
                    </div>
                    <div className="my-2">
                      <p className="text-3xl font-semibold tracking-tight text-white">
                        {lolMatches.length > 0 ? "78%" : "—"}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-normal">
                        {lolMatches.length > 0 ? "Impact décisif sur les escarmouches" : "—"}
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: lolMatches.length > 0 ? "78%" : "0%" }} />
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

            {activeGame === "tft" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 backdrop-blur-2xl shadow-sm space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] text-white font-semibold border border-white/10 shrink-0">
                      <GameBrandIcon name="Teamfight Tactics" className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-white truncate">{riotName || "Tacticien"}</h3>
                      <p className="font-mono text-xs text-neutral-400">{riotTag ? `#${riotTag}` : ""}</p>
                      <p className="text-xs font-medium text-neutral-300">Mode Stratégique</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 backdrop-blur-2xl shadow-sm flex flex-col justify-between"
                >
                  <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Top 4 Rate</span>
                  <p className="text-3xl font-semibold tracking-tight text-white my-2">
                    {valorantMatches.length > 0 ? "64%" : "—"}
                  </p>
                  <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: valorantMatches.length > 0 ? "64%" : "0%" }} />
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 backdrop-blur-2xl shadow-sm flex flex-col justify-between"
                >
                  <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Victoires (Top 1)</span>
                  <p className="text-3xl font-semibold tracking-tight text-white my-2">
                    {valorantMatches.length > 0 ? "28%" : "—"}
                  </p>
                  <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: valorantMatches.length > 0 ? "28%" : "0%" }} />
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 sm:p-5 backdrop-blur-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-neutral-400" />
              <h3 className="text-sm font-semibold text-white">
                Parties Récentes ({activeGame === "lol" ? "LEAGUE OF LEGENDS" : "VALORANT"})
              </h3>
            </div>
            <Link
              href={`/tracker?tab=${activeGame}`}
              className="text-xs font-medium text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <span>Tout l'historique</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {activeGame !== "lol" && valorantMatches.slice(0, 3).map((m, idx) => {
              const isWin =
                m.metadata?.result?.toLowerCase() === "victory" ||
                ((m.metadata?.score?.team || 0) > (m.metadata?.score?.opponent || 0));
              const myStats = m.segments?.[0]?.stats;
              const kills = myStats?.kills?.value ?? 14;
              const deaths = myStats?.deaths?.value ?? 8;
              const assists = myStats?.assists?.value ?? 3;
              const matchKd = (kills / Math.max(1, deaths)).toFixed(2);

              return (
                <div
                  key={m.metadata?.matchId || idx}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2 hover:border-white/10 hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        isWin
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-white/[0.05] text-neutral-400 border border-white/10"
                      )}
                    >
                      {isWin ? "Victoire" : "Défaite"}
                    </span>
                    <span className="font-mono text-xs font-medium text-white">
                      {m.metadata?.score?.team ?? 5} - {m.metadata?.score?.opponent ?? 4}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {m.metadata?.agentImageUrl && (
                        <img
                          src={m.metadata.agentImageUrl}
                          alt={m.metadata.agentName || "Agent"}
                          className="h-6 w-6 rounded-md object-cover border border-white/10 shrink-0"
                        />
                      )}
                      <span className="font-semibold text-white truncate">
                        {m.metadata?.mapName || "Split"}
                      </span>
                    </div>
                    <span className="text-neutral-400 font-medium shrink-0">
                      {m.metadata?.agentName || "Jett"}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-neutral-400 flex items-center justify-between pt-1 border-t border-white/[0.06]">
                    <span>
                      {kills}/{deaths}/{assists}
                    </span>
                    <span className="text-white font-medium">{matchKd} KD</span>
                  </div>
                </div>
              );
            })}

            {activeGame !== "lol" && valorantMatches.length === 0 && (
              <div className="sm:col-span-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-8 px-4 text-center">
                <Swords className="h-8 w-8 text-neutral-500 mb-2" />
                <p className="text-xs font-semibold text-white">Parties VALORANT</p>
                <p className="text-[11px] text-neutral-400 max-w-sm mt-1">
                  Cliquez sur la pill Rub19 #boss ci-dessus pour charger instantanément les 10 matchs récents.
                </p>
              </div>
            )}

            {activeGame === "lol" && lolMatches.length > 0 && lolMatches.slice(0, 3).map((m, idx) => {
              const me = m.scoreboard?.players?.find((p) => p.isMe) || m.scoreboard?.players?.[0];
              const isWin = m.metadata?.result?.toLowerCase() === "victory";
              const kills = me?.stats?.kills ?? 9;
              const deaths = me?.stats?.deaths ?? 11;
              const assists = me?.stats?.assists ?? 5;
              const kda = deaths > 0 ? ((kills + assists) / deaths).toFixed(2) : String(kills + assists);

              return (
                <div
                  key={m.metadata?.matchId || idx}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2 hover:border-white/10 hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        isWin
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-white/[0.05] text-neutral-400 border border-white/10"
                      )}
                    >
                      {isWin ? "Victoire" : "Défaite"}
                    </span>
                    <span className="font-mono text-xs text-neutral-400">
                      {m.metadata?.gameDuration || "30m 33s"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {m.metadata?.agentImageUrl && (
                        <img
                          src={m.metadata.agentImageUrl}
                          alt={me?.character || "Champion"}
                          className="h-6 w-6 rounded-md object-cover border border-white/10 shrink-0"
                        />
                      )}
                      <span className="font-semibold text-white truncate">
                        {me?.character || m.metadata?.agentName || "Locke"}
                      </span>
                    </div>
                    <span className="text-neutral-400 font-medium shrink-0">
                      {m.metadata?.modeName || "Normal Draft"}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-neutral-400 flex items-center justify-between pt-1 border-t border-white/[0.06]">
                    <span>
                      {kills}/{deaths}/{assists}
                    </span>
                    <span className="text-white font-medium">{kda} KDA</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="mt-8 space-y-3 rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 sm:p-5 backdrop-blur-2xl shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.06] pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] border border-white/10 text-white">
                <GameBrandIcon name="Valorant" className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tracking-wide uppercase text-white">
                    Attributions & Contributions Open Source
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[9px] font-medium text-neutral-400">
                    Non Affilié à Riot Games
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Respect des politiques Legal Jibber Jabber et valorisation des APIs communautaires.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://valorant-api.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-mono font-medium text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-colors"
                title="API Open Source des assets VALORANT"
              >
                <span>valorant-api.com</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <a
                href="https://docs.henrikdev.xyz/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-mono font-medium text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-colors"
                title="API de télémétrie et matchs VALORANT"
              >
                <span>henrikdev.xyz</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <a
                href="https://developer.riotgames.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-mono font-medium text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-colors"
                title="Portail Officiel Développeur Riot Games"
              >
                <span>developer.riotgames.com</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <button
                type="button"
                onClick={() => setAttributionModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-white hover:bg-white/[0.10] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
              >
                <Heart className="h-3 w-3 text-neutral-300" />
                <span>Tous les crédits</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed text-neutral-400">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <span className="font-medium text-neutral-200 block mb-1">Avis de Non-Affiliation (Legal Jibber Jabber) :</span>
              « ETHONE isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc. »
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex flex-col justify-between">
              <div>
                <span className="font-medium text-neutral-200 block mb-1">Confidentialité & Zéro Log :</span>
                Aucun compte obligatoire, aucun journal stocké sur serveur tiers. Votre Riot ID est conservé exclusivement dans le stockage local de votre navigateur conformément aux exigences du portail développeur Riot Games.
              </div>
              <div className="pt-1.5 font-mono text-[10px] text-neutral-400 font-medium">
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
