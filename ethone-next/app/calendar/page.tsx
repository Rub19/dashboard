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
import BrainFinanceAssistant from "@/components/calendar/BrainFinanceAssistant";
import { useI18n } from "@/lib/hooks/useI18n";
import {
  listBills,
  getNextDueDate,
  parseISODate,
  type Bill,
} from "@/lib/bills-manager";
import { Sparkles, Calendar as CalendarIcon, CreditCard, DollarSign } from "lucide-react";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
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

function buildMarkers(bills: Bill[], focused: CalendarDate): CalendarMarker[] {
  const monthStart = startOfDay(startOfMonth(focused).toDate(getLocalTimeZone()));
  const monthEndRaw = endOfMonth(focused).toDate(getLocalTimeZone());
  const monthEnd = new Date(monthEndRaw);
  monthEnd.setHours(23, 59, 59, 999);

  const dayMap = new Map<string, { count: number; hasUnpaid: boolean; hasPaid: boolean }>();

  for (const bill of bills) {
    for (const iso of billOccurrencesInMonth(bill, monthStart, monthEnd)) {
      const current = dayMap.get(iso) ?? { count: 0, hasUnpaid: false, hasPaid: false };
      current.count += 1;
      if (bill.paid) current.hasPaid = true;
      else current.hasUnpaid = true;
      dayMap.set(iso, current);
    }
  }

  return Array.from(dayMap.entries()).map(([date, meta]) => ({
    date,
    count: meta.count,
    tone: meta.hasUnpaid ? "error" : meta.hasPaid ? "success" : "default",
  }));
}

export default function CalendarPage() {
  const i18n = useI18n();
  const [selected, setSelected] = useState<CalendarDate>(() => today(getLocalTimeZone()));
  const [focused, setFocused] = useState<CalendarDate>(() => startOfMonth(today(getLocalTimeZone())));
  const [bills, setBills] = useState<Bill[]>([]);

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

  const markers = useMemo(() => buildMarkers(bills, focused), [bills, focused]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden p-4 sm:p-6 lg:p-8 space-y-2">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Calendrier & Factures
            </h1>
            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-purple-400">
              {bills.length} abonnements
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Suivez vos échéances, abonnements et dépenses avec l&apos;intelligence Brain.
          </p>
        </div>
      </div>

      {/* Brain Finance Bar */}
      <div className="shrink-0">
        <BrainFinanceAssistant bills={bills} onRefresh={reload} />
      </div>

      {/* Main Grid: Interactive Calendar + Billing Detail Panel */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-12">
        <div className="flex h-full min-h-0 flex-col lg:col-span-7 xl:col-span-8">
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
        <div className="flex h-full min-h-0 flex-col lg:col-span-5 xl:col-span-4">
          <CalendarBillingPanel date={selected} bills={bills} onChange={reload} />
        </div>
      </div>
    </div>
  );
}
