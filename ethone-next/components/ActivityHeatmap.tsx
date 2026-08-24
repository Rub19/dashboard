"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/hooks/useI18n";
import type { ActivityEntry } from "@/lib/activity-journal";

export type ActivityHeatmapProps = {
  entries: ActivityEntry[];
  weeks?: number;
};

type Cell = {
  date: Date;
  count: number;
  isToday: boolean;
};

const CELL = 12;
const GAP = 5;
const COL = CELL + GAP;

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function dateKey(iso = ""): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function heatLevelClass(count: number): string {
  if (count === 0) return "bg-[var(--text-primary)]/[0.03] border border-[var(--text-primary)]/[0.05] rounded-sm";
  if (count <= 2) return "bg-[--accent-primary] border border-[--accent-primary] rounded-sm";
  if (count <= 5) return "bg-[--accent-primary] border border-[--accent-primary] rounded-sm";
  if (count <= 9) return "bg-[--accent-primary] rounded-sm shadow-[0_0_6px_var(--glow-color)]";
  return "bg-[--accent-primary] rounded-sm shadow-[0_0_10px_var(--glow-color)]";
}

function useLocale(): string {
  const i18n = useI18n();
  return i18n("daysShort")?.includes(",") ? "fr" : "en";
}

export default function ActivityHeatmap({ entries, weeks = 53 }: ActivityHeatmapProps) {
  const i18n = useI18n();
  const locale = useLocale();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const endDate = addDays(startOfWeek(today), (weeks - 1) * 7 + 6);
  const startDate = addDays(endDate, -(weeks * 7) + 1);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const key = dateKey(e.timestamp);
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [entries]);

  const { grid, monthLabels, dayLabels } = useMemo(() => {
    const grid: Cell[][] = [];
    const monthLabels: { index: number; label: string }[] = [];
    let previousMonth = -1;

    for (let w = 0; w < weeks; w++) {
      const weekStart = addDays(startDate, w * 7);
      const col: Cell[] = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(weekStart, d);
        const key = dateKey(date.toISOString());
        const count = counts.get(key) || 0;
        col.push({ date, count, isToday: isSameDay(date, today) });
      }
      grid.push(col);

      const monday = col[0].date;
      if (monday.getMonth() !== previousMonth) {
        monthLabels.push({
          index: w,
          label: new Intl.DateTimeFormat(locale, { month: "short" }).format(monday),
        });
        previousMonth = monday.getMonth();
      }
    }

    const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
    const dayLabels = [0, 2, 4].map((d) => dayFormatter.format(addDays(startDate, d)));

    return { grid, monthLabels, dayLabels };
  }, [counts, startDate, weeks, locale, today]);

  const [tooltip, setTooltip] = useState<{ x: number; y: number; count: number; date: string } | null>(null);

  function showTooltip(cell: Cell, e: React.MouseEvent) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const formatted = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(cell.date);
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      count: cell.count,
      date: formatted,
    });
  }

  function moveTooltip(e: React.MouseEvent) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip((prev) => (prev ? { ...prev, x: rect.left + rect.width / 2, y: rect.top - 8 } : null));
  }

  function hideTooltip() {
    setTooltip(null);
  }

  return (
    <div className="relative w-full overflow-x-auto [&::-webkit-scrollbar]:hidden">
      <div className="min-w-max">
        {/* Month labels */}
        <div className="mb-1.5 ml-7 flex h-4 gap-1.5" style={{ width: weeks * COL }}>
          {monthLabels.map((m, i) => (
            <span
              key={i}
              className="text-[10px] font-medium uppercase text-[var(--text-muted)]"
              style={{
                marginLeft: i === 0 ? m.index * COL : undefined,
              }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="flex gap-1.5">
          {/* Day labels */}
          <div className="mr-2 flex w-5 flex-col items-end gap-1.5 py-0.5">
            {dayLabels.map((label, i) => (
              <span key={i} className="h-3 text-[9px] leading-3 text-[var(--text-muted)]">
                {label}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-flow-col gap-1.5">
            {grid.map((week, w) => (
              <div key={w} className="grid grid-rows-7 gap-1.5">
                {week.map((cell, d) => (
                  <motion.div
                    key={d}
                    whileHover={{ scale: 1.15 }}
                    transition={{ duration: 0.15 }}
                    onMouseEnter={(e) => showTooltip(cell, e)}
                    onMouseMove={moveTooltip}
                    onMouseLeave={hideTooltip}
                    className={`h-3 w-3 cursor-pointer ${heatLevelClass(cell.count)} ${
                      cell.isToday ? "ring-2 ring-[--accent-primary] ring-offset-1 ring-offset-zinc-950" : ""
                    }`}
                    aria-label={`${cell.count} ${i18n("journalContributions") || "contributions"} ${i18n("journalOnDate") || "le"} ${cell.date.toLocaleDateString()}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-[var(--text-muted)]">
          <span>{i18n("less") || "Moins"}</span>
          <div className="flex gap-1">
            {[0, 1, 3, 6, 10].map((c) => (
              <div key={c} className={`h-3 w-3 ${heatLevelClass(c)}`} />
            ))}
          </div>
          <span>{i18n("more") || "Plus"}</span>
        </div>
      </div>

      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg border border-[var(--text-primary)]/[0.08] bg-zinc-950/90 px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] shadow-xl backdrop-blur-xl"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <span className="font-semibold text-[--accent-primary]">{tooltip.count}</span>{" "}
            {i18n("journalContributions") || "contributions"} {i18n("journalOnDate") || "le"} {tooltip.date}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
