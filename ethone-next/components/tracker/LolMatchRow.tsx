"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical, Shield, Users } from "lucide-react";
import {
  type LolMatch,
  type LolPlayer,
  formatLolDuration,
  formatLolTimeAgo,
  calculateLolTRS,
} from "@/lib/lol-tracker";
import { cn } from "@/lib/utils";

interface LolMatchRowProps {
  match: LolMatch;
  index: number;
}

export default function LolMatchRow({ match, index }: LolMatchRowProps) {
  const [expanded, setExpanded] = useState(false);

  const meta = match.metadata;
  const isWin = meta?.result?.toLowerCase() === "victory";

  const players = match.scoreboard?.players || [];
  const me: LolPlayer | undefined =
    players.find((p) => p.isMe) || players[0];

  const kills = me?.stats?.kills ?? (match.segments?.[0]?.stats?.kills?.value ?? 0);
  const deaths = me?.stats?.deaths ?? (match.segments?.[0]?.stats?.deaths?.value ?? 0);
  const assists = me?.stats?.assists ?? (match.segments?.[0]?.stats?.assists?.value ?? 0);
  const kdaRatio =
    deaths === 0
      ? kills + assists
      : Number(((kills + assists) / deaths).toFixed(2));

  const csMin = me?.stats?.csPerMin ?? (match.segments?.[0]?.stats?.csPerMin?.value ?? 6.0);
  const trs = calculateLolTRS(me);

  const blueTeam = players.filter((p) => p.team === "Blue");
  const redTeam = players.filter((p) => p.team === "Red");

  // Items: 6 slots + 1 trinket
  const items = me?.items || [];
  const itemSlots = Array.from({ length: 6 }, (_, i) => items[i] || null);
  const trinket = items[6] || null;

  const spells = me?.spells || [];
  const rune = me?.rune;

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
        className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-3 p-3 sm:p-3.5 cursor-pointer select-none"
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

        {/* Left Side: Meta + Champion + Spells/Runes + Items */}
        <div className="flex flex-wrap items-center gap-3 pl-2 min-w-0">
          {/* Mode Details */}
          <div className="min-w-[110px]">
            <p className="text-[10px] font-medium text-zinc-400">
              {formatLolTimeAgo(meta?.timestamp)} <span className="text-zinc-600">{"//"}</span>{" "}
              <span>{formatLolDuration(meta?.duration)}</span>
            </p>
            <h4 className="text-sm font-bold text-white tracking-wide mt-0.5">
              {meta?.modeName || "Ranked Solo"}
            </h4>
          </div>

          {/* Role badge */}
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-zinc-400">
            {me?.position ? me.position.slice(0, 3).toUpperCase() : "?"}
          </div>

          {/* Champion Avatar with Level Badge */}
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-inner">
            <img
              src={
                meta?.championImageUrl ||
                (me?.character
                  ? `https://ddragon.leagueoflegends.com/cdn/14.15.1/img/champion/${me.character}.png`
                  : "https://ddragon.leagueoflegends.com/cdn/14.15.1/img/champion/Ahri.png")
              }
              alt={me?.character || "Champion"}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://ddragon.leagueoflegends.com/cdn/14.15.1/img/champion/Ahri.png";
              }}
            />
            {me?.level && (
              <span className="absolute bottom-0 left-0 rounded-tr-md bg-black/80 px-1 py-0.2 font-mono text-[9px] font-bold text-zinc-300">
                {me.level}
              </span>
            )}
          </div>

          {/* Spells (2) & Runes (2) */}
          <div className="flex items-center gap-1">
            {/* Spells Column */}
            <div className="flex flex-col gap-1">
              {spells.slice(0, 2).map((spell, si) => (
                <div
                  key={si}
                  className="h-5 w-5 overflow-hidden rounded-md border border-white/10 bg-black/50"
                >
                  {spell.image ? (
                    <img src={spell.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-zinc-800" />
                  )}
                </div>
              ))}
            </div>

            {/* Runes Column */}
            <div className="flex flex-col gap-1">
              <div className="h-5 w-5 overflow-hidden rounded-md border border-amber-500/30 bg-black/50">
                {rune?.image ? (
                  <img src={rune.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-amber-900/30" />
                )}
              </div>
              <div className="h-5 w-5 overflow-hidden rounded-md border border-white/10 bg-black/50">
                <div className="h-full w-full bg-zinc-800" />
              </div>
            </div>
          </div>

          {/* Items Grid (2x3 + Trinket) */}
          <div className="flex items-center gap-1">
            <div className="grid grid-cols-3 grid-rows-2 gap-1">
              {itemSlots.map((item, ii) => (
                <div
                  key={ii}
                  className="h-5 w-5 overflow-hidden rounded-md border border-white/10 bg-black/40 flex items-center justify-center"
                >
                  {item?.image ? (
                    <img src={item.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full border border-dashed border-white/10" />
                  )}
                </div>
              ))}
            </div>

            {/* Trinket */}
            <div className="h-11 w-5 overflow-hidden rounded-md border border-amber-500/30 bg-black/40 flex items-center justify-center">
              {trinket?.image ? (
                <img src={trinket.image} alt="" className="h-5 w-5 object-cover" />
              ) : (
                <div className="h-3 w-3 rounded-full bg-amber-400/50" />
              )}
            </div>
          </div>
        </div>

        {/* Right Side: TRS + K/D/A + CS/min + Teams Roster + Menu */}
        <div className="flex flex-wrap items-center justify-between xl:justify-end gap-3 sm:gap-6 pl-2 xl:pl-0">
          {/* TRS (Tracker Rating Score) */}
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-xl border shadow-sm",
                trs >= 900
                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                  : "border-white/10 bg-white/5 text-zinc-400"
              )}
            >
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-[8px] font-black uppercase text-zinc-500">TRS</span>
              <span className="font-mono text-xs font-black text-white">{trs}</span>
            </div>
          </div>

          {/* K/D/A & Ratio */}
          <div className="text-center min-w-[70px]">
            <span className="block font-mono text-[10px] font-bold text-zinc-400">
              {kills} <span className="text-zinc-600">{"//"}</span> {deaths}{" "}
              <span className="text-zinc-600">{"//"}</span> {assists}
            </span>
            <span
              className={cn(
                "font-mono text-sm font-black",
                kdaRatio >= 3.0
                  ? "text-cyan-400"
                  : kdaRatio >= 1.0
                  ? "text-amber-300"
                  : "text-rose-400"
              )}
            >
              {kdaRatio.toFixed(2)} KDA
            </span>
          </div>

          {/* CS/min */}
          <div className="text-center min-w-[40px]">
            <span className="block text-[9px] font-bold uppercase text-zinc-500">CS/min</span>
            <span className="font-mono text-xs font-bold text-white">{csMin}</span>
          </div>

          {/* Teams 10-Champions Roster (2 rows of 5) */}
          <div className="hidden sm:flex flex-col gap-1">
            {/* Blue Team Row */}
            <div className="flex items-center gap-1">
              {blueTeam.slice(0, 5).map((p, pi) => (
                <div
                  key={pi}
                  className="h-4 w-4 overflow-hidden rounded-md border border-cyan-500/30 bg-black"
                  title={`${p.name} (${p.character})`}
                >
                  <img
                    src={
                      p.assets?.champion?.small ||
                      `https://ddragon.leagueoflegends.com/cdn/14.15.1/img/champion/${p.character}.png`
                    }
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Red Team Row */}
            <div className="flex items-center gap-1">
              {redTeam.slice(0, 5).map((p, pi) => (
                <div
                  key={pi}
                  className="h-4 w-4 overflow-hidden rounded-md border border-rose-500/30 bg-black"
                  title={`${p.name} (${p.character})`}
                >
                  <img
                    src={
                      p.assets?.champion?.small ||
                      `https://ddragon.leagueoflegends.com/cdn/14.15.1/img/champion/${p.character}.png`
                    }
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              ))}
            </div>
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

      {/* Expanded Scoreboard */}
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
                  Scoreboard de la partie (10 joueurs)
                </span>
                <span className="text-[11px] text-zinc-500 font-normal">
                  Durée: {formatLolDuration(meta?.duration)} · Mode: {meta?.modeName}
                </span>
              </div>

              <div className="overflow-x-auto os-scroll">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500">
                      <th className="pb-2 pl-2">Joueur / Champion</th>
                      <th className="pb-2 text-center">Équipe</th>
                      <th className="pb-2 text-center">K / D / A</th>
                      <th className="pb-2 text-center">KDA</th>
                      <th className="pb-2 text-center">CS (CS/m)</th>
                      <th className="pb-2 text-center">Dégâts</th>
                      <th className="pb-2 text-center">Or</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {players.map((p, pi) => {
                      const pKda =
                        p.stats.deaths === 0
                          ? p.stats.kills + p.stats.assists
                          : Number(((p.stats.kills + p.stats.assists) / p.stats.deaths).toFixed(2));

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
                              src={
                                p.assets?.champion?.small ||
                                `https://ddragon.leagueoflegends.com/cdn/14.15.1/img/champion/${p.character}.png`
                              }
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
                          <td className="py-2 text-center font-bold">
                            <span
                              className={
                                p.team === "Blue" ? "text-cyan-400" : "text-rose-400"
                              }
                            >
                              {p.team}
                            </span>
                          </td>
                          <td className="py-2 text-center font-mono">
                            {p.stats.kills} / {p.stats.deaths} / {p.stats.assists}
                          </td>
                          <td
                            className={cn(
                              "py-2 text-center font-mono font-bold",
                              pKda >= 3.0
                                ? "text-cyan-400"
                                : pKda >= 1.0
                                ? "text-amber-300"
                                : "text-rose-400"
                            )}
                          >
                            {pKda.toFixed(2)}
                          </td>
                          <td className="py-2 text-center font-mono text-zinc-400">
                            {p.stats.cs} ({p.stats.csPerMin}/m)
                          </td>
                          <td className="py-2 text-center font-mono text-zinc-300">
                            {p.stats.damage.toLocaleString()}
                          </td>
                          <td className="py-2 text-center font-mono text-amber-300">
                            {p.stats.gold.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
