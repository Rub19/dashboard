"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import ChannelPicker, { fetchGuildChannels, type ChannelOption } from "../../ChannelPicker";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, Segmented, StatTile, useGuildApi, useMemberNames } from "../kit";
import { tx } from "@/lib/tx";

type Recurrence = "none" | "daily" | "weekly";
type Reminder = { id: string; channelId: string; userId: string; message: string; remindAt: string; recurrence: Recurrence; delivered: boolean; deliveredCount: number };

const REC: Record<Recurrence, string> = { none: "Une fois", daily: "Chaque jour", weekly: "Chaque semaine" };
const PRESETS = ["15m", "30m", "1h", "3h", "1j", "1sem"];
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
  const trigger = async (r: Reminder) => {
    setBusy(true);
    const res = await api<{ success: boolean }>(`/reminders/${r.id}/trigger`, { method: "POST" });
    setBusy(false);
    if (res?.success) {
      void load();
    }
  };
  const cancel = async (r: Reminder) => {
    if (await api(`/reminders/${r.id}`, { method: "DELETE" })) setList((l) => l?.filter((x) => x.id !== r.id) ?? null);
  };

  const canCreate = message.trim().length > 0 && DELAY_RE.test(delay.trim()) && !!channelId && !busy;

  return (
    <ConsolePage title={tx("Rappels")}>
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label={tx("En attente")} value={list ? pending.length : "—"} />
        <StatTile label={tx("Récurrents")} value={list ? pending.filter((r) => r.recurrence !== "none").length : "—"} />
        <StatTile label={tx("Prochain")} value={pending[0] ? when(pending[0].remindAt) : "—"} />
      </motion.div>

      <Panel title={tx("Nouveau rappel")} subtitle={tx("Envoyé à ton nom dans le salon choisi.")}>
        <Row label={tx("Message")}>
          <textarea value={message} maxLength={1500} rows={2} onChange={(e) => setMessage(e.target.value)} placeholder={tx("Réunion staff dans 10 minutes")} aria-label={tx("Message du rappel")} className={field} />
        </Row>
        <Row label={tx("Dans")} hint={tx("Ex. 30m, 2h, 1j, 1h30m (30 secondes minimum).")}>
          <div className="flex flex-wrap items-center gap-2">
            <input value={delay} maxLength={20} onChange={(e) => setDelay(e.target.value)} aria-label={tx("Délai")} className={`${field} h-9 w-28 py-0 font-mono`} />
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDelay(p)}
                  className={`rounded-md border px-2 py-1 font-mono text-xs transition-colors ${delay === p ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]" : "border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </Row>
        <Row label={tx("Répéter")}>
          <Segmented label={tx("Répéter")} value={recurrence} options={Object.entries(REC) as [Recurrence, string][]} onChange={setRecurrence} />
        </Row>
        <Row label={tx("Salon")}>
          <ChannelPicker guildId={guildId} value={channelId} filterTypes={[0, 5]} placeholder={tx("Choisir un salon")} onChange={(id) => setChannelId(id)} />
        </Row>
        <div className="flex justify-end border-t border-[var(--panel-border)] px-5 py-3">
          <button type="button" disabled={!canCreate} onClick={create} className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
            {tx("Programmer")}
          </button>
        </div>
      </Panel>

      <Panel title={tx("Rappels programmés")} subtitle={tx("Créés avec /reminder ou depuis cette page.")}>
        {!list ? (
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        ) : pending.length === 0 ? (
          <EmptyLine>{tx("Aucun rappel en attente.")}</EmptyLine>
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
                <div className="flex items-center gap-1.5">
                  <GhostButton disabled={busy} onClick={() => trigger(r)}>{tx("Déclencher")}</GhostButton>
                  <GhostButton disabled={busy} onClick={() => cancel(r)}>{tx("Annuler")}</GhostButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}
