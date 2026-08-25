"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEK_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export type CalendarDot = {
  date: string; // YYYY-MM-DD
  category: "meeting" | "bill" | "flow";
};

type CalendarGridProps = {
  currentDate: Date;
  selectedDate: Date;
  today: Date;
  dots?: CalendarDot[];
  onSelect: (date: Date) => void;
  onChange: (date: Date) => void;
  monthLabel: string;
};

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(first);
  start.setDate(1 - offset);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}

export default function CalendarGrid({
  currentDate,
  selectedDate,
  today,
  dots = [],
  onSelect,
  onChange,
  monthLabel,
}: CalendarGridProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const dotsByDate = useMemo(() => {
    const map = new Map<string, CalendarDot["category"][]>();
    for (const dot of dots) {
      const list = map.get(dot.date) ?? [];
      list.push(dot.category);
      map.set(dot.date, list);
    }
    return map;
  }, [dots]);

  function prev() {
    onChange(new Date(year, month - 1, 1));
  }

  function next() {
    onChange(new Date(year, month + 1, 1));
  }

  function selectToday() {
    const now = new Date();
    onChange(now);
    onSelect(now);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl v8-panel p-4 shadow-xl shadow-black/50 backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent rounded-2xl" />

      <div className="relative z-10 mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">{monthLabel}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            aria-label="Mois précédent"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={selectToday}
            className="rounded-lg border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.06] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/10"
          >
            Aujourd&apos;hui
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Mois suivant"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)]"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-7">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]"
          >
            {d}
          </div>
        ))}
        {cells.map((date, i) => {
          const inMonth = date.getMonth() === month;
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          const key = toISODate(date);
          const dayDots = dotsByDate.get(key) ?? [];

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(date)}
              className={`group relative flex min-h-[50px] flex-col justify-between border border-[var(--text-primary)]/[0.04] p-1.5 text-left transition-all hover:bg-[var(--text-primary)]/[0.03] sm:min-h-[58px] ${
                isSelected
                  ? "z-10 rounded-xl bg-[var(--surface)]/50"
                  : "rounded-none"
              }`}
              style={
                isSelected
                  ? {
                      borderColor: "var(--accent-color, #10b981)",
                      backgroundColor: "var(--accent-muted, rgba(16, 185, 129, 0.08))",
                      boxShadow: "0 0 16px var(--accent-glow, rgba(16, 185, 129, 0.15))",
                    }
                  : undefined
              }
            >
              <span
                className={`text-[11px] font-mono font-medium transition-colors ${
                  inMonth
                    ? isSelected
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-primary)] group-hover:text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] opacity-40"
                }`}
              >
                {date.getDate()}
              </span>

              {isToday && (
                <span
                  className="absolute right-2 top-2 h-2 w-2 rounded-full"
                  style={{ background: "var(--accent-color, #10b981)" }}
                />
              )}

              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {dayDots.slice(0, 4).map((category, idx) => {
                  const color =
                    category === "meeting"
                      ? "bg-blue-500"
                      : category === "bill"
                      ? "bg-purple-500"
                      : "bg-[var(--accent-primary)]";
                  return (
                    <span
                      key={idx}
                      className={`h-1.5 w-1.5 rounded-full ${color}`}
                    />
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { buildMonthGrid, toISODate, isSameDay };
