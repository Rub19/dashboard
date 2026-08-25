"use client";

import { useMemo, useState } from "react";
import { Calendar, ChevronDown, Plus, Receipt, Scan } from "lucide-react";
import type { CalendarItem } from "@/components/CalendarBills";
import VendorLogo from "@/components/logos/VendorLogo";

// ---------------------------------------------------------------------------
// EventsCard
// ---------------------------------------------------------------------------

type EventsCardProps = {
  date: Date;
  items: CalendarItem[];
  onAdd: () => void;
};

const EVENT_SOURCES = ["Tous", "Factures", "Événements"];

export function EventsCard({ date, items, onAdd }: EventsCardProps) {
  const [source, setSource] = useState("Tous");
  const [menuOpen, setMenuOpen] = useState(false);

  const label = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const filteredItems = useMemo(() => {
    if (source === "Factures") {
      return items.filter((it) => it.category === "monthly" || it.category === "yearly");
    }
    if (source === "Événements") {
      return items.filter((it) => it.category === "event");
    }
    return items;
  }, [items, source]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl v8-panel p-5 backdrop-blur-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[--accent-primary]" />
          <span className="text-sm font-bold text-white">Événements</span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.03] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.06]"
          >
            {source}
            <ChevronDown className="h-3 w-3" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1.5 min-w-[8rem] rounded-xl border border-white/[0.08] bg-zinc-900 p-1 shadow-xl backdrop-blur-xl">
              {EVENT_SOURCES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSource(s);
                    setMenuOpen(false);
                  }}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                    source === s
                      ? "bg-[var(--text-primary)]/[0.08] text-[var(--text-primary)]"
                      : "text-[var(--text-primary)] hover:bg-[var(--text-primary)]/[0.04]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col gap-1 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3.5">
          <p className="text-xs font-semibold text-white">{label}</p>
          <p className="text-xs text-zinc-500">Aucun événement pour cette date.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filteredItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5"
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: item.color || "#A259FF" }}
              >
                <VendorLogo vendor={item.vendor} className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{item.title}</p>
                {item.amount !== undefined && (
                  <p className="text-[10px] text-zinc-400">
                    {item.amount > 0
                      ? item.amount.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        })
                      : "Événement"}
                    {" · "}
                    {item.category === "monthly"
                      ? "Mensuel"
                      : item.category === "yearly"
                      ? "Annuel"
                      : "Événement"}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add action */}
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.04] py-2 text-xs font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)]"
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter un événement
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InvoicesCard
// ---------------------------------------------------------------------------

type InvoicesCardProps = {
  items: CalendarItem[];
  currentDate: Date;
  onAdd: () => void;
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
};

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];

export function InvoicesCard({
  items,
  currentDate,
  onAdd,
  selectedDate,
  onSelectDate,
}: InvoicesCardProps) {
  const activeDate = selectedDate || currentDate;

  const currentMonthItems = useMemo(() => {
    return items.filter((it) => {
      const d = new Date(it.date);
      return d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth();
    });
  }, [items, currentDate]);

  const monthTotal = useMemo(
    () =>
      currentMonthItems
        .filter((it) => it.category === "monthly" || it.category === "yearly")
        .reduce((sum, it) => sum + (it.amount || 0), 0),
    [currentMonthItems]
  );

  const next30Days = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  }, []);

  const upcoming = useMemo(() => {
    const now = new Date();
    return items.filter((it) => {
      const d = new Date(it.date);
      return d >= now && d <= next30Days;
    });
  }, [items, next30Days]);

  const weekStart = useMemo(() => {
    const d = new Date(activeDate);
    const day = (d.getDay() + 6) % 7; // MON = 0
    d.setDate(d.getDate() - day);
    return d;
  }, [activeDate]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const amountText = monthTotal.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
  const upcomingText = `${upcoming.length} à venir dans 30 jours`;

  return (
    <div className="flex flex-col gap-4 rounded-2xl v8-panel p-5 backdrop-blur-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-[--accent-primary]" />
          <span className="text-sm font-bold text-white">Factures</span>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold font-mono tracking-tight text-white">{amountText}</p>
          <p className="text-[10px] text-zinc-400">{upcomingText}</p>
        </div>
      </div>

      {/* Day selector */}
      <div className="grid grid-cols-7 gap-1.5 rounded-xl border border-white/[0.05] bg-white/[0.02] p-1">
        {days.map((day, idx) => {
          const active = isSameDay(day, activeDate);
          const hasItem = items.some((it) => it.date === toISODate(day));
          return (
            <button
              key={toISODate(day)}
              type="button"
              onClick={() => onSelectDate?.(day)}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-lg p-2 text-center text-xs transition-colors ${
                active
                  ? "bg-[var(--accent-primary)] font-bold text-[var(--accent-contrast)] shadow-sm"
                  : "text-[var(--muted)] hover:bg-[var(--text-primary)]/[0.04] hover:text-[var(--text-primary)]"
              }`}
            >
              <span className="text-[9px] opacity-70">{WEEK_DAYS[idx]}</span>
              <span className="leading-none">{day.getDate()}</span>
              {hasItem && !active && (
                <span className="h-1 w-1 rounded-full bg-zinc-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 py-2 text-xs font-semibold text-[var(--accent-primary)] transition-all hover:bg-[var(--accent-primary)]/20 active:scale-[0.99]"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.04] py-2 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)]"
        >
          <Scan className="h-3.5 w-3.5" />
          Scanner
        </button>
      </div>
    </div>
  );
}
