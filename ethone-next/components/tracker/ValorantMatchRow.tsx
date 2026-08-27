"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical, ChevronDown, ChevronUp, Shield, Zap, Target, Flame, Trophy, Users } from "lucide-react";
import {
  type ValorantMatch,
  getAgentIcon,
  formatTimeAgo,
  calculateMatchRankBadge,
  getMatchHighlightBadges,
} from "@/lib/valorant-tracker";
import { cn } from "@/lib/utils";

interface ValorantMatchRowProps {
  match: ValorantMatch;
  index: number;
}

export default function ValorantMatchRow({ match, index }: ValorantMatchRowProps) {
  const [expanded, setExpanded] = useState(false);

  const meta = match.metadata;
  const isWin =
    meta.result.toLowerCase() === "victory" ||
    (meta.score.team !== null &&
      meta.score.opponent !== null &&
      meta.score.team > meta.score.opponent);

  const kills = match.segments?.[0]?.stats?.kills?.value ?? 0;
  const deaths = match.segments?.[0]?.stats?.deaths?.value ?? 0;
  const assists = match.segments?.[0]?.stats?.assists?.value ?? 0;
  const kd = deaths === 0 ? kills : Number((kills / deaths).toFixed(2));
  const hsPercent = Math.round(match.segments?.[0]?.stats?.headshotsPercentage?.value ?? 0);
  const damageDelta = Math.round(match.segments?.[0]?.stats?.damageDeltaPerRound?.value ?? 0);
  const acs = Math.round(match.segments?.[0]?.stats?.scorePerRound?.value ?? (match.segments?.[0]?.stats?.score?.value ?? 0));

  const rankBadge = calculateMatchRankBadge(match);
  const highlights = getMatchHighlightBadges(match);
  const agentIcon = getAgentIcon(meta.agentName, meta.agentImageUrl);

  const teamScore = meta.score.team ?? (isWin ? 5 : 2);
  const opponentScore = meta.score.opponent ?? (isWin ? 2 : 5);

  const players = match.scoreboard?.players || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
      className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c1017]/85 backdrop-blur-xl transition-all duration-200 hover:border-white/15 hover:bg-[#0f141e]/95 shadow-sm"
    >
      {/* Main Row */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 sm:p-3.5 cursor-pointer select-none"
      >
        {/* Glowing Status Indicator Pill on Left */}
        <div
          className={cn(
            "absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-all",
            isWin
              ? "bg-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.7)]"
              : "bg-[#ef4444] shadow-[0_0_12px_rgba(239,68,68,0.7)]"
          )}
        />

        {/* Left Side: Agent Avatar + Meta + Map + Score */}
        <div className="flex items-center gap-3 pl-2 min-w-0">
          {/* Agent Avatar */}
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-inner">
            <img
              src={agentIcon}
              alt={meta.agentName || "Agent"}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://media.valorant-api.com/agents/add6443a-41bd-e378-6169-1589f0169f48/displayicon.png";
              }}
            />
          </div>

          {/* Map & Mode Details */}
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-zinc-400">
              {formatTimeAgo(meta.timestamp)} <span className="text-zinc-600">//</span>{" "}
              <span className="text-zinc-300">{meta.modeName || "Swiftplay"}</span>
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <h4 className="text-sm font-bold text-white tracking-wide truncate">
                {meta.mapName || "Sunset"}
              </h4>

              {/* MVP / Placement Badge */}
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider",
                  rankBadge.tone === "gold"
                    ? "border border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                    : rankBadge.tone === "silver"
                    ? "border border-zinc-500/40 bg-zinc-700/30 text-zinc-200"
                    : "border border-amber-700/40 bg-amber-900/20 text-amber-400"
                )}
              >
                {rankBadge.label}
              </span>
            </div>
          </div>

          {/* Score Box */}
          <div className="ml-4 shrink-0 text-center">
            <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              Score
            </span>
            <div className="flex items-center gap-1 font-mono text-sm font-black">
              <span className={isWin ? "text-emerald-400" : "text-rose-400"}>
                {teamScore}
              </span>
              <span className="text-zinc-600">:</span>
              <span className={!isWin ? "text-emerald-400" : "text-rose-400"}>
                {opponentScore}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Highlights / Accolades */}
        <div className="hidden lg:flex items-center gap-1.5 px-2">
          {highlights.map((badge, bi) => (
            <span
              key={bi}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-zinc-300 shadow-xs"
            >
              {badge}
            </span>
          ))}
        </div>

        {/* Right Side: Exact Stats Columns */}
        <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-5 pl-2 md:pl-0">
          {/* K/D */}
          <div className="text-center min-w-[36px]">
            <span className="block text-[9px] font-bold uppercase text-zinc-500">K/D</span>
            <span
              className={cn(
                "font-mono text-sm font-black",
                kd >= 2.0
                  ? "text-cyan-400"
                  : kd >= 1.0
                  ? "text-emerald-400"
                  : "text-rose-400"
              )}
            >
              {kd}
            </span>
          </div>

          {/* K/D/A */}
          <div className="text-center min-w-[58px]">
            <span className="block text-[9px] font-bold uppercase text-zinc-500">K/D/A</span>
            <span className="font-mono text-xs font-bold text-white">
              {kills} <span className="text-zinc-600">/</span> {deaths}{" "}
              <span className="text-zinc-600">/</span> {assists}
            </span>
          </div>

          {/* DDΔ (Damage Delta) */}
          <div className="text-center min-w-[36px]">
            <span className="block text-[9px] font-bold uppercase text-zinc-500">DDΔ</span>
            <span
              className={cn(
                "font-mono text-xs font-bold",
                damageDelta >= 0 ? "text-white" : "text-rose-400"
              )}
            >
              {damageDelta >= 0 ? `${damageDelta}` : damageDelta}
            </span>
          </div>

          {/* HS% */}
          <div className="text-center min-w-[32px]">
            <span className="block text-[9px] font-bold uppercase text-zinc-500">HS%</span>
            <span className="font-mono text-xs font-bold text-white">{hsPercent}</span>
          </div>

          {/* ACS */}
          <div className="text-center min-w-[36px]">
            <span className="block text-[9px] font-bold uppercase text-zinc-500">ACS</span>
            <span className="font-mono text-xs font-black text-white">{acs}</span>
          </div>

          {/* Expand Menu Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white transition-all active:scale-95 cursor-pointer"
            aria-label="Détails du match"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded Scoreboard & Players List */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-white/10 bg-black/40 p-4 overflow-hidden"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-cyan-400" />
                  Scoreboard de la partie
                </span>
                <span className="text-[11px] text-zinc-500 font-normal">
                  Mode: {meta.modeName || "Standard"} · Carte: {meta.mapName}
                </span>
              </div>

              {players.length === 0 ? (
                <div className="py-4 text-center text-xs text-zinc-500">
                  Détails complets des joueurs synchronisés avec Henrik API.
                </div>
              ) : (
                <div className="overflow-x-auto os-scroll">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500">
                        <th className="pb-2 pl-2">Joueur / Agent</th>
                        <th className="pb-2 text-center">Rang</th>
                        <th className="pb-2 text-center">Score</th>
                        <th className="pb-2 text-center">K / D / A</th>
                        <th className="pb-2 text-center">K/D</th>
                        <th className="pb-2 text-center">Dégâts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {players.map((p, pi) => {
                        const pKd = p.stats.deaths === 0 ? p.stats.kills : Number((p.stats.kills / p.stats.deaths).toFixed(2));
                        const pIcon = getAgentIcon(p.character, p.assets?.agent?.small);

                        return (
                          <tr
                            key={pi}
                            className={cn(
                              "transition-colors",
                              p.isMe
                                ? "bg-cyan-500/10 font-semibold text-cyan-200"
                                : "hover:bg-white/[0.02] text-zinc-300"
                            )}
                          >
                            <td className="py-2 pl-2 flex items-center gap-2">
                              <img
                                src={pIcon}
                                alt=""
                                className="h-6 w-6 rounded-lg object-cover border border-white/10"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                              <div className="min-w-0">
                                <span className="truncate">{p.name}</span>
                                <span className="text-[10px] text-zinc-500">#{p.tag}</span>
                              </div>
                            </td>
                            <td className="py-2 text-center text-zinc-400">
                              {p.currenttier_patched || "-"}
                            </td>
                            <td className="py-2 text-center font-mono font-bold">
                              {p.stats.score}
                            </td>
                            <td className="py-2 text-center font-mono">
                              {p.stats.kills} / {p.stats.deaths} / {p.stats.assists}
                            </td>
                            <td
                              className={cn(
                                "py-2 text-center font-mono font-bold",
                                pKd >= 1.0 ? "text-emerald-400" : "text-rose-400"
                              )}
                            >
                              {pKd}
                            </td>
                            <td className="py-2 text-center font-mono text-zinc-400">
                              {p.stats.damageMade || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
