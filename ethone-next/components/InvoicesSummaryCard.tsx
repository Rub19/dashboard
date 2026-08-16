"use client";

import { Plus, Scan } from "lucide-react";
import BentoCard from "@/components/ui/BentoCard";
import type { CalendarItem } from "@/components/CalendarBills";

type InvoicesSummaryCardProps = {
  items: CalendarItem[];
  currentDate: Date;
  onAdd: () => void;
};

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function InvoicesSummaryCard({ items, currentDate, onAdd }: InvoicesSummaryCardProps) {
  const currentMonthItems = items.filter((it) => {
    const d = new Date(it.date);
    return d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth();
  });

  const monthTotal = currentMonthItems
    .filter((it) => it.category === "monthly" || it.category === "yearly")
    .reduce((sum, it) => sum + (it.amount || 0), 0);

  const next30Days = new Date();
  next30Days.setDate(next30Days.getDate() + 30);

  const upcoming = items.filter((it) => {
    const d = new Date(it.date);
    return d >= new Date() && d <= next30Days;
  });

  return (
    <BentoCard title="Factures & Abonnements" icon="receipt">
      <div className="mb-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Total à payer ce mois
        </p>
        <p className="mt-1 text-3xl font-bold font-mono text-white">
          ${monthTotal.toFixed(2)}
        </p>
        <p className="text-[10px] text-zinc-500">
          {currentMonthItems.length} échéance{currentMonthItems.length > 1 ? "s" : ""} ce mois
        </p>
      </div>

      <div className="mb-4 border-t border-white/[0.05] pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Échéances dans les 30 jours
        </p>
        {upcoming.length === 0 ? (
          <p className="text-xs text-zinc-500">Aucune échéance imminente.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.slice(0, 5).map((it) => (
              <li key={it.id} className="flex items-center justify-between text-xs">
                <span className="truncate text-zinc-300">{it.title}</span>
                <span className="shrink-0 font-medium text-white">{toISODate(new Date(it.date))}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-xs font-medium text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Nouvelle facture
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-xs font-medium text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white"
        >
          <Scan className="h-3.5 w-3.5" />
          Scanner reçu
        </button>
      </div>
    </BentoCard>
  );
}
