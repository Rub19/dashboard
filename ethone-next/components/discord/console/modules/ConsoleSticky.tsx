"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChannelPicker, { fetchGuildChannels, type ChannelOption } from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, StatTile, Stepper, Switch, TextField, useGuildApi } from "../kit";

type Sticky = { channelId: string; content: string; asEmbed: boolean; title: string; color: string; enabled: boolean; cooldownSeconds: number; repostCount: number };
type Overview = { total: number; active: number; totalReposts: number; channels: { channelId: string; enabled: boolean; repostCount: number; preview: string }[] };

const HEX = /^#[0-9a-f]{6}$/i;
const field =
  "w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";

/** Messages épinglés (format Keeper) : un message qui reste toujours en bas du salon. */
export default function ConsoleSticky({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [ov, setOv] = useState<Overview | null>(null);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<Sticky | null>(null);
  const [draft, setDraft] = useState("");
  const [newChannel, setNewChannel] = useState("");
  const [newContent, setNewContent] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api<Overview>("/sticky/overview");
    setOv(r ?? { total: 0, active: 0, totalReposts: 0, channels: [] });
  }, [api]);
  useEffect(() => {
    void load();
    fetchGuildChannels(guildId).then(setChannels);
  }, [guildId, load]);
  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

  const toggle = async (channelId: string) => {
    if (open === channelId) return setOpen(null);
    setOpen(channelId);
    setDetail(null);
    const r = await api<Sticky>(`/sticky/config/${channelId}`);
    if (r) {
      setDetail(r);
      setDraft(r.content);
    }
  };
  const save = async (channelId: string, patch: Partial<Sticky>) => {
    setBusy(true);
    if (detail?.channelId === channelId) setDetail({ ...detail, ...patch });
    const r = await api<{ config: Sticky }>(`/sticky/config/${channelId}`, { method: "PUT", json: patch });
    setBusy(false);
    if (r) {
      if (open === channelId) setDetail(r.config);
      void load();
    }
    return !!r;
  };
  const create = async () => {
    if (await save(newChannel, { content: newContent.trim() })) {
      setNewChannel("");
      setNewContent("");
    }
  };
  const repost = async (channelId: string) => {
    setBusy(true);
    await api(`/sticky/config/${channelId}/repost`, { method: "POST" });
    setBusy(false);
  };
  const remove = async (channelId: string) => {
    if (!(await confirmDialog(`Retirer le message épinglé de #${channelName(channelId)} ?`, { title: "Retirer", confirmLabel: "Retirer" }))) return;
    if (await api(`/sticky/config/${channelId}`, { method: "DELETE" })) {
      setOpen(null);
      void load();
    }
  };

  const used = ov?.channels.map((c) => c.channelId) ?? [];
  const canCreate = !!newChannel && !used.includes(newChannel) && newContent.trim().length > 0 && !busy;

  return (
    <ConsolePage title="Messages épinglés">
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Actifs" value={ov?.active ?? "—"} hint={ov ? `sur ${ov.total}` : undefined} />
        <StatTile label="Republications" value={ov?.totalReposts ?? "—"} />
        <StatTile label="Salons" value={ov?.total ?? "—"} />
      </motion.div>

      <Panel title="Nouveau message épinglé" subtitle="Etho le republie en bas du salon après chaque nouveau message.">
        <Row label="Salon">
          <ChannelPicker guildId={guildId} value={newChannel} filterTypes={[0, 5]} placeholder="Choisir un salon" onChange={(id) => setNewChannel(id)} />
          {used.includes(newChannel) && <p className="mt-1 text-[11px] text-[var(--warning)]">Ce salon a déjà un message épinglé : modifie-le dans la liste.</p>}
        </Row>
        <Row label="Message" hint="Markdown Discord, 2000 caractères.">
          <textarea value={newContent} maxLength={2000} rows={3} onChange={(e) => setNewContent(e.target.value)} aria-label="Message épinglé" className={field} />
        </Row>
        <div className="flex justify-end border-t border-[var(--panel-border)] px-5 py-3">
          <button type="button" disabled={!canCreate} onClick={create} className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
            Épingler
          </button>
        </div>
      </Panel>

      <Panel title="Salons avec un message épinglé">
        {!ov ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : ov.channels.length === 0 ? (
          <EmptyLine>Aucun message épinglé.</EmptyLine>
        ) : (
          <ul>
            {ov.channels.map((c) => (
              <li key={c.channelId} className="border-t border-[var(--panel-border)] first:border-t-0">
                <div className="flex items-center gap-3 px-5 py-3">
                  <button type="button" onClick={() => toggle(c.channelId)} aria-expanded={open === c.channelId} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">#{channelName(c.channelId)}</p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                      {c.repostCount} republication{c.repostCount > 1 ? "s" : ""} · {c.preview}
                    </p>
                  </button>
                  <Switch checked={c.enabled} onChange={(v) => save(c.channelId, { enabled: v })} label={`Activer #${channelName(c.channelId)}`} />
                </div>
                <AnimatePresence initial={false}>
                  {open === c.channelId && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
                      <div className="border-t border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40">
                        {!detail ? (
                          <EmptyLine>Chargement…</EmptyLine>
                        ) : (
                          <>
                            <Row label="Message">
                              <textarea value={draft} maxLength={2000} rows={4} onChange={(e) => setDraft(e.target.value)} onBlur={() => draft.trim() && draft !== detail.content && save(c.channelId, { content: draft.trim() })} aria-label="Message" className={field} />
                            </Row>
                            <Row label="En embed" hint="Sinon, message texte simple.">
                              <Switch checked={detail.asEmbed} onChange={(v) => save(c.channelId, { asEmbed: v })} label="En embed" />
                            </Row>
                            {detail.asEmbed && (
                              <>
                                <Row label="Titre">
                                  <TextField value={detail.title} maxLength={256} width="w-72" onCommit={(v) => save(c.channelId, { title: v })} />
                                </Row>
                                <Row label="Couleur">
                                  <span className="inline-flex items-center gap-2">
                                    <input type="color" value={HEX.test(detail.color) ? detail.color : "#5865f2"} onChange={(e) => save(c.channelId, { color: e.target.value })} aria-label="Couleur" className="h-8 w-10 cursor-pointer rounded border border-[var(--panel-border)] bg-transparent" />
                                    <span className="font-mono text-xs text-[var(--text-muted)]">{detail.color}</span>
                                  </span>
                                </Row>
                              </>
                            )}
                            <Row label="Délai entre deux republications" hint="Évite de republier à chaque message d'une conversation rapide.">
                              <Stepper value={detail.cooldownSeconds} min={2} max={120} unit="secondes" onCommit={(n) => save(c.channelId, { cooldownSeconds: n })} />
                            </Row>
                            <div className="flex items-center gap-1.5 border-t border-[var(--panel-border)] px-5 py-3">
                              <GhostButton disabled={busy} onClick={() => repost(c.channelId)}>
                                Republier maintenant
                              </GhostButton>
                              <span className="flex-1" />
                              <GhostButton onClick={() => remove(c.channelId)}>Retirer</GhostButton>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}
