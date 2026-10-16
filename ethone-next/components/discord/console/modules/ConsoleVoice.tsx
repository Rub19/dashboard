"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChannelPicker, { fetchGuildChannels, invalidateGuildChannels, type ChannelOption } from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { sinceLabel } from "@/lib/discord/security-scan";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, GhostButton, Panel, RoleChips, Row, Segmented, Select, StatTile, Stepper, Switch, TextField, useGuildApi } from "../kit";
import { tx } from "@/lib/tx";

type Access = "public" | "locked" | "role_only" | "invite_only";
type Hub = {
  id: string;
  name: string;
  channelId: string;
  categoryId?: string | null;
  namingTemplate: string;
  userLimit: number;
  bitrate: number;
  accessMode: Access;
  autoNumbering: boolean;
  enabled: boolean;
  allowedRoles: string[];
};
type Room = { id: string; hubName: string; name: string; ownerTag: string; userLimit: number; isLocked: boolean; currentUsers?: string[]; createdAt: string };
type Kpis = { activeVoiceChannelsCount: number; usersInVoiceCount: number; sessionsTodayCount: number };
type Strategy = "FIRST_REMAINING" | "RANDOM_REMAINING" | "HIGHEST_ROLE" | "OWNERLESS" | "DELETE_ROOM";
type Settings = {
  enabled: boolean;
  emptyDeletionDelaySeconds: number;
  ownershipTransferStrategy: Strategy;
  maxRoomsPerGuild: number;
  maxRoomsPerUser: number;
  creationCooldownSeconds: number;
  creationTextChannelId: string | null;
  sendControlPanelInRoom: boolean;
};

const ACCESS: [Access, string][] = [
  ["public", "Ouvert"],
  ["locked", "Verrouillé"],
  ["role_only", "Rôles"],
  ["invite_only", "Invitation"],
];
const STRATEGY: [Strategy, string][] = [
  ["FIRST_REMAINING", "Au premier membre encore présent"],
  ["RANDOM_REMAINING", "À un membre présent au hasard"],
  ["HIGHEST_ROLE", "Au membre au rôle le plus haut"],
  ["OWNERLESS", "Personne (salon sans propriétaire)"],
  ["DELETE_ROOM", "Supprimer le salon"],
];


