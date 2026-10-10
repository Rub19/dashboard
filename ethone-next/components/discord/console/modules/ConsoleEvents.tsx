"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChannelPicker, { fetchGuildChannels, type ChannelOption } from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import EventDetails from "./EventDetails";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, Segmented, StatTile, Stepper, Switch, useGuildApi } from "../kit";

type Category = "GAMING" | "TOURNAMENT" | "COMMUNITY" | "STAFF" | "WATCH_PARTY" | "GIVEAWAY" | "MEETING" | "VOICE" | "OTHER";
type Status = "DRAFT" | "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
type Event = {
  id: string;
  title: string;
  description: string;
  category: Category;
  status: Status;
  organizer: { username: string };
  startDate: string;
  endDate: string;
  durationMinutes: number;
  location: { type: string; channelId?: string; channelName?: string; externalUrl?: string };
  capacity: { unlimited: boolean; maxParticipants: number; waitlistEnabled: boolean };
  stats: { goingCount: number; maybeCount: number; attendedCount: number };
  discordScheduledEventId?: string;
};
type Stats = { upcomingCount: number; activeCount: number; eventsThisMonth: number; totalParticipants: number };

const CATEGORY: Record<Category, string> = {
  COMMUNITY: "Communauté",
  GAMING: "Jeu",
  TOURNAMENT: "Tournoi",
  WATCH_PARTY: "Visionnage",
  GIVEAWAY: "Giveaway",
  MEETING: "Réunion",
  VOICE: "Vocal",
  STAFF: "Staff",
  OTHER: "Autre",
};
const STATUS: Record<Status, string> = { DRAFT: "Brouillon", SCHEDULED: "Prévu", LIVE: "En cours", COMPLETED: "Terminé", CANCELLED: "Annulé" };
const FILTERS = {
  next: (e: Event) => e.status === "SCHEDULED" || e.status === "LIVE" || e.status === "DRAFT",
  past: (e: Event) => e.status === "COMPLETED" || e.status === "CANCELLED",
  all: () => true,
};
const field =
  "w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";
