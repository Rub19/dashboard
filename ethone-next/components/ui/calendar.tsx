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
  success: "bg-[--accent-primary]",
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
        "flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/75 p-4 backdrop-blur-2xl",
        className,
      )}
    >
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="rounded-xl border border-[var(--panel-border)] bg-[var(--text-primary)]/4 p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
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
              className="w-36"
              aria-label="Mois"
            />
            <Select
              value={String(focused.year)}
              onChange={(v) => changeMonth(focused.month, Number(v))}
              options={yearOptions}
              className="w-28"
              aria-label="Année"
            />
          </div>
        ) : (
          <span className="text-sm font-medium text-white">{monthYearLabel}</span>
        )}

        <button
          type="button"
          onClick={() => nav(1)}
          className="rounded-xl border border-[var(--panel-border)] bg-[var(--text-primary)]/4 p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
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

      <div className="mt-1 grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-1 overflow-hidden">
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
                "relative flex min-h-0 flex-col items-center justify-center rounded-xl text-sm transition-colors",
                !inMonth && "pointer-events-none text-transparent",
                selected
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:bg-[var(--accent-primary)]"
                  : isTodayCell
                    ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/20"
                    : "bg-[var(--text-primary)]/2 text-[var(--text-primary)] hover:bg-[var(--text-primary)]/6",
              )}
            >
              <span
                className={cn(
                  "text-sm font-medium",
                  selected ? "text-[var(--accent-contrast)]" : isTodayCell ? "text-[var(--accent-primary)]" : "",
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
