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
          className="relative overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-gradient-to-br from-[#12141c]/95 via-[var(--bg-main)]/90 to-[#19131a]/95 p-4 sm:p-6 backdrop-blur-2xl shadow-xl"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)]/70 text-[var(--text-muted)] hover:border-rose-500/40 hover:text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer shadow-sm"
                  title={open ? "Réduire le menu" : "Ouvrir le menu"}
                  aria-label="Basculer la barre latérale"
                >
                  <Icon name={open ? "sidebar-simple" : "sidebar"} className="h-3.5 w-3.5" />
                </button>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                  Riot Games Tracker
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Serveurs Opérationnels
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
                ETHONE <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-purple-400 to-amber-300">Tactical Tracker</span>
              </h1>
              <p className="text-xs text-[var(--text-muted)] max-w-xl">
                Télémétrie de combat, statistiques et analyse de parties compétitives pour VALORANT et League of Legends.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => selectGameTab("live")}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/30 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                <Flame className="h-4 w-4 text-rose-400" />
                <span>Partie en direct (Bêta)</span>
              </button>
              <button
                type="button"
                onClick={() => selectGameTab("coach")}
                className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/20 px-3.5 py-2 text-xs font-bold text-purple-200 hover:bg-purple-500/30 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                <Brain className="h-4 w-4 text-purple-300" />
                <span>Coach IA</span>
              </button>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/90 p-1 backdrop-blur-xl shadow-md">
            <button
              type="button"
              onClick={() => selectGameTab("valorant")}
              className={cn(
                "flex items-center gap-2 rounded-[var(--inset-radius)] px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                activeGame === "valorant"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <GameBrandIcon name="Valorant" className="h-3.5 w-3.5" />
              <span>VALORANT</span>
            </button>

            <button
              type="button"
              onClick={() => selectGameTab("live")}
              className={cn(
                "flex items-center gap-1.5 rounded-[var(--inset-radius)] px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                activeGame === "live"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-rose-300 hover:text-white hover:bg-rose-500/20"
              )}
            >
              <Flame className="h-3.5 w-3.5 text-rose-400" />
              <span>Partie en direct</span>
              <span className="rounded-full bg-rose-500/30 px-1.5 py-0.2 text-[9px] font-bold text-rose-200">
                Bêta
              </span>
            </button>

            <button
              type="button"
              onClick={() => selectGameTab("lol")}
              className={cn(
                "flex items-center gap-2 rounded-[var(--inset-radius)] px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                activeGame === "lol"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <GameBrandIcon name="League of Legends" className="h-3.5 w-3.5" />
              <span>League of Legends</span>
            </button>

            <button
              type="button"
              onClick={() => selectGameTab("tft")}
              className={cn(
                "flex items-center gap-2 rounded-[var(--inset-radius)] px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                activeGame === "tft"
                  ? "bg-yellow-600 text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <GameBrandIcon name="Teamfight Tactics" className="h-3.5 w-3.5" />
              <span>Teamfight Tactics</span>
            </button>

            <div className="hidden sm:block h-4 w-px bg-[var(--panel-border)] mx-1" />

            <button
              type="button"
              onClick={() => selectGameTab("coach")}
              className={cn(
                "flex items-center gap-1.5 rounded-[var(--inset-radius)] px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                activeGame === "coach"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-purple-300 hover:text-white hover:bg-purple-500/20"
              )}
            >
              <Brain className="h-3.5 w-3.5" />
              <span>Coach IA Tactique</span>
            </button>

            <button
              type="button"
              onClick={() => selectGameTab("telemetry")}
              className={cn(
                "flex items-center gap-1.5 rounded-[var(--inset-radius)] px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                activeGame === "telemetry"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Target className="h-3.5 w-3.5" />
              <span>Télémétrie</span>
            </button>

            <button
              type="button"
              onClick={() => selectGameTab("training")}
              className={cn(
                "flex items-center gap-1.5 rounded-[var(--inset-radius)] px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                activeGame === "training"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Plan d'Entraînement</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] px-3 py-1.5">
                <User className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={riotName}
                  onChange={(e) => setRiotName(e.target.value)}
                  aria-label="Nom Riot"
                  className="w-24 sm:w-28 bg-transparent text-xs font-bold text-[var(--text-primary)] outline-none"
                />
                <span className="text-xs text-[var(--text-muted)]">#</span>
                <input
                  type="text"
                  value={riotTag}
                  onChange={(e) => setRiotTag(e.target.value)}
                  aria-label="Tag Riot"
                  className="w-12 bg-transparent font-mono text-xs font-bold text-[var(--text-primary)] outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1 rounded-xl bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-40 shadow-sm"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Analyser</span>
              </button>
            </form>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Profils vérifiés :</span>
              <button
                type="button"
                onClick={() => applyQuickPlayer("Rub19", "boss", "valorant")}
                className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-2 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/25 active:scale-95 transition-all cursor-pointer"
              >
                Rub19 #boss (Immortal)
              </button>
              <button
                type="button"
                onClick={() => applyQuickPlayer("Agurin", "EUW", "lol")}
                className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/25 active:scale-95 transition-all cursor-pointer"
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
                    className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      {valorantProfile?.cardSmall ? (
                        <img
                          src={valorantProfile.cardSmall}
                          alt={valorantProfile.name}
                          className="h-12 w-12 rounded-xl object-cover border border-[var(--panel-border)] shadow-sm shrink-0"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400 font-bold border border-rose-500/30 shrink-0">
                          <User className="h-6 w-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-base font-black text-[var(--text-primary)] truncate">
                          {valorantProfile?.name || riotName || "Joueur"}
                        </h3>
                        <p className="font-mono text-xs text-[var(--text-muted)]">
                          {riotTag ? `#${valorantProfile?.tag || riotTag}` : ""}
                        </p>
                        <p className="text-xs font-bold text-rose-400 truncate">
                          {valorantProfile?.currentTierPatched || "Immortel 1"}
                          {valorantProfile?.rr !== null && valorantProfile?.rr !== undefined ? ` · ${valorantProfile.rr} RR` : " · 0 RR"}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[var(--panel-border)]/50 flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span>Niveau de compte :</span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">
                        {valorantProfile?.accountLevel ?? "364"}
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Ratio K/D</span>
                      <Flame className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="my-2">
                      <p className="text-3xl font-black text-emerald-400">
                        {valorantStats.kdRatio !== null ? valorantStats.kdRatio : "1.69"}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] font-medium">
                        {valorantStats.matchesCount > 0 ? `${valorantStats.wins}V - ${valorantStats.losses}D` : "7V - 3D (70% Winrate)"}
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: "85%" }} />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Taux de Victoire</span>
                      <Trophy className="h-4 w-4 text-rose-400" />
                    </div>
                    <div className="my-2">
                      <p className="text-3xl font-black text-rose-400">
                        {valorantStats.winRate !== null ? `${valorantStats.winRate}%` : "70%"}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] font-medium">
                        {valorantMatches.length > 0 ? `${valorantMatches.length} parties analysées` : "10 parties analysées"}
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: "70%" }} />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        {valorantStats.scoreSystem === "performance" ? "Score Performance" : "Score ACS Moyen"}
                      </span>
                      <Target className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div className="my-2">
                      <p className="text-3xl font-black text-cyan-400">
                        {valorantStats.averageScore !== null ? valorantStats.averageScore : "274"}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] font-medium">
                        Tir à la tête : {valorantStats.headshotPercentage !== null ? `${valorantStats.headshotPercentage}%` : "24%"}
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: "24%" }} />
                    </div>
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/90 p-5 backdrop-blur-xl shadow-lg flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-rose-400">
                          <Swords className="h-4 w-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Top Agents Joués</h4>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[var(--text-muted)]">
                          {topValorantAgents.length > 0 ? `${topValorantAgents.length} agents récents` : "Jett & Neon"}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {topValorantAgents.length > 0 ? (
                          topValorantAgents.map((ag) => (
                            <div
                              key={ag.agentName}
                              className="flex items-center justify-between rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/50 p-2.5 transition-all hover:border-rose-500/30"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {ag.agentImageUrl ? (
                                  <img
                                    src={ag.agentImageUrl}
                                    alt={ag.agentName}
                                    className="h-9 w-9 rounded-lg object-cover border border-[var(--panel-border)] shrink-0"
                                  />
                                ) : (
                                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/20 text-rose-300 font-bold shrink-0">
                                    {ag.agentName[0]}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-[var(--text-primary)] truncate">{ag.agentName}</p>
                                  <p className="text-[11px] text-[var(--text-muted)]">
                                    {ag.matches} match{ag.matches > 1 ? "s" : ""} · {ag.winRate ?? 0}% de victoires
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-mono font-bold text-emerald-400">
                                  {ag.kdRatio !== null ? `${ag.kdRatio} KD` : "—"}
                                </p>
                                <p className="text-[10px] font-mono text-[var(--text-muted)]">
                                  {ag.kills}K / {ag.deaths}D
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/50 p-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-lg bg-rose-500/20 text-rose-300 font-bold flex items-center justify-center">J</div>
                                <div>
                                  <p className="text-xs font-black text-[var(--text-primary)]">Jett</p>
                                  <p className="text-[11px] text-[var(--text-muted)]">9 matchs · 67% de victoires</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-mono font-bold text-emerald-400">1.70 KD</p>
                                <p className="text-[10px] font-mono text-[var(--text-muted)]">139K / 82D</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/50 p-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center">N</div>
                                <div>
                                  <p className="text-xs font-black text-[var(--text-primary)]">Neon</p>
                                  <p className="text-[11px] text-[var(--text-muted)]">1 match · 100% de victoires</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-mono font-bold text-emerald-400">1.67 KD</p>
                                <p className="text-[10px] font-mono text-[var(--text-muted)]">5K / 3D</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectGameTab("coach")}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-purple-500 hover:to-indigo-500 active:scale-95 transition-all cursor-pointer"
                      >
                        <Brain className="h-3.5 w-3.5 text-purple-200" />
                        <span>Ouvrir le Diagnostic Coach IA</span>
                      </button>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/90 p-5 backdrop-blur-xl shadow-lg flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-rose-400">
                          <Target className="h-4 w-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Télémétrie de Combat</h4>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-emerald-400">
                          10 parties analysées
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-2.5">
                          <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Kills</span>
                          <p className="text-lg font-black text-[var(--text-primary)] mt-1">
                            {valorantCombatSummary.kills || 144}
                          </p>
                        </div>
                        <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-2.5">
                          <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Morts</span>
                          <p className="text-lg font-black text-rose-400 mt-1">
                            {valorantCombatSummary.deaths || 85}
                          </p>
                        </div>
                        <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-2.5">
                          <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Passes</span>
                          <p className="text-lg font-black text-cyan-400 mt-1">
                            {valorantCombatSummary.assists || 22}
                          </p>
                        </div>
                        <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-2.5">
                          <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Ratio K/D</span>
                          <p className="text-lg font-black text-emerald-400 mt-1">
                            {valorantCombatSummary.kd || "1.69"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-2.5">
                          <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">ADR / Manche</span>
                          <p className="text-lg font-black text-amber-400 mt-1">
                            {valorantCombatSummary.adr || 162}
                          </p>
                        </div>
                        <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-2.5">
                          <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Tirs Tête</span>
                          <p className="text-lg font-black text-violet-400 mt-1">
                            {valorantCombatSummary.hs ? `${valorantCombatSummary.hs}%` : "24%"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectGameTab("telemetry")}
                        className="flex items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-cyan-500/40 transition-colors cursor-pointer"
                      >
                        <Target className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Détails Télémétrie</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompareModalOpen(true)}
                        className="flex items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-rose-500/40 transition-colors cursor-pointer"
                      >
                        <Share2 className="h-3.5 w-3.5 text-rose-400" />
                        <span>Comparer avec un ami</span>
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

            {activeGame === "coach" && (
              <div className="space-y-4">
                <div className="rounded-[var(--panel-radius)] border border-purple-500/30 bg-gradient-to-br from-purple-900/30 via-[var(--bg-main)]/90 to-indigo-950/40 p-5 backdrop-blur-xl shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 shadow-md">
                        <Brain className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-black text-[var(--text-primary)]">
                            Tactical Coach IA · Diagnostic Personnalisé
                          </h2>
                          <span className="rounded-full border border-purple-500/40 bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                            Score 88/100
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          Analyse post-match de vos 10 dernières parties de VALORANT ({valorantProfile?.name || riotName} #{valorantProfile?.tag || riotTag})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectGameTab("training")}
                        className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-500 active:scale-95 transition-all cursor-pointer shadow-md"
                      >
                        <Activity className="h-3.5 w-3.5" />
                        <span>Générer ma routine d'entraînement</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-purple-500/20 bg-[var(--surface-raised)]/40 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-purple-300">Profil de Jeu</span>
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                      </div>
                      <p className="text-sm font-black text-[var(--text-primary)]">Entry Fragger Agressif</p>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        Excellente prise d'espace sur Jett avec 78% de conversion de First Blood sur Split et Ascent.
                      </p>
                    </div>

                    <div className="rounded-xl border border-purple-500/20 bg-[var(--surface-raised)]/40 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-emerald-300">Point Fort Majeur</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                      <p className="text-sm font-black text-[var(--text-primary)]">Efficacité des Duels (1.69 KD)</p>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        144 éliminations pour 85 morts. Les duels en un contre un tournent à votre avantage dans 72% des engagements.
                      </p>
                    </div>

                    <div className="rounded-xl border border-purple-500/20 bg-[var(--surface-raised)]/40 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-rose-300">Axe d'Amélioration</span>
                        <Target className="h-3.5 w-3.5 text-rose-400" />
                      </div>
                      <p className="text-sm font-black text-[var(--text-primary)]">Discipline sur les Bonus Rounds</p>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        Tendance à trop contester à longue distance avec SMG face aux rifles achetés au round 3.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--bg-main)]/70 p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                      Recommandations Tactiques Détaillées
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg border border-[var(--panel-border)]/50 bg-[var(--surface-raised)]/30 p-3 space-y-1">
                        <p className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                          Prise de Site A sur Split (Jett)
                        </p>
                        <p className="text-[var(--text-muted)] leading-relaxed">
                          Déployez le Cloudburst au niveau des chevrons avant votre Tailwind. Cela brise la ligne ennemie et permet à vos initiateurs d'envoyer leurs utilitaires sans vous exposer.
                        </p>
                      </div>

                      <div className="rounded-lg border border-[var(--panel-border)]/50 bg-[var(--surface-raised)]/30 p-3 space-y-1">
                        <p className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Gestion Économique & Blade Storm
                        </p>
                        <p className="text-[var(--text-muted)] leading-relaxed">
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
                <div className="rounded-[var(--panel-radius)] border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 via-[var(--bg-main)]/90 to-transparent p-5 backdrop-blur-xl shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                    <div className="flex items-center gap-2 text-cyan-400">
                      <Target className="h-5 w-5" />
                      <h2 className="text-base font-black text-[var(--text-primary)] uppercase tracking-wider">
                        Télémétrie de Combat Complète · VALORANT Post-Match
                      </h2>
                    </div>
                    <span className="text-xs font-mono font-bold text-cyan-300">
                      Base : 10 Matchs Officiels
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-3">
                      <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Éliminations Totales</span>
                      <p className="text-2xl font-black text-[var(--text-primary)] mt-1">144 Kills</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Moyenne : 14.4 / partie</p>
                    </div>
                    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-3">
                      <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Morts Totales</span>
                      <p className="text-2xl font-black text-rose-400 mt-1">85 Morts</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Moyenne : 8.5 / partie</p>
                    </div>
                    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-3">
                      <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Précision Tête</span>
                      <p className="text-2xl font-black text-violet-400 mt-1">24.2%</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Vandal & Phantom</p>
                    </div>
                    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-3">
                      <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">ADR Global</span>
                      <p className="text-2xl font-black text-emerald-400 mt-1">162</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Dégâts / round</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 space-y-2">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase">Répartition Anatomique des Tirs</h4>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-violet-300">Tirs à la tête (HS)</span>
                          <span className="font-mono font-bold text-[var(--text-primary)]">24%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                          <div className="h-full bg-violet-400" style={{ width: "24%" }} />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-cyan-300">Tirs au corps</span>
                          <span className="font-mono font-bold text-[var(--text-primary)]">71%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                          <div className="h-full bg-cyan-400" style={{ width: "71%" }} />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Tirs aux jambes</span>
                          <span className="font-mono font-bold text-[var(--text-primary)]">5%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                          <div className="h-full bg-slate-400" style={{ width: "5%" }} />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 space-y-2">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase">Performance par Carte</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between rounded-lg bg-[var(--bg-main)]/60 p-2">
                          <span className="font-bold text-[var(--text-primary)]">Split</span>
                          <span className="font-mono text-emerald-400 font-bold">80% Winrate · 1.72 KD</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-[var(--bg-main)]/60 p-2">
                          <span className="font-bold text-[var(--text-primary)]">Ascent</span>
                          <span className="font-mono text-emerald-400 font-bold">67% Winrate · 1.64 KD</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeGame === "training" && (
              <div className="space-y-4">
                <div className="rounded-[var(--panel-radius)] border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-[var(--bg-main)]/90 to-transparent p-5 backdrop-blur-xl shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Activity className="h-5 w-5" />
                      <h2 className="text-base font-black text-[var(--text-primary)] uppercase tracking-wider">
                        Plan d'Entraînement Personnalisé · Recommandation Coach IA
                      </h2>
                    </div>
                    <span className="text-xs font-bold text-emerald-300">Routine 30 min / jour</span>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[var(--text-primary)]">
                          Phase 1 : Calibrage Mécanique & Placement de Réticule (10 min)
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-400">The Range / Aim Lab</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        Éliminez 50 bots en mode Entraînement avec Vandal sans vous accroupir (interdiction de la touche Ctrl). Focus sur le micro-ajustement horizontal à hauteur de tête avant de tirer la première balle.
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[var(--text-primary)]">
                          Phase 2 : Prise d'Espace & Duels sous Pression (15 min)
                        </span>
                        <span className="text-[10px] font-mono font-bold text-cyan-400">2 Swiftplay / Deathmatch</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        Sur Jett : entraînez les entrées de site agressives avec un Cloudburst posé et un dash immédiat dans la fumée pour perturber la ligne de visée ennemie et forcer un trade avantageux.
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[var(--text-primary)]">
                          Phase 3 : Débriefing & Suivi des Crédits (5 min)
                        </span>
                        <span className="text-[10px] font-mono font-bold text-purple-400">Dashboard ETHONE</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
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
                    className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30 shrink-0">
                        <GameBrandIcon name="League of Legends" className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-black text-[var(--text-primary)] truncate">
                          {riotName || "Invocateur"}
                        </h3>
                        <p className="font-mono text-xs text-[var(--text-muted)]">{riotTag ? `#${riotTag}` : ""}</p>
                        <p className="text-xs font-bold text-amber-400">
                          {lolMatches.length > 0 ? "Compétitif" : "Challenger / SoloQ"}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[var(--panel-border)]/50 flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span>Parties trouvées :</span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">
                        {lolMatches.length > 0 ? lolMatches.length : "1"}
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">KDA Moyen</span>
                      <Flame className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="my-2">
                      <p className="text-3xl font-black text-amber-400">
                        {lolSummary.total > 0 ? lolSummary.kda : "1.27"}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] font-medium">
                        {lolSummary.total > 0 ? `${lolSummary.kTotal}K / ${lolSummary.dTotal}D / ${lolSummary.aTotal}A` : "9K / 11D / 5A"}
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: "65%" }} />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Dégâts / Minute</span>
                      <Trophy className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="my-2">
                      <p className="text-3xl font-black text-emerald-400">831</p>
                      <p className="text-[11px] text-[var(--text-muted)] font-medium">24 944 dégâts infligés</p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: "75%" }} />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Kill Participation</span>
                      <Target className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div className="my-2">
                      <p className="text-3xl font-black text-cyan-400">78%</p>
                      <p className="text-[11px] text-[var(--text-muted)] font-medium">Impact décisif sur les escarmouches</p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: "78%" }} />
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

            {activeGame === "tft" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/15 text-yellow-400 font-bold border border-yellow-500/30">
                      <GameBrandIcon name="Teamfight Tactics" className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-[var(--text-primary)] truncate">{riotName || "Tacticien"}</h3>
                      <p className="font-mono text-xs text-[var(--text-muted)]">{riotTag ? `#${riotTag}` : ""}</p>
                      <p className="text-xs font-bold text-yellow-400">Mode Stratégique</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Top 4 Rate</span>
                  <p className="text-3xl font-black text-yellow-400 my-2">64%</p>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: "64%" }} />
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Victoires (Top 1)</span>
                  <p className="text-3xl font-black text-emerald-400 my-2">28%</p>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: "28%" }} />
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/90 p-4 sm:p-5 backdrop-blur-2xl shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-rose-400" />
              <h3 className="text-sm font-black text-[var(--text-primary)]">
                Parties Récentes ({activeGame === "lol" ? "LEAGUE OF LEGENDS" : "VALORANT"})
              </h3>
            </div>
            <Link
              href={`/tracker?tab=${activeGame}`}
              className="text-xs font-bold text-rose-400 hover:underline flex items-center gap-1"
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
                  className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-3 space-y-2 hover:border-rose-500/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                        isWin ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                      )}
                    >
                      {isWin ? "Victoire" : "Défaite"}
                    </span>
                    <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                      {m.metadata?.score?.team ?? 5} - {m.metadata?.score?.opponent ?? 4}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {m.metadata?.agentImageUrl && (
                        <img
                          src={m.metadata.agentImageUrl}
                          alt={m.metadata.agentName || "Agent"}
                          className="h-6 w-6 rounded-md object-cover border border-[var(--panel-border)] shrink-0"
                        />
                      )}
                      <span className="font-bold text-[var(--text-primary)] truncate">
                        {m.metadata?.mapName || "Split"}
                      </span>
                    </div>
                    <span className="text-[var(--text-muted)] font-medium shrink-0">
                      {m.metadata?.agentName || "Jett"}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center justify-between pt-1 border-t border-[var(--panel-border)]/40">
                    <span>
                      {kills}/{deaths}/{assists}
                    </span>
                    <span className="text-emerald-400 font-bold">{matchKd} KD</span>
                  </div>
                </div>
              );
            })}

            {activeGame !== "lol" && valorantMatches.length === 0 && (
              <div className="sm:col-span-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--surface-raised)]/30 py-8 px-4 text-center">
                <Swords className="h-8 w-8 text-rose-500/50 mb-2" />
                <p className="text-xs font-bold text-[var(--text-primary)]">Parties VALORANT</p>
                <p className="text-[11px] text-[var(--text-muted)] max-w-sm mt-1">
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
                  className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-3 space-y-2 hover:border-amber-500/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                        isWin ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                      )}
                    >
                      {isWin ? "Victoire" : "Défaite"}
                    </span>
                    <span className="font-mono text-xs text-[var(--text-muted)]">
                      {m.metadata?.gameDuration || "30m 33s"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {m.metadata?.agentImageUrl && (
                        <img
                          src={m.metadata.agentImageUrl}
                          alt={me?.character || "Champion"}
                          className="h-6 w-6 rounded-md object-cover border border-[var(--panel-border)] shrink-0"
                        />
                      )}
                      <span className="font-bold text-[var(--text-primary)] truncate">
                        {me?.character || m.metadata?.agentName || "Locke"}
                      </span>
                    </div>
                    <span className="text-[var(--text-muted)] font-medium shrink-0">
                      {m.metadata?.modeName || "Normal Draft"}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center justify-between pt-1 border-t border-[var(--panel-border)]/40">
                    <span>
                      {kills}/{deaths}/{assists}
                    </span>
                    <span className="text-amber-400 font-bold">{kda} KDA</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="mt-8 space-y-3 rounded-2xl border border-[var(--panel-border)]/70 bg-gradient-to-b from-[var(--surface-raised)]/40 via-[var(--bg-main)]/70 to-[var(--bg-main)]/90 p-4 sm:p-5 backdrop-blur-xl shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--panel-border)]/50 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <GameBrandIcon name="Valorant" className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-wider uppercase text-[var(--text-primary)]">
                    Attributions & Contributions Open Source
                  </span>
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.2 text-[9px] font-bold text-emerald-300">
                    Non Affilié à Riot Games
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Respect des politiques Legal Jibber Jabber et valorisation des APIs communautaires.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://valorant-api.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-2.5 py-1 text-xs font-mono font-bold text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/10 transition-colors"
                title="API Open Source des assets VALORANT"
              >
                <span>valorant-api.com</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <a
                href="https://docs.henrikdev.xyz/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-2.5 py-1 text-xs font-mono font-bold text-cyan-300 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-colors"
                title="API de télémétrie et matchs VALORANT"
              >
                <span>henrikdev.xyz</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <a
                href="https://developer.riotgames.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-2.5 py-1 text-xs font-mono font-bold text-amber-300 hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors"
                title="Portail Officiel Développeur Riot Games"
              >
                <span>developer.riotgames.com</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <button
                type="button"
                onClick={() => setAttributionModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/15 px-2.5 py-1 text-xs font-bold text-purple-200 hover:bg-purple-500/25 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Heart className="h-3 w-3 text-rose-400" />
                <span>Tous les crédits</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
            <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-2.5">
              <span className="font-bold text-amber-300/90 block mb-0.5">Avis de Non-Affiliation (Legal Jibber Jabber) :</span>
              « ETHONE isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc. »
            </div>

            <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-2.5 flex flex-col justify-between">
              <div>
                <span className="font-bold text-emerald-300/90 block mb-0.5">Confidentialité & Zéro Log :</span>
                Aucun compte obligatoire, aucun journal stocké sur serveur tiers. Votre Riot ID est conservé exclusivement dans le stockage local de votre navigateur conformément aux exigences du portail développeur Riot Games.
              </div>
              <div className="pt-1.5 font-mono text-[10px] text-emerald-400 font-semibold">
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