const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
/** Valeur d'un <input type="datetime-local"> pour demain 21 h (heure locale). */
const defaultStart = () => {
  const d = new Date(Date.now() + 86_400_000);
  d.setHours(21, 0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

/** Événements (format Keeper) : création rapide, prochains événements, participants, report et annulation. */
export default function ConsoleEvents({ guildId, initialView = "list" }: { guildId: string; initialView?: "list" | "calendar" }) {
  const api = useGuildApi(guildId);
  const [view, setView] = useState<"list" | "calendar">(initialView);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [events, setEvents] = useState<Event[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [filter, setFilter] = useState<keyof typeof FILTERS>("next");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("COMMUNITY");
  const [start, setStart] = useState(defaultStart);
  const [duration, setDuration] = useState(120);
  const [voiceId, setVoiceId] = useState("");
  const [capacity, setCapacity] = useState(0);
  const [sync, setSync] = useState(true);

  const load = useCallback(async () => {
    const [e, s] = await Promise.all([api<{ events: Event[] }>("/events"), api<{ stats: Stats }>("/events/stats/overview", { silent: true })]);
    setEvents(e?.events ?? []);
    if (s) setStats(s.stats);
  }, [api]);
  useEffect(() => {
    void load();
    fetchGuildChannels(guildId).then(setChannels);
  }, [guildId, load]);
  const channelName = (id?: string) => (id ? (channels.find((c) => c.id === id)?.name ?? id) : "");

  const create = async () => {
    const startDate = new Date(start);
    setBusy(true);
    const r = await api<{ event: Event }>("/events", {
      method: "POST",
      json: {
        title: title.trim(),
        description: description.trim(),
        category,
        startDate: startDate.toISOString(),
        endDate: new Date(startDate.getTime() + duration * 60_000).toISOString(),
        durationMinutes: duration,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        location: voiceId ? { type: "VOICE", channelId: voiceId, channelName: channelName(voiceId) } : { type: "NONE" },
        capacity: { unlimited: capacity === 0, maxParticipants: capacity, waitlistEnabled: true },
        syncToDiscord: sync,
      },
    });
    setBusy(false);
    if (r) {
      setTitle("");
      setDescription("");
      void load();
    }
  };
  const duplicate = async (e: Event) => {
    if (await api(`/events/${e.id}/duplicate`, { method: "POST" })) void load();
  };
  const postpone = async (e: Event, hours: number) => {
    const s = new Date(new Date(e.startDate).getTime() + hours * 3_600_000);
    const en = new Date(new Date(e.endDate).getTime() + hours * 3_600_000);
    if (await api(`/events/${e.id}/reschedule`, { method: "POST", json: { newStartDate: s.toISOString(), newEndDate: en.toISOString() } })) void load();
  };
  const cancel = async (e: Event) => {
    if (!(await confirmDialog(`Annuler « ${e.title} » ? Les inscrits ne pourront plus s'y rendre.`, { title: "Annuler l'événement", confirmLabel: "Annuler l'événement" }))) return;
    if (await api(`/events/${e.id}`, { method: "DELETE" })) void load();
  };

  const list = (events ?? []).filter(FILTERS[filter]).sort((a, b) => (filter === "past" ? b.startDate.localeCompare(a.startDate) : a.startDate.localeCompare(b.startDate)));
  const canCreate = title.trim().length > 0 && !!start && !Number.isNaN(new Date(start).getTime()) && !busy;

  return (
    <ConsolePage
      title="Événements"
      actions={
        <Segmented
          label="Affichage"
          value={view}
          options={[
            ["list", "Liste"],
            ["calendar", "Calendrier"],
          ]}
          onChange={setView}
        />
      }
    >
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="À venir" value={stats?.upcomingCount ?? "—"} />
        <StatTile label="En cours" value={stats?.activeCount ?? "—"} />
        <StatTile label="Ce mois-ci" value={stats?.eventsThisMonth ?? "—"} />
        <StatTile label="Inscriptions" value={stats?.totalParticipants ?? "—"} />
      </motion.div>

      <Panel title="Nouvel événement">
        <Row label="Titre">
          <input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="Soirée jeux" aria-label="Titre" className={`${field} h-9 py-0`} />
        </Row>
        <Row label="Description">
          <textarea value={description} maxLength={1000} rows={2} onChange={(e) => setDescription(e.target.value)} aria-label="Description" className={field} />
        </Row>
        <Row label="Catégorie">
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)} aria-label="Catégorie" className={`${field} h-9 w-48 py-0`}>
            {Object.entries(CATEGORY).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Début" hint="Heure de ton navigateur.">
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Début" className={`${field} h-9 w-56 py-0`} />
        </Row>
        <Row label="Durée">
          <Stepper value={duration} min={15} max={1440} step={15} unit="minutes" onCommit={setDuration} />
        </Row>
        <Row label="Salon vocal" hint="Facultatif.">
          <ChannelPicker guildId={guildId} value={voiceId} filterTypes={[2, 13]} placeholder="Aucun salon" onChange={(id) => setVoiceId(id)} />
        </Row>
        <Row label="Places" hint="0 = sans limite (liste d'attente au-delà).">
          <Stepper value={capacity} min={0} max={10000} unit="places" onCommit={setCapacity} />
        </Row>
        <Row label="Événement Discord" hint="Crée aussi l'événement dans l'onglet Événements du serveur Discord.">
          <Switch checked={sync} onChange={setSync} label="Événement Discord" />
        </Row>
        <div className="flex justify-end border-t border-[var(--panel-border)] px-5 py-3">
          <button type="button" disabled={!canCreate} onClick={create} className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
            Créer l&apos;événement
          </button>
        </div>
      </Panel>

      {view === "calendar" && (
        <Panel
          title={month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          actions={
            <div className="flex gap-1.5">
              <GhostButton onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>←</GhostButton>
              <GhostButton
                onClick={() => {
                  const d = new Date();
                  setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                }}
              >
                Aujourd&apos;hui
              </GhostButton>
              <GhostButton onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>→</GhostButton>
            </div>
          }
        >
          <MonthGrid month={month} events={events ?? []} onPickDay={(d) => setStart(dayStart(d))} onOpen={(id) => {
            setView("list");
            setFilter("all");
            setOpen(id);
          }} />
        </Panel>
      )}

      {view === "list" && (
      <Panel
        title="Événements du serveur"
        actions={
          <Segmented
            label="Filtre"
            value={filter}
            options={[
              ["next", "À venir"],
              ["past", "Passés"],
              ["all", "Tous"],
            ]}
            onChange={setFilter}
          />
        }
      >
        {!events ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : list.length === 0 ? (
          <EmptyLine>{events.length === 0 ? "Aucun événement pour l'instant." : "Rien dans cette liste."}</EmptyLine>
        ) : (
          <ul>
            {list.map((e) => (
              <li key={e.id} className="border-t border-[var(--panel-border)] first:border-t-0">
                <button type="button" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[var(--surface-hover)]">
                  <span className="w-14 shrink-0 text-center text-sm font-bold tabular-nums text-[var(--text-primary)]">
                    {e.stats.goingCount}
                    <span className="block text-[10px] font-normal text-[var(--text-muted)]">inscrit{e.stats.goingCount > 1 ? "s" : ""}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{e.title}</p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                      <span className={cn(e.status === "LIVE" && "text-[var(--success)]", e.status === "CANCELLED" && "text-[var(--danger)]")}>{STATUS[e.status]}</span> · {when(e.startDate)} · {CATEGORY[e.category] ?? e.category}
                      {e.location.channelId ? ` · 🔊 ${channelName(e.location.channelId)}` : ""}
                    </p>
                  </div>
                </button>
                <AnimatePresence initial={false}>
                  {open === e.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
                      <div className="space-y-3 border-t border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40 px-5 py-4">
                        {e.description && <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">{e.description}</p>}
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {e.stats.goingCount} inscrit{e.stats.goingCount > 1 ? "s" : ""} · {e.stats.maybeCount} peut-être
                          {e.status === "COMPLETED" ? ` · ${e.stats.attendedCount} présent${e.stats.attendedCount > 1 ? "s" : ""}` : ""} · {e.capacity.unlimited ? "places illimitées" : `${e.capacity.maxParticipants} places`} · organisé par{" "}
                          {e.organizer.username}
                          {e.discordScheduledEventId ? " · synchronisé avec Discord" : ""}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(e.status === "SCHEDULED" || e.status === "DRAFT") && (
                            <>
                              <GhostButton onClick={() => postpone(e, 1)}>Reporter d&apos;1 h</GhostButton>
                              <GhostButton onClick={() => postpone(e, 24)}>Reporter d&apos;1 jour</GhostButton>
                            </>
                          )}
                          <GhostButton onClick={() => duplicate(e)}>Dupliquer</GhostButton>
                          <GhostButton onClick={() => setDetails(details === e.id ? null : e.id)}>{details === e.id ? "Masquer les participants" : "Participants et réglages"}</GhostButton>
                          <span className="flex-1" />
                          {e.status !== "CANCELLED" && e.status !== "COMPLETED" && <GhostButton onClick={() => cancel(e)}>Annuler</GhostButton>}
                        </div>
                        {details === e.id && <EventDetails guildId={guildId} event={e} onChanged={load} />}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      )}
    </ConsolePage>
  );
}

/** Valeur datetime-local à 21 h pour un jour cliqué dans le calendrier. */
function dayStart(d: Date) {
  const x = new Date(d);
  x.setHours(21, 0, 0, 0);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** Grille du mois (lundi en premier) : événements du jour en pastilles, clic sur un jour pour préremplir la création. */
function MonthGrid({ month, events, onPickDay, onOpen }: { month: Date; events: Event[]; onPickDay: (d: Date) => void; onOpen: (id: string) => void }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => {
    const n = i - offset + 1;
    return n >= 1 && n <= days ? new Date(month.getFullYear(), month.getMonth(), n) : null;
  });
  const today = new Date().toDateString();
  const byDay = new Map<string, Event[]>();
  for (const e of events) {
    const key = new Date(e.startDate).toDateString();
    byDay.set(key, [...(byDay.get(key) ?? []), e]);
  }
  return (
    <div className="px-3 pb-3 pt-2">
      <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) =>
          !d ? (
            <span key={i} />
          ) : (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => onPickDay(d)}
              onKeyDown={(ev) => ev.key === "Enter" && onPickDay(d)}
              title="Préremplir un événement ce jour-là"
              className={cn(
                "min-h-16 cursor-pointer rounded-lg border p-1 text-left transition-colors hover:bg-[var(--surface-hover)]",
                d.toDateString() === today ? "border-[var(--accent-primary)]" : "border-[var(--panel-border)]"
              )}
            >
              <span className="text-[10px] font-semibold text-[var(--text-muted)]">{d.getDate()}</span>
              {(byDay.get(d.toDateString()) ?? []).slice(0, 3).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onOpen(e.id);
                  }}
                  className={cn(
                    "mt-0.5 block w-full truncate rounded px-1 py-px text-left text-[10px] font-semibold",
                    e.status === "CANCELLED" ? "bg-[var(--danger)]/15 text-[var(--danger)] line-through" : "bg-[var(--accent-primary)]/15 text-[var(--text-primary)]"
                  )}
                >
                  {new Date(e.startDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} {e.title}
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
