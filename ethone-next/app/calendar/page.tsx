"use client";

import { useState } from "react";
import { useItems } from "@/lib/hooks/useItems";
import Card3D from "@/components/Card3D";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, Loader2 } from "lucide-react";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function CalendarPage() {
  const { items, loading, error, create, remove } = useItems("events");
  const [date, setDate] = useState(new Date());
  const [newTitle, setNewTitle] = useState("");

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

  function hasEvent(day: number) {
    return items.some((e) => {
      const start = e.startAt ? new Date(e.startAt) : null;
      return (
        start &&
        start.getDate() === day &&
        start.getMonth() === month &&
        start.getFullYear() === year
      );
    });
  }

  const monthEvents = items.filter((e) => {
    const start = e.startAt ? new Date(e.startAt) : null;
    return start && start.getMonth() === month && start.getFullYear() === year;
  });

  async function addEvent() {
    if (!newTitle.trim()) return;
    const start = new Date(year, month, date.getDate());
    await create({ title: newTitle, body: "", startAt: start.toISOString() });
    setNewTitle("");
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
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEvent()}
            placeholder="Nouvel événement..."
            className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={addEvent}
            disabled={loading}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

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
            const event = hasEvent(day);
            const isToday =
              new Date().getDate() === day &&
              new Date().getMonth() === month &&
              new Date().getFullYear() === year;
            return (
            <div
              key={day}
              className={`relative flex aspect-square items-center justify-center rounded-xl text-sm ${
                isToday
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-raised)] text-[var(--foreground)]"
              }`}
            >
              {day}
              {event && (
                <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-violet-400" />
              )}
            </div>
            );
          })}
        </div>
      </Card3D>

      {error && (
        <Card3D>
          <p className="text-sm text-red-400">{error.message}</p>
        </Card3D>
      )}

      <Card3D>
        <div className="mb-2 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-[var(--accent)]" />
          <p className="font-medium">Événements</p>
        </div>
        {loading && items.length === 0 ? (
          <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
        ) : monthEvents.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Aucun événement ce mois.</p>
        ) : (
          <div className="space-y-2">
            {monthEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {e.startAt ? new Date(e.startAt).toLocaleString("fr-FR") : "-"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(e.id)}
                  disabled={loading}
                  className="text-[var(--muted)] hover:text-red-400 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card3D>
    </div>
  );
}
