"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { confirmDialog } from "@/lib/confirmDialog";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, Segmented, StatTile, Switch, useGuildApi } from "../kit";
import CustomCommandEditor, { TRIGGERS, type Command, type Trigger } from "./CustomCommandEditor";

type Template = { name: string; description: string };

const MAX = 50;
const field =
  "w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";

/** Texte de la première réponse d'une commande, pour la liste. */
const replyOf = (c: Command) => {
  const a = c.defaultActions.find((x) => x.type === "send_response");
  return a?.response?.content || a?.response?.embed?.title || a?.response?.embed?.description || "";
};

/** Commandes personnalisées (format Keeper) : création rapide, modèles et éditeur complet (arguments, conditions, actions). */
export default function ConsoleCustomCommands({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [list, setList] = useState<Command[] | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [open, setOpen] = useState<string | null>(null);
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

  const replace = (c: Command) => setList((l) => l?.map((x) => (x.id === c.id ? c : x)) ?? null);
  const toggle = async (c: Command, enabled: boolean) => {
    replace({ ...c, enabled });
    const r = await api<{ command: Command }>(`/custom-commands/${c.id}/toggle`, { method: "POST", json: { enabled } });
    if (r?.command) replace(r.command);
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
      setOpen(r.command.id);
    }
  };
  const fromTemplate = async (t: Template) => {
    const r = await api<{ command: Command }>("/custom-commands/from-template", { method: "POST", json: { templateName: t.name } });
    if (r?.command) {
      setList((l) => [...(l ?? []), r.command]);
      setOpen(r.command.id);
    }
  };
  const duplicate = async (c: Command) => {
    const r = await api<{ command: Command }>(`/custom-commands/${c.id}/duplicate`, { method: "POST" });
    if (r?.command) setList((l) => [...(l ?? []), r.command]);
  };
  const remove = async (c: Command) => {
    if (!(await confirmDialog(`Supprimer la commande « ${c.name} » ?`, { title: "Supprimer", confirmLabel: "Supprimer" }))) return;
    if (await api(`/custom-commands/${c.id}`, { method: "DELETE" })) {
      setList((l) => l?.filter((x) => x.id !== c.id) ?? null);
      setOpen(null);
    }
  };

  const commands = list ?? [];
  const validName = /^[a-z0-9_-]{1,32}$/.test(name.trim().toLowerCase());
  const taken = commands.some((c) => c.name === name.trim().toLowerCase());

  return (
    <ConsolePage title="Commandes personnalisées">
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Commandes" value={list ? commands.length : "—"} hint={`${MAX} au maximum`} />
        <StatTile label="Actives" value={list ? commands.filter((c) => c.enabled).length : "—"} />
        <StatTile label="Utilisations" value={list ? commands.reduce((n, c) => n + (c.usageCount || 0), 0).toLocaleString("fr-FR") : "—"} />
      </motion.div>

      <Panel title="Nouvelle commande" subtitle="Commence par une réponse simple : conditions, embeds, boutons et rôles s'ajoutent ensuite dans la commande.">
        <Row label="Nom" hint="Minuscules, chiffres, - et _.">
          <input value={name} maxLength={32} onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="regles" aria-label="Nom de la commande" className={`${field} h-9 max-w-xs py-0 font-mono`} />
          {taken && <p className="mt-1 text-[11px] text-[var(--warning)]">Ce nom existe déjà.</p>}
        </Row>
        <Row label="Réponse">
          <textarea value={reply} maxLength={2000} rows={3} onChange={(e) => setReply(e.target.value)} aria-label="Réponse" className={field} />
        </Row>
        <Row label="Déclenchement">
          <Segmented label="Déclenchement" value={trigger} options={TRIGGERS} onChange={setTrigger} />
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
                  <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id} className="min-w-0 flex-1 text-left">
                    <p className="truncate font-mono text-[13px] font-semibold text-[var(--text-primary)]">/{c.name}</p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                      {c.usageCount || 0}× · {TRIGGERS.find(([t]) => t === c.triggerType)?.[1]}
                      {c.conditions.length ? ` · ${c.conditions.length} condition(s)` : ""}
                      {replyOf(c) ? ` · ${replyOf(c)}` : ""}
                    </p>
                  </button>
                  <Switch checked={c.enabled} onChange={(v) => toggle(c, v)} label={`Activer /${c.name}`} />
                </div>
                <AnimatePresence initial={false}>
                  {open === c.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
                      <div className="border-t border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40">
                        <CustomCommandEditor
                          key={c.id}
                          guildId={guildId}
                          command={c}
                          onSaved={replace}
                          footer={
                            <>
                              <GhostButton disabled={commands.length >= MAX} onClick={() => duplicate(c)}>
                                Dupliquer
                              </GhostButton>
                              <GhostButton onClick={() => remove(c)}>Supprimer</GhostButton>
                            </>
                          }
                        />
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
