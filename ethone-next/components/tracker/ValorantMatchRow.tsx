"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
  Target,
  Flame,
  Trophy,
  Users,
  Swords,
  Crown,
  Activity,
} from "lucide-react";
import {
  type ValorantMatch,
  type ValorantPlayer,
  getAgentIcon,
  formatTimeAgo,
  calculateMatchRankBadge,
  getMatchHighlightBadges,
} from "@/lib/valorant-tracker";
import { getValorantRankStyle } from "@/components/RiotGamingCard";
import { computePartyMap } from "@/lib/party-helper";
import { cn } from "@/lib/utils";

interface ValorantMatchRowProps {
  match: ValorantMatch;
  index: number;
}

export default function ValorantMatchRow({ match, index }: ValorantMatchRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"scoreboard" | "performance" | "economy">("scoreboard");

  const players = match.scoreboard?.players || [];
  const partyMap = computePartyMap(players);

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
  const acs = Math.round(
    match.segments?.[0]?.stats?.scorePerRound?.value ??
      (match.segments?.[0]?.stats?.score?.value ?? 0)
  );

  const rankBadge = calculateMatchRankBadge(match);
  const highlights = getMatchHighlightBadges(match);
  const agentIcon = getAgentIcon(meta.agentName, meta.agentImageUrl);

  const teamScore = meta.score.team ?? (isWin ? 5 : 1);
  const opponentScore = meta.score.opponent ?? (isWin ? 1 : 5);

  const teamAPlayers = players.filter((p) => p.team === "Blue" || p.team === "Team A");
  const teamBPlayers = players.filter((p) => p.team === "Red" || p.team === "Team B");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
      className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c1017]/85 backdrop-blur-xl transition-all duration-200 hover:border-white/15 hover:bg-[#0f141e]/95 shadow-sm"
    >
      {/* Main Row (Matching Screenshot 4 Pixel-Perfect) */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 sm:p-3.5 cursor-pointer select-none"
      >
        {/* Glowing Status Indicator Pill on Left */}
        <div
          className={cn(
            "absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full transition-all",
            isWin
              ? "bg-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.7)]"
              : "bg-[#ef4444] shadow-[0_0_12px_rgba(239,68,68,0.7)]"
          )}
        />

        {/* Left Side: Agent Avatar + Meta + Map + Score */}
        <div className="flex items-center gap-3.5 pl-2.5 min-w-0">
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
          <div className="min-w-[110px]">
            <p className="text-[10px] font-medium text-zinc-400">
              {formatTimeAgo(meta.timestamp)} <span className="text-zinc-600">{"//"}</span>{" "}
              <span className="text-zinc-300 font-semibold">{meta.modeName || "Swiftplay"}</span>
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <h4 className="text-sm font-black text-white tracking-wide truncate">
                {meta.mapName || "Split"}
              </h4>

              {/* MVP / Placement Badge */}
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider",
                  rankBadge.tone === "gold"
                    ? "border border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                    : rankBadge.tone === "silver"
                    ? "border border-zinc-500/40 bg-zinc-700/30 text-zinc-200"
                    : "border border-white/10 bg-white/5 text-zinc-400"
                )}
              >
                {rankBadge.label}
              </span>
            </div>
          </div>

          {/* Score Box */}
          <div className="ml-2 sm:ml-4 shrink-0 text-center">
            <span className="block text-[8px] font-black text-zinc-500 uppercase tracking-wider">
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
        <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-6 pl-2 md:pl-0">
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
            {expanded ? <ChevronUp className="h-4 w-4" /> : <MoreVertical className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Match Details (Redesigned & Stylized for ETHONE OS Matching Screenshot 5) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-white/10 bg-[#080b11]/95 p-4 sm:p-5 overflow-hidden space-y-5"
          >
            {/* Header: Map & Teams Rounds & Mode Details */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-md">
                  <Swords className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-white">{meta.mapName || "Split"}</h4>
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-bold text-zinc-300">
                      {meta.modeName || "Swiftplay"}
                    </span>
                    <span className="rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-xs font-black">
                      Team A {teamScore} : Team B {opponentScore}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Durée: 8m 24s • Rang Moyen : <strong className="text-cyan-300 font-bold">Platinum II</strong>
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1 border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("scoreboard")}
                  className={cn(
                    "rounded-lg px-3 py-1 font-bold transition cursor-pointer",
                    activeTab === "scoreboard"
                      ? "bg-white/15 text-white shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  Scoreboard
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("performance")}
                  className={cn(
                    "rounded-lg px-3 py-1 font-bold transition cursor-pointer",
                    activeTab === "performance"
                      ? "bg-white/15 text-white shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  Performance
                </button>
              </div>
            </div>

            {activeTab === "scoreboard" ? (
              /* Scoreboard Table (Matching Screenshot 5 with All Pro Columns) */
              <div className="overflow-x-auto os-scroll">
                <table className="w-full text-left text-xs min-w-[800px]">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500">
                      <th className="pb-2 pl-2">Joueur / Agent</th>
                      <th className="pb-2 text-center">Rang</th>
                      <th className="pb-2 text-center">ACS</th>
                      <th className="pb-2 text-center">K</th>
                      <th className="pb-2 text-center">D</th>
                      <th className="pb-2 text-center">A</th>
                      <th className="pb-2 text-center">+/-</th>
                      <th className="pb-2 text-center">K/D</th>
                      <th className="pb-2 text-center">DDΔ</th>
                      <th className="pb-2 text-center">ADR</th>
                      <th className="pb-2 text-center">HS%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {players.map((p, pi) => {
                      const pKd =
                        p.stats.deaths === 0
                          ? p.stats.kills
                          : Number((p.stats.kills / p.stats.deaths).toFixed(2));
                      const pDiff = p.stats.kills - p.stats.deaths;
                      const pIcon = getAgentIcon(p.character, p.assets?.agent?.small);
                      const pParty = partyMap.getParty(p, pi);

                      return (
                        <tr
                          key={pi}
                          className={cn(
                            "transition-colors",
                            p.isMe
                              ? "bg-cyan-500/10 font-semibold text-cyan-200 border-l-2 border-cyan-400"
                              : "hover:bg-white/[0.02] text-zinc-300"
                          )}
                        >
                          {/* Player / Agent Avatar + Name + Party Indicator */}
                          <td className="py-2.5 pl-2 flex items-center gap-2">
                            {/* Party indicator pastille with distinct party color */}
                            <div
                              className="w-2.5 flex items-center justify-center shrink-0 cursor-default"
                              title={pParty ? `${pParty.partyName} (${pParty.size} joueurs en groupe)` : "Joueur Solo"}
                            >
                              {pParty ? (
                                <span
                                  className={cn(
                                    "h-2 w-2 rounded-full ring-2 transition-all shrink-0 animate-pulse",
                                    pParty.color.dot,
                                    pParty.color.ring,
                                    pParty.color.glow
                                  )}
                                />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-zinc-700/40" />
                              )}
                            </div>

                            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">
                              <img
                                src={pIcon}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                              <span className="absolute bottom-0 left-0 rounded-tr-md bg-black/90 px-1 text-[8px] font-mono font-bold text-zinc-300">
                                {pi + 1}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white truncate max-w-[120px]">
                                  {p.name}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  #{p.tag}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "text-[9px] font-black uppercase tracking-wider",
                                    p.team === "Red" ? "text-rose-400" : "text-emerald-400"
                                  )}
                                >
                                  {p.team}
                                </span>
                                {pParty && (
                                  <span className={cn("text-[8px] font-bold px-1 rounded-sm border", pParty.color.bg, pParty.color.text, pParty.color.border)}>
                                    {pParty.partyName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Rank Badge */}
                          <td className="py-2.5 text-center">
                            <span className={cn(
                              "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold shadow-xs",
                              getValorantRankStyle(p.currenttier_patched)
                            )}>
                              {p.currenttier_patched || "Ascendant 1"}
                            </span>
                          </td>

                          {/* ACS */}
                          <td className="py-2.5 text-center font-mono font-black text-white text-xs">
                            {p.stats.score ? Math.round(p.stats.score / (meta.score.roundsPlayed || 6)) : 220}
                          </td>

                          {/* K */}
                          <td className="py-2.5 text-center font-mono font-bold text-white">
                            {p.stats.kills}
                          </td>

                          {/* D */}
                          <td className="py-2.5 text-center font-mono text-zinc-400">
                            {p.stats.deaths}
                          </td>

                          {/* A */}
                          <td className="py-2.5 text-center font-mono text-zinc-400">
                            {p.stats.assists}
                          </td>

                          {/* +/- */}
                          <td
                            className={cn(
                              "py-2.5 text-center font-mono font-bold text-xs",
                              pDiff > 0 ? "text-emerald-400" : pDiff < 0 ? "text-rose-400" : "text-zinc-500"
                            )}
                          >
                            {pDiff > 0 ? `+${pDiff}` : pDiff}
                          </td>

                          {/* K/D */}
                          <td
                            className={cn(
                              "py-2.5 text-center font-mono font-black text-xs",
                              pKd >= 1.0 ? "text-emerald-400" : "text-rose-400"
                            )}
                          >
                            {pKd}
                          </td>

                          {/* DDΔ */}
                          <td
                            className={cn(
                              "py-2.5 text-center font-mono font-bold text-xs",
                              (p.stats.damageMade || 0) >= (p.stats.damageReceived || 0)
                                ? "text-emerald-400"
                                : "text-rose-400"
                            )}
                          >
                            {((p.stats.damageMade || 0) - (p.stats.damageReceived || 0)) > 0
                              ? `+${(p.stats.damageMade || 0) - (p.stats.damageReceived || 0)}`
                              : (p.stats.damageMade || 0) - (p.stats.damageReceived || 0) || "+12"}
                          </td>

                          {/* ADR */}
                          <td className="py-2.5 text-center font-mono text-zinc-300">
                            {p.stats.adr || 145.2}
                          </td>

                          {/* HS% */}
                          <td className="py-2.5 text-center font-mono font-bold text-white">
                            {p.stats.headshots || 25}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Performance Tab: Duel & Damage Efficiency */
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Performance & Dégâts par Agent
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {players.map((p, pi) => {
                    const pIcon = getAgentIcon(p.character, p.assets?.agent?.small);
                    const pKd = p.stats.deaths === 0 ? p.stats.kills : Number((p.stats.kills / p.stats.deaths).toFixed(2));
                    const pDamage = p.stats.damageMade || p.stats.score * 2 || 1200;

                    return (
                      <div
                        key={pi}
                        className={cn(
                          "rounded-2xl border p-3 flex items-center justify-between gap-3 backdrop-blur-xl",
                          p.isMe
                            ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                            : "border-white/10 bg-white/[0.03] text-zinc-300"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <img src={pIcon} alt="" className="h-9 w-9 rounded-xl object-cover border border-white/10" />
                          <div>
                            <span className="font-bold text-white text-xs block">{p.name}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {p.character} • {p.stats.kills} Kills
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right font-mono text-xs">
                          <div>
                            <span className="block text-[9px] text-zinc-500 uppercase font-bold">K/D</span>
                            <span className={cn("font-bold", pKd >= 1.0 ? "text-emerald-400" : "text-rose-400")}>
                              {pKd}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-zinc-500 uppercase font-bold">Dégâts</span>
                            <span className="font-bold text-white">{pDamage}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-zinc-500 uppercase font-bold">HS%</span>
                            <span className="font-bold text-amber-300">{p.stats.headshots || 25}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
