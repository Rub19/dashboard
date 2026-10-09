"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import ChannelPicker, { fetchGuildChannels, type ChannelOption } from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { useToast } from "@/components/ToastProvider";
import { sinceLabel } from "@/lib/discord/security-scan";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { ConsolePage, EmptyLine, GhostButton, Panel, RoleChips, Row, Segmented, StatTile, Stepper, TextField, useGuildApi } from "../kit";

type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
type Category = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  discordCategoryId: string | null;
  supportRoleIds: string[];
  defaultPriority: Priority;
  autoCloseInactivityHours: number;
  maxTicketsPerUser: number;
  welcomeMessage: string;
  [k: string]: unknown;
};
type TicketPanel = { id: string; channelId: string | null; messageId: string | null; title: string; description: string; color: string; buttonLabel: string; buttonEmoji: string; categoryIds: string[] };
type Ticket = { id: string; channelId: string; userTag: string; categoryName: string; priority: Priority; status: string; claimedBy: { id: string; tag: string } | null; createdAt: string; lastActivityAt?: string };
type Config = { mode: "channel" | "forum"; forumChannelId?: string | null; forumTagIds?: Record<string, string>; namingFormat: string };
type Overview = { open: number; pending: number; closedToday: number; totalTickets: number };

const PRIORITIES: [Priority, string][] = [
  ["LOW", "Basse"],
  ["NORMAL", "Normale"],
  ["HIGH", "Haute"],
  ["URGENT", "Urgente"],
];
const STATUS: Record<string, string> = { OPEN: "Ouvert", PENDING: "En attente", WAITING_USER: "Attend le membre", WAITING_STAFF: "Attend le staff", RESOLVED: "Résolu" };
const PRIORITY_COLOR: Record<Priority, string> = { LOW: "var(--text-muted)", NORMAL: "var(--text-muted)", HIGH: "var(--warning)", URGENT: "var(--danger)" };
const input = "h-9 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";
const newId = (p: string) => `${p}-${Date.now().toString(36)}`;

