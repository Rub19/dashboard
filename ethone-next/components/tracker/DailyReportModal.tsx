"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  Zap,
  Sparkles,
  Award,
  Swords,
  Shield,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ValorantDayGroup } from "@/lib/valorant-tracker";
import type { LolDayGroup } from "@/lib/lol-tracker";

export type DailyReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  game: "valorant" | "lol";
  currentGroup: ValorantDayGroup | LolDayGroup | null;
  previousGroup?: ValorantDayGroup | LolDayGroup | null;
};

export default function DailyReportModal({
  isOpen,
  onClose,
  game,
  currentGroup,
  previousGroup,
}: DailyReportModalProps) {
  const isVal = game === "valorant";

  const stats = useMemo(() => {
    if (!currentGroup) return null;

    const wins = currentGroup.wins || 0;
    const count = currentGroup.count || 1;
    const losses = currentGroup.losses || count - wins;
    const winRate = Math.round((wins / Math.max(1, count)) * 100);

    const valGroup = isVal ? (currentGroup as ValorantDayGroup) : null;
    const prevVal = isVal && previousGroup ? (previousGroup as ValorantDayGroup) : null;

    const lolGroup = !isVal ? (currentGroup as LolDayGroup) : null;
    const prevLol = !isVal && previousGroup ? (previousGroup as LolDayGroup) : null;

    const kd = isVal ? valGroup?.avgKd || 1 : lolGroup?.avgKda || 1;
    const prevKd = isVal ? prevVal?.avgKd || null : prevLol?.avgKda || null;
    const kdDiff = prevKd !== null ? Number((kd - prevKd).toFixed(2)) : null;

    const hs = isVal ? valGroup?.avgHsPercent || 0 : 0;
    const prevHs = prevVal?.avgHsPercent || null;
    const hsDiff = prevHs !== null ? hs - prevHs : null;

    const acs = isVal ? valGroup?.avgAcs || 0 : lolGroup?.avgDpm || 0;
    const prevAcs = isVal ? prevVal?.avgAcs || null : prevLol?.avgDpm || null;
    const acsDiff = prevAcs !== null ? acs - prevAcs : null;

    // AI Coach Insights based on stats
    const tips: string[] = [];
    if (winRate >= 60) {
      tips.push("Excellente forme globale avec une majorité de victoires. Continue sur ce rythme !");
    } else if (winRate < 40) {
      tips.push("Session difficile : prends de courtes pauses entre les parties pour réinitialiser ton focus mental.");
    }

    if (isVal) {
      if (hs >= 30) {
        tips.push("Précision chirurgicale : ton pourcentage de Headshots est au-dessus de la moyenne de ton rang.");
      } else if (hs < 20) {
        tips.push("Conseil de visée : maintiens ton réticule à hauteur de tête (Crosshair Placement) lors des décalages.");
      }

      if ((valGroup?.avgDamageDelta || 0) > 20) {
        tips.push("Très bon impact en duel (+DDΔ positif) : tu infliges bien plus de dégâts que tu n'en subis.");
      }
    } else {
      if (kd >= 3.0) {
        tips.push("KDA exceptionnel : très bonne survie et participation décisive aux escarmouches.");
      }
      if ((lolGroup?.avgDpm || 0) >= 600) {
        tips.push("Dégâts constants par minute élevés : tu optimises bien ton impact en teamfight.");
      }
    }

    if (tips.length === 0) {
      tips.push("Performance équilibrée. Maintiens une communication active et sécurise les objectifs clés.");
    }

    return {
      dateLabel: currentGroup.dateLabel,
      count,
      wins,
      losses,
      winRate,
      kd,
      kdDiff,
      hs,
      hsDiff,
      acs,
      acsDiff,
      totalKills: isVal ? valGroup?.totalKills : undefined,
      totalDeaths: isVal ? valGroup?.totalDeaths : undefined,
      totalAssists: isVal ? valGroup?.totalAssists : undefined,
      tips,
    };
  }, [currentGroup, previousGroup, isVal]);

  if (!isOpen || !stats) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0d1017]/95 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-2xl border shadow-md",
                  isVal
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                )}
              >
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Rapport du jour</h3>
                <p className="text-xs text-zinc-400 font-medium">
                  {stats.dateLabel} • {stats.count} {stats.count > 1 ? "parties" : "partie"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stats Grid */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Record & Win Rate */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
              <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Bilan ({stats.winRate}%)
              </span>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-black">
                <span className="text-emerald-400">{stats.wins}W</span>
                <span className="text-zinc-600">{"//"}</span>
                <span className="text-rose-400">{stats.losses}L</span>
              </div>
            </div>

            {/* K/D or KDA */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
              <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                {isVal ? "Ratio K/D" : "KDA Moyen"}
              </span>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-mono text-sm font-black text-white">{stats.kd}</span>
                {stats.kdDiff !== null && (
                  <span
                    className={cn(
                      "flex items-center text-[10px] font-bold",
                      stats.kdDiff >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}
                  >
                    {stats.kdDiff >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                    {stats.kdDiff >= 0 ? `+${stats.kdDiff}` : stats.kdDiff}
                  </span>
                )}
              </div>
            </div>

            {/* ACS / DPM */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
              <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                {isVal ? "Score ACS" : "Dégâts DPM"}
              </span>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-mono text-sm font-black text-white">{stats.acs}</span>
                {stats.acsDiff !== null && (
                  <span
                    className={cn(
                      "flex items-center text-[10px] font-bold",
                      stats.acsDiff >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}
                  >
                    {stats.acsDiff >= 0 ? `+${stats.acsDiff}` : stats.acsDiff}
                  </span>
                )}
              </div>
            </div>

            {/* HS% if Valorant */}
            {isVal && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Précision HS
                </span>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-sm font-black text-white">{stats.hs}%</span>
                  {stats.hsDiff !== null && (
                    <span
                      className={cn(
                        "flex items-center text-[10px] font-bold",
                        stats.hsDiff >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {stats.hsDiff >= 0 ? `+${stats.hsDiff}%` : `${stats.hsDiff}%`}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI Coach Insights Section */}
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-4 shadow-inner">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Analyse & Conseils Coach
              </h4>
            </div>
            <ul className="space-y-2 text-xs text-zinc-300">
              {stats.tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
