"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CalendarDate,
  getLocalTimeZone,
  startOfMonth,
  startOfWeek,
  getWeeksInMonth,
  isSameMonth,
  isSameDay,
  isToday,
  today,
} from "@internationalized/date";
import { cn } from "@/lib/utils";

export type CalendarMarker = {
  /** ISO-8601 date (YYYY-MM-DD). */
  date: string;
  /** Number of items behind the marker. */
  count?: number;
  /** Visual accent of the dot. */
  tone?: "default" | "success" | "warning" | "error" | "info";
};

export interface CalendarProps {
  value?: CalendarDate | null;
  onChange?: (date: CalendarDate) => void;
  onMonthChange?: (date: CalendarDate) => void;
  className?: string;
  captionLayout?: "dropdown" | "default";
  locale?: string;
  markers?: CalendarMarker[];
}

const DEFAULT_LOCALE = "fr-FR";

const TONE_CLASSES: Record<string, string> = {
  default: "bg-violet-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  error: "bg-rose-400",
  info: "bg-sky-400",
};

export function Calendar({
  value,
  onChange,
  onMonthChange,
  className,
  captionLayout = "default",
  locale = DEFAULT_LOCALE,
  markers = [],
}: CalendarProps) {
  const initial = startOfMonth(value ?? today(getLocalTimeZone()));
  const [focused, setFocused] = React.useState<CalendarDate>(initial);

  React.useEffect(() => {
    if (value) setFocused(startOfMonth(value));
  }, [value]);

  const markerMap = React.useMemo(() => {
    const map = new Map<string, CalendarMarker>();
    for (const m of markers) {
      map.set(m.date, m);
    }
    return map;
  }, [markers]);

  const weeks = React.useMemo(() => getWeeksInMonth(focused, locale), [focused, locale]);
  const start = React.useMemo(() => startOfWeek(startOfMonth(focused), locale), [focused, locale]);
  const cells = React.useMemo<CalendarDate[]>(() => {
    const list: CalendarDate[] = [];
    for (let i = 0; i < weeks * 7; i++) {
      list.push(start.add({ days: i }) as CalendarDate);
    }
    return list;
  }, [start, weeks]);

  const weekdays = React.useMemo(() => {
    const first = startOfWeek(today(getLocalTimeZone()), locale);
    return Array.from({ length: 7 }, (_, i) => {
      const d = first.add({ days: i }) as CalendarDate;
      return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d.toDate(getLocalTimeZone()));
    });
  }, [locale]);

  const monthYearLabel = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(focused.toDate(getLocalTimeZone())),
    [focused, locale],
  );

  function changeMonth(month: number, year: number) {
    const next = new CalendarDate(year, month, 1);
    setFocused(next);
    onMonthChange?.(next);
  }

  function nav(offset: number) {
    const next = focused.add({ months: offset });
    setFocused(next);
    onMonthChange?.(next);
  }

  function select(day: CalendarDate) {
    if (!isSameMonth(day, focused)) {
      const next = startOfMonth(day);
      setFocused(next);
      onMonthChange?.(next);
    }
    onChange?.(day);
  }

  const years = React.useMemo(() => {
    const current = focused.year;
    const list: number[] = [];
    for (let y = current - 10; y <= current + 20; y++) list.push(y);
    return list;
  }, [focused.year]);

  const months = React.useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-zinc-950/75 p-4 backdrop-blur-2xl",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-2 text-zinc-400 transition-colors hover:text-white"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {captionLayout === "dropdown" ? (
          <div className="flex items-center gap-2">
            <select
              value={focused.month}
              onChange={(e) => changeMonth(Number(e.target.value), focused.year)}
              className="rounded-lg border border-white/[0.08] bg-zinc-950/50 px-2 py-1 text-sm text-white outline-none"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {new Intl.DateTimeFormat(locale, { month: "long" }).format(
                    new Date(focused.year, m - 1, 1),
                  )}
                </option>
              ))}
            </select>
            <select
              value={focused.year}
              onChange={(e) => changeMonth(focused.month, Number(e.target.value))}
              className="rounded-lg border border-white/[0.08] bg-zinc-950/50 px-2 py-1 text-sm text-white outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span className="text-sm font-medium text-white">{monthYearLabel}</span>
        )}

        <button
          type="button"
          onClick={() => nav(1)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-2 text-zinc-400 transition-colors hover:text-white"
          aria-label="Mois suivant"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-zinc-500">
        {weekdays.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day) => {
          const inMonth = isSameMonth(day, focused);
          const selected = value ? isSameDay(day, value) : false;
          const isTodayCell = isToday(day, getLocalTimeZone());
          const marker = inMonth ? markerMap.get(day.toString()) : undefined;

          return (
            <button
              key={day.toString()}
              type="button"
              disabled={!inMonth}
              onClick={() => select(day)}
              aria-pressed={selected}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors",
                !inMonth && "pointer-events-none text-transparent",
                selected
                  ? "bg-emerald-500 text-zinc-950 hover:bg-emerald-500"
                  : isTodayCell
                    ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/50 hover:bg-emerald-500/20"
                    : "bg-white/[0.02] text-white hover:bg-white/[0.06]",
              )}
            >
              <span
                className={cn(
                  "text-sm font-medium",
                  selected ? "text-zinc-950" : isTodayCell ? "text-emerald-400" : "",
                )}
              >
                {day.day}
              </span>
              {marker && (
                <span
                  className={cn(
                    "mt-0.5 h-1.5 w-1.5 rounded-full",
                    TONE_CLASSES[marker.tone ?? "default"] ?? TONE_CLASSES.default,
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
