"use client";

import { useEffect, useMemo, useState } from "react";
import { useItems } from "@/lib/hooks/useItems";
import { useCalendarEvents } from "@/lib/hooks/useCalendarEvents";
import { buildAuthUrl } from "@/lib/oauth";
import Card3D from "@/components/Card3D";
import Input from "@/components/Input";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import BillsCalendarWidget from "@/components/BillsCalendarWidget";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { getUserState, setUserState } from "@/lib/user-state";
import { buildMonth, eventsForDate } from "@/lib/calendar";
import Select from "@/components/ui/Select";

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
  const [filter, setFilter] = useState<"all" | "local" | "google">("all");

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

  const filteredEvents = useMemo(() => {
    if (filter === "all") return allEvents;
    return allEvents.filter((e) => e.source === filter);
  }, [allEvents, filter]);

  const year = date.getFullYear();
  const month = date.getMonth();
  const monthName = new Date(year, month, 1).toLocaleString(settings.language, { month: "long", year: "numeric" });
  const days = useMemo(() => buildMonth(year, month), [year, month]);

  function eventsForDay(day: number) {
    if (day === 0) return [];
    return eventsForDate(filteredEvents, new Date(year, month, day));
  }

  const selectedDayEvents = useMemo(
    () => eventsForDate(filteredEvents, new Date(year, month, selectedDay)),
    [filteredEvents, selectedDay, year, month]
  );

  function prev() {
    setDate(new Date(year, month - 1, 1));
  }

  function next() {
    setDate(new Date(year, month + 1, 1));
  }

  function today() {
    const now = new Date();
    setDate(now);
    setSelectedDay(now.getDate());
  }

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
    <div className="w-full sm:max-w-5xl lg:max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{i18n("calendarTitle")}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={i18n("previous")}
            onClick={prev}
            className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 text-[var(--muted)] hover:text-[var(--foreground)] backdrop-blur-[var(--panel-blur)]"
          >
            <Icon name="chevron-left" className="h-4 w-4" />
          </button>
          <span className="min-w-24 text-center text-xs font-medium capitalize sm:min-w-32 sm:text-sm">{monthName}</span>
          <button
            type="button"
            aria-label={i18n("next")}
            onClick={next}
            className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 text-[var(--muted)] hover:text-[var(--foreground)] backdrop-blur-[var(--panel-blur)]"
          >
            <Icon name="chevron-right" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={today}
            className="rounded-[var(--panel-radius)] bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            {i18n("today")}
          </button>
        </div>
      </div>

      <Card3D>
        <div className="mb-3 flex flex-wrap gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEvent()}
            aria-label={i18n("newEvent")}
            placeholder={i18n("newEvent")}
            className="min-w-0 flex-1"
          />
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            aria-label={i18n("time")}
            className="w-28 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-2 text-sm outline-none focus:border-[var(--accent)] backdrop-blur-[var(--panel-blur)]"
          />
          <button
            type="button"
            aria-label={i18n("add")}
            onClick={addEvent}
            disabled={itemsLoading}
            className="flex shrink-0 items-center gap-2 rounded-[var(--panel-radius)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[var(--muted)] sm:gap-2 sm:text-xs">
          {DAYS.map((d) => (
            <div key={d}>{i18n(d)}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((day, i) => {
            const dayEvents = day.date ? eventsForDay(day.day) : [];
            const isSelected = day.day === selectedDay;
            return (
              <button
                key={`${day.date}-${i}`}
                type="button"
                onClick={() => day.date && setSelectedDay(day.day)}
                disabled={day.date === 0}
                className={`relative flex aspect-square items-center justify-center rounded-[var(--panel-radius)] text-xs sm:text-sm transition-colors ${
                  day.date === 0
                    ? "pointer-events-none bg-transparent"
                    : day.isToday
                      ? "bg-[var(--accent)] text-white"
                      : isSelected
                        ? "bg-[var(--accent)]/20 text-[var(--accent)] ring-1 ring-[var(--accent)]"
                        : "bg-[var(--panel-bg)] text-[var(--foreground)] hover:bg-[var(--panel-bg)]"
                }`}
              >
                {day.date ? day.day : ""}
                {day.date && dayEvents.length > 0 && (
                  <span
                    className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${
                      day.isToday || isSelected ? "bg-white" : "bg-violet-400"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </Card3D>

      {(itemsError || googleError) && (
        <Card3D>
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm text-red-400">
              <Icon name="alert-triangle" className="h-4 w-4" />
              {itemsError?.message || googleError?.message}
            </p>
            <p className="text-xs text-[var(--muted)]">{i18n("calendarConnectionHint")}</p>
          </div>
        </Card3D>
      )}

      <Card3D>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon name="calendar-days" className="h-5 w-5 text-[var(--accent)]" />
            <p className="font-medium">{i18n("event")}</p>
          </div>
          <div className="flex items-center gap-2">
            {!clientId ? (
              <button
                type="button"
                onClick={connectGoogle}
                className="flex shrink-0 items-center gap-1.5 rounded-[var(--panel-radius)] bg-[var(--panel-bg)] px-2 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent)]/20"
              >
                <Icon name="cloud" className="h-3 w-3" />
                {i18n("google")}
              </button>
            ) : (
              <span className="text-xs text-emerald-400">{i18n("google")} {i18n("connected")}</span>
            )}
            <Select
              value={filter}
              onChange={(value) => setFilter(value as typeof filter)}
              options={[
                { id: "all", label: i18n("allSources") },
                { id: "local", label: i18n("local") },
                { id: "google", label: i18n("google") },
              ]}
              aria-label={i18n("filter")}
              className="min-w-0"
            />
          </div>
        </div>
        <p className="text-sm text-[var(--muted)]">
          {new Date(year, month, selectedDay).toLocaleDateString(settings.language, { weekday: "long", day: "numeric", month: "long" })}
        </p>
        {itemsLoading || googleLoading ? (
          <Icon name="loader-2" className="h-5 w-5 animate-spin text-[var(--muted)]" />
        ) : selectedDayEvents.length === 0 ? (
          <p className="break-words text-sm text-[var(--muted)]">{i18n("noEventsDay")}</p>
        ) : (
          <div className="space-y-2">
            {selectedDayEvents.map((e) => (
              <div key={e.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words font-medium">
                    {e.title} {e.source === "google" && <span className="text-[10px] text-[var(--muted)]">(G)</span>}
                  </p>
                  <p className="break-words text-xs text-[var(--muted)]">
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

      <BillsCalendarWidget />
    </div>
  );
}
