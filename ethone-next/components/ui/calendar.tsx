"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Select, { type SelectOption } from "@/components/ui/Select";
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
  /** Brand logos / images for the bills */
  logos?: string[];
  /** Bill labels */
  labels?: string[];
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
  success: "bg-[var(--accent-primary)]",
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
    const list: number[] = [];
    for (let y = 1900; y <= 2100; y++) list.push(y);
    return list;
  }, []);

  const months = React.useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  const monthOptions: SelectOption[] = React.useMemo(
    () =>
      months.map((m) => ({
        id: String(m),
        label: new Intl.DateTimeFormat(locale, { month: "long" }).format(
          new Date(focused.year, m - 1, 1),
        ),
      })),
    [months, locale, focused.year],
  );

  const yearOptions: SelectOption[] = React.useMemo(
    () => years.map((y) => ({ id: String(y), label: String(y) })),
    [years],
  );

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/80 p-3 sm:p-4 backdrop-blur-2xl shadow-xl",
        className,
      )}
    >
      <div className="mb-2.5 flex shrink-0 items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="rounded-xl border border-[var(--panel-border)] bg-[var(--text-primary)]/4 p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] cursor-pointer"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {captionLayout === "dropdown" ? (
          <div className="flex items-center gap-2">
            <Select
              value={String(focused.month)}
              onChange={(v) => changeMonth(Number(v), focused.year)}
              options={monthOptions}
              className="w-32 sm:w-36"
              aria-label="Mois"
            />
            <Select
              value={String(focused.year)}
              onChange={(v) => changeMonth(focused.month, Number(v))}
              options={yearOptions}
              className="w-24 sm:w-28"
              aria-label="Année"
            />
          </div>
        ) : (
          <span className="text-sm font-medium text-[var(--text-primary)]">{monthYearLabel}</span>
        )}

        <button
          type="button"
          onClick={() => nav(1)}
          className="rounded-xl border border-[var(--panel-border)] bg-[var(--text-primary)]/4 p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] cursor-pointer"
          aria-label="Mois suivant"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-[11px] font-semibold text-[var(--text-muted)] py-1">
        {weekdays.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="mt-0.5 grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-1 sm:gap-1.5 overflow-hidden">
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
                "relative flex min-h-0 flex-col items-center justify-between rounded-xl sm:rounded-2xl p-1 sm:p-1.5 text-xs sm:text-sm transition-all duration-150 cursor-pointer overflow-hidden",
                !inMonth && "pointer-events-none opacity-0",
                selected
                  ? "border border-purple-400/70 bg-gradient-to-b from-purple-500/30 to-indigo-500/20 text-white shadow-[0_0_18px_rgba(168,85,247,0.4)] scale-[1.02]"
                  : isTodayCell
                    ? "border border-cyan-500/50 bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/30 hover:bg-cyan-500/20"
                    : "border border-white/[0.04] bg-white/[0.02] text-zinc-300 hover:border-white/15 hover:bg-white/[0.06]",
                marker && !selected && "border-white/10 bg-white/[0.04]"
              )}
            >
              <span
                className={cn(
                  "text-[11px] sm:text-xs font-bold leading-none",
                  selected ? "text-white" : isTodayCell ? "text-cyan-300" : "text-zinc-200",
                )}
              >
                {day.day}
              </span>

              {marker && (
                <div className="mt-0.5 flex max-w-full items-center justify-center gap-0.5 overflow-hidden">
                  {marker.logos && marker.logos.length > 0 ? (
                    <>
                      {marker.logos.slice(0, 2).map((logoUrl, i) => (
                        <div
                          key={i}
                          className="flex h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 items-center justify-center rounded-full bg-black/70 border border-white/20 p-0.5 shadow-xs"
                        >
                          <img
                            src={logoUrl}
                            alt=""
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                      ))}
                      {marker.logos.length > 2 && (
                        <span className="flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-purple-500/30 border border-purple-500/40 text-[8px] font-bold text-purple-200">
                          +{marker.logos.length - 2}
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full shadow-[0_0_6px_currentColor]",
                          marker.tone === "error"
                            ? "bg-rose-500 text-rose-500"
                            : marker.tone === "success"
                            ? "bg-emerald-400 text-emerald-400"
                            : "bg-purple-400 text-purple-400"
                        )}
                      />
                      {marker.count && marker.count > 1 && (
                        <span className="font-mono text-[8px] font-bold text-zinc-400">
                          {marker.count}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
