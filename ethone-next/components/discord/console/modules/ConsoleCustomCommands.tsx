"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { confirmDialog } from "@/lib/confirmDialog";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, GhostButton, Panel, RoleChips, Row, Segmented, StatTile, Stepper, Switch, TextField, useGuildApi } from "../kit";

type Trigger = "slash" | "prefix" | "both";
type Action = { type: string; response?: { content?: string; embed?: { title?: string; description?: string } } };
type Command = {
  id: string;
  name: string;
  description: string;
  triggerType: Trigger;
  enabled: boolean;
  cooldownSeconds: number;
  requiredRoleIds: string[];
  conditions: unknown[];
  defaultActions: Action[];
  usageCount: number;
};
type Template = { name: string; description: string };

const TRIGGER: [Trigger, string][] = [
  ["both", "/ et préfixe"],
  ["slash", "/ seulement"],
  ["prefix", "Préfixe seulement"],
];
const MAX = 50;
const field =
  "w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";

/** Texte de la première réponse d'une commande (ce que la liste affiche et ce que l'éditeur rapide modifie). */
const replyOf = (c: Command) => {
  const a = c.defaultActions.find((x) => x.type === "send_response");
  return a?.response?.content ?? a?.response?.embed?.description ?? "";
};
/** Commande simple : une seule réponse texte, sans conditions ni autre action (modifiable ici). */
const isSimple = (c: Command) => c.conditions.length === 0 && c.defaultActions.length === 1 && c.defaultActions[0].type === "send_response" && !c.defaultActions[0].response?.embed;

