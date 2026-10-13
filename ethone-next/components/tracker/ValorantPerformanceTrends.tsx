"use client";

import { useMemo, useState } from "react";
import {
  type DateFilterRange,
  filterMatchesByDateRange,
  calculatePerformanceTrends,
  calculateMapAnalytics,
  calculateInsights,
} from "@/lib/valorant-analytics";
import type { ValorantMatch } from "@/lib/valorant-tracker";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Calendar,
} from "@/components/icons/ph";
import { motion } from "framer-motion";
import { EASE_SNAP } from "@/lib/ease";

export interface ValorantPerformanceTrendsProps {
  matches: ValorantMatch[];
}

export default function ValorantPerformanceTrends({ matches }: ValorantPerformanceTrendsProps) {
  const [range, setRange] = useState<DateFilterRange>("30d");

  const filteredMatches = useMemo(
    () => filterMatchesByDateRange(matches, range),
    [matches, range]
  );

  const trends = useMemo(
    () => calculatePerformanceTrends(filteredMatches),
    [filteredMatches]
  );

  const mapStats = useMemo(
    () => calculateMapAnalytics(filteredMatches),
    [filteredMatches]
  );

  const insights = useMemo(
    () => calculateInsights(filteredMatches),
    [filteredMatches]
  );

  const summary = useMemo(() => {
    if (filteredMatches.length === 0) return null;
    let wins = 0;
    let kills = 0;
    let deaths = 0;
    let totalHs = 0;
    let totalShots = 0;
    let totalAdr = 0;
    let adrCount = 0;

    for (const m of filteredMatches) {
      const res = (m.metadata?.result || "").toLowerCase();
      const teamScore = m.metadata?.score?.team ?? null;
      const oppScore = m.metadata?.score?.opponent ?? null;
      if (res === "victory" || (teamScore !== null && oppScore !== null && teamScore > oppScore)) {
        wins += 1;
      }

      const seg = m.segments?.[0]?.stats;
      if (seg) {
        if (typeof seg.kills?.value === "number") kills += seg.kills.value;
        if (typeof seg.deaths?.value === "number") deaths += seg.deaths.value;
        if (typeof seg.adr?.value === "number") {
          totalAdr += seg.adr.value;
          adrCount += 1;
        }
      }

      const me = m.scoreboard?.players?.find((p) => p.isMe);
      if (me?.stats) {
        const hs = me.stats.headshots || 0;
        const bs = me.stats.bodyshots || 0;
        const ls = me.stats.legshots || 0;
        totalHs += hs;
        totalShots += hs + bs + ls;
      }
    }

    const count = filteredMatches.length;
    const wr = Math.round((wins / count) * 100);
    const kd = deaths > 0 ? Number((kills / deaths).toFixed(2)) : kills;
    const hsPct = totalShots > 0 ? Math.round((totalHs / totalShots) * 100) : null;
    const adr = adrCount > 0 ? Math.round(totalAdr / adrCount) : null;

    return { count, wins, losses: count - wins, wr, kd, hsPct, adr };
  }, [filteredMatches]);

  const maxKd = useMemo(() => {
    if (trends.length === 0) return 2;
    const max = Math.max(...trends.map((t) => t.kd), 2);
    return Math.ceil(max * 10) / 10;
  }, [trends]);

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--text-muted)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/5 text-[var(--text-primary)]/85 mb-3">
          <TrendingUp className="h-7 w-7" />
        </div>
        <h4 className="text-sm font-bold text-[var(--text-primary)]">Aucune analyse disponible</h4>
        <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]/80">
          Recherchez un joueur Valorant pour visualiser les courbes de progression et les indicateurs tactiques.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/80 p-3.5 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-rose-400" />
          <span className="text-xs font-bold text-[var(--text-primary)]">Période d&apos;analyse :</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto os-scroll">
          {(
            [
              { id: "7d", label: "7 jours" },
              { id: "14d", label: "14 jours" },
              { id: "30d", label: "30 jours" },
              { id: "all", label: "Tout l'historique" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRange(item.id)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                range === item.id
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-[var(--text-primary)]/5 text-[var(--text-muted)] hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)]"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE_SNAP }}
            className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/70 p-3 backdrop-blur-xl"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Victoires</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[var(--text-primary)]">{summary.wr}%</span>
              <span className="text-xs text-[var(--text-muted)]">
                ({summary.wins}V - {summary.losses}D)
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05, ease: EASE_SNAP }}
            className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/70 p-3 backdrop-blur-xl"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Ratio K/D</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className={cn("text-xl font-black", summary.kd >= 1.1 ? "text-emerald-400" : summary.kd < 0.95 ? "text-rose-400" : "text-amber-400")}>
                {summary.kd}
              </span>
              <span className="text-xs text-[var(--text-muted)]">moyen</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1, ease: EASE_SNAP }}
            className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/70 p-3 backdrop-blur-xl"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Précision Headshot</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-cyan-400">
                {summary.hsPct !== null ? `${summary.hsPct}%` : "—"}
              </span>
              <span className="text-xs text-[var(--text-muted)]">{summary.hsPct !== null ? "tirs tête" : "non dispo"}</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.15, ease: EASE_SNAP }}
            className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/70 p-3 backdrop-blur-xl"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Dégâts Moyens / Round</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[var(--text-primary)]">
                {summary.adr !== null ? summary.adr : "—"}
              </span>
              <span className="text-xs text-[var(--text-muted)]">ADR</span>
            </div>
          </motion.div>
        </div>
      )}

      {trends.length > 0 && (
        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/70 p-4 backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-rose-400" />
              <h3 className="text-xs font-bold text-[var(--text-primary)]">Évolution du Ratio K/D par Partie</h3>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Victoire
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Défaite
              </span>
            </div>
          </div>

          <div className="relative h-44 w-full pt-4">
            <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${Math.max(trends.length - 1, 1) * 60 + 40} 120`} preserveAspectRatio="none">
              <line
                x1="0"
                y1={120 - (1.0 / maxKd) * 110}
                x2={Math.max(trends.length - 1, 1) * 60 + 40}
                y2={120 - (1.0 / maxKd) * 110}
                stroke="currentColor"
                strokeDasharray="4 4"
                className="text-[var(--text-muted)]/20"
                strokeWidth="1"
              />

              {trends.length > 1 && (
                <polyline
                  fill="none"
                  stroke="rgba(244, 63, 94, 0.6)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={trends
                    .map((pt, i) => {
                      const x = i * 60 + 20;
                      const y = Math.max(10, 120 - (pt.kd / maxKd) * 110);
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />
              )}

              {trends.map((pt, i) => {
                const x = i * 60 + 20;
                const y = Math.max(10, 120 - (pt.kd / maxKd) * 110);
                const isVictory = pt.result === "victory";

                return (
                  <g key={pt.matchId} className="group cursor-pointer">
                    <circle
                      cx={x}
                      cy={y}
                      r="5.5"
                      className={cn(
                        "transition-transform group-hover:scale-150",
                        isVictory ? "fill-emerald-400" : "fill-rose-500"
                      )}
                    />
                    <title>{`${pt.date} · ${pt.agentName} sur ${pt.mapName}\nRatio : ${pt.kd} K/D (${isVictory ? "Victoire" : "Défaite"})`}</title>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono px-2 pt-1 border-t border-[var(--panel-border)]/40">
            <span>{trends[0]?.date}</span>
            <span>Ligne pointillée : ratio 1.0 neutre</span>
            <span>{trends[trends.length - 1]?.date}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-[var(--panel-radius)] border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
              Points Forts Identifiés
            </h4>
          </div>

          {insights.strengths.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">
              {insights.hasSufficientData
                ? "Aucun point fort statistiquement saillant sur cet échantillon."
                : "Échantillon trop restreint pour dégager des forces confirmées."}
            </p>
          ) : (
            <div className="space-y-2">
              {insights.strengths.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[var(--inset-radius)] border border-emerald-500/20 bg-[var(--bg-main)]/60 p-2.5 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">{item.title}</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                      {item.metric}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[var(--panel-radius)] border border-rose-500/20 bg-rose-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wide">
              Axes d&apos;Amélioration Prioritaires
            </h4>
          </div>

          {insights.improvements.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">
              {insights.hasSufficientData
                ? "Aucune faiblesse statistique critique observée sur cet échantillon."
                : "Échantillon trop restreint pour isoler des faiblesses récurrentes."}
            </p>
          ) : (
            <div className="space-y-2">
              {insights.improvements.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[var(--inset-radius)] border border-rose-500/20 bg-[var(--bg-main)]/60 p-2.5 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">{item.title}</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300">
                      {item.metric}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {mapStats.length > 0 && (
        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/70 p-4 backdrop-blur-xl space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-[var(--text-primary)]">Performances par Carte</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {mapStats.map((map) => (
              <div
                key={map.mapName}
                className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[var(--text-primary)]">{map.mapName}</span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {map.matchesCount} partie{map.matchesCount > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-muted)]">Taux de victoire</span>
                    <span className={cn("font-bold font-mono", map.winRate >= 50 ? "text-emerald-400" : "text-rose-400")}>
                      {map.winRate}% ({map.wins}V - {map.losses}D)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--panel-border)] overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", map.winRate >= 50 ? "bg-emerald-400" : "bg-rose-500")}
                      style={{ width: `${map.winRate}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--panel-border)]/40">
                  <span>Ratio K/D</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">{map.kdRatio}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
