"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import ChannelPicker, { fetchGuildChannels, type ChannelOption } from "../../ChannelPicker";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, Segmented, StatTile, useGuildApi, useMemberNames } from "../kit";

type Recurrence = "none" | "daily" | "weekly";
type Reminder = { id: string; channelId: string; userId: string; message: string; remindAt: string; recurrence: Recurrence; delivered: boolean; deliveredCount: number };

const REC: Record<Recurrence, string> = { none: "Une fois", daily: "Chaque jour", weekly: "Chaque semaine" };
const DELAY_RE = /^(\d+\s*[smhdjw]\s*)+$/i;
const field =
  "w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";
const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Rappels (format Keeper) : rappels programmés du serveur, création depuis le site et annulation. */
export default function ConsoleReminders({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [list, setList] = useState<Reminder[] | null>(null);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [message, setMessage] = useState("");
  const [delay, setDelay] = useState("1h");
  const [channelId, setChannelId] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api<{ reminders: Reminder[] }>("/reminders/list");
    setList(r?.reminders ?? []);
  }, [api]);
  useEffect(() => {
    void load();
    fetchGuildChannels(guildId).then(setChannels);
  }, [guildId, load]);

  const pending = (list ?? []).filter((r) => !r.delivered).sort((a, b) => a.remindAt.localeCompare(b.remindAt));
  const names = useMemberNames(guildId, pending.map((r) => r.userId));
  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

  const create = async () => {
    setBusy(true);
    const r = await api<{ reminder: Reminder }>("/reminders", { method: "POST", json: { in: delay.trim(), message: message.trim(), channelId, recurrence } });
    setBusy(false);
    if (r) {
      setList((l) => [...(l ?? []), r.reminder]);
      setMessage("");
    }
  };
  const cancel = async (r: Reminder) => {
    if (await api(`/reminders/${r.id}`, { method: "DELETE" })) setList((l) => l?.filter((x) => x.id !== r.id) ?? null);
  };

  const canCreate = message.trim().length > 0 && DELAY_RE.test(delay.trim()) && !!channelId && !busy;

  return (
    <ConsolePage title="Rappels">
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="En attente" value={list ? pending.length : "—"} />
        <StatTile label="Récurrents" value={list ? pending.filter((r) => r.recurrence !== "none").length : "—"} />
        <StatTile label="Prochain" value={pending[0] ? when(pending[0].remindAt) : "—"} />
      </motion.div>

      <Panel title="Nouveau rappel" subtitle="Envoyé à ton nom dans le salon choisi.">
        <Row label="Message">
          <textarea value={message} maxLength={1500} rows={2} onChange={(e) => setMessage(e.target.value)} placeholder="Réunion staff dans 10 minutes" aria-label="Message du rappel" className={field} />
        </Row>
        <Row label="Dans" hint="Ex. 30m, 2h, 1j, 1h30m (30 secondes minimum).">
          <input value={delay} maxLength={20} onChange={(e) => setDelay(e.target.value)} aria-label="Délai" className={`${field} h-9 w-32 py-0 font-mono`} />
        </Row>
        <Row label="Répéter">
          <Segmented label="Répéter" value={recurrence} options={Object.entries(REC) as [Recurrence, string][]} onChange={setRecurrence} />
        </Row>
        <Row label="Salon">
          <ChannelPicker guildId={guildId} value={channelId} filterTypes={[0, 5]} placeholder="Choisir un salon" onChange={(id) => setChannelId(id)} />
        </Row>
        <div className="flex justify-end border-t border-[var(--panel-border)] px-5 py-3">
          <button type="button" disabled={!canCreate} onClick={create} className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
            Programmer
          </button>
        </div>
      </Panel>

      <Panel title="Rappels programmés" subtitle="Créés avec /reminder ou depuis cette page.">
        {!list ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : pending.length === 0 ? (
          <EmptyLine>Aucun rappel en attente.</EmptyLine>
        ) : (
          <ul>
            {pending.map((r) => (
              <li key={r.id} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{r.message}</p>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">
                    {when(r.remindAt)} · {REC[r.recurrence]} · #{channelName(r.channelId)} · {names[r.userId]?.displayName ?? r.userId}
                  </p>
                </div>
                <GhostButton onClick={() => cancel(r)}>Annuler</GhostButton>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}
