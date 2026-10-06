"use client";

import { useMemo, useState } from "react";
import { CalendarDate, getLocalTimeZone } from "@internationalized/date";
import { useSettings } from "@/components/SettingsProvider";
import { CalendarClock, Clock, Plus, Trash2, MapPin, Check } from "@/components/icons/ph";
import { hapticSuccessPattern, hapticRigidImpact } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";
import type { Item } from "@/lib/hooks/useItems";

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatEventTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export type CalendarAgendaPanelProps = {
  date: CalendarDate;
  events: Item[];
  loading?: boolean;
  onCreateEvent: (data: Omit<Item, "id">) => Promise<any>;
  onDeleteEvent: (id: string) => Promise<any>;
};

export default function CalendarAgendaPanel({
  date,
  events,
  loading = false,
  onCreateEvent,
  onDeleteEvent,
}: CalendarAgendaPanelProps) {
  const { settings } = useSettings();
  const { success, error: toastError } = useToast();

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isAllDay, setIsAllDay] = useState(false);
  const [body, setBody] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedDate = useMemo(() => startOfDay(date.toDate(getLocalTimeZone())), [date]);

  const dayEvents = useMemo(() => {
    return events.filter((e) => {
      if (!e.startAt) return false;
      const d = new Date(e.startAt);
      if (isNaN(d.getTime())) return false;
      return isSameCalendarDay(d, selectedDate);
    }).sort((a, b) => {
      const tA = new Date(a.startAt || 0).getTime();
      const tB = new Date(b.startAt || 0).getTime();
      return tA - tB;
    });
  }, [events, selectedDate]);

  function resetForm() {
    setTitle("");
    setStartTime("09:00");
    setEndTime("10:00");
    setIsAllDay(false);
    setBody("");
    setLocation("");
    setAdding(false);
  }

  async function handleAdd() {
    if (!title.trim()) return;

    setSaving(true);
    try {
      let startAt: string;
      let endAt: string | undefined;

      const dateStr = date.toString();

      if (isAllDay) {
        startAt = `${dateStr}T00:00:00.000Z`;
        endAt = `${dateStr}T23:59:59.999Z`;
      } else {
        startAt = new Date(`${dateStr}T${startTime}:00`).toISOString();
        endAt = new Date(`${dateStr}T${endTime}:00`).toISOString();
      }

      await onCreateEvent({
        title: title.trim(),
        body: body.trim(),
        startAt,
        endAt,
        data: location.trim() ? { location: location.trim() } : undefined,
      });

      hapticSuccessPattern();
      success("Événement planifié", title.trim());
      resetForm();
    } catch {
      toastError("Erreur lors de la création de l'événement");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    hapticRigidImpact();
    try {
      await onDeleteEvent(id);
      success("Événement supprimé");
    } catch {
      toastError("Erreur lors de la suppression");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/90 p-4 sm:p-5 backdrop-blur-2xl shadow-xl">
      <div className="mb-4 flex shrink-0 items-start justify-between gap-3 border-b border-[var(--panel-border)] pb-3.5">
        <div>
          <p className="text-xs font-semibold capitalize text-[var(--text-muted)]">
            {selectedDate.toLocaleDateString(settings.language, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h3 className="text-base font-bold text-[var(--text-primary)] mt-0.5">
            {dayEvents.length === 0
              ? "Aucun rendez-vous ce jour"
              : `${dayEvents.length} événement${dayEvents.length > 1 ? "s" : ""} au programme`}
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setAdding(!adding)}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-[var(--inset-radius)] border px-3 text-xs font-semibold transition-all cursor-pointer shadow-xs",
            adding
              ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
              : "border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{adding ? "Fermer" : "Planifier"}</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto os-scroll space-y-2.5 pr-1">
        {adding && (
          <div className="rounded-[var(--panel-radius)] border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 p-3.5 space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                Titre de l'événement
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex. Réunion d'équipe, Déjeuner, Séance sport..."
                className="w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-primary)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="rounded border-[var(--panel-border)] text-[var(--accent-primary)] focus:ring-0"
                />
                <span>Journée entière</span>
              </label>
            </div>

            {!isAllDay && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Début
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Fin
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                Lieu ou Lien (optionnel)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="ex. Salle B, Google Meet, Discord..."
                className="w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                Détails / Notes (optionnel)
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Ordre du jour ou notes complémentaires..."
                rows={2}
                className="w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!title.trim() || saving}
                onClick={handleAdd}
                className="flex items-center gap-1.5 rounded-[var(--inset-radius)] bg-[var(--accent-primary)] px-3.5 py-1 text-xs font-bold text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-40 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{saving ? "Enregistrement..." : "Ajouter"}</span>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-[var(--text-muted)]/80">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent mb-2" />
            <p className="text-xs text-[var(--text-muted)]">Chargement de l&apos;agenda...</p>
          </div>
        ) : dayEvents.length === 0 && !adding ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-[var(--text-muted)]/80">
            <div className="flex h-12 w-12 items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/5 text-[var(--text-muted)] mb-2">
              <CalendarClock className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold text-[var(--text-primary)]/85">Journée libre</p>
            <p className="text-[11px] text-[var(--text-muted)]/80 mt-0.5">
              Aucun rendez-vous planifié pour cette journée.
            </p>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>Créer un événement</span>
            </button>
          </div>
        ) : (
          dayEvents.map((evt) => {
            const timeRange = evt.startAt ? `${formatEventTime(evt.startAt)}${evt.endAt ? ` - ${formatEventTime(evt.endAt)}` : ""}` : "";
            const eventLoc = (evt.data as Record<string, any>)?.location;

            return (
              <div
                key={evt.id}
                className="group relative flex items-start justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] p-3 hover:border-[var(--input-border-hover)] hover:bg-[var(--text-primary)]/[0.06] transition-all"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded bg-[var(--info)]/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-[var(--info)]">
                      <Clock className="h-3 w-3" />
                      <span>{timeRange || "Journée"}</span>
                    </span>
                    <h4 className="font-bold text-xs text-[var(--text-primary)] truncate">
                      {evt.title}
                    </h4>
                  </div>

                  {eventLoc && (
                    <p className="flex items-center gap-1 text-[10px] text-[var(--accent-primary)] truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{eventLoc}</span>
                    </p>
                  )}

                  {evt.body && (
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
                      {evt.body}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(evt.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--danger)]/15 hover:text-[var(--danger)] text-[var(--text-muted)] transition-all cursor-pointer"
                  title="Supprimer cet événement"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
