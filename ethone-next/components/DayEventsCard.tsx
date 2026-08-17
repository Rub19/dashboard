"use client";

import { Calendar, Plus } from "lucide-react";
import BentoCard from "@/components/ui/BentoCard";
import type { CalendarItem } from "@/components/CalendarBills";
import VendorLogo from "@/components/logos/VendorLogo";

type DayEventsCardProps = {
  date: Date;
  items: CalendarItem[];
  onAdd: () => void;
};

export default function DayEventsCard({ date, items, onAdd }: DayEventsCardProps) {
  const isToday =
    new Date().getDate() === date.getDate() &&
    new Date().getMonth() === date.getMonth() &&
    new Date().getFullYear() === date.getFullYear();

  const label = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <BentoCard title={label} icon="calendar-days" action={
      isToday ? (
        <span className="inline-flex items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
          Aujourd&apos;hui
        </span>
      ) : null
    }>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center text-zinc-500">
          <Calendar className="mb-2 h-5 w-5" />
          <p className="text-xs">Aucun événement prévu</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5"
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: item.color || "#A259FF" }}
              >
                <VendorLogo vendor={item.vendor} className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{item.title}</p>
                {item.amount !== undefined && (
                  <p className="text-[10px] text-zinc-400">
                    {item.amount > 0 ? `$${item.amount.toFixed(2)}` : "Événement"} ·{" "}
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

      <button
        type="button"
        onClick={onAdd}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-xs font-medium text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white"
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter un événement
      </button>
    </BentoCard>
  );
}
