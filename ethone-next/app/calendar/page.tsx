"use client";

import { useEffect, useMemo, useState } from "react";
import { useItems } from "@/lib/hooks/useItems";
import { useCalendarEvents } from "@/lib/hooks/useCalendarEvents";
import { buildAuthUrl } from "@/lib/oauth";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { getUserState, setUserState } from "@/lib/user-state";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default function CalendarPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { settings } = useSettings();
  const { items, loading: itemsLoading, error: itemsError, create, remove } = useItems("events");
  const [date, setDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(date.getDate());
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("ethone:clientId:google-calendar") || "";
    setClientId(saved);
    getUserState<string>("clientId:google-calendar", "").then((remote) => {
      if (remote) {
        setClientId(remote);
        localStorage.setItem("ethone:clientId:google-calendar", remote);
      }
    });
  }, []);

  const { events: googleEvents, loading: googleLoading, error: googleError } = useCalendarEvents(clientId);

  const allEvents = useMemo(
    () => [
      ...items.map((e) => ({ ...e, source: "local" as const })),
      ...googleEvents.map((e) => ({ ...e, source: "google" as const })),
    ],
    [items, googleEvents]
  );

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
    return allEvents.some((e) => {
      const start = e.startAt ? new Date(e.startAt) : null;
      return start && start.getDate() === day && start.getMonth() === month && start.getFullYear() === year;
    });
  }

  const monthEvents = allEvents.filter((e) => {
    const start = e.startAt ? new Date(e.startAt) : null;
    return start && start.getMonth() === month && start.getFullYear() === year;
  });

  const selectedDayEvents = monthEvents.filter((e) => {
    const start = e.startAt ? new Date(e.startAt) : null;
    return start && start.getDate() === selectedDay;
  });

  async function addEvent() {
    if (!newTitle.trim()) return;
    try {
      const [hours, minutes] = newTime.split(":").map(Number);
      const start = new Date(year, month, selectedDay, hours, minutes);
      await create({ title: newTitle, body: "", startAt: start.toISOString() });
      setNewTitle("");
      success(i18n("created"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function deleteEvent(id: string) {
    try {
      await remove(id);
      success(i18n("deleted"));
    } catch {
      showError(i18n("error"));
    }
  }

  const monthName = new Date(year, month, 1).toLocaleString(settings.language, { month: "long", year: "numeric" });

  function connectGoogle() {
    const id = prompt(i18n("clientId"));
    if (!id) return;
    localStorage.setItem("ethone:clientId:google-calendar", id);
    setUserState("clientId:google-calendar", id).catch(() => {});
    setClientId(id);
    success(i18n("connectSuccess"));
    window.location.href = buildAuthUrl("google-calendar", id, { provider: "google-calendar", clientId: id });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n("calendarTitle")}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={i18n("previous")}
            onClick={prev}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-2 text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <Icon name="chevron-left" className="h-4 w-4" />
          </button>
          <span className="min-w-32 text-center text-sm font-medium capitalize">{monthName}</span>
          <button
            type="button"
            aria-label={i18n("next")}
            onClick={next}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-2 text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <Icon name="chevron-right" className="h-4 w-4" />
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
            aria-label={i18n("newEvent")} placeholder={i18n("newEvent")}
            className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            aria-label={i18n("time")}
            className="w-28 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            aria-label={i18n("add")}
            onClick={addEvent}
            disabled={itemsLoading}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs text-[var(--muted)]">
          {DAYS.map((d) => (
            <div key={d}>{i18n(d)}</div>
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
              new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`relative flex aspect-square items-center justify-center rounded-xl text-sm transition-colors ${
                  isToday
                    ? "bg-[var(--accent)] text-white"
                    : isSelected
                      ? "bg-[var(--accent)]/20 text-[var(--accent)] ring-1 ring-[var(--accent)]"
                      : "bg-[var(--surface-raised)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                }`}
              >
                {day}
                {event && <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${isToday || isSelected ? "bg-white" : "bg-violet-400"}`} />}
              </button>
            );
          })}
        </div>
      </Card3D>

      {(itemsError || googleError) && (
        <Card3D>
          <p className="text-sm text-red-400">{itemsError?.message || googleError?.message}</p>
        </Card3D>
      )}

      <Card3D>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon name="calendar-days" className="h-5 w-5 text-[var(--accent)]" />
            <p className="font-medium">{i18n("event")}</p>
          </div>
          {!clientId ? (
            <button
              type="button"
              onClick={connectGoogle}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--surface-raised)] px-2 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent)]/20"
            >
              <Icon name="cloud" className="h-3 w-3" />
              {i18n("google")}
            </button>
          ) : (
            <span className="text-xs text-emerald-400">{i18n("google")} {i18n("connected")}</span>
          )}
        </div>
        <p className="text-sm text-[var(--muted)]">{new Date(year, month, selectedDay).toLocaleDateString(settings.language, { weekday: "long", day: "numeric", month: "long" })}</p>
        {itemsLoading || googleLoading ? (
          <Icon name="loader-2" className="h-5 w-5 animate-spin text-[var(--muted)]" />
        ) : selectedDayEvents.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{i18n("noEventsDay")}</p>
        ) : (
          <div className="space-y-2">
            {selectedDayEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">
                    {e.title} {e.source === "google" && <span className="text-[10px] text-[var(--muted)]">(G)</span>}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {e.startAt ? new Date(e.startAt).toLocaleString(settings.language) : "-"}
                  </p>
                </div>
                {e.source === "local" && (
                  <button
                    type="button"
                    onClick={() => deleteEvent(e.id)}
                    disabled={itemsLoading}
                    className="text-[var(--muted)] hover:text-red-400 disabled:opacity-50"
                  >
                    <Icon name="trash-2" className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card3D>
    </div>
  );
}