/** Commandes personnalisées (format Keeper) : réponses rapides créées en quelques secondes, éditeur avancé pour le reste. */
export default function ConsoleCustomCommands({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [list, setList] = useState<Command[] | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState("");
  const [reply, setReply] = useState("");
  const [trigger, setTrigger] = useState<Trigger>("both");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api<{ commands: Command[] }>("/custom-commands/list");
    setList(r?.commands ?? []);
  }, [api]);
  useEffect(() => {
    void load();
    api<{ templates: Template[] }>("/custom-commands/templates", { silent: true }).then((r) => setTemplates(r?.templates ?? []));
  }, [api, load]);

  const replace = (c?: Command) => c && setList((l) => l?.map((x) => (x.id === c.id ? c : x)) ?? null);
  const update = async (c: Command, patch: Partial<Command>) => {
    setList((l) => l?.map((x) => (x.id === c.id ? { ...x, ...patch } : x)) ?? null);
    const r = await api<{ command: Command }>(`/custom-commands/${c.id}`, { method: "PUT", json: patch });
    if (r) replace(r.command);
    else void load();
  };
  const create = async () => {
    setBusy(true);
    const r = await api<{ command: Command }>("/custom-commands/create", {
      method: "POST",
      json: { name: name.trim().toLowerCase(), description: reply.trim().slice(0, 90) || "Commande personnalisée", triggerType: trigger, defaultActions: [{ type: "send_response", response: { content: reply.trim() } }] },
    });
    setBusy(false);
    if (r?.command) {
      setList((l) => [...(l ?? []), r.command]);
      setName("");
      setReply("");
    }
  };
  const fromTemplate = async (t: Template) => {
    const r = await api<{ command: Command }>("/custom-commands/from-template", { method: "POST", json: { templateName: t.name } });
    if (r?.command) setList((l) => [...(l ?? []), r.command]);
  };
  const duplicate = async (c: Command) => {
    const r = await api<{ command: Command }>(`/custom-commands/${c.id}/duplicate`, { method: "POST" });
    if (r?.command) setList((l) => [...(l ?? []), r.command]);
  };
  const remove = async (c: Command) => {
    if (!(await confirmDialog(`Supprimer la commande « ${c.name} » ?`, { title: "Supprimer", confirmLabel: "Supprimer" }))) return;
    if (await api(`/custom-commands/${c.id}`, { method: "DELETE" })) setList((l) => l?.filter((x) => x.id !== c.id) ?? null);
  };

  const commands = list ?? [];
  const validName = /^[a-z0-9_-]{1,32}$/.test(name.trim().toLowerCase());
  const taken = commands.some((c) => c.name === name.trim().toLowerCase());

  return (
    <ConsolePage
      title="Commandes personnalisées"
      actions={
        <Link href={`/discord/commands?guildId=${guildId}`} className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
          Éditeur avancé
        </Link>
      }
    >
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Commandes" value={list ? commands.length : "—"} hint={`${MAX} au maximum`} />
        <StatTile label="Actives" value={list ? commands.filter((c) => c.enabled).length : "—"} />
        <StatTile label="Utilisations" value={list ? commands.reduce((n, c) => n + (c.usageCount || 0), 0).toLocaleString("fr-FR") : "—"} />
      </motion.div>

      <Panel title="Nouvelle commande" subtitle="Une réponse simple. Conditions, rôles donnés, boutons et embeds : éditeur avancé.">
        <Row label="Nom" hint="Minuscules, chiffres, - et _.">
          <input value={name} maxLength={32} onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="regles" aria-label="Nom de la commande" className={`${field} h-9 max-w-xs py-0 font-mono`} />
          {taken && <p className="mt-1 text-[11px] text-[var(--warning)]">Ce nom existe déjà.</p>}
        </Row>
        <Row label="Réponse">
          <textarea value={reply} maxLength={2000} rows={3} onChange={(e) => setReply(e.target.value)} aria-label="Réponse" className={field} />
        </Row>
        <Row label="Déclenchement">
          <Segmented label="Déclenchement" value={trigger} options={TRIGGER} onChange={setTrigger} />
        </Row>
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--panel-border)] px-5 py-3">
          {templates.length > 0 && <span className="text-[11px] text-[var(--text-muted)]">Modèles :</span>}
          {templates.slice(0, 6).map((t) => (
            <GhostButton key={t.name} disabled={commands.length >= MAX} onClick={() => fromTemplate(t)}>
              /{t.name}
            </GhostButton>
          ))}
          <span className="flex-1" />
          <button type="button" disabled={!validName || taken || !reply.trim() || busy || commands.length >= MAX} onClick={create} className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
            Créer la commande
          </button>
        </div>
      </Panel>

      <Panel title="Commandes du serveur">
        {!list ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : commands.length === 0 ? (
          <EmptyLine>Aucune commande personnalisée.</EmptyLine>
        ) : (
          <ul>
            {commands.map((c) => (
              <li key={c.id} className="border-t border-[var(--panel-border)] first:border-t-0">
                <div className="flex items-center gap-3 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(open === c.id ? null : c.id);
                      setDraft(replyOf(c));
                    }}
                    aria-expanded={open === c.id}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate font-mono text-[13px] font-semibold text-[var(--text-primary)]">/{c.name}</p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                      {c.usageCount || 0}× · {TRIGGER.find(([t]) => t === c.triggerType)?.[1]}
                      {isSimple(c) ? ` · ${replyOf(c)}` : " · commande avancée"}
                    </p>
                  </button>
                  <Switch checked={c.enabled} onChange={(v) => update(c, { enabled: v })} label={`Activer /${c.name}`} />
                </div>
                <AnimatePresence initial={false}>
                  {open === c.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
                      <div className="border-t border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40">
                        <Row label="Description" hint="Affichée dans la liste des commandes / de Discord.">
                          <TextField value={c.description} maxLength={100} width="w-full" onCommit={(v) => update(c, { description: v })} />
                        </Row>
                        {isSimple(c) ? (
                          <Row label="Réponse">
                            <textarea
                              value={draft}
                              maxLength={2000}
                              rows={3}
                              onChange={(e) => setDraft(e.target.value)}
                              onBlur={() => draft.trim() && draft !== replyOf(c) && update(c, { defaultActions: [{ type: "send_response", response: { content: draft.trim() } }] })}
                              aria-label="Réponse"
                              className={field}
                            />
                          </Row>
                        ) : (
                          <Row label="Réponse">
                            <p className="text-xs text-[var(--text-muted)]">Commande avec conditions, embed ou plusieurs actions : modifie-la dans l&apos;éditeur avancé.</p>
                          </Row>
                        )}
                        <Row label="Déclenchement">
                          <Segmented label="Déclenchement" value={c.triggerType} options={TRIGGER} onChange={(v) => update(c, { triggerType: v })} />
                        </Row>
                        <Row label="Délai entre deux utilisations" hint="Par membre. 0 = aucun.">
                          <Stepper value={c.cooldownSeconds} min={0} max={3600} step={5} unit="secondes" onCommit={(n) => update(c, { cooldownSeconds: n })} />
                        </Row>
                        <Row label="Rôles requis" hint="Vide : tout le monde.">
                          <RoleChips guildId={guildId} ids={c.requiredRoleIds} onChange={(ids) => update(c, { requiredRoleIds: ids })} />
                        </Row>
                        <div className="flex items-center gap-1.5 border-t border-[var(--panel-border)] px-5 py-3">
                          <GhostButton disabled={commands.length >= MAX} onClick={() => duplicate(c)}>
                            Dupliquer
                          </GhostButton>
                          <span className="flex-1" />
                          <GhostButton onClick={() => remove(c)}>Supprimer</GhostButton>
                        </div>
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