/** Salons vocaux temporaires (format Keeper) : salons « rejoindre pour créer », salons ouverts et règles. */
export default function ConsoleVoice({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [hubs, setHubs] = useState<Hub[] | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [newTrigger, setNewTrigger] = useState("");
  const [panelChannel, setPanelChannel] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [o, s] = await Promise.all([api<{ kpis: Kpis; hubs: Hub[]; activeRooms: Room[] }>("/voice/overview"), api<{ settings: Settings }>("/voice/settings", { silent: true })]);
    setHubs(o?.hubs ?? []);
    setRooms(o?.activeRooms ?? []);
    if (o) setKpis(o.kpis);
    if (s) {
      setSettings(s.settings);
      setPanelChannel(s.settings.creationTextChannelId ?? "");
    }
  }, [api]);
  useEffect(() => {
    void load();
    fetchGuildChannels(guildId).then(setChannels);
  }, [guildId, load]);

  const channelName = (id?: string | null) => (id ? (channels.find((c) => c.id === id)?.name ?? id) : "—");

  const saveHub = async (h: Hub, patch: Partial<Hub>) => {
    setHubs((l) => l?.map((x) => (x.id === h.id ? { ...x, ...patch } : x)) ?? null);
    const r = await api<{ hub: Hub }>(`/voice/hubs/${h.id}`, { method: "PUT", json: patch });
    if (r) setHubs((l) => l?.map((x) => (x.id === h.id ? r.hub : x)) ?? null);
    else void load();
  };
  const addHub = async () => {
    setBusy(true);
    const r = await api<{ hub: Hub }>("/voice/hubs", { method: "POST", json: { channelId: newTrigger, type: "voice" } });
    setBusy(false);
    if (r) {
      setHubs((l) => [...(l ?? []), r.hub]);
      setNewTrigger("");
      setOpen(r.hub.id);
    }
  };
  const quickSetup = async () => {
    setBusy(true);
    const r = await api<{ hub: Hub }>("/voice/hubs/quick", { method: "POST" });
    setBusy(false);
    if (r) {
      invalidateGuildChannels(guildId);
      void load();
      fetchGuildChannels(guildId).then(setChannels);
    }
  };
  const removeHub = async (h: Hub) => {
    if (!(await confirmDialog(tx("Retirer « {name} » ? Le salon Discord #{v1} n'est pas supprimé.", { name: h.name, v1: channelName(h.channelId) }), { title: tx("Retirer le salon"), confirmLabel: tx("Retirer") }))) return;
    if (await api(`/voice/hubs/${h.id}`, { method: "DELETE" })) setHubs((l) => l?.filter((x) => x.id !== h.id) ?? null);
  };
  const toggleLockRoom = async (r: Room) => {
    const nextLocked = !r.isLocked;
    const res = await api(`/voice/rooms/${r.id}/action`, {
      method: "POST",
      json: { action: nextLocked ? "lock" : "unlock" },
    });
    if (res) {
      setRooms((l) => l.map((x) => (x.id === r.id ? { ...x, isLocked: nextLocked } : x)));
    }
  };
  const closeRoom = async (r: Room) => {
    if (!(await confirmDialog(tx("Fermer le salon « {name} » ? Les membres présents seront déconnectés.", { name: r.name }), { title: tx("Fermer le salon"), confirmLabel: tx("Fermer") }))) return;
    if (await api(`/voice/rooms/${r.id}/action`, { method: "POST", json: { action: "delete" } })) setRooms((l) => l.filter((x) => x.id !== r.id));
  };
  const saveSettings = async (patch: Partial<Settings>) => {
    setSettings((s) => (s ? { ...s, ...patch } : s));
    const r = await api<{ settings: Settings }>("/voice/settings", { method: "PUT", json: patch });
    if (r) setSettings(r.settings);
  };
  const publishPanel = async () => {
    setBusy(true);
    const r = await api("/voice/panel/publish", { method: "POST", json: { channelId: panelChannel } });
    setBusy(false);
    if (r) void saveSettings({ creationTextChannelId: panelChannel });
  };

  return (
    <ConsolePage title={tx("Salons vocaux")}>
      {settings && !settings.enabled && (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">{tx("La création de salons est coupée : rejoindre un salon déclencheur ne crée rien. Réactive-la dans « Règles ».")}</p>
        </Panel>
      )}

      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={tx("Salons ouverts")} value={kpis?.activeVoiceChannelsCount ?? "—"} />
        <StatTile label={tx("Membres dedans")} value={kpis?.usersInVoiceCount ?? "—"} />
        <StatTile label={tx("Sessions (24 h)")} value={kpis?.sessionsTodayCount ?? "—"} />
        <StatTile label={tx("Salons déclencheurs")} value={hubs ? hubs.length : "—"} />
      </motion.div>

      <Panel title={tx("Salons déclencheurs")} subtitle={tx("Rejoindre un de ces salons vocaux crée un salon temporaire au membre.")}>
        {!hubs ? (
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        ) : (
          <>
            {hubs.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-5 py-6 text-center">
                <p className="text-xs text-[var(--text-muted)]">{tx("Aucun salon déclencheur. L'installation rapide crée une catégorie et un salon « ➕ Créer ton salon ».")}</p>
                <button type="button" disabled={busy} onClick={quickSetup} className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
                  {tx("Installation rapide")}
                </button>
              </div>
            )}
            <ul>
              {hubs.map((h) => (
                <li key={h.id} className="border-t border-[var(--panel-border)] first:border-t-0">
                  <div className="flex items-center gap-3 px-5 py-3">
                    <button type="button" onClick={() => setOpen(open === h.id ? null : h.id)} aria-expanded={open === h.id} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{h.name}</p>
                      <p className="truncate text-[11px] text-[var(--text-muted)]">
                        🔊 {channelName(h.channelId)} · {ACCESS.find(([a]) => a === h.accessMode)?.[1]} · {h.userLimit ? tx("{userLimit} places", { userLimit: h.userLimit }) : tx("sans limite")}
                      </p>
                    </button>
                    <Switch checked={h.enabled} onChange={(v) => saveHub(h, { enabled: v })} label={tx("Activer {name}", { name: h.name })} />
                  </div>
                  <AnimatePresence initial={false}>
                    {open === h.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
                        <div className="border-t border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40">
                          <Row label={tx("Nom")}>
                            <TextField value={h.name} maxLength={60} onCommit={(v) => saveHub(h, { name: v })} />
                          </Row>
                          <Row label={tx("Salon déclencheur")} hint={tx("Salon vocal à rejoindre.")}>
                            <ChannelPicker guildId={guildId} value={h.channelId} filterTypes={[2]} allowClear={false} placeholder={tx("Choisir un salon vocal")} onChange={(id) => id && saveHub(h, { channelId: id })} />
                          </Row>
                          <Row label={tx("Catégorie")} hint={tx("Où les salons sont créés. Vide : celle du salon déclencheur.")}>
                            <ChannelPicker guildId={guildId} value={h.categoryId ?? ""} filterTypes={[4]} placeholder={tx("Même catégorie")} onChange={(id) => saveHub(h, { categoryId: id || null })} />
                          </Row>
                          <Row label={tx("Nom des salons")} hint={tx("{username}, {displayName}, {number}, {server}")}>
                            <TextField value={h.namingTemplate} maxLength={90} width="w-72" onCommit={(v) => saveHub(h, { namingTemplate: v })} />
                          </Row>
                          <Row label={tx("Numérotation")} hint={tx("Ajoute un numéro quand plusieurs salons portent le même nom.")}>
                            <Switch checked={h.autoNumbering} onChange={(v) => saveHub(h, { autoNumbering: v })} label={tx("Numérotation")} />
                          </Row>
                          <Row label={tx("Places")} hint={tx("0 = sans limite.")}>
                            <Stepper value={h.userLimit} min={0} max={99} unit="membres" onCommit={(n) => saveHub(h, { userLimit: n })} />
                          </Row>
                          <Row label={tx("Débit audio")} hint={tx("Plafonné par le niveau de boost du serveur.")}>
                            <Stepper value={Math.round(h.bitrate / 1000)} min={8} max={384} step={8} unit="kbps" onCommit={(n) => saveHub(h, { bitrate: n * 1000 })} />
                          </Row>
                          <Row label={tx("Accès à la création")}>
                            <Segmented label={tx("Accès")} value={h.accessMode} options={ACCESS} onChange={(v) => saveHub(h, { accessMode: v })} />
                          </Row>
                          {h.accessMode === "role_only" && (
                            <Row label={tx("Rôles autorisés")}>
                              <RoleChips guildId={guildId} ids={h.allowedRoles} onChange={(ids) => saveHub(h, { allowedRoles: ids })} />
                            </Row>
                          )}
                          <div className="flex justify-end border-t border-[var(--panel-border)] px-5 py-3">
                            <GhostButton onClick={() => removeHub(h)}>{tx("Retirer ce salon déclencheur")}</GhostButton>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--panel-border)] px-5 py-3">
              <ChannelPicker guildId={guildId} value={newTrigger} filterTypes={[2]} placeholder={tx("Salon vocal existant")} onChange={(id) => setNewTrigger(id)} />
              <GhostButton disabled={busy || !newTrigger} onClick={addHub}>
                {tx("Ajouter")}
              </GhostButton>
            </div>
          </>
        )}
      </Panel>

      <Panel title={tx("Salons ouverts")}>
        {rooms.length === 0 ? (
          <EmptyLine>{tx("Aucun salon temporaire ouvert en ce moment.")}</EmptyLine>
        ) : (
          <ul>
            {rooms.map((r) => (
              <li key={r.id} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                <span className="w-12 shrink-0 text-center text-sm font-bold tabular-nums text-[var(--text-primary)]">
                  {r.currentUsers?.length ?? 0}
                  {r.userLimit ? <span className="text-xs font-normal text-[var(--text-muted)]">/{r.userLimit}</span> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                    {r.isLocked ? "🔒 " : ""}
                    {r.name}
                  </p>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">
                    {r.ownerTag} · {r.hubName} {" "}{tx("· ouvert")}{" "} {sinceLabel(r.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <GhostButton onClick={() => toggleLockRoom(r)}>
                    {r.isLocked ? tx("Déverrouiller") : tx("Verrouiller")}
                  </GhostButton>
                  <GhostButton onClick={() => closeRoom(r)}>{tx("Fermer")}</GhostButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={tx("Règles")}>
        {!settings ? (
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        ) : (
          <>
            <Row label={tx("Création de salons")} hint={tx("Coupée : les salons déclencheurs ne créent plus rien.")}>
              <Switch checked={settings.enabled} onChange={(v) => saveSettings({ enabled: v })} label={tx("Création de salons")} />
            </Row>
            <Row label={tx("Suppression d'un salon vide")} hint={tx("Délai avant de supprimer un salon resté vide.")}>
              <Stepper value={settings.emptyDeletionDelaySeconds} min={0} max={3600} step={5} unit="secondes" onCommit={(n) => saveSettings({ emptyDeletionDelaySeconds: n })} />
            </Row>
            <Row label={tx("Quand le propriétaire part")}>
              <Select value={settings.ownershipTransferStrategy} options={STRATEGY} onChange={(v) => saveSettings({ ownershipTransferStrategy: v })} aria-label={tx("Quand le propriétaire part")} />
            </Row>
            <Row label={tx("Salons par membre")}>
              <Stepper value={settings.maxRoomsPerUser} min={1} max={10} unit="salons" onCommit={(n) => saveSettings({ maxRoomsPerUser: n })} />
            </Row>
            <Row label={tx("Salons sur le serveur")} hint={tx("Au-delà, plus aucun salon n'est créé.")}>
              <Stepper value={settings.maxRoomsPerGuild} min={1} max={200} unit="salons" onCommit={(n) => saveSettings({ maxRoomsPerGuild: n })} />
            </Row>
            <Row label={tx("Délai entre deux créations")} hint={tx("Par membre.")}>
              <Stepper value={settings.creationCooldownSeconds} min={0} max={3600} step={5} unit="secondes" onCommit={(n) => saveSettings({ creationCooldownSeconds: n })} />
            </Row>
            <Row label={tx("Panneau de contrôle")} hint={tx("Boutons (verrouiller, renommer, limite…) envoyés dans chaque salon créé.")}>
              <Switch checked={settings.sendControlPanelInRoom} onChange={(v) => saveSettings({ sendControlPanelInRoom: v })} label={tx("Panneau de contrôle")} />
            </Row>
            <Row label={tx("Panneau de création")} hint={tx("Message avec un bouton pour créer son salon sans passer par le vocal.")}>
              <div className="flex flex-wrap items-center gap-2">
                <ChannelPicker guildId={guildId} value={panelChannel} filterTypes={[0, 5]} placeholder={tx("Choisir un salon")} onChange={(id) => setPanelChannel(id)} />
                <GhostButton disabled={busy || !panelChannel} onClick={publishPanel}>
                  {tx("Envoyer")}
                </GhostButton>
              </div>
            </Row>
          </>
        )}
      </Panel>
    </ConsolePage>
  );
}
