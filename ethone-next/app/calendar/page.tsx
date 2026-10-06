"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDate,
  endOfMonth,
  getLocalTimeZone,
  startOfMonth,
  today,
} from "@internationalized/date";
import { Calendar, type CalendarMarker } from "@/components/ui/calendar";
import CalendarBillingPanel from "@/components/CalendarBillingPanel";
import CalendarAgendaPanel from "@/components/calendar/CalendarAgendaPanel";
import BrainFinanceAssistant from "@/components/calendar/BrainFinanceAssistant";
import { Clock, CreditCard } from "@/components/icons/ph";
import { useItems, type Item } from "@/lib/hooks/useItems";
import { cn } from "@/lib/utils";
import {
  listBills,
  getNextDueDate,
  parseISODate,
  type Bill,
} from "@/lib/bills-manager";
import { detectBrandMeta } from "@/lib/bills-brands";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function billOccurrencesInMonth(bill: Bill, monthStart: Date, monthEnd: Date): string[] {
  const dates: string[] = [];
  let from = startOfDay(monthStart);
  let safety = 0;
  let next = getNextDueDate(bill, from);

  while (next && safety < 120) {
    const d = parseISODate(next);
    if (d > monthEnd) break;
    if (d >= from) {
      dates.push(next);
    }
    const nextFrom = new Date(d);
    nextFrom.setDate(nextFrom.getDate() + 1);
    from = startOfDay(nextFrom);
    next = getNextDueDate(bill, from);
    safety++;
  }

  return dates;
}

function buildMarkers(bills: Bill[], events: Item[], focused: CalendarDate): CalendarMarker[] {
  const monthStart = startOfDay(startOfMonth(focused).toDate(getLocalTimeZone()));
  const monthEndRaw = endOfMonth(focused).toDate(getLocalTimeZone());
  const monthEnd = new Date(monthEndRaw);
  monthEnd.setHours(23, 59, 59, 999);

  const dayMap = new Map<
    string,
    {
      count: number;
      hasUnpaid: boolean;
      hasPaid: boolean;
      hasEvents: boolean;
      logos: string[];
      labels: string[];
    }
  >();

  for (const bill of bills) {
    const meta = detectBrandMeta(bill.label);
    const logo = meta.logo;
    for (const iso of billOccurrencesInMonth(bill, monthStart, monthEnd)) {
      const current = dayMap.get(iso) ?? {
        count: 0,
        hasUnpaid: false,
        hasPaid: false,
        hasEvents: false,
        logos: [],
        labels: [],
      };
      current.count += 1;
      if (bill.paid) current.hasPaid = true;
      else current.hasUnpaid = true;
      if (logo && !current.logos.includes(logo)) {
        current.logos.push(logo);
      }
      current.labels.push(bill.label);
      dayMap.set(iso, current);
    }
  }

  for (const event of events) {
    if (!event.startAt) continue;
    const d = new Date(event.startAt);
    if (isNaN(d.getTime())) continue;
    if (d < monthStart || d > monthEnd) continue;
    const iso = d.toISOString().slice(0, 10);
    const current = dayMap.get(iso) ?? {
      count: 0,
      hasUnpaid: false,
      hasPaid: false,
      hasEvents: true,
      logos: [],
      labels: [],
    };
    current.count += 1;
    current.hasEvents = true;
    current.labels.push(event.title);
    dayMap.set(iso, current);
  }

  return Array.from(dayMap.entries()).map(([date, meta]) => {
    let tone: CalendarMarker["tone"] = "default";
    if (meta.hasUnpaid) tone = "error";
    else if (meta.hasPaid && !meta.hasEvents) tone = "success";
    else if (meta.hasEvents) tone = "info";

    return {
      date,
      count: meta.count,
      tone,
      logos: meta.logos,
      labels: meta.labels,
    };
  });
}

