"use client";

import { TrendingUp } from "@/components/icons/ph";
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
          <h3 className="text-base font-black text-[var(--text-primary)] tracking-wide">
            {group.dateLabel}
          </h3>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-md border border-[var(--panel-border)] bg-[var(--text-primary)]/5 px-1.5 font-mono text-[10px] font-bold text-[var(--text-primary)]/85">
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
          <span className="text-[var(--text-muted)]/60">{"//"}</span>
          <span className="text-rose-400">{group.losses} L</span>
        </div>
      </div>

      {/* Right: Daily Aggregate KPIs (Matching Screenshot) */}
      <div className="flex items-center justify-between md:justify-end gap-4 sm:gap-6 text-[var(--text-muted)] overflow-x-auto os-scroll">
        {/* K/D */}
        <div className="text-right">
          <span className="block text-[8px] font-extrabold uppercase text-[var(--text-muted)]/80">K/D</span>
          <span className="font-mono text-xs font-black text-[var(--text-primary)]">{group.avgKd}</span>
        </div>

        {/* K/D/A Breakdown */}
        <div className="text-right">
          <span className="block text-[8px] font-extrabold uppercase text-[var(--text-muted)]/80">
            {group.totalKills} K <span className="text-[var(--text-muted)]/60">{"//"}</span> {group.totalDeaths} D{" "}
            <span className="text-[var(--text-muted)]/60">{"//"}</span> {group.totalAssists} A
          </span>
          <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
            {group.avgKda} <span className="text-[10px] text-[var(--text-muted)]">K/D/A</span>
          </span>
        </div>

        {/* DDΔ */}
        <div className="text-right min-w-[32px]">
          <span className="block text-[8px] font-extrabold uppercase text-[var(--text-muted)]/80">DDΔ</span>
          <span
            className={cn(
              "font-mono text-xs font-bold",
              group.avgDamageDelta >= 0 ? "text-[var(--text-primary)]" : "text-rose-400"
            )}
          >
            {group.avgDamageDelta >= 0 ? `${group.avgDamageDelta}` : group.avgDamageDelta}
          </span>
        </div>

        {/* HS% */}
        <div className="text-right min-w-[28px]">
          <span className="block text-[8px] font-extrabold uppercase text-[var(--text-muted)]/80">HS%</span>
          <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{Math.round(group.avgHsPercent)}</span>
        </div>

        {/* Score de performance moyen (0-500) depuis le patch 13.06, sinon ACS moyen des anciennes parties */}
        <div className="text-right min-w-[32px]">
          <span className="block text-[8px] font-extrabold uppercase text-[var(--text-muted)]/80">
            {group.avgPerformanceScore !== null ? "PERF" : group.avgAcs > 0 ? "ACS" : "PERF"}
          </span>
          <span className="font-mono text-xs font-black text-[var(--text-primary)]">
            {group.avgPerformanceScore !== null ? group.avgPerformanceScore : group.avgAcs > 0 ? group.avgAcs : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
