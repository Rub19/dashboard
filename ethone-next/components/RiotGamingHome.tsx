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
  ExternalLink,
  ChevronRight,
  Flame,
  Target,
  Trophy,
  Activity,
  Zap,
  CheckCircle2,
  Share2,
  RefreshCw,
  Key,
} from "@/components/icons/ph";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import {
  fetchPlayerProfile,
  calculateComputedStats,
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
import { cn } from "@/lib/utils";
import { EASE_SNAP, EASE_OUT } from "@/lib/ease";

type GameTab = "valorant" | "lol" | "tft";

export default function RiotGamingHome() {
  const { settings } = useSettings();
  const { success, error: showError } = useToast();

  const [activeGame, setActiveGame] = useState<GameTab>("valorant");

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

  const loadPlayerData = useCallback(
    async (targetName: string, targetTag: string, game: GameTab) => {
      const cleanName = targetName.trim();
      const cleanTag = targetTag.trim().replace(/^#/, "");
      if (!cleanName || !cleanTag) return;

      setLoading(true);

      if (game === "valorant") {
        try {
          const [profRes, matchRes] = await Promise.all([
            fetchPlayerProfile(cleanName, cleanTag, false).catch(() => ({ data: null })),
            fetchValorantMatchesDirect(cleanName, cleanTag, "all", 1, 6).catch(() => []),
          ]);
          if (profRes.data) setValorantProfile(profRes.data);
          if (Array.isArray(matchRes)) setValorantMatches(matchRes);
        } catch {
        } finally {
          setLoading(false);
        }
      } else if (game === "lol") {
        try {
          const matches = await fetchLolMatchesDirect(cleanName, cleanTag, "all", 1, 6).catch(() => []);
          if (Array.isArray(matches)) setLolMatches(matches);
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
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                  Riot Games Hub #1
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <ShieldCheck className="h-3 w-3" />
                  RSO OAuth Conforme
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-2 py-0.5 text-[10px] font-mono text-[var(--text-muted)]">
                  Serveurs EUW · Live
                </span>
              </div>

              <h1 className="text-xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
                RIOT GAMES <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-red-400 to-amber-300">Tracker</span>
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-2xl">
                Suivi compétitif en temps réel et historiques officiels pour VALORANT, League of Legends et Teamfight Tactics.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConnectModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/30 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                <Key className="h-4 w-4 text-rose-400" />
                <span>#RIOT TRACKER · Connexion & APIs</span>
              </button>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/90 p-1 backdrop-blur-xl shadow-md">
            <button
              type="button"
              onClick={() => setActiveGame("valorant")}
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
              onClick={() => setActiveGame("lol")}
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
              onClick={() => setActiveGame("tft")}
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md space-y-3"
                >
                  <div className="flex items-center gap-3">
                    {valorantProfile?.cardSmall ? (
                      <img
                        src={valorantProfile.cardSmall}
                        alt={valorantProfile.name}
                        className="h-12 w-12 rounded-xl object-cover border border-[var(--panel-border)] shadow-sm"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400 font-bold border border-rose-500/30">
                        <User className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-[var(--text-primary)] truncate">
                        {valorantProfile?.name || riotName || ""}
                      </h3>
                      <p className="font-mono text-xs text-[var(--text-muted)]">
                        {riotTag ? `#${valorantProfile?.tag || riotTag}` : ""}
                      </p>
                      <p className="text-xs font-bold text-rose-400">
                        {valorantProfile?.currentTierPatched || (riotName ? "Non classé" : "")}
                        {valorantProfile?.rr !== null && valorantProfile?.rr !== undefined ? ` · ${valorantProfile.rr} RR` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[var(--panel-border)]/50 flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Niveau de compte :</span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">
                      {valorantProfile?.accountLevel || ""}
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
                      {valorantStats.kdRatio !== null ? valorantStats.kdRatio : ""}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">
                      {valorantStats.kdRatio !== null ? "Performance calculée" : ""}
                    </p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: valorantStats.kdRatio ? `${Math.min(100, valorantStats.kdRatio * 50)}%` : "0%" }} />
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
                      {valorantStats.winRate !== null ? `${valorantStats.winRate}%` : ""}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">
                      {valorantMatches.length > 0 ? `${valorantMatches.length} parties analysées` : ""}
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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Score ACS Moyen</span>
                    <Target className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="my-2">
                    <p className="text-3xl font-black text-cyan-400">
                      {valorantStats.avgAcs !== null ? valorantStats.avgAcs : ""}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">
                      {valorantStats.headshotPct !== null ? `Tir à la tête : ${valorantStats.headshotPct}%` : ""}
                    </p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: valorantStats.headshotPct ? `${valorantStats.headshotPct}%` : "0%" }} />
                  </div>
                </motion.div>
              </div>
            )}

            {activeGame === "lol" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
                      <GameBrandIcon name="League of Legends" className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-[var(--text-primary)] truncate">
                        {riotName || ""}
                      </h3>
                      <p className="font-mono text-xs text-[var(--text-muted)]">{riotTag ? `#${riotTag}` : ""}</p>
                      <p className="text-xs font-bold text-amber-400">
                        {lolMatches.length > 0 ? "Compétitif" : (riotName ? "Non classé" : "")}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[var(--panel-border)]/50 flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>File : Solo/Duo</span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">
                      {lolMatches.length > 0 ? "Actif" : ""}
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
                      {lolSummary.total > 0 ? lolSummary.kda : ""}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">
                      {lolSummary.total > 0 ? `${lolSummary.kTotal}/${lolSummary.dTotal}/${lolSummary.aTotal}` : ""}
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
                      {lolSummary.total > 0 ? `${lolSummary.winRate}%` : ""}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">
                      {lolSummary.total > 0 ? `${lolSummary.total} parties analysées` : ""}
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
                      {lolSummary.total > 0 ? `${lolSummary.total}` : ""}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">
                      {lolSummary.total > 0 ? `${lolSummary.wins} victoires` : ""}
                    </p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: lolSummary.total > 0 ? `${Math.min(100, lolSummary.total * 5)}%` : "0%" }} />
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
                      <h3 className="text-base font-black text-[var(--text-primary)] truncate">{riotName || ""}</h3>
                      <p className="font-mono text-xs text-[var(--text-muted)]">{riotTag ? `#${riotTag}` : ""}</p>
                      <p className="text-xs font-bold text-yellow-400"></p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Top 4 Rate</span>
                  <p className="text-3xl font-black text-yellow-400 my-2"></p>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: "0%" }} />
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Victoires (Top 1)</span>
                  <p className="text-3xl font-black text-emerald-400 my-2"></p>
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
            className="rounded-[var(--panel-radius)] border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-[var(--bg-main)]/90 to-transparent p-5 backdrop-blur-xl shadow-lg flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center gap-2 text-rose-400 mb-2">
                <Swords className="h-4 w-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Riot Games Live Feed</h4>
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Suivi Compétitif Direct & Télémétrie Officielle
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Statistiques en direct, historique des rounds, variations MMR et performances individuelles sans intermédiaire ni enregistrement de données.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setConnectModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-rose-500 hover:to-red-500 active:scale-95 transition-all cursor-pointer"
              >
                <Key className="h-3.5 w-3.5" />
                <span>Configurer mes identifiants Riot</span>
              </button>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-5 backdrop-blur-xl shadow-md flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center gap-2 text-rose-400 mb-2">
                <Share2 className="h-4 w-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Comparateur de Profils</h4>
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Comparer deux joueurs Riot Games
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Confrontez vos rangs, ratios de victoires, K/D et scores de combat avec un coéquipier ou un rival.
              </p>
            </div>
            <div className="pt-2">
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
              <span>Voir tout l'historique</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {activeGame === "valorant" && valorantMatches.slice(0, 3).map((m, idx) => {
              const isWin = m.metadata?.result?.toLowerCase() === "victory" || ((m.metadata?.score?.team || 0) > (m.metadata?.score?.opponent || 0));
              const myStats = m.segments?.[0]?.stats;
              return (
                <div
                  key={m.metadata?.matchId || idx}
                  className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-3 space-y-2"
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
                    <span className="font-bold text-[var(--text-primary)]">{m.metadata?.mapName || ""}</span>
                    <span className="text-[var(--text-muted)] font-medium">{m.metadata?.agentName || ""}</span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center justify-between">
                    <span>K/D/A : {myStats?.kills?.value ?? 0}/{myStats?.deaths?.value ?? 0}/{myStats?.assists?.value ?? 0}</span>
                    <span className="text-emerald-400 font-bold">{myStats?.kd?.value ? `${myStats.kd.value} KD` : ""}</span>
                  </div>
                </div>
              );
            })}

            {activeGame === "valorant" && valorantMatches.length === 0 && (
              <div className="sm:col-span-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--surface-raised)]/30 py-8 px-4 text-center">
                <Swords className="h-8 w-8 text-rose-500/50 mb-2" />
                <p className="text-xs font-bold text-[var(--text-primary)]">Aucun match VALORANT chargé</p>
                <p className="text-[11px] text-[var(--text-muted)] max-w-sm mt-1">
                  {riotName ? "Aucune partie récente trouvée pour ce compte ou données en attente. Cliquez sur Analyser ou connectez votre Riot ID." : "Renseignez votre Nom Riot et votre Tag ci-dessus pour afficher vos parties récentes."}
                </p>
              </div>
            )}

            {activeGame === "lol" && lolMatches.length > 0 && lolMatches.slice(0, 3).map((m, idx) => {
              const me = m.scoreboard?.players?.find((p) => p.isMe) || m.scoreboard?.players?.[0];
              const isWin = m.metadata?.result?.toLowerCase() === "victory";
              return (
                <div key={m.metadata?.matchId || idx} className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-3 space-y-2">
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
                    <span className="font-bold text-[var(--text-primary)]">{me?.championName || ""}</span>
                    <span className="text-[var(--text-muted)] font-medium">{m.metadata?.queue || ""}</span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center justify-between">
                    <span>K/D/A : {me?.stats?.kills ?? 0}/{me?.stats?.deaths ?? 0}/{me?.stats?.assists ?? 0}</span>
                    <span className="text-amber-400 font-bold">{me?.stats?.damagePerMinute ? `${me.stats.damagePerMinute} DPM` : ""}</span>
                  </div>
                </div>
              );
            })}

            {activeGame === "lol" && lolMatches.length === 0 && (
              <div className="sm:col-span-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--surface-raised)]/30 py-8 px-4 text-center">
                <GameBrandIcon name="League of Legends" className="h-8 w-8 text-amber-500/50 mb-2" />
                <p className="text-xs font-bold text-[var(--text-primary)]">Aucun match League of Legends chargé</p>
                <p className="text-[11px] text-[var(--text-muted)] max-w-sm mt-1">
                  {riotName ? "Aucune partie récente trouvée pour ce compte LoL." : "Renseignez votre Nom Riot et votre Tag ci-dessus pour analyser votre historique LoL."}
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
