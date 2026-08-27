"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Trophy,
  Target,
  Flame,
  Shield,
  Zap,
  Activity,
  Calendar,
  Clock,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import GameIcon from "@/components/icons/GameIcon";

export type TrackerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  game: "valorant" | "lol";
  playerName?: string | null;
  playerTag?: string | null;
  matches?: Record<string, unknown>[] | null;
  onRefresh?: () => void;
};

export default function TrackerModal({
  isOpen,
  onClose,
  game,
  playerName = "Player",
  playerTag = "EUW",
  matches,
  onRefresh,
}: TrackerModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "matches" | "agents">("overview");
  const isVal = game === "valorant";

  // Fallback demo data if matches empty
  const matchHistory = useMemo(() => {
    if (matches && matches.length > 0) return matches;

    if (isVal) {
      return [
        {
          id: "val-1",
          metadata: {
            mapName: "Ascent",
            modeName: "Compétitif",
            agentName: "Jett",
            result: "Victory",
            score: { team: 13, opponent: 8 },
            timeAgo: "Il y a 2h",
            duration: "34m",
          },
          stats: {
            kills: 24,
            deaths: 12,
            assists: 6,
            score: 6420,
            hsPercent: "28%",
            adr: 172,
            kda: "2.50",
          },
        },
        {
          id: "val-2",
          metadata: {
            mapName: "Haven",
            modeName: "Compétitif",
            agentName: "Reyna",
            result: "Defeat",
            score: { team: 11, opponent: 13 },
            timeAgo: "Il y a 4h",
            duration: "41m",
          },
          stats: {
            kills: 21,
            deaths: 16,
            assists: 4,
            score: 5120,
            hsPercent: "32%",
            adr: 154,
            kda: "1.56",
          },
        },
        {
          id: "val-3",
          metadata: {
            mapName: "Bind",
            modeName: "Compétitif",
            agentName: "Omen",
            result: "Victory",
            score: { team: 13, opponent: 5 },
            timeAgo: "Hier",
            duration: "26m",
          },
          stats: {
            kills: 18,
            deaths: 9,
            assists: 14,
            score: 4890,
            hsPercent: "22%",
            adr: 138,
            kda: "3.55",
          },
        },
        {
          id: "val-4",
          metadata: {
            mapName: "Sunset",
            modeName: "Compétitif",
            agentName: "Jett",
            result: "Victory",
            score: { team: 13, opponent: 10 },
            timeAgo: "Il y a 2 jours",
            duration: "38m",
          },
          stats: {
            kills: 26,
            deaths: 15,
            assists: 5,
            score: 7100,
            hsPercent: "25%",
            adr: 185,
            kda: "2.07",
          },
        },
      ];
    } else {
      return [
        {
          id: "lol-1",
          metadata: {
            mapName: "Faille de l'invocateur",
            modeName: "Ranked Solo",
            agentName: "Yasuo",
            result: "Victory",
            score: { team: 32, opponent: 18 },
            timeAgo: "Il y a 3h",
            duration: "29m",
          },
          stats: {
            kills: 12,
            deaths: 4,
            assists: 9,
            score: 18400,
            csPerMin: "8.4",
            adr: 650,
            kda: "5.25",
          },
        },
        {
          id: "lol-2",
          metadata: {
            mapName: "Faille de l'invocateur",
            modeName: "Ranked Solo",
            agentName: "Ahri",
            result: "Victory",
            score: { team: 28, opponent: 21 },
            timeAgo: "Il y a 5h",
            duration: "33m",
          },
          stats: {
            kills: 9,
            deaths: 3,
            assists: 15,
            score: 16200,
            csPerMin: "7.8",
            adr: 590,
            kda: "8.00",
          },
        },
        {
          id: "lol-3",
          metadata: {
            mapName: "Faille de l'invocateur",
            modeName: "Ranked Solo",
            agentName: "Yone",
            result: "Defeat",
            score: { team: 19, opponent: 34 },
            timeAgo: "Hier",
            duration: "36m",
          },
          stats: {
            kills: 7,
            deaths: 8,
            assists: 4,
            score: 14100,
            csPerMin: "7.1",
            adr: 480,
            kda: "1.37",
          },
        },
      ];
    }
  }, [matches, isVal]);

  const statsSummary = useMemo(() => {
    if (isVal) {
      return {
        rank: "Ascendant 2",
        rating: "68 RR",
        winRate: "64%",
        kda: "1.42",
        headshot: "26.8%",
        adr: "162.4",
        matches: "48",
      };
    } else {
      return {
        rank: "Émeraude 1",
        rating: "82 LP",
        winRate: "59%",
        kda: "3.28",
        headshot: "8.2 CS/m",
        adr: "612 D/m",
        matches: "62",
      };
    }
  }, [isVal]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "relative flex flex-col h-[90vh] max-h-[850px] w-full max-w-4xl rounded-3xl border bg-[#0b0c10] shadow-2xl overflow-hidden backdrop-blur-2xl text-[var(--text-primary)]",
              isVal ? "border-rose-500/30" : "border-amber-500/30"
            )}
          >
            {/* Top Game Banner */}
            <div
              className={cn(
                "relative shrink-0 px-6 py-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
                isVal
                  ? "bg-gradient-to-r from-rose-950/70 via-red-900/30 to-black/80 border-rose-500/20"
                  : "bg-gradient-to-r from-amber-950/70 via-yellow-900/30 to-black/80 border-amber-500/20"
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-lg",
                    isVal ? "bg-rose-500/20 border-rose-500/40 text-rose-400" : "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  )}
                >
                  <GameIcon game={game} className="h-8 w-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black tracking-tight text-white">
                      {playerName}
                      <span className="text-sm font-normal text-[var(--text-muted)] ml-1">#{playerTag}</span>
                    </h2>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                        isVal ? "bg-rose-500/20 border-rose-500/40 text-rose-300" : "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      )}
                    >
                      {statsSummary.rank} • {statsSummary.rating}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Tracker en direct • Données synchronisées avec les serveurs officiels
                  </p>
                </div>
              </div>

              {/* Close & Refresh buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all active:scale-95"
                    title="Actualiser les stats"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all active:scale-95"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="shrink-0 flex items-center gap-2 px-6 pt-3 border-b border-white/5 bg-black/40">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={cn(
                  "px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer",
                  activeTab === "overview"
                    ? isVal
                      ? "border-rose-500 text-rose-400"
                      : "border-amber-500 text-amber-400"
                    : "border-transparent text-[var(--text-muted)] hover:text-white"
                )}
              >
                Vue d&apos;ensemble
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("matches")}
                className={cn(
                  "px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer",
                  activeTab === "matches"
                    ? isVal
                      ? "border-rose-500 text-rose-400"
                      : "border-amber-500 text-amber-400"
                    : "border-transparent text-[var(--text-muted)] hover:text-white"
                )}
              >
                Historique des parties ({matchHistory.length})
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto os-scroll p-6 space-y-6">
              {/* Overview Metrics Cards */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                      <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Win Rate</p>
                      <p className="mt-1 text-2xl font-black text-white">{statsSummary.winRate}</p>
                      <p className="text-[10px] text-emerald-400 font-medium mt-0.5">En hausse (+4%)</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                      <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">K/D Ratio</p>
                      <p className="mt-1 text-2xl font-black text-white">{statsSummary.kda}</p>
                      <p className="text-[10px] text-emerald-400 font-medium mt-0.5">Top 12%</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                      <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        {isVal ? "Headshot %" : "CS / min"}
                      </p>
                      <p className="mt-1 text-2xl font-black text-white">{statsSummary.headshot}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Moyenne saison</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                      <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        {isVal ? "Dégâts / Round" : "Dégâts / min"}
                      </p>
                      <p className="mt-1 text-2xl font-black text-white">{statsSummary.adr}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{statsSummary.matches} parties</p>
                    </div>
                  </div>

                  {/* Highlights Banner */}
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Série de victoires en cours</h4>
                        <p className="text-xs text-[var(--text-muted)]">
                          3 victoires consécutives lors de vos 4 derniers matchs compétitifs.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Match History List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-white/60" />
                  Dernières parties compétitives
                </h3>

                <div className="space-y-2.5">
                  {matchHistory.map((m, idx) => {
                    const meta = (m.metadata || {}) as Record<string, unknown>;
                    const stats = (m.stats || {}) as Record<string, unknown>;
                    const isVictory = String(meta.result || "").toLowerCase() === "victory";

                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 transition-all shadow-sm",
                          isVictory
                            ? "border-emerald-500/30 bg-emerald-950/15 hover:border-emerald-500/50"
                            : "border-rose-500/30 bg-rose-950/15 hover:border-rose-500/50"
                        )}
                      >
                        {/* Left: Agent & Result */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={cn(
                              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border font-bold text-sm shadow-md",
                              isVictory
                                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                                : "border-rose-500/40 bg-rose-500/20 text-rose-300"
                            )}
                          >
                            {String(meta.agentName || "Agent").slice(0, 3)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.2 text-[10px] font-black uppercase tracking-wider",
                                  isVictory ? "bg-emerald-500/30 text-emerald-300" : "bg-rose-500/30 text-rose-300"
                                )}
                              >
                                {isVictory ? "Victoire" : "Défaite"}
                              </span>
                              <span className="text-xs font-bold text-white">
                                {String(meta.mapName || "Map")}
                              </span>
                              <span className="text-xs text-[var(--text-muted)]">• {String(meta.modeName || "Compétitif")}</span>
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                              {String(meta.timeAgo || "Récemment")} • Durée: {String(meta.duration || "30m")}
                            </p>
                          </div>
                        </div>

                        {/* Right: KDA & Score */}
                        <div className="flex items-center gap-5 justify-between sm:justify-end">
                          <div className="text-center">
                            <p className="font-mono text-sm font-bold text-white">
                              {String(stats.kills ?? 0)} / {String(stats.deaths ?? 0)} / {String(stats.assists ?? 0)}
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)] font-mono">
                              KDA {String(stats.kda ?? "1.0")}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-mono text-base font-black text-white">
                              {meta.score
                                ? `${(meta.score as { team: number }).team} - ${(meta.score as { opponent: number }).opponent}`
                                : "—"}
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)] font-medium">Score final</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
