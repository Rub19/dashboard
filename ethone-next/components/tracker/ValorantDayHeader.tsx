"use client";

import { TrendingUp, BarChart2 } from "lucide-react";
import type { ValorantDayGroup } from "@/lib/valorant-tracker";
import { cn } from "@/lib/utils";

interface ValorantDayHeaderProps {
  group: ValorantDayGroup;
  onViewReport?: () => void;
}

export default function ValorantDayHeader({ group, onViewReport }: ValorantDayHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-3 py-2 text-xs select-none">
      {/* Left: Date + Count + View Report + Record */}
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-black text-white tracking-wide">
            {group.dateLabel}
          </h3>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-md border border-white/15 bg-white/5 px-1.5 font-mono text-[10px] font-bold text-zinc-300">
            {group.count}
          </span>
        </div>

        {/* View Report Link */}
        <button
          type="button"
          onClick={onViewReport}
          className="flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>View Report</span>
        </button>

        {/* Record (Wins // Losses) */}
        <div className="flex items-center gap-1.5 font-mono font-black text-xs pl-2">
          <span className="text-emerald-400">{group.wins} W</span>
          <span className="text-zinc-600">//</span>
          <span className="text-rose-400">{group.losses} L</span>
        </div>
      </div>

      {/* Right: Daily Aggregate KPIs (Matching Screenshot) */}
      <div className="flex items-center justify-between md:justify-end gap-4 sm:gap-6 text-zinc-400 overflow-x-auto os-scroll">
        {/* K/D */}
        <div className="text-right">
          <span className="block text-[8px] font-extrabold uppercase text-zinc-500">K/D</span>
          <span className="font-mono text-xs font-black text-white">{group.avgKd}</span>
        </div>

        {/* K/D/A Breakdown */}
        <div className="text-right">
          <span className="block text-[8px] font-extrabold uppercase text-zinc-500">
            {group.totalKills} K <span className="text-zinc-600">//</span> {group.totalDeaths} D{" "}
            <span className="text-zinc-600">//</span> {group.totalAssists} A
          </span>
          <span className="font-mono text-xs font-bold text-white">
            {group.avgKda} <span className="text-[10px] text-zinc-400">K/D/A</span>
          </span>
        </div>

        {/* DDΔ */}
        <div className="text-right min-w-[32px]">
          <span className="block text-[8px] font-extrabold uppercase text-zinc-500">DDΔ</span>
          <span
            className={cn(
              "font-mono text-xs font-bold",
              group.avgDamageDelta >= 0 ? "text-white" : "text-rose-400"
            )}
          >
            {group.avgDamageDelta >= 0 ? `${group.avgDamageDelta}` : group.avgDamageDelta}
          </span>
        </div>

        {/* HS% */}
        <div className="text-right min-w-[28px]">
          <span className="block text-[8px] font-extrabold uppercase text-zinc-500">HS%</span>
          <span className="font-mono text-xs font-bold text-white">{group.avgHsPercent}</span>
        </div>

        {/* ACS */}
        <div className="text-right min-w-[32px]">
          <span className="block text-[8px] font-extrabold uppercase text-zinc-500">ACS</span>
          <span className="font-mono text-xs font-black text-white">{group.avgAcs}</span>
        </div>
      </div>
    </div>
  );
}
