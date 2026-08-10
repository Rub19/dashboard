"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function CalendarPage() {
  const [date, setDate] = useState(new Date());
  const [events] = useState<{ day: number; title: string }[]>([
    { day: new Date().getDate(), title: "Aujourd'hui" },
  ]);

  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prev() {
    setDate(new Date(year, month - 1, 1));
  }

  function next() {
    setDate(new Date(year, month + 1, 1));
  }

  const monthName = new Date(year, month, 1).toLocaleString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendrier</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-2 text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-32 text-center text-sm font-medium capitalize">{monthName}</span>
          <button
            type="button"
            onClick={next}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-2 text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Card3D>
        <div className="grid grid-cols-7 gap-2 text-center text-xs text-[var(--muted)]">
          {DAYS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const hasEvent = events.some((e) => e.day === day);
            const isToday =
              new Date().getDate() === day &&
              new Date().getMonth() === month &&
              new Date().getFullYear() === year;
            return (
              <div
                key={day}
                className={`flex aspect-square items-center justify-center rounded-xl text-sm ${
                  isToday
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface-raised)] text-[var(--foreground)]"
                }`}
              >
                {day}
                {hasEvent && (
                  <span className="absolute mb-5 h-1.5 w-1.5 rounded-full bg-violet-400" />
                )}
              </div>
            );
          })}
        </div>
      </Card3D>

      <Card3D>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-[var(--accent)]" />
          <p className="font-medium">Événements</p>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">Intégration Google Calendar à brancher.</p>
      </Card3D>
    </div>
  );
}