/** Tickets (format Keeper) : où s'ouvrent les tickets, catégories, panneaux publiés et tickets en cours. */
export default function ConsoleTickets({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const { success } = useToast();
  const [ov, setOv] = useState<Overview | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [cats, setCats] = useState<Category[] | null>(null);
  const [panels, setPanels] = useState<TicketPanel[] | null>(null);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [forumDraft, setForumDraft] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [o, c, k, p, t] = await Promise.all([
      api<Overview>("/tickets/overview", { silent: true }),
      api<{ config: Config }>("/tickets/config"),
      api<{ categories: Category[] }>("/tickets/categories"),
      api<{ panels: TicketPanel[] }>("/tickets/panels"),
      api<{ tickets: Ticket[] }>("/tickets/tickets?limit=100", { silent: true }),
    ]);
    if (o) setOv(o);
    if (c) setConfig(c.config);
    setCats(k?.categories ?? []);
    setPanels(p?.panels ?? []);
    setTickets((t?.tickets ?? []).filter((x) => x.status !== "CLOSED"));
  }, [api]);
  useEffect(() => {
    void load();
    fetchGuildChannels(guildId).then(setChannels);
  }, [guildId, load]);

  const saveConfig = async (patch: Partial<Config>) => {
    const r = await api<{ config: Config }>("/tickets/config", { method: "PATCH", json: patch });
    if (r) setConfig(r.config);
    return !!r;
  };

  const createForumTags = async () => {
    setBusy("tags");
    const r = await api<{ config: Config; created: string[] }>("/tickets/config/forum-tags", { method: "POST", json: {} });
    setBusy(null);
    if (r) {
      setConfig(r.config);
      success("Tags de statut", r.created.length ? `${r.created.length} tag${r.created.length > 1 ? "s" : ""} ajouté${r.created.length > 1 ? "s" : ""} au forum.` : "Le forum les avait déjà.");
    }
  };

  const saveCat = async (c: Category) => {
    const r = await api<{ category: Category }>("/tickets/categories", { method: "POST", json: c });
    if (r) setCats((list) => (list?.some((x) => x.id === c.id) ? list.map((x) => (x.id === c.id ? r.category : x)) : [...(list ?? []), r.category]));
    return !!r;
  };
  const addCat = async () => {
    const id = newId("cat");
    if (await saveCat({ id, name: "Nouvelle catégorie" } as Category)) setOpenCat(id);
  };
  const deleteCat = async (c: Category) => {
    if (!(await confirmDialog(`Supprimer la catégorie « ${c.name} » ? Les tickets déjà ouverts restent ouverts.`, { title: "Supprimer la catégorie", confirmLabel: "Supprimer" }))) return;
    const r = await api(`/tickets/categories/${c.id}`, { method: "DELETE" });
    if (r) setCats((list) => list?.filter((x) => x.id !== c.id) ?? null);
  };

  const savePanel = async (p: TicketPanel) => {
    const r = await api<{ panel: TicketPanel }>("/tickets/panels", { method: "POST", json: p });
    if (r) setPanels((list) => (list?.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? r.panel : x)) : [...(list ?? []), r.panel]));
    return !!r;
  };
  const addPanel = async () => {
    const id = newId("panel");
    if (await savePanel({ id } as TicketPanel)) setOpenPanel(id);
  };
  const deletePanel = async (p: TicketPanel) => {
    if (!(await confirmDialog(`Supprimer le panneau « ${p.title} » du tableau de bord ? Le message déjà publié sur Discord reste en place.`, { title: "Supprimer le panneau", confirmLabel: "Supprimer" }))) return;
    const r = await api(`/tickets/panels/${p.id}`, { method: "DELETE" });
    if (r) setPanels((list) => list?.filter((x) => x.id !== p.id) ?? null);
  };
  const publish = async (p: TicketPanel, channelId: string) => {
    setBusy(`pub:${p.id}`);
    const r = await api<{ messageId: string; channelName: string }>(`/tickets/panels/${p.id}/publish`, { method: "POST", json: { channelId } });
    setBusy(null);
    if (r) {
      success("Panneau publié", `Envoyé dans #${r.channelName}.`);
      setPanels((list) => list?.map((x) => (x.id === p.id ? { ...x, channelId, messageId: r.messageId } : x)) ?? null);
    }
  };

  const claim = async (t: Ticket) => {
    setBusy(`t:${t.id}`);
    const r = await api<{ ticket: Ticket }>(`/tickets/tickets/${encodeURIComponent(t.id)}/claim`, { method: "POST", json: {} });
    setBusy(null);
    if (r) setTickets((list) => list?.map((x) => (x.id === t.id ? { ...x, claimedBy: r.ticket.claimedBy } : x)) ?? null);
  };
  const close = async (t: Ticket) => {
    if (!(await confirmDialog(`Fermer le ticket ${t.id} de ${t.userTag} ? Le transcript est enregistré puis le salon est fermé.`, { title: "Fermer le ticket", confirmLabel: "Fermer" }))) return;
    setBusy(`t:${t.id}`);
    const r = await api(`/tickets/tickets/${encodeURIComponent(t.id)}/close`, { method: "POST", json: { reason: "Fermé depuis le tableau de bord" } });
    setBusy(null);
    if (r) setTickets((list) => list?.filter((x) => x.id !== t.id) ?? null);
  };

  const channelName = (id: string | null) => (id ? channels.find((c) => c.id === id)?.name ?? "salon supprimé" : null);
  const mode = forumDraft ? "forum" : config?.mode ?? "channel";
  const tagsReady = !!config?.forumTagIds && Object.values(config.forumTagIds).filter(Boolean).length >= 4;

  return (
    <ConsolePage title="Tickets">
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Ouverts" value={ov?.open ?? "—"} />
        <StatTile label="En attente" value={ov?.pending ?? "—"} />
        <StatTile label="Fermés aujourd'hui" value={ov?.closedToday ?? "—"} />
        <StatTile label="Total" value={ov?.totalTickets ?? "—"} />
      </motion.div>

      <Panel title="Réglages">
        {!config ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : (
          <>
            <Row label="Les tickets s'ouvrent" hint={mode === "forum" ? "Un post par ticket dans un forum, avec un tag de statut." : "Un salon privé par ticket."}>
              <Segmented
                label="Mode des tickets"
                value={mode}
                options={[
                  ["channel", "En salon"],
                  ["forum", "Dans un forum"],
                ]}
                onChange={(v) => {
                  if (v === "forum" && !config.forumChannelId) return setForumDraft(true);
                  setForumDraft(false);
                  void saveConfig({ mode: v });
                }}
              />
            </Row>
            {mode === "forum" && (
              <>
                <Row label="Forum" hint={forumDraft ? "Choisis le forum pour activer ce mode." : undefined}>
                  <ChannelPicker
                    guildId={guildId}
                    value={config.forumChannelId ?? ""}
                    filterTypes={[15]}
                    allowClear={false}
                    placeholder="Choisir un forum"
                    onChange={async (id) => {
                      if (await saveConfig({ mode: "forum", forumChannelId: id })) setForumDraft(false);
                    }}
                  />
                </Row>
                {config.forumChannelId && (
                  <Row label="Tags de statut" hint="Ouvert, En cours, Résolu, Fermé.">
                    {tagsReady ? <span className="text-xs text-[var(--text-muted)]">Prêts sur le forum.</span> : <GhostButton onClick={createForumTags} disabled={busy === "tags"}>{busy === "tags" ? "Création…" : "Créer les tags"}</GhostButton>}
                  </Row>
                )}
              </>
            )}
            {mode === "channel" && (
              <Row label="Nom des salons" hint="{username} : pseudo du membre, {id} : numéro du ticket.">
                <TextField value={config.namingFormat} maxLength={60} mono onCommit={(v) => saveConfig({ namingFormat: v })} />
              </Row>
            )}
          </>
        )}
      </Panel>

      <Panel title="Catégories" subtitle="Chaque catégorie devient un bouton sur le panneau." actions={<GhostButton onClick={addCat}>Ajouter</GhostButton>}>
        {!cats ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : cats.length === 0 ? (
          <EmptyLine>Aucune catégorie : les membres ne peuvent pas ouvrir de ticket.</EmptyLine>
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {cats.map((c) => (
                <motion.li key={c.id} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={SPRING_LAYOUT} className="border-t border-[var(--panel-border)] first:border-t-0">
                  <button type="button" onClick={() => setOpenCat(openCat === c.id ? null : c.id)} aria-expanded={openCat === c.id} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[var(--surface-hover)]">
                    <span className="w-6 text-center text-base">{c.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{c.name}</p>
                      <p className="truncate text-[11px] text-[var(--text-muted)]">
                        {c.supportRoleIds.length ? `${c.supportRoleIds.length} rôle${c.supportRoleIds.length > 1 ? "s" : ""} support` : "Aucun rôle support"} · fermeture {c.autoCloseInactivityHours > 0 ? `après ${c.autoCloseInactivityHours} h` : "manuelle"}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">{openCat === c.id ? "Fermer" : "Modifier"}</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {openCat === c.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden bg-[var(--surface-base,var(--bg-main))]/40">
                        <CategoryEditor guildId={guildId} cat={c} onSave={saveCat} onDelete={() => deleteCat(c)} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Panel>

      <Panel title="Panneaux" subtitle="Le message avec les boutons pour ouvrir un ticket." actions={<GhostButton onClick={addPanel}>Nouveau panneau</GhostButton>}>
        {!panels ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : panels.length === 0 ? (
          <EmptyLine>Aucun panneau. Crée-en un puis publie-le dans un salon.</EmptyLine>
        ) : (
          <ul>
            {panels.map((p) => (
              <li key={p.id} className="border-t border-[var(--panel-border)] first:border-t-0">
                <button type="button" onClick={() => setOpenPanel(openPanel === p.id ? null : p.id)} aria-expanded={openPanel === p.id} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[var(--surface-hover)]">
                  <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: p.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{p.title}</p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                      {p.messageId && channelName(p.channelId) ? `Publié dans #${channelName(p.channelId)}` : "Pas encore publié"} · {p.categoryIds.length ? `${p.categoryIds.length} catégorie${p.categoryIds.length > 1 ? "s" : ""}` : "toutes les catégories"}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{openPanel === p.id ? "Fermer" : "Modifier"}</span>
                </button>
                <AnimatePresence initial={false}>
                  {openPanel === p.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden bg-[var(--surface-base,var(--bg-main))]/40">
                      <PanelEditor guildId={guildId} panel={p} cats={cats ?? []} publishing={busy === `pub:${p.id}`} onSave={savePanel} onPublish={(ch) => publish(p, ch)} onDelete={() => deletePanel(p)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Tickets en cours">
        {!tickets ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : tickets.length === 0 ? (
          <EmptyLine>Aucun ticket ouvert.</EmptyLine>
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {tickets.map((t) => (
                <motion.li key={t.id} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={SPRING_LAYOUT} className="flex flex-wrap items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                      {t.userTag} <span className="font-normal text-[var(--text-muted)]">· {t.categoryName}</span>
                    </p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                      <span style={{ color: PRIORITY_COLOR[t.priority] }}>{PRIORITIES.find(([k]) => k === t.priority)?.[1]}</span> · {STATUS[t.status] ?? t.status} · {t.claimedBy ? `pris par ${t.claimedBy.tag}` : "personne dessus"} · {sinceLabel(t.lastActivityAt || t.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <a href={`https://discord.com/channels/${guildId}/${t.channelId}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-[var(--panel-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Discord
                    </a>
                    {!t.claimedBy && (
                      <GhostButton onClick={() => claim(t)} disabled={busy !== null}>
                        Prendre en charge
                      </GhostButton>
                    )}
                    <GhostButton onClick={() => close(t)} disabled={busy !== null}>
                      Fermer
                    </GhostButton>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}

function CategoryEditor({ guildId, cat, onSave, onDelete }: { guildId: string; cat: Category; onSave: (c: Category) => Promise<boolean>; onDelete: () => void }) {
  const [welcome, setWelcome] = useState(cat.welcomeMessage);
  useEffect(() => setWelcome(cat.welcomeMessage), [cat.welcomeMessage]);
  const save = (patch: Partial<Category>) => void onSave({ ...cat, ...patch });
  return (
    <div className="border-t border-[var(--panel-border)]">
      <Row label="Nom">
        <div className="flex gap-2">
          <TextField value={cat.emoji} maxLength={8} width="w-16" onCommit={(v) => save({ emoji: v })} />
          <TextField value={cat.name} maxLength={32} onCommit={(v) => save({ name: v })} />
        </div>
      </Row>
      <Row label="Description" hint="Affichée sur le panneau.">
        <TextField value={cat.description} maxLength={100} width="w-full" onCommit={(v) => save({ description: v })} />
      </Row>
      <Row label="Rôles support" hint="Voient et gèrent les tickets de cette catégorie.">
        <RoleChips guildId={guildId} ids={cat.supportRoleIds} onChange={(ids) => save({ supportRoleIds: ids })} />
      </Row>
      <Row label="Catégorie Discord" hint="Où créer les salons. Vide : en haut du serveur.">
        <ChannelPicker guildId={guildId} value={cat.discordCategoryId ?? ""} filterTypes={[4]} placeholder="Aucune" onChange={(id) => save({ discordCategoryId: id || null })} />
      </Row>
      <Row label="Priorité par défaut">
        <Segmented label="Priorité" value={cat.defaultPriority} options={PRIORITIES} onChange={(v) => save({ defaultPriority: v })} />
      </Row>
      <Row label="Tickets ouverts par membre">
        <Stepper value={cat.maxTicketsPerUser} min={1} max={10} onCommit={(n) => save({ maxTicketsPerUser: n })} />
      </Row>
      <Row label="Fermeture si inactif" hint="0 : jamais fermé automatiquement.">
        <Stepper value={cat.autoCloseInactivityHours} min={0} max={720} unit="h" onCommit={(n) => save({ autoCloseInactivityHours: n })} />
      </Row>
      <Row label="Message d'accueil" hint="{user}, {username}, {ticketId}, {category}, {server}.">
        <textarea
          value={welcome}
          maxLength={1500}
          rows={3}
          onChange={(e) => setWelcome(e.target.value)}
          onBlur={() => welcome.trim() && welcome !== cat.welcomeMessage && save({ welcomeMessage: welcome })}
          className={cn(input, "h-auto py-2")}
        />
      </Row>
      <div className="flex justify-end border-t border-[var(--panel-border)] px-5 py-3">
        <GhostButton onClick={onDelete}>Supprimer la catégorie</GhostButton>
      </div>
    </div>
  );
}

function PanelEditor({
  guildId,
  panel,
  cats,
  publishing,
  onSave,
  onPublish,
  onDelete,
}: {
  guildId: string;
  panel: TicketPanel;
  cats: Category[];
  publishing: boolean;
  onSave: (p: TicketPanel) => Promise<boolean>;
  onPublish: (channelId: string) => void;
  onDelete: () => void;
}) {
  const [target, setTarget] = useState(panel.channelId ?? "");
  const [desc, setDesc] = useState(panel.description);
  useEffect(() => setDesc(panel.description), [panel.description]);
  const save = (patch: Partial<TicketPanel>) => void onSave({ ...panel, ...patch });
  const toggleCat = (id: string) => save({ categoryIds: panel.categoryIds.includes(id) ? panel.categoryIds.filter((x) => x !== id) : [...panel.categoryIds, id] });
  return (
    <div className="border-t border-[var(--panel-border)]">
      <Row label="Titre">
        <TextField value={panel.title} maxLength={256} width="w-full" onCommit={(v) => save({ title: v })} />
      </Row>
      <Row label="Texte">
        <textarea value={desc} maxLength={2000} rows={3} onChange={(e) => setDesc(e.target.value)} onBlur={() => desc.trim() && desc !== panel.description && save({ description: desc })} className={cn(input, "h-auto py-2")} />
      </Row>
      <Row label="Couleur">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(panel.color) ? panel.color : "#5865f2"} onChange={(e) => save({ color: e.target.value })} aria-label="Couleur du panneau" className="h-9 w-14 cursor-pointer rounded-lg border border-[var(--panel-border)] bg-transparent" />
      </Row>
      <Row label="Bouton" hint="Utilisé quand le panneau n'a qu'une catégorie.">
        <TextField value={panel.buttonLabel} maxLength={80} onCommit={(v) => save({ buttonLabel: v })} />
      </Row>
      <Row label="Catégories" hint="Aucune cochée : toutes (5 boutons max).">
        <div className="flex flex-wrap gap-1.5">
          {cats.map((c) => {
            const on = panel.categoryIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleCat(c.id)}
                className={cn("rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors", on ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]" : "border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
              >
                {c.emoji} {c.name}
              </button>
            );
          })}
        </div>
      </Row>
      <Row label="Publier dans">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[12rem] flex-1">
            <ChannelPicker guildId={guildId} value={target} filterTypes={[0]} allowClear={false} placeholder="Choisir un salon" onChange={setTarget} />
          </div>
          <GhostButton onClick={() => onPublish(target)} disabled={!target || publishing}>
            {publishing ? "Publication…" : panel.messageId ? "Republier" : "Publier"}
          </GhostButton>
        </div>
      </Row>
      <div className="flex justify-end border-t border-[var(--panel-border)] px-5 py-3">
        <GhostButton onClick={onDelete}>Supprimer le panneau</GhostButton>
      </div>
    </div>
  );
}
