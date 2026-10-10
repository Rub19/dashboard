"use client";

import { useCallback, useEffect, useState } from "react";
import { confirmDialog } from "@/lib/confirmDialog";
import { cn } from "@/lib/utils";
import { EmptyLine, GhostButton, Row, Segmented, Stepper, TextField, useGuildApi } from "../kit";

type Rsvp = "GOING" | "MAYBE" | "NOT_GOING" | "WAITLIST";
type Attendance = "REGISTERED" | "ATTENDED" | "LATE" | "NO_SHOW" | "CANCELLED";
type Participant = { userId: string; displayName: string; username: string; avatarUrl: string; rsvp: Rsvp; attendance: Attendance; waitlistPosition?: number };
type EventInfo = { id: string; title: string; description: string; capacity: { unlimited: boolean; maxParticipants: number; waitlistEnabled: boolean } };

const RSVP: Record<Rsvp, [string, string]> = {
  GOING: ["Inscrit", "text-[var(--success)]"],
  MAYBE: ["Peut-être", "text-[var(--warning)]"],
  NOT_GOING: ["Ne vient pas", "text-[var(--text-muted)]"],
  WAITLIST: ["Liste d'attente", "text-[var(--text-muted)]"],
};
const ATTENDANCE: [Attendance, string][] = [
  ["REGISTERED", "—"],
  ["ATTENDED", "Présent"],
  ["LATE", "En retard"],
  ["NO_SHOW", "Absent"],
];

/** Détails d'un événement : titre, description, places et participants (présences pointées par le staff). */
export default function EventDetails({ guildId, event, onChanged }: { guildId: string; event: EventInfo; onChanged: () => void }) {
  const api = useGuildApi(guildId);
  const [people, setPeople] = useState<Participant[] | null>(null);
  const [desc, setDesc] = useState(event.description);

  const load = useCallback(async () => {
    const r = await api<{ participants: Participant[] }>(`/events/${event.id}/participants`);
    setPeople(r?.participants ?? []);
  }, [api, event.id]);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Partial<EventInfo>) => {
    if (await api(`/events/${event.id}`, { method: "PUT", json: patch })) onChanged();
  };
  const mark = async (p: Participant, attendance: Attendance) => {
    setPeople((l) => l?.map((x) => (x.userId === p.userId ? { ...x, attendance } : x)) ?? null);
    if (!(await api(`/events/${event.id}/participants/${p.userId}/checkin`, { method: "POST", json: { attendance } }))) void load();
  };
  const remove = async (p: Participant) => {
    if (!(await confirmDialog(`Retirer ${p.displayName || p.username} de l'événement ?`, { title: "Retirer", confirmLabel: "Retirer" }))) return;
    if (await api(`/events/${event.id}/participants/${p.userId}`, { method: "DELETE" })) {
      void load();
      onChanged();
    }
  };

  const order: Rsvp[] = ["GOING", "MAYBE", "WAITLIST", "NOT_GOING"];
  const sorted = (people ?? []).slice().sort((a, b) => order.indexOf(a.rsvp) - order.indexOf(b.rsvp) || (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0));

  return (
    <div className="rounded-lg border border-[var(--panel-border)]">
      <Row label="Titre">
        <TextField value={event.title} maxLength={100} width="w-72" onCommit={(v) => save({ title: v })} />
      </Row>
      <Row label="Description">
        <textarea
          value={desc}
          maxLength={1000}
          rows={2}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={() => desc !== event.description && save({ description: desc })}
          aria-label="Description"
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
        />
      </Row>
      <Row label="Places" hint="0 = sans limite. Au-delà, les membres passent en liste d'attente.">
        <Stepper
          value={event.capacity.unlimited ? 0 : event.capacity.maxParticipants}
          min={0}
          max={10000}
          unit="places"
          onCommit={(n) => save({ capacity: { ...event.capacity, unlimited: n === 0, maxParticipants: n } })}
        />
      </Row>
      <div className="border-t border-[var(--panel-border)] px-5 py-3">
        <p className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">Participants</p>
        {!people ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : sorted.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">Personne ne s&apos;est encore inscrit (bouton sous l&apos;annonce Discord).</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {sorted.map((p) => (
              <li key={p.userId} className="flex flex-wrap items-center gap-2.5 border-t border-[var(--panel-border)] py-2 first:border-t-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="h-7 w-7 rounded-full" /> : <span className="h-7 w-7 rounded-full bg-[var(--panel-border)]" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{p.displayName || p.username}</p>
                  <p className={cn("text-[11px]", RSVP[p.rsvp][1])}>
                    {RSVP[p.rsvp][0]}
                    {p.rsvp === "WAITLIST" && p.waitlistPosition ? ` · n°${p.waitlistPosition}` : ""}
                  </p>
                </div>
                {p.rsvp === "GOING" && <Segmented label={`Présence de ${p.displayName}`} value={ATTENDANCE.some(([a]) => a === p.attendance) ? p.attendance : "REGISTERED"} options={ATTENDANCE} onChange={(v) => mark(p, v)} />}
                <GhostButton onClick={() => remove(p)}>Retirer</GhostButton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
