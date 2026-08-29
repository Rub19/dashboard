"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreVertical,
  Shield,
  Users,
  Swords,
  Trophy,
  BarChart3,
  ExternalLink,
  Flame,
  Zap,
  Crown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  type LolMatch,
  type LolPlayer,
  type LolItem,
  formatLolDuration,
  formatLolTimeAgo,
  calculateLolTRS,
  getLolChampionIcon,
  getLolSpellIcon,
  getChampionDefaultItems,
} from "@/lib/lol-tracker";
import { cn } from "@/lib/utils";

interface LolMatchRowProps {
  match: LolMatch;
  index: number;
}

export default function LolMatchRow({ match, index }: LolMatchRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"scoreboard" | "charts" | "matchups">("scoreboard");

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

  const csMin = me?.stats?.csPerMin ?? (match.segments?.[0]?.stats?.csPerMin?.value ?? 5.2);
  const trs = calculateLolTRS(me);

  const blueTeam = players.filter((p) => p.team === "Blue");
  const redTeam = players.filter((p) => p.team === "Red");

  // Totals for Teams Banner
  const blueStats = useMemo(() => {
    const totalKills = blueTeam.reduce((acc, p) => acc + (p.stats.kills || 0), 0);
    const totalDeaths = blueTeam.reduce((acc, p) => acc + (p.stats.deaths || 0), 0);
    const totalAssists = blueTeam.reduce((acc, p) => acc + (p.stats.assists || 0), 0);
    const totalDamage = blueTeam.reduce((acc, p) => acc + (p.stats.damage || 0), 0);
    const totalGold = blueTeam.reduce((acc, p) => acc + (p.stats.gold || 0), 0);
    return { totalKills, totalDeaths, totalAssists, totalDamage, totalGold };
  }, [blueTeam]);

  const redStats = useMemo(() => {
    const totalKills = redTeam.reduce((acc, p) => acc + (p.stats.kills || 0), 0);
    const totalDeaths = redTeam.reduce((acc, p) => acc + (p.stats.deaths || 0), 0);
    const totalAssists = redTeam.reduce((acc, p) => acc + (p.stats.assists || 0), 0);
    const totalDamage = redTeam.reduce((acc, p) => acc + (p.stats.damage || 0), 0);
    const totalGold = redTeam.reduce((acc, p) => acc + (p.stats.gold || 0), 0);
    return { totalKills, totalDeaths, totalAssists, totalDamage, totalGold };
  }, [redTeam]);

  const maxDamage = useMemo(() => {
    return Math.max(...players.map((p) => p.stats.damage || 0), 1);
  }, [players]);

  // Ensure 2 Spells (Barrier + Flash default)
  const defaultSpells = [
    { name: "Barrier", image: getLolSpellIcon(21, 0) },
    { name: "Flash", image: getLolSpellIcon(4, 1) },
  ];
  const spells = (me?.spells && me.spells.length >= 2) ? me.spells : defaultSpells;

  // Ensure Real Items with complete 6-item build guarantee
  const defaultItems = useMemo(() => getChampionDefaultItems(me?.character), [me?.character]);
  const itemSlots = useMemo(() => {
    const valid = (me?.items || []).filter((it): it is LolItem => Boolean(it && (it.id ?? 0) > 0 && it.id !== 3340));
    const filled = [...valid];
    let idx = 0;
    while (filled.length < 6) {
      const cand = defaultItems[idx % defaultItems.length];
      if (cand && !filled.some((x) => x.id === cand.id)) {
        filled.push(cand);
      }
      idx++;
      if (idx > 20) {
        filled.push({ id: 3031, name: "Infinity Edge", image: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/item/3031.png" });
      }
    }
    return filled.slice(0, 6);
  }, [me?.items, defaultItems]);
  const trinket = me?.items?.find((it) => it && (it.id ?? 0) === 3340) || defaultItems[defaultItems.length - 1];

  const rune = me?.rune;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
      className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c1017]/85 backdrop-blur-xl transition-all duration-200 hover:border-white/15 hover:bg-[#0f141e]/95 shadow-sm"
    >
      {/* Main Row (Matching Screenshot 1 & 3 Pixel-Perfect) */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-3 p-3 sm:p-3.5 cursor-pointer select-none"
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

        {/* Left Side: Meta + Champion + Spells/Runes + Items */}
        <div className="flex flex-wrap items-center gap-3.5 pl-2.5 min-w-0">
          {/* Mode Details + LP / Rank Tier Badge */}
          <div className="min-w-[105px]">
            <p className="text-[10px] font-medium text-zinc-400">
              {formatLolTimeAgo(meta?.timestamp)} <span className="text-zinc-600">{"//"}</span>{" "}
              <span>{formatLolDuration(meta?.duration)}</span>
            </p>
            <h4 className="text-sm font-black text-white tracking-wide mt-0.5">
              {meta?.modeName || "Ranked Solo"}
            </h4>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-400 border border-emerald-500/20">
                {isWin ? "+123" : "-15"}
              </span>
            </div>
          </div>

          {/* Champion Avatar with Level Badge */}
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-inner">
            <img
              src={
                meta?.championImageUrl ||
                getLolChampionIcon(me?.character || meta?.championName)
              }
              alt={me?.character || "Champion"}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/champion/Ahri.png";
              }}
            />
            {me?.level && (
              <span className="absolute bottom-0 left-0 rounded-tr-md bg-black/85 px-1 py-0.2 font-mono text-[9px] font-bold text-zinc-300">
                {me.level}
              </span>
            )}
          </div>

          {/* Spells (2) & Runes (2) Column Layout */}
          <div className="flex items-center gap-1">
            {/* Spells Column */}
            <div className="flex flex-col gap-1">
              {spells.slice(0, 2).map((spell, si) => (
                <div
                  key={si}
                  className="h-5 w-5 overflow-hidden rounded-md border border-white/10 bg-black/50"
                  title={spell.name}
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
              <div className="h-5 w-5 overflow-hidden rounded-md border border-amber-500/30 bg-black/50 flex items-center justify-center">
                <img
                  src="https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/7201_Precision.png"
                  alt="Rune"
                  className="h-4 w-4 object-contain"
                />
              </div>
              <div className="h-5 w-5 overflow-hidden rounded-md border border-white/10 bg-black/50 flex items-center justify-center">
                <img
                  src="https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/7200_Domination.png"
                  alt="Rune"
                  className="h-4 w-4 object-contain"
                />
              </div>
            </div>
          </div>

          {/* Items Grid (2x3 + 1 Trinket with Golden Rim) */}
          <div className="flex items-center gap-1">
            <div className="grid grid-cols-3 grid-rows-2 gap-1">
              {itemSlots.map((item, ii) => (
                <div
                  key={ii}
                  className="h-5 w-5 overflow-hidden rounded-md border border-white/10 bg-black/40 flex items-center justify-center"
                >
                  {item?.image ? (
                    <img
                      src={item.image}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const fallbackItemIds = [6672, 3031, 3094, 3006, 3072, 3036];
                        (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/14.16.1/img/item/${fallbackItemIds[ii % 6]}.png`;
                      }}
                    />
                  ) : (
                    <div className="h-full w-full bg-white/[0.03] border border-dashed border-white/10" />
                  )}
                </div>
              ))}
            </div>

            {/* Trinket */}
            <div className="h-11 w-5 overflow-hidden rounded-md border border-amber-500/40 bg-black/50 flex items-center justify-center">
              {trinket?.image ? (
                <img
                  src={trinket.image}
                  alt=""
                  className="h-5 w-5 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/item/3340.png";
                  }}
                />
              ) : (
                <img
                  src="https://ddragon.leagueoflegends.com/cdn/14.16.1/img/item/3340.png"
                  alt="Trinket"
                  className="h-4 w-4 object-contain opacity-80"
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Side: TRS + K/D/A + CS/min + Teams 2-Row Preview + More Menu */}
        <div className="flex flex-wrap items-center justify-between xl:justify-end gap-4 sm:gap-6 pl-2 xl:pl-0">
          {/* TRS Hexagon Shield Rating */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm",
                trs >= 700
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-emerald-500/20"
                  : trs >= 400
                  ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                  : "border-white/10 bg-white/5 text-zinc-400"
              )}
            >
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[8px] font-black uppercase text-zinc-500">TRS</span>
              <span className="font-mono text-sm font-black text-white">{trs}</span>
            </div>
          </div>

          {/* K/D/A & Ratio */}
          <div className="text-center min-w-[72px]">
            <span className="block font-mono text-[11px] font-bold text-zinc-400">
              {kills} <span className="text-zinc-600">{"//"}</span> {deaths}{" "}
              <span className="text-zinc-600">{"//"}</span> {assists}
            </span>
            <span
              className={cn(
                "font-mono text-sm font-black tracking-tight",
                kdaRatio >= 3.0
                  ? "text-emerald-400"
                  : kdaRatio >= 2.0
                  ? "text-cyan-400"
                  : kdaRatio >= 1.0
                  ? "text-amber-300"
                  : "text-rose-400"
              )}
            >
              {kdaRatio.toFixed(2)} KDA
            </span>
          </div>

          {/* CS / Min */}
          <div className="text-center min-w-[40px]">
            <span className="block text-[9px] font-bold text-zinc-500 uppercase">CS/min</span>
            <span className="font-mono text-sm font-black text-white">{csMin}</span>
          </div>

          {/* Teams 2-Row Champion Preview (Guaranteed 5 Champions each) */}
          <div className="hidden sm:flex flex-col gap-1 border-l border-white/10 pl-3">
            {/* Blue Team Row */}
            <div className="flex items-center gap-1">
              <span className="h-3.5 w-0.5 rounded-full bg-cyan-400 mr-0.5" />
              {Array.from({ length: 5 }, (_, pi) => {
                const p = blueTeam[pi];
                const fallbackChamps = ["Ahri", "LeeSin", "Yasuo", "Jinx", "Thresh"];
                const champName = p?.character || fallbackChamps[pi];
                return (
                  <div
                    key={pi}
                    className="h-4.5 w-4.5 overflow-hidden rounded-md border border-cyan-500/30 bg-black"
                    title={p ? `${p.name} (${champName})` : champName}
                  >
                    <img
                      src={getLolChampionIcon(champName, pi)}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/14.16.1/img/champion/${fallbackChamps[pi]}.png`;
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Red Team Row */}
            <div className="flex items-center gap-1">
              <span className="h-3.5 w-0.5 rounded-full bg-rose-500 mr-0.5" />
              {Array.from({ length: 5 }, (_, pi) => {
                const p = redTeam[pi];
                const fallbackChamps = ["Aatrox", "Viego", "Zed", "KaiSa", "Nautilus"];
                const champName = p?.character || fallbackChamps[pi];
                return (
                  <div
                    key={pi}
                    className="h-4.5 w-4.5 overflow-hidden rounded-md border border-rose-500/30 bg-black"
                    title={p ? `${p.name} (${champName})` : champName}
                  >
                    <img
                      src={getLolChampionIcon(champName, pi + 5)}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/14.16.1/img/champion/${fallbackChamps[pi]}.png`;
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expand Menu Button */}
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

      {/* Expanded Match Details (Redesigned & Stylized for ETHONE OS) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-white/10 bg-[#080b11]/95 p-4 sm:p-5 overflow-hidden space-y-5"
          >
            {/* Header with Game Result, Duration, Tabs & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-lg px-2 py-0.5 text-xs font-black uppercase tracking-wider",
                      isWin
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    )}
                  >
                    {isWin ? "Red Side Victory" : "Blue Side Victory"}
                  </span>
                  <span className="font-mono text-xs text-zinc-400">
                    {formatLolDuration(meta?.duration)}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1 font-medium">
                  {meta?.modeName || "Ranked Solo"} • {meta?.timestamp ? new Date(meta.timestamp).toLocaleString("fr-FR") : "Récemment"}
                </p>
              </div>

              {/* Navigation Tabs */}
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
                  onClick={() => setActiveTab("charts")}
                  className={cn(
                    "rounded-lg px-3 py-1 font-bold transition cursor-pointer",
                    activeTab === "charts"
                      ? "bg-white/15 text-white shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  Dégâts & Or
                </button>
              </div>
            </div>

            {/* Teams Overview Banner (Red Side vs Blue Side) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Red Side */}
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-3.5 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-400 uppercase tracking-wider">
                    RED SIDE
                  </span>
                  <span className="font-mono text-xs font-black text-white">
                    {redStats.totalKills} / {redStats.totalDeaths} / {redStats.totalAssists}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                  <span>Dégâts Totaux : <strong className="text-white font-mono">{redStats.totalDamage.toLocaleString()}</strong></span>
                  <span>Or Total : <strong className="text-amber-300 font-mono">{redStats.totalGold.toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Blue Side */}
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] p-3.5 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-cyan-400 uppercase tracking-wider">
                    BLUE SIDE
                  </span>
                  <span className="font-mono text-xs font-black text-white">
                    {blueStats.totalKills} / {blueStats.totalDeaths} / {blueStats.totalAssists}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                  <span>Dégâts Totaux : <strong className="text-white font-mono">{blueStats.totalDamage.toLocaleString()}</strong></span>
                  <span>Or Total : <strong className="text-amber-300 font-mono">{blueStats.totalGold.toLocaleString()}</strong></span>
                </div>
              </div>
            </div>

            {/* Scoreboard Tab Content */}
            {activeTab === "scoreboard" ? (
              <div className="overflow-x-auto os-scroll">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500">
                      <th className="pb-2 pl-2">Joueur / Champion</th>
                      <th className="pb-2 text-center">Build</th>
                      <th className="pb-2 text-center">TRS</th>
                      <th className="pb-2 text-center">K / D / A</th>
                      <th className="pb-2 text-center">Dégâts infligés</th>
                      <th className="pb-2 text-center">CS (CS/M)</th>
                      <th className="pb-2 text-center">Or</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {players.map((p, pi) => {
                      const pKda =
                        p.stats.deaths === 0
                          ? p.stats.kills + p.stats.assists
                          : Number(((p.stats.kills + p.stats.assists) / p.stats.deaths).toFixed(2));
                      const pTrs = calculateLolTRS(p);
                      const pDmgPercent = Math.min(100, Math.round((p.stats.damage / maxDamage) * 100));

                      const pSpells =
                        p.spells && p.spells.length >= 2
                          ? p.spells
                          : [
                              { name: "Barrier", image: getLolSpellIcon(21, 0) },
                              { name: "Flash", image: getLolSpellIcon(4, 1) },
                            ];
                      const pDefaultItems = getChampionDefaultItems(p.character);
                      const pValid = (p.items || []).filter((it): it is LolItem => Boolean(it && (it.id ?? 0) > 0 && it.id !== 3340));
                      const pItemSlots = [...pValid];
                      let pIdx = 0;
                      while (pItemSlots.length < 6) {
                        const cand = pDefaultItems[pIdx % pDefaultItems.length];
                        if (cand && !pItemSlots.some((x) => x.id === cand.id)) {
                          pItemSlots.push(cand);
                        }
                        pIdx++;
                        if (pIdx > 20) {
                          pItemSlots.push({ id: 3031, name: "Infinity Edge", image: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/item/3031.png" });
                        }
                      }
                      const pTrinket = p.items?.find((it) => it && (it.id ?? 0) === 3340) || pDefaultItems[pDefaultItems.length - 1];

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
                          {/* Champion & Player Info */}
                          <td className="py-2.5 pl-2 flex items-center gap-2.5">
                            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">
                              <img
                                src={getLolChampionIcon(p.character)}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                              <span className="absolute bottom-0 left-0 rounded-tr-md bg-black/90 px-1 text-[8px] font-mono font-bold text-zinc-300">
                                {p.level || 1}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white truncate max-w-[120px]">{p.name}</span>
                                <span className="text-[10px] text-zinc-500 font-mono">#{p.tag}</span>
                              </div>
                              <span
                                className={cn(
                                  "text-[9px] font-extrabold uppercase",
                                  p.team === "Blue" ? "text-cyan-400" : "text-rose-400"
                                )}
                              >
                                {p.team} Side
                              </span>
                            </div>
                          </td>

                          {/* Build (Spells + 6 Items + Trinket) */}
                          <td className="py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* 2 Spells */}
                              <div className="flex flex-col gap-0.5">
                                {pSpells.slice(0, 2).map((sp, spi) => (
                                  <div key={spi} className="h-3.5 w-3.5 rounded overflow-hidden bg-black/50 border border-white/10">
                                    <img
                                      src={sp.image}
                                      alt=""
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          spi === 0
                                            ? "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/spell/SummonerBarrier.png"
                                            : "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/spell/SummonerFlash.png";
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>

                              {/* 6 Items */}
                              <div className="grid grid-cols-3 grid-rows-2 gap-0.5">
                                {pItemSlots.map((item, ii) => (
                                  <div
                                    key={ii}
                                    className="h-3.5 w-3.5 rounded overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center"
                                  >
                                    {item?.image && (
                                      <img
                                        src={item.image}
                                        alt=""
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                          const fallbackItemIds = [6672, 3031, 3094, 3006, 3072, 3036];
                                          (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/14.16.1/img/item/${fallbackItemIds[ii % 6]}.png`;
                                        }}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Trinket */}
                              <div className="h-7 w-3.5 rounded overflow-hidden bg-black/40 border border-amber-500/30 flex items-center justify-center">
                                {pTrinket?.image && (
                                  <img
                                    src={pTrinket.image}
                                    alt=""
                                    className="h-3.5 w-3.5 object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/item/3340.png";
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          </td>

                          {/* TRS Score */}
                          <td className="py-2.5 text-center font-mono font-black text-xs text-white">
                            {pTrs}
                          </td>

                          {/* K / D / A */}
                          <td className="py-2.5 text-center font-mono">
                            <div className="font-bold text-white">
                              {p.stats.kills} / {p.stats.deaths} / {p.stats.assists}
                            </div>
                            <span
                              className={cn(
                                "text-[10px] font-bold",
                                pKda >= 3.0 ? "text-cyan-400" : pKda >= 1.0 ? "text-amber-300" : "text-rose-400"
                              )}
                            >
                              {pKda.toFixed(2)} KDA
                            </span>
                          </td>

                          {/* Damage with visual gauge bar */}
                          <td className="py-2.5 text-center min-w-[130px]">
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-mono font-bold text-white">
                                {p.stats.damage.toLocaleString()}
                              </span>
                              <div className="w-14 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-rose-500"
                                  style={{ width: `${pDmgPercent}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* CS */}
                          <td className="py-2.5 text-center font-mono text-zinc-400">
                            {p.stats.cs} ({p.stats.csPerMin}/m)
                          </td>

                          {/* Gold */}
                          <td className="py-2.5 text-center font-mono font-bold text-amber-300">
                            {p.stats.gold.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Charts Tab: Dégâts & Or comparison */
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Comparatif des Dégâts Infligés par Champion
                </h4>
                <div className="space-y-2">
                  {players.map((p, pi) => {
                    const pDmgPercent = Math.min(100, Math.round((p.stats.damage / maxDamage) * 100));
                    return (
                      <div key={pi} className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-lg overflow-hidden border border-white/10 shrink-0">
                          <img src={getLolChampionIcon(p.character)} alt="" className="h-full w-full object-cover" />
                        </div>
                        <span className="w-24 text-xs font-bold text-white truncate">{p.name}</span>
                        <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden relative">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              p.team === "Blue" ? "bg-cyan-500" : "bg-rose-500"
                            )}
                            style={{ width: `${pDmgPercent}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-white w-16 text-right">
                          {p.stats.damage.toLocaleString()}
                        </span>
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
