"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords,
  ShieldCheck,
  TrendingUp,
  User,
  Search,
  ChevronRight,
  Flame,
  Target,
  Trophy,
  Activity,
  Zap,
  Share2,
  Key,
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
import { useAnimatedSidebar } from "@/components/motion/animated-sidebar";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { EASE_SNAP } from "@/lib/ease";

type GameTab = "valorant" | "lol" | "tft";

export default function RiotGamingHome() {
  const { settings } = useSettings();
  const { success, error: showError } = useToast();
  const { open, setOpen } = useAnimatedSidebar();

  const [activeGame, setActiveGame] = useState<GameTab>(() => {
    if (typeof window !== "undefined") {
      const urlTab = new URLSearchParams(window.location.search).get("tab") || new URLSearchParams(window.location.search).get("game");
      if (urlTab === "lol" || urlTab === "tft" || urlTab === "valorant") return urlTab;
    }
    return "valorant";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleUrlTab = () => {
      const urlTab = new URLSearchParams(window.location.search).get("tab") || new URLSearchParams(window.location.search).get("game");
      if (urlTab === "lol" || urlTab === "tft" || urlTab === "valorant") {
        setActiveGame(urlTab as GameTab);
      }
    };
    window.addEventListener("popstate", handleUrlTab);
    return () => window.removeEventListener("popstate", handleUrlTab);
  }, []);

  const selectGameTab = useCallback((game: GameTab) => {
    setActiveGame(game);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", game);
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const [riotName, setRiotName] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ethone:tracker:riot_name");
      if (stored) return stored;
    }
    return settings.liveTrackerRiotName || "";
  });
  const [riotTag, setRiotTag] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ethone:tracker:riot_tag");
      if (stored) return stored;
    }
    return settings.liveTrackerRiotTag || "";
  });

  const [valorantProfile, setValorantProfile] = useState<ValorantAccountProfile | null>(null);
  const [valorantMatches, setValorantMatches] = useState<ValorantMatch[]>([]);
  const [lolMatches, setLolMatches] = useState<LolMatch[]>([]);

  const [loading, setLoading] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

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

      if (game === "valorant") {
        try {
          const [profRes, matchData] = await Promise.all([
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
          ]);
          if (profRes.data) setValorantProfile(profRes.data);
          if (Array.isArray(matchData)) setValorantMatches(matchData);
        } catch {
        } finally {
          setLoading(false);
        }
      } else if (game === "lol") {
        try {
          const matchData = await fetchWorker(
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
            });
          if (Array.isArray(matchData)) setLolMatches(matchData);
        } catch {
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("ethone:tracker:riot_name");
      const storedTag = localStorage.getItem("ethone:tracker:riot_tag");
      const targetName = storedName || riotName;
      const targetTag = storedTag || riotTag;
      if (targetName && targetName !== riotName) setRiotName(targetName);
      if (targetTag && targetTag !== riotTag) setRiotTag(targetTag);
      if (targetName && targetTag) {
        loadPlayerData(targetName, targetTag, activeGame);
        return;
      }
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
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

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
                  VALORANT · LoL · TFT
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <ShieldCheck className="h-3 w-3" />
                  Données Live & Zéro Log
                </span>
              </div>

              <h1 className="text-xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
                RIOT GAMES <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-red-400 to-amber-300">Tracker</span>
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-2xl">
                Suivi compétitif en temps réel et historiques officiels de parties pour VALORANT et League of Legends.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConnectModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/30 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                <Key className="h-4 w-4 text-rose-400" />
                <span>Identifiants & Clés API</span>
              </button>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/90 p-1 backdrop-blur-xl shadow-md">
            <button
              type="button"
              onClick={() => selectGameTab("valorant")}
              className={cn(
                "flex items-center gap-2 rounded-[var(--inset-radius)] px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
                activeGame === "valorant"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <GameBrandIcon name="Valorant" className="h-4 w-4" />
              <span>VALORANT</span>
            </button>

            <button
              type="button"
              onClick={() => selectGameTab("lol")}
              className={cn(
                "flex items-center gap-2 rounded-[var(--inset-radius)] px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
                activeGame === "lol"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <GameBrandIcon name="League of Legends" className="h-4 w-4" />
              <span>League of Legends</span>
            </button>

            <button
              type="button"
              onClick={() => selectGameTab("tft")}
              className={cn(
                "flex items-center gap-2 rounded-[var(--inset-radius)] px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
                activeGame === "tft"
                  ? "bg-yellow-600 text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <GameBrandIcon name="Teamfight Tactics" className="h-4 w-4" />
              <span>Teamfight Tactics</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
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
                className="flex items-center gap-1 rounded-xl bg-[var(--accent-primary)] px-3 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Analyser</span>
              </button>
            </form>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Pills :</span>
              <button
                type="button"
                onClick={() => applyQuickPlayer("Rub19", "boss", "valorant")}
                className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-2 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/25 active:scale-95 transition-all cursor-pointer"
              >
                Rub19 #boss
              </button>
              <button
                type="button"
                onClick={() => applyQuickPlayer("Agurin", "EUW", "lol")}
                className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/25 active:scale-95 transition-all cursor-pointer"
              >
                Agurin #EUW
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
                        {valorantProfile?.currentTierPatched || (riotName ? "Non classé" : "En attente")}
                        {valorantProfile?.rr !== null && valorantProfile?.rr !== undefined ? ` · ${valorantProfile.rr} RR` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[var(--panel-border)]/50 flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Niveau de compte :</span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">
                      {valorantProfile?.accountLevel ?? "—"}
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
                      {valorantStats.kdRatio !== null ? valorantStats.kdRatio : "—"}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">
                      {valorantStats.matchesCount > 0 ? `${valorantStats.wins}V - ${valorantStats.losses}D` : "Performance"}
                    </p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: valorantStats.kdRatio ? `${Math.min(100, Math.round(valorantStats.kdRatio * 50))}%` : "0%" }} />
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
                      {valorantStats.winRate !== null ? `${valorantStats.winRate}%` : "—"}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">
                      {valorantMatches.length > 0 ? `${valorantMatches.length} parties analysées` : "Historique"}
                    </p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${valorantStats.winRate || 0}%` }} />
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
                      {valorantStats.averageScore !== null ? valorantStats.averageScore : "—"}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">
                      {valorantStats.headshotPercentage !== null
                        ? `Tir à la tête : ${valorantStats.headshotPercentage}%`
                        : valorantStats.adr !== null
                        ? `ADR : ${valorantStats.adr}`
                        : "Combat"}
                    </p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: valorantStats.headshotPercentage ? `${valorantStats.headshotPercentage}%` : "0%" }} />
                  </div>
                </motion.div>
              </div>
            )}

            {activeGame === "lol" && (
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
                        {lolMatches.length > 0 ? "Compétitif" : (riotName ? "Non classé" : "En attente")}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[var(--panel-border)]/50 flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Parties trouvées :</span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">
                      {lolMatches.length}
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
                      {lolSummary.total > 0 ? lolSummary.kda : "—"}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">
                      {lolSummary.total > 0 ? `${lolSummary.kTotal}K / ${lolSummary.dTotal}D / ${lolSummary.aTotal}A` : "Télémétrie"}
                    </p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: lolSummary.total > 0 ? `${Math.min(100, Math.round(Number(lolSummary.kda) * 20))}%` : "0%" }} />
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Taux de Victoire</span>
                    <Trophy className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="my-2">
                    <p className="text-3xl font-black text-emerald-400">
                      {lolSummary.total > 0 ? `${lolSummary.winRate}%` : "—"}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">
                      {lolSummary.total > 0 ? `${lolSummary.wins} victoires sur ${lolSummary.total}` : "Statistiques"}
                    </p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: lolSummary.total > 0 ? `${lolSummary.winRate}%` : "0%" }} />
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Parties Jouées</span>
                    <Target className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="my-2">
                    <p className="text-3xl font-black text-cyan-400">
                      {lolSummary.total > 0 ? `${lolSummary.total}` : "—"}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">
                      {lolSummary.total > 0 ? `${lolSummary.wins}V - ${lolSummary.total - lolSummary.wins}D` : "Historique"}
                    </p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: lolSummary.total > 0 ? `${Math.min(100, lolSummary.total * 10)}%` : "0%" }} />
                  </div>
                </motion.div>
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
                  <p className="text-3xl font-black text-yellow-400 my-2">—</p>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: "0%" }} />
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Victoires (Top 1)</span>
                  <p className="text-3xl font-black text-emerald-400 my-2">—</p>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: "0%" }} />
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            whileHover={{ y: -2 }}
            className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/90 p-5 backdrop-blur-xl shadow-lg flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-rose-400">
                  <Swords className="h-4 w-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    {activeGame === "valorant" ? "Top Agents Joués" : "Champions en Vedette"}
                  </h4>
                </div>
                <span className="text-[10px] font-mono font-bold text-[var(--text-muted)]">
                  {activeGame === "valorant" ? `${topValorantAgents.length} agents récents` : `${lolMatches.length} parties`}
                </span>
              </div>

              {activeGame === "valorant" && topValorantAgents.length > 0 ? (
                <div className="space-y-2.5">
                  {topValorantAgents.map((ag) => (
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
                  ))}
                </div>
              ) : activeGame === "lol" && lolMatches.length > 0 ? (
                <div className="space-y-2.5">
                  {lolMatches.slice(0, 3).map((m, idx) => {
                    const me = m.scoreboard?.players?.find((p) => p.isMe) || m.scoreboard?.players?.[0];
                    return (
                      <div
                        key={m.id || idx}
                        className="flex items-center justify-between rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/50 p-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {m.metadata?.championImageUrl ? (
                            <img
                              src={m.metadata.championImageUrl}
                              alt={m.metadata.championName || "Champion"}
                              className="h-9 w-9 rounded-lg object-cover border border-[var(--panel-border)] shrink-0"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 font-bold shrink-0">
                              LoL
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-black text-[var(--text-primary)] truncate">
                              {me?.character || m.metadata?.championName || "Champion"}
                            </p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                              {m.metadata?.modeName || "Partie"} · {m.metadata?.result === "Victory" ? "Victoire" : "Défaite"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono font-bold text-amber-400">
                            {me?.stats?.kda ? `${me.stats.kda} KDA` : "—"}
                          </p>
                          <p className="text-[10px] font-mono text-[var(--text-muted)]">
                            {me?.stats?.kills ?? 0}/{me?.stats?.deaths ?? 0}/{me?.stats?.assists ?? 0}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--surface-raised)]/30 py-6 px-4 text-center">
                  <Swords className="h-6 w-6 text-rose-400/60 mb-2" />
                  <p className="text-xs font-bold text-[var(--text-primary)]">Historique en attente</p>
                  <p className="text-[11px] text-[var(--text-muted)] max-w-xs mt-1">
                    Sélectionnez un profil ou lancez une analyse pour afficher les champions et agents les plus joués.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setConnectModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-rose-500 hover:to-red-500 active:scale-95 transition-all cursor-pointer"
              >
                <Key className="h-3.5 w-3.5" />
                <span>Configurer mes accès Riot</span>
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
                  {valorantMatches.length > 0 ? "Données vérifiées" : "En attente"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Kills</span>
                  <p className="text-lg font-black text-[var(--text-primary)] mt-1">
                    {activeGame === "valorant" ? valorantCombatSummary.kills : lolSummary.kTotal}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Morts</span>
                  <p className="text-lg font-black text-rose-400 mt-1">
                    {activeGame === "valorant" ? valorantCombatSummary.deaths : lolSummary.dTotal}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Passes</span>
                  <p className="text-lg font-black text-cyan-400 mt-1">
                    {activeGame === "valorant" ? valorantCombatSummary.assists : lolSummary.aTotal}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Ratio K/D</span>
                  <p className="text-lg font-black text-emerald-400 mt-1">
                    {activeGame === "valorant" ? valorantCombatSummary.kd : lolSummary.kda}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">ADR / Dégâts</span>
                  <p className="text-lg font-black text-amber-400 mt-1">
                    {activeGame === "valorant"
                      ? (valorantCombatSummary.adr ?? "—")
                      : (lolMatches[0]?.scoreboard?.players?.[0]?.stats?.damagePerMin ? `${lolMatches[0].scoreboard.players[0].stats.damagePerMin}/m` : "—")}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Tirs Tête</span>
                  <p className="text-lg font-black text-violet-400 mt-1">
                    {activeGame === "valorant" && valorantCombatSummary.hs !== null && valorantCombatSummary.hs !== undefined
                      ? `${valorantCombatSummary.hs}%`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
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

        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/90 p-4 sm:p-5 backdrop-blur-2xl shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-rose-400" />
              <h3 className="text-sm font-black text-[var(--text-primary)]">
                Parties Récentes ({activeGame.toUpperCase()})
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
            {activeGame === "valorant" && valorantMatches.slice(0, 3).map((m, idx) => {
              const isWin = m.metadata?.result?.toLowerCase() === "victory" || ((m.metadata?.score?.team || 0) > (m.metadata?.score?.opponent || 0));
              const myStats = m.segments?.[0]?.stats;
              const kills = myStats?.kills?.value ?? 0;
              const deaths = myStats?.deaths?.value ?? 0;
              const assists = myStats?.assists?.value ?? 0;
              const matchKd = (kills / Math.max(1, deaths)).toFixed(2);

              return (
                <div
                  key={m.metadata?.matchId || idx}
                  className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-3 space-y-2 hover:border-rose-500/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                      isWin ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                    )}>
                      {isWin ? "Victoire" : "Défaite"}
                    </span>
                    <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                      {m.metadata?.score?.team ?? 0} - {m.metadata?.score?.opponent ?? 0}
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
                      <span className="font-bold text-[var(--text-primary)] truncate">{m.metadata?.mapName || "Partie"}</span>
                    </div>
                    <span className="text-[var(--text-muted)] font-medium shrink-0">{m.metadata?.agentName || ""}</span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center justify-between pt-1 border-t border-[var(--panel-border)]/40">
                    <span>{kills}/{deaths}/{assists}</span>
                    <span className="text-emerald-400 font-bold">{matchKd} KD</span>
                  </div>
                </div>
              );
            })}

            {activeGame === "valorant" && valorantMatches.length === 0 && (
              <div className="sm:col-span-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--surface-raised)]/30 py-8 px-4 text-center">
                <Swords className="h-8 w-8 text-rose-500/50 mb-2" />
                <p className="text-xs font-bold text-[var(--text-primary)]">Aucun match VALORANT chargé</p>
                <p className="text-[11px] text-[var(--text-muted)] max-w-sm mt-1">
                  {riotName ? "Aucune partie récente trouvée pour ce compte ou données en attente. Cliquez sur Analyser ou sur la pill Rub19 #boss." : "Renseignez votre Nom Riot et votre Tag ci-dessus pour afficher vos parties récentes."}
                </p>
              </div>
            )}

            {activeGame === "lol" && lolMatches.length > 0 && lolMatches.slice(0, 3).map((m, idx) => {
              const me = m.scoreboard?.players?.find((p) => p.isMe) || m.scoreboard?.players?.[0];
              const isWin = m.metadata?.result?.toLowerCase() === "victory";
              const kills = me?.stats?.kills ?? 0;
              const deaths = me?.stats?.deaths ?? 0;
              const assists = me?.stats?.assists ?? 0;
              const kda = deaths > 0 ? ((kills + assists) / deaths).toFixed(2) : String(kills + assists);

              return (
                <div key={m.metadata?.matchId || idx} className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-3 space-y-2 hover:border-amber-500/30 transition-all">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                      isWin ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                    )}>
                      {isWin ? "Victoire" : "Défaite"}
                    </span>
                    <span className="font-mono text-xs text-[var(--text-muted)]">{m.metadata?.gameDuration || ""}</span>
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
                      <span className="font-bold text-[var(--text-primary)] truncate">{me?.character || m.metadata?.agentName || "Champion"}</span>
                    </div>
                    <span className="text-[var(--text-muted)] font-medium shrink-0">{m.metadata?.modeName || ""}</span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center justify-between pt-1 border-t border-[var(--panel-border)]/40">
                    <span>{kills}/{deaths}/{assists}</span>
                    <span className="text-amber-400 font-bold">{kda} KDA</span>
                  </div>
                </div>
              );
            })}

            {activeGame === "lol" && lolMatches.length === 0 && (
              <div className="sm:col-span-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--surface-raised)]/30 py-8 px-4 text-center">
                <GameBrandIcon name="League of Legends" className="h-8 w-8 text-amber-500/50 mb-2" />
                <p className="text-xs font-bold text-[var(--text-primary)]">Aucun match League of Legends chargé</p>
                <p className="text-[11px] text-[var(--text-muted)] max-w-sm mt-1">
                  {riotName ? "Aucune partie récente trouvée pour ce compte LoL. Cliquez sur la pill Agurin #EUW pour tester." : "Renseignez votre Nom Riot et votre Tag ci-dessus pour analyser votre historique LoL."}
                </p>
              </div>
            )}

            {activeGame === "tft" && (
              <div className="sm:col-span-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--surface-raised)]/30 py-8 px-4 text-center">
                <GameBrandIcon name="Teamfight Tactics" className="h-8 w-8 text-yellow-500/50 mb-2" />
                <p className="text-xs font-bold text-[var(--text-primary)]">Suivi Teamfight Tactics</p>
                <p className="text-[11px] text-[var(--text-muted)] max-w-sm mt-1">
                  Connectez votre compte Riot RSO pour synchroniser vos classements et compositions TFT.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/30 p-3.5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Confidentialité & Zéro Log :</strong> Aucun compte requis, aucune donnée ni journal sauvegardé sur serveur. Votre Riot ID est conservé localement sur cet appareil.
            </span>
          </div>
          <span className="font-mono text-[10px] shrink-0 text-emerald-400">
            ✓ 100% Local · Zéro Log Serveur
          </span>
        </div>
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
    </div>
  );
}