export default function CalendarPage() {
  const [selected, setSelected] = useState<CalendarDate>(() => today(getLocalTimeZone()));
  const [focused, setFocused] = useState<CalendarDate>(() => startOfMonth(today(getLocalTimeZone())));
  const [bills, setBills] = useState<Bill[]>([]);
  const [viewTab, setViewTab] = useState<"agenda" | "bills">("agenda");

  const { items: events, create: createEvent, remove: removeEvent, loading: eventsLoading } = useItems("events");

  function reload() {
    setBills(listBills());
  }

  useEffect(() => {
    reload();
    function onStorage(e: StorageEvent) {
      if (e.key === "ethone-bills-v1") reload();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const markers = useMemo(() => buildMarkers(bills, events, focused), [bills, events, focused]);

  const selectedDate = useMemo(() => startOfDay(selected.toDate(getLocalTimeZone())), [selected]);

  const dayEventsCount = useMemo(() => {
    return events.filter((e) => {
      if (!e.startAt) return false;
      const d = new Date(e.startAt);
      if (isNaN(d.getTime())) return false;
      return isSameCalendarDay(d, selectedDate);
    }).length;
  }, [events, selectedDate]);

  const dayBillsCount = useMemo(() => {
    return bills.filter((b) => {
      const next = getNextDueDate(b, selectedDate);
      if (!next) return false;
      const d = parseISODate(next);
      return isSameCalendarDay(d, selectedDate);
    }).length;
  }, [bills, selectedDate]);

  return (
    <div className="stagger-children flex h-full min-h-0 w-full flex-col gap-3 overflow-y-auto os-scroll p-3 sm:p-4 lg:overflow-hidden lg:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
              Calendrier & Agenda
            </h1>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="rounded-full border border-[var(--info)]/30 bg-[var(--info)]/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[var(--info)]">
                {events.length} événements
              </span>
              <span className="rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[var(--accent-primary)]">
                {bills.length} abonnements
              </span>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Planifiez vos rendez-vous, suivez vos échéances et optimisez vos dépenses.
          </p>
        </div>
      </div>

      <div className="shrink-0">
        <BrainFinanceAssistant bills={bills} onRefresh={reload} selectedDate={selected} />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 pb-1 lg:grid-cols-12 lg:overflow-hidden">
        <div className="flex min-h-[26rem] flex-col lg:h-full lg:min-h-0 lg:col-span-7 xl:col-span-8">
          <Calendar
            value={selected}
            onChange={setSelected}
            onMonthChange={setFocused}
            captionLayout="dropdown"
            className="h-full"
            markers={markers}
            locale="fr-FR"
          />
        </div>
        <div className="flex min-h-[24rem] flex-col lg:h-full lg:min-h-0 lg:col-span-5 xl:col-span-4">
          <div className="flex items-center gap-1.5 p-1 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 mb-2 shrink-0">
            <button
              type="button"
              onClick={() => setViewTab("agenda")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewTab === "agenda"
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Agenda</span>
              {dayEventsCount > 0 && (
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                    viewTab === "agenda" ? "bg-white/20 text-white" : "bg-[var(--text-primary)]/10 text-[var(--text-muted)]"
                  )}
                >
                  {dayEventsCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setViewTab("bills")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewTab === "bills"
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Factures</span>
              {dayBillsCount > 0 && (
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                    viewTab === "bills" ? "bg-white/20 text-white" : "bg-[var(--text-primary)]/10 text-[var(--text-muted)]"
                  )}
                >
                  {dayBillsCount}
                </span>
              )}
            </button>
          </div>

          <div key={`${selected.toString()}-${viewTab}`} className="rise-in flex min-h-0 flex-1 flex-col">
            {viewTab === "agenda" ? (
              <CalendarAgendaPanel
                date={selected}
                events={events}
                loading={eventsLoading}
                onCreateEvent={createEvent}
                onDeleteEvent={removeEvent}
              />
            ) : (
              <CalendarBillingPanel date={selected} bills={bills} onChange={reload} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
