"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/hooks/useI18n";
import type { ActivityEntry } from "@/lib/activity-journal";

export type ActivityHeatmapProps = {
  entries: ActivityEntry[];
  weeks?: number;
  selectedDate?: Date | null;
  onSelectDate?: (date: Date | null) => void;
};

type Cell = {
  date: Date;
  count: number;
  isToday: boolean;
};

const CELL = 12;
const GAP = 6;
const COL = CELL + GAP;

export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function dateKey(iso = ""): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function heatLevelClass(count: number, isSelected = false): string {
  if (isSelected) {
    return "bg-[var(--accent-primary)] ring-2 ring-white dark:ring-zinc-100 ring-offset-1 ring-offset-[var(--bg-main)] shadow-[0_0_8px_var(--glow-color)] rounded-sm";
  }
  if (count === 0) {
    return "bg-[var(--text-primary)]/[0.04] border border-[var(--text-primary)]/[0.06] rounded-sm hover:border-[var(--text-primary)]/20";
  }
  if (count <= 2) {
    return "bg-[var(--accent-primary)]/30 border border-[var(--accent-primary)]/40 rounded-sm hover:brightness-110";
  }
  if (count <= 5) {
    return "bg-[var(--accent-primary)]/60 border border-[var(--accent-primary)]/70 rounded-sm hover:brightness-110";
  }
  if (count <= 9) {
    return "bg-[var(--accent-primary)]/85 border border-[var(--accent-primary)]/90 rounded-sm shadow-[0_0_6px_var(--glow-color)] hover:brightness-110";
  }
  return "bg-[var(--accent-primary)] border border-[var(--accent-primary)] rounded-sm shadow-[0_0_10px_var(--glow-color)] hover:brightness-110";
}

function useLocale(): string {
  const i18n = useI18n();
  return i18n("daysShort")?.includes(",") ? "fr" : "en";
}

export default function ActivityHeatmap({
  entries,
  weeks = 53,
  selectedDate = null,
  onSelectDate,
}: ActivityHeatmapProps) {
  const i18n = useI18n();
  const locale = useLocale();
  const scrollRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Automatically scroll to the most recent week (today) on mount or period change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [weeks]);

  const endDate = useMemo(() => addDays(startOfWeek(today), 6), [today]);
  const startDate = useMemo(() => addDays(endDate, -(weeks * 7) + 1), [endDate, weeks]);

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
    <div ref={scrollRef} className="relative w-full overflow-x-auto os-scroll pb-1">
      <div className="min-w-max">
        {/* Month labels positioned directly above their respective start weeks */}
        <div className="relative mb-2 ml-8 h-4 text-[10px] font-medium uppercase text-[var(--text-muted)]" style={{ width: weeks * COL }}>
          {monthLabels.map((m, i) => (
            <span
              key={i}
              className="absolute select-none whitespace-nowrap"
              style={{ left: m.index * COL }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="flex gap-1.5">
          {/* Day labels: exactly aligned with the 7 rows (Mon, Wed, Fri) */}
          <div className="mr-1 grid grid-rows-7 gap-1.5 py-0.5 w-6 text-right">
            <span className="h-3 text-[9px] leading-3 text-[var(--text-muted)] select-none">{dayLabels[0]}</span>
            <span className="h-3" />
            <span className="h-3 text-[9px] leading-3 text-[var(--text-muted)] select-none">{dayLabels[1]}</span>
            <span className="h-3" />
            <span className="h-3 text-[9px] leading-3 text-[var(--text-muted)] select-none">{dayLabels[2]}</span>
            <span className="h-3" />
            <span className="h-3" />
          </div>

          {/* Grid */}
          <div className="grid grid-flow-col gap-1.5">
            {grid.map((week, w) => (
              <div key={w} className="grid grid-rows-7 gap-1.5">
                {week.map((cell, d) => {
                  const isSelected = selectedDate ? isSameDay(cell.date, selectedDate) : false;
                  return (
                    <motion.div
                      key={d}
                      whileHover={{ scale: 1.18 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      onMouseEnter={(e) => showTooltip(cell, e)}
                      onMouseMove={moveTooltip}
                      onMouseLeave={hideTooltip}
                      onClick={() => {
                        if (onSelectDate) {
                          onSelectDate(isSelected ? null : cell.date);
                        }
                      }}
                      className={`h-3 w-3 cursor-pointer transition-colors ${heatLevelClass(cell.count, isSelected)} ${
                        cell.isToday && !isSelected
                          ? "ring-1.5 ring-[var(--accent-primary)] ring-offset-1 ring-offset-[var(--bg-main)]"
                          : ""
                      }`}
                      aria-label={`${cell.count} ${i18n("journalContributions") || "contributions"} ${i18n("journalOnDate") || "le"} ${cell.date.toLocaleDateString()}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend with interactive hint */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[10px] text-[var(--text-muted)]">
          <div className="text-[11px]">
            {selectedDate ? (
              <span className="inline-flex items-center gap-1.5 text-[var(--accent-primary)] font-medium">
                <span>
                  {i18n("filteredByDate") || "Filtré le"} : {selectedDate.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "long" })}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectDate?.(null)}
                  className="ml-1 underline hover:text-[var(--text-primary)] cursor-pointer text-[10px]"
                >
                  ({i18n("reset") || "Réinitialiser"})
                </button>
              </span>
            ) : (
              <span className="opacity-75">
                {i18n("clickToFilter") || "Cliquez sur un jour pour filtrer les entrées ci-dessous"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>{i18n("less") || "Moins"}</span>
            <div className="flex gap-1">
              {[0, 1, 3, 6, 10].map((c) => (
                <div key={c} className={`h-3 w-3 ${heatLevelClass(c)}`} />
              ))}
            </div>
            <span>{i18n("more") || "Plus"}</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none fixed z-[var(--z-dock)] -translate-x-1/2 -translate-y-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] shadow-xl backdrop-blur-xl"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <span className="font-semibold text-[var(--accent-primary)]">{tooltip.count}</span>{" "}
            {i18n("journalContributions") || "contributions"} {i18n("journalOnDate") || "le"} {tooltip.date}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
