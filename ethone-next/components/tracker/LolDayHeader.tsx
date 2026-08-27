"use client";

import type { LolDayGroup } from "@/lib/lol-tracker";

interface LolDayHeaderProps {
  group: LolDayGroup;
}

export default function LolDayHeader({ group }: LolDayHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-3 py-2 text-xs select-none">
      {/* Left: Date + Count + Record */}
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-black text-white tracking-wide">
            {group.dateLabel}
          </h3>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-md border border-white/15 bg-white/5 px-1.5 font-mono text-[10px] font-bold text-zinc-300">
            {group.count}
          </span>
        </div>

        {/* Record (Wins // Losses) */}
        <div className="flex items-center gap-1.5 font-mono font-black text-xs pl-2">
          <span className="text-emerald-400">{group.wins} W</span>
          <span className="text-zinc-600">//</span>
          <span className="text-rose-400">{group.losses} L</span>
        </div>
      </div>

      {/* Right: Daily Aggregate KPIs (Avg DPM, Avg KDA, Avg GPM) */}
      <div className="flex items-center justify-between md:justify-end gap-6 text-zinc-400 overflow-x-auto os-scroll">
        {/* Avg DPM */}
        <div className="text-right">
          <span className="block text-[8px] font-extrabold uppercase text-zinc-500">Avg DPM</span>
          <span className="font-mono text-xs font-black text-white">{group.avgDpm}</span>
        </div>

        {/* Avg KDA */}
        <div className="text-right">
          <span className="block text-[8px] font-extrabold uppercase text-zinc-500">Avg KDA</span>
          <span className="font-mono text-xs font-black text-white">{group.avgKda.toFixed(2)}</span>
        </div>

        {/* Avg GPM */}
        <div className="text-right min-w-[36px]">
          <span className="block text-[8px] font-extrabold uppercase text-zinc-500">Avg GPM</span>
          <span className="font-mono text-xs font-black text-white">{group.avgGpm}</span>
        </div>
      </div>
    </div>
  );
}
