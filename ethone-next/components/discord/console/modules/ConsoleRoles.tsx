"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import ChannelPicker, { fetchGuildChannels, type ChannelOption } from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { useToast } from "@/components/ToastProvider";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { ConsolePage, EmptyLine, GhostButton, Panel, RoleAdder, RoleChips, Row, Segmented, Stepper, Switch, TextField, useGuildApi } from "../kit";

type AutoRole = {
  enabled: boolean;
  roleIds: string[];
  applyToHumans: boolean;
  applyToBots: boolean;
  waitForScreening: boolean;
  delaySeconds: number;
  useSeparateBotRoles: boolean;
  botRoleIds: string[];
  scheduledSyncEnabled: boolean;
  scheduledSyncIntervalHours: number;
  lastSyncAt: string | null;
};
type Item = { id: string; roleId: string; label: string; emoji: string | null; description: string | null; style: "Primary" | "Secondary" | "Success" | "Danger"; prerequisiteRoleId: string | null; mutuallyExclusiveRoleIds: string[] };
type Group = { id: string; name: string; mode: "toggle" | "single_exclusive" | "multi_limit"; minSelect: number; maxSelect: number; itemIds: string[] };
type RolePanel = { id: string; name: string; channelId: string | null; messageId: string | null; componentType: "buttons" | "select_menu"; title: string; description: string; color: string; items: Item[]; groups: Group[]; status: string; [k: string]: unknown };

const input = "w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";
const EXCLUSIVE = "console-exclusive";

/** Rôles (format Keeper) : rôles donnés à l'arrivée et menus de rôles en libre-service. */
export default function ConsoleRoles({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const { success } = useToast();
  const [auto, setAuto] = useState<AutoRole | null>(null);
  const [missing, setMissing] = useState<number | null>(null);
  const [panels, setPanels] = useState<RolePanel[] | null>(null);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadAuto = useCallback(async () => {
    const r = await api<{ config: AutoRole; missingCount: number }>("/roles/autorole");
    if (r) {
      setAuto(r.config);
      setMissing(r.missingCount);
    }
  }, [api]);
  useEffect(() => {
    void loadAuto();
    api<{ panels: RolePanel[] }>("/roles/panels").then((r) => setPanels(r?.panels ?? []));
    fetchGuildChannels(guildId).then(setChannels);
  }, [api, guildId, loadAuto]);

  const saveAuto = async (patch: Partial<AutoRole>) => {
    if (auto) setAuto({ ...auto, ...patch });
    const r = await api<{ config: AutoRole }>("/roles/autorole", { method: "PATCH", json: patch });
    if (r) setAuto(r.config);
  };
  const syncNow = async () => {
    if (!(await confirmDialog(`Donner les rôles automatiques aux ${missing} membre${missing === 1 ? "" : "s"} qui ne les ont pas encore ?`, { title: "Synchroniser", confirmLabel: "Donner les rôles" }))) return;
    setBusy("sync");
    const r = await api<{ updated: number }>("/roles/autorole/sync", { method: "POST", json: {} });
    setBusy(null);
    if (r) {
      success("Rôles donnés", `${r.updated} membre${r.updated > 1 ? "s" : ""} mis à jour.`);
      void loadAuto();
    }
  };

  const savePanel = async (p: Partial<RolePanel>) => {
    const r = await api<{ panel: RolePanel }>("/roles/panels", { method: "POST", json: p });
    if (r) setPanels((list) => (list?.some((x) => x.id === r.panel.id) ? list.map((x) => (x.id === r.panel.id ? r.panel : x)) : [...(list ?? []), r.panel]));
    return r?.panel ?? null;
  };
  const addPanel = async () => {
    const p = await savePanel({ name: "Menu de rôles" });
    if (p) setOpen(p.id);
  };
  const publish = async (p: RolePanel, channelId: string) => {
    setBusy(`pub:${p.id}`);
    const r = await api<{ messageId: string; channelName: string }>(`/roles/panels/${p.id}/publish`, { method: "POST", json: { channelId } });
    setBusy(null);
    if (r) {
      success("Menu publié", `Dans #${r.channelName}.`);
      setPanels((list) => list?.map((x) => (x.id === p.id ? { ...x, channelId, messageId: r.messageId, status: "active" } : x)) ?? null);
    }
  };
  const remove = async (p: RolePanel) => {
    if (!(await confirmDialog(`Supprimer « ${p.name} » ?${p.messageId ? " Le message publié sur Discord est supprimé aussi." : ""}`, { title: "Supprimer le menu", confirmLabel: "Supprimer" }))) return;
    const r = await api(`/roles/panels/${p.id}?deleteMessage=true`, { method: "DELETE" });
    if (r) setPanels((list) => list?.filter((x) => x.id !== p.id) ?? null);
  };

  const channelName = (id: string | null) => (id ? channels.find((c) => c.id === id)?.name ?? null : null);

  return (
    <ConsolePage title="Rôles">
      <Panel title="Rôles à l'arrivée" subtitle="Donnés automatiquement à chaque nouveau membre.">
        {!auto ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : (
          <>
            {!auto.enabled && <p className="border-b border-[var(--panel-border)] px-5 py-2.5 text-xs text-[var(--warning)]">Module désactivé : active-le en haut de la page pour que ces rôles soient donnés.</p>}
            <Row label="Membres">
              <RoleChips guildId={guildId} ids={auto.roleIds} onChange={(ids) => saveAuto({ roleIds: ids })} />
            </Row>
            <Row label="Bots" hint="Rôles pour les bots ajoutés au serveur.">
              <div className="flex flex-wrap items-center gap-3">
                <Switch checked={auto.applyToBots} onChange={(v) => saveAuto({ applyToBots: v })} label="Donner des rôles aux bots" />
                {auto.applyToBots && (
                  <Segmented
                    label="Rôles des bots"
                    value={auto.useSeparateBotRoles ? "own" : "same"}
                    options={[
                      ["same", "Mêmes rôles"],
                      ["own", "Rôles à part"],
                    ]}
                    onChange={(v) => saveAuto({ useSeparateBotRoles: v === "own" })}
                  />
                )}
              </div>
            </Row>
            {auto.applyToBots && auto.useSeparateBotRoles && (
              <Row label="Rôles des bots">
                <RoleChips guildId={guildId} ids={auto.botRoleIds} onChange={(ids) => saveAuto({ botRoleIds: ids })} />
              </Row>
            )}
            <Row label="Après les règles" hint="Attendre que le membre accepte les règles du serveur (filtrage Discord).">
              <Switch checked={auto.waitForScreening} onChange={(v) => saveAuto({ waitForScreening: v })} label="Attendre l'acceptation des règles" />
            </Row>
            <Row label="Délai" hint="Laisse le temps à l'anti-raid de passer. 0 : immédiat.">
              <Stepper value={auto.delaySeconds} min={0} max={86400} unit="s" onCommit={(n) => saveAuto({ delaySeconds: n })} />
            </Row>
            <Row label="Membres déjà présents" hint={auto.roleIds.length === 0 ? "Choisis d'abord les rôles à donner." : missing ? `${missing} membre${missing > 1 ? "s" : ""} n'${missing > 1 ? "ont" : "a"} pas encore ces rôles.` : "Tout le monde a déjà ces rôles."}>
              <GhostButton onClick={syncNow} disabled={!missing || busy === "sync" || auto.roleIds.length === 0}>
                {busy === "sync" ? "Attribution…" : "Donner maintenant"}
              </GhostButton>
            </Row>
            <Row label="Rattrapage automatique" hint="Redonne les rôles manquants à intervalle régulier.">
              <div className="flex flex-wrap items-center gap-3">
                <Switch checked={auto.scheduledSyncEnabled} onChange={(v) => saveAuto({ scheduledSyncEnabled: v })} label="Rattrapage automatique" />
                {auto.scheduledSyncEnabled && <Stepper value={auto.scheduledSyncIntervalHours} min={1} max={168} unit="h" onCommit={(n) => saveAuto({ scheduledSyncIntervalHours: n })} />}
              </div>
            </Row>
          </>
        )}
      </Panel>

      <Panel title="Menus de rôles" subtitle="Les membres choisissent eux-mêmes leurs rôles." actions={<GhostButton onClick={addPanel}>Nouveau menu</GhostButton>}>
        {!panels ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : panels.length === 0 ? (
          <EmptyLine>Aucun menu de rôles.</EmptyLine>
        ) : (
          <ul>
            {panels.map((p) => (
              <li key={p.id} className="border-t border-[var(--panel-border)] first:border-t-0">
                <button type="button" onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[var(--surface-hover)]">
                  <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: p.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{p.name}</p>
                    <p className={cn("truncate text-[11px]", p.status === "error" ? "text-[var(--danger)]" : "text-[var(--text-muted)]")}>
                      {p.items.length} rôle{p.items.length > 1 ? "s" : ""} · {p.componentType === "buttons" ? "boutons" : "menu déroulant"} · {p.status === "error" ? "erreur à la dernière vérification" : p.messageId && channelName(p.channelId) ? `publié dans #${channelName(p.channelId)}` : "pas encore publié"}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{open === p.id ? "Fermer" : "Modifier"}</span>
                </button>
                <AnimatePresence initial={false}>
                  {open === p.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden bg-[var(--surface-base,var(--bg-main))]/40">
                      <PanelEditor guildId={guildId} panel={p} publishing={busy === `pub:${p.id}`} onSave={savePanel} onPublish={(ch) => publish(p, ch)} onDelete={() => remove(p)} />
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

function PanelEditor({ guildId, panel, publishing, onSave, onPublish, onDelete }: { guildId: string; panel: RolePanel; publishing: boolean; onSave: (p: Partial<RolePanel>) => Promise<RolePanel | null>; onPublish: (channelId: string) => void; onDelete: () => void }) {
  const [target, setTarget] = useState(panel.channelId ?? "");
  const [desc, setDesc] = useState(panel.description);
  useEffect(() => setDesc(panel.description), [panel.description]);
  const exclusive = panel.groups.some((g) => g.id === EXCLUSIVE);

  const save = (patch: Partial<RolePanel>) => {
    const next = { ...panel, ...patch };
    // Groupe « un seul rôle » tenu à jour avec la liste des rôles du menu.
    const keep = patch.groups ?? next.groups;
    const groups = keep.some((g) => g.id === EXCLUSIVE) ? keep.map((g) => (g.id === EXCLUSIVE ? { ...g, itemIds: next.items.map((i) => i.id) } : g)) : keep;
    void onSave({ ...next, groups });
  };
  const setExclusive = (on: boolean) =>
    save({ groups: on ? [...panel.groups, { id: EXCLUSIVE, name: "Un seul rôle", mode: "single_exclusive", minSelect: 0, maxSelect: 1, itemIds: [] }] : panel.groups.filter((g) => g.id !== EXCLUSIVE) });
  const setItem = (id: string, patch: Partial<Item>) => save({ items: panel.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });

  return (
    <div className="border-t border-[var(--panel-border)]">
      <Row label="Nom" hint="Pour t'y retrouver ici.">
        <TextField value={panel.name} maxLength={50} onCommit={(v) => save({ name: v })} />
      </Row>
      <Row label="Titre du message">
        <TextField value={panel.title} maxLength={256} width="w-full" onCommit={(v) => save({ title: v })} />
      </Row>
      <Row label="Texte">
        <textarea value={desc} maxLength={2000} rows={2} onChange={(e) => setDesc(e.target.value)} onBlur={() => desc.trim() && desc !== panel.description && save({ description: desc })} className={input} />
      </Row>
      <Row label="Couleur">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(panel.color) ? panel.color : "#5865f2"} onChange={(e) => save({ color: e.target.value })} aria-label="Couleur du menu" className="h-9 w-14 cursor-pointer rounded-lg border border-[var(--panel-border)] bg-transparent" />
      </Row>
      <Row label="Affichage">
        <Segmented
          label="Affichage"
          value={panel.componentType}
          options={[
            ["buttons", "Boutons"],
            ["select_menu", "Menu déroulant"],
          ]}
          onChange={(v) => save({ componentType: v })}
        />
      </Row>
      <Row label="Un seul rôle à la fois" hint="Choisir un rôle retire les autres du menu.">
        <Switch checked={exclusive} onChange={setExclusive} label="Un seul rôle à la fois" />
      </Row>
      <Row label="Rôles proposés" hint="25 au plus. Le libellé est le texte du bouton.">
        <div className="space-y-1.5">
          <AnimatePresence initial={false}>
            {panel.items.map((i) => (
              <motion.div key={i.id} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={SPRING_LAYOUT} className="flex items-center gap-2">
                <TextField value={i.emoji ?? ""} maxLength={8} width="w-14" placeholder="🙂" onCommit={(v) => setItem(i.id, { emoji: v || null })} />
                <TextField value={i.label} maxLength={80} onCommit={(v) => setItem(i.id, { label: v })} />
                <button type="button" onClick={() => save({ items: panel.items.filter((x) => x.id !== i.id) })} aria-label={`Retirer ${i.label}`} className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--danger)]">
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {panel.items.length < 25 && (
            <RoleAdder
              guildId={guildId}
              excludeIds={panel.items.map((i) => i.roleId)}
              onPick={(r) => save({ items: [...panel.items, { id: `item_${Date.now().toString(36)}`, roleId: r.id, label: r.name.slice(0, 80), emoji: null, description: null, style: "Secondary", prerequisiteRoleId: null, mutuallyExclusiveRoleIds: [] }] })}
            />
          )}
        </div>
      </Row>
      <Row label="Publier dans" hint={panel.messageId ? "Republier dans le même salon met le message à jour." : undefined}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[12rem] flex-1">
            <ChannelPicker guildId={guildId} value={target} filterTypes={[0, 5]} allowClear={false} placeholder="Choisir un salon" onChange={setTarget} />
          </div>
          <GhostButton onClick={() => onPublish(target)} disabled={!target || publishing || panel.items.length === 0}>
            {publishing ? "Publication…" : panel.messageId ? "Republier" : "Publier"}
          </GhostButton>
        </div>
      </Row>
      <div className="flex justify-end border-t border-[var(--panel-border)] px-5 py-3">
        <GhostButton onClick={onDelete}>Supprimer le menu</GhostButton>
      </div>
    </div>
  );
}
