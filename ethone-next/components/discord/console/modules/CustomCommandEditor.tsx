"use client";

import { useState } from "react";
import { Plus, Trash2 } from "@/components/icons/ph";
import ChannelPicker from "../../ChannelPicker";
import { cn } from "@/lib/utils";
import { GhostButton, RoleChips, Row, Segmented, Stepper, Switch, useGuildApi } from "../kit";

export type Trigger = "slash" | "prefix" | "both";
type ArgType = "string" | "number" | "boolean" | "user" | "role" | "channel";
type Button = { label: string; url?: string; style: "link" | "primary" | "secondary" | "success" | "danger" };
type Response = { content?: string; embed?: { title?: string; description?: string; color?: string; footerText?: string; imageUrl?: string; thumbnailUrl?: string; fields?: unknown[] }; buttons?: Button[] };
export type Action = { type: "send_response" | "add_role" | "remove_role" | "delete_trigger" | "send_dm"; roleId?: string; response?: Response };
type CondType = "has_role" | "lacks_role" | "is_admin" | "channel_equals" | "arg_equals" | "arg_contains";
type Block = { condition: { type: CondType; targetId?: string; argName?: string; value?: string }; thenActions: Action[]; elseActions?: Action[] };
type Arg = { name: string; description: string; type: ArgType; required: boolean };
export type Command = {
  id: string;
  name: string;
  description: string;
  triggerType: Trigger;
  enabled: boolean;
  cooldownSeconds: number;
  requiredRoleIds: string[];
  arguments: Arg[];
  conditions: Block[];
  defaultActions: Action[];
  usageCount: number;
};

export const TRIGGERS: [Trigger, string][] = [
  ["both", "/ et préfixe"],
  ["slash", "/ seulement"],
  ["prefix", "Préfixe seulement"],
];
const ACTIONS: [Action["type"], string][] = [
  ["send_response", "Répondre"],
  ["send_dm", "Envoyer en MP"],
  ["add_role", "Donner un rôle"],
  ["remove_role", "Retirer un rôle"],
  ["delete_trigger", "Supprimer le message"],
];
const CONDITIONS: [CondType, string][] = [
  ["has_role", "a le rôle"],
  ["lacks_role", "n'a pas le rôle"],
  ["is_admin", "est administrateur"],
  ["channel_equals", "est dans le salon"],
  ["arg_equals", "l'argument vaut"],
  ["arg_contains", "l'argument contient"],
];
const ARG_TYPES: [ArgType, string][] = [
  ["string", "Texte"],
  ["number", "Nombre"],
  ["boolean", "Oui/non"],
  ["user", "Membre"],
  ["role", "Rôle"],
  ["channel", "Salon"],
];
const VARS = ["{user}", "{username}", "{display_name}", "{server}", "{member_count}", "{channel}", "{date}", "{time}"];
const field =
  "w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";
const small = "h-8 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";

/** Éditeur complet d'une commande personnalisée : réglages, arguments, conditions et actions, puis enregistrement unique. */
export default function CustomCommandEditor({ guildId, command, onSaved, footer }: { guildId: string; command: Command; onSaved: (c: Command) => void; footer?: React.ReactNode }) {
  const api = useGuildApi(guildId);
  const [c, setC] = useState<Command>(() => structuredClone(command));
  const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState<{ content: string | null; embed: { title?: string; description?: string } | null }[] | null>(null);
  const set = (patch: Partial<Command>) => setC((x) => ({ ...x, ...patch }));
  const dirty = JSON.stringify(c) !== JSON.stringify(command);

  const save = async () => {
    setBusy(true);
    const r = await api<{ command: Command }>(`/custom-commands/${c.id}`, {
      method: "PUT",
      json: { description: c.description, triggerType: c.triggerType, cooldownSeconds: c.cooldownSeconds, requiredRoleIds: c.requiredRoleIds, arguments: c.arguments, conditions: c.conditions, defaultActions: c.defaultActions },
    });
    setBusy(false);
    if (r?.command) {
      setC(structuredClone(r.command));
      onSaved(r.command);
    }
  };
  const test = async () => {
    const r = await api<{ previews: typeof previews }>(`/custom-commands/${c.id}/test`, { method: "POST", json: { args: {} } });
    if (r) setPreviews(r.previews ?? []);
  };

  return (
    <>
      <Row label="Description" hint="Affichée dans la liste des commandes / de Discord.">
        <input value={c.description} maxLength={100} onChange={(e) => set({ description: e.target.value })} aria-label="Description" className={`${field} h-9 py-0`} />
      </Row>
      <Row label="Déclenchement">
        <Segmented label="Déclenchement" value={c.triggerType} options={TRIGGERS} onChange={(v) => set({ triggerType: v })} />
      </Row>
      <Row label="Délai entre deux utilisations" hint="Par membre. 0 = aucun.">
        <Stepper value={c.cooldownSeconds} min={0} max={3600} step={5} unit="secondes" onCommit={(n) => set({ cooldownSeconds: n })} />
      </Row>
      <Row label="Rôles requis" hint="Vide : tout le monde.">
        <RoleChips guildId={guildId} ids={c.requiredRoleIds} onChange={(ids) => set({ requiredRoleIds: ids })} />
      </Row>

      <Row label="Arguments" hint="Valeurs saisies par le membre, utilisables avec {args.nom}.">
        <div className="space-y-1.5">
          {c.arguments.map((a, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1.5">
              <input
                value={a.name}
                maxLength={32}
                onChange={(e) => set({ arguments: c.arguments.map((x, j) => (j === i ? { ...x, name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") } : x)) })}
                placeholder="nom"
                aria-label="Nom de l'argument"
                className={`${small} w-28 font-mono`}
              />
              <select value={a.type} onChange={(e) => set({ arguments: c.arguments.map((x, j) => (j === i ? { ...x, type: e.target.value as ArgType } : x)) })} aria-label="Type" className={small}>
                {ARG_TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <input
                value={a.description}
                maxLength={100}
                onChange={(e) => set({ arguments: c.arguments.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })}
                placeholder="Description"
                aria-label="Description de l'argument"
                className={`${small} min-w-0 flex-1`}
              />
              <label className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                <Switch checked={a.required} onChange={(v) => set({ arguments: c.arguments.map((x, j) => (j === i ? { ...x, required: v } : x)) })} label="Obligatoire" />
                Obligatoire
              </label>
              <IconRemove label="Retirer l'argument" onClick={() => set({ arguments: c.arguments.filter((_, j) => j !== i) })} />
            </div>
          ))}
          {c.arguments.length < 10 && (
            <GhostButton onClick={() => set({ arguments: [...c.arguments, { name: `arg${c.arguments.length + 1}`, description: "", type: "string", required: false }] })}>
              <Plus className="h-3.5 w-3.5" /> Argument
            </GhostButton>
          )}
        </div>
      </Row>

      <div className="border-t border-[var(--panel-border)] px-5 py-3.5">
        <p className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">Conditions</p>
        <div className="space-y-2">
          {c.conditions.map((b, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-[var(--panel-border)] p-3">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-semibold text-[var(--text-muted)]">Si le membre</span>
                <select
                  value={b.condition.type}
                  onChange={(e) => set({ conditions: c.conditions.map((x, j) => (j === i ? { ...x, condition: { type: e.target.value as CondType } } : x)) })}
                  aria-label="Condition"
                  className={small}
                >
                  {CONDITIONS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <CondTarget guildId={guildId} block={b} args={c.arguments} onChange={(cond) => set({ conditions: c.conditions.map((x, j) => (j === i ? { ...x, condition: cond } : x)) })} />
                <span className="flex-1" />
                <IconRemove label="Retirer la condition" onClick={() => set({ conditions: c.conditions.filter((_, j) => j !== i) })} />
              </div>
              <p className="text-[11px] font-semibold text-[var(--success)]">Alors</p>
              <ActionList guildId={guildId} actions={b.thenActions} onChange={(a) => set({ conditions: c.conditions.map((x, j) => (j === i ? { ...x, thenActions: a } : x)) })} />
              <p className="text-[11px] font-semibold text-[var(--warning)]">Sinon</p>
              <ActionList guildId={guildId} actions={b.elseActions ?? []} onChange={(a) => set({ conditions: c.conditions.map((x, j) => (j === i ? { ...x, elseActions: a } : x)) })} />
            </div>
          ))}
          {c.conditions.length < 10 && (
            <GhostButton onClick={() => set({ conditions: [...c.conditions, { condition: { type: "has_role" }, thenActions: [{ type: "send_response", response: { content: "" } }], elseActions: [] }] })}>
              <Plus className="h-3.5 w-3.5" /> Condition
            </GhostButton>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--panel-border)] px-5 py-3.5">
        <p className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">{c.conditions.length ? "Ensuite, dans tous les cas" : "Actions"}</p>
        <ActionList guildId={guildId} actions={c.defaultActions} onChange={(a) => set({ defaultActions: a })} />
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">Variables : {VARS.join(" ")} et {"{args.nom}"}.</p>
      </div>

      {previews && (
        <div className="space-y-1.5 border-t border-[var(--panel-border)] px-5 py-3">
          <p className="text-[11px] font-semibold text-[var(--text-muted)]">Aperçu (avec un membre d&apos;exemple)</p>
          {previews.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">Aucune réponse à afficher.</p>
          ) : (
            previews.map((p, i) => (
              <div key={i} className="rounded-lg border-l-4 border-[var(--accent-primary)] bg-[var(--surface-hover)] px-3 py-2 text-xs text-[var(--text-primary)]">
                {p.content && <p className="whitespace-pre-wrap">{p.content}</p>}
                {p.embed?.title && <p className="font-semibold">{p.embed.title}</p>}
                {p.embed?.description && <p className="whitespace-pre-wrap text-[var(--text-muted)]">{p.embed.description}</p>}
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--panel-border)] px-5 py-3">
        <button type="button" disabled={!dirty || busy} onClick={save} className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
        {dirty && <GhostButton onClick={() => setC(structuredClone(command))}>Annuler les changements</GhostButton>}
        <GhostButton disabled={dirty} onClick={test}>
          Tester
        </GhostButton>
        <span className="flex-1" />
        {footer}
      </div>
    </>
  );
}

function IconRemove({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--danger)]">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

function CondTarget({ guildId, block, args, onChange }: { guildId: string; block: Block; args: Arg[]; onChange: (c: Block["condition"]) => void }) {
  const cond = block.condition;
  if (cond.type === "has_role" || cond.type === "lacks_role")
    return (
      <div className="min-w-40">
        <RoleChips guildId={guildId} ids={cond.targetId ? [cond.targetId] : []} max={1} onChange={(ids) => onChange({ ...cond, targetId: ids[0] })} />
      </div>
    );
  if (cond.type === "channel_equals") return <ChannelPicker guildId={guildId} value={cond.targetId ?? ""} filterTypes={[0, 5]} placeholder="Salon" onChange={(id) => onChange({ ...cond, targetId: id || undefined })} />;
  if (cond.type === "arg_equals" || cond.type === "arg_contains")
    return (
      <>
        <select value={cond.argName ?? ""} onChange={(e) => onChange({ ...cond, argName: e.target.value })} aria-label="Argument" className={small}>
          <option value="">argument…</option>
          {args.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
        <input value={cond.value ?? ""} maxLength={100} onChange={(e) => onChange({ ...cond, value: e.target.value })} placeholder="valeur" aria-label="Valeur" className={`${small} w-32`} />
      </>
    );
  return null;
}

/** Liste d'actions exécutées dans l'ordre. */
function ActionList({ guildId, actions, onChange }: { guildId: string; actions: Action[]; onChange: (a: Action[]) => void }) {
  const update = (i: number, a: Action) => onChange(actions.map((x, j) => (j === i ? a : x)));
  return (
    <div className="space-y-1.5">
      {actions.map((a, i) => (
        <div key={i} className="space-y-1.5 rounded-lg bg-[var(--surface-base,var(--bg-main))]/60 p-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              value={a.type}
              onChange={(e) => {
                const t = e.target.value as Action["type"];
                update(i, t === "send_response" || t === "send_dm" ? { type: t, response: a.response ?? { content: "" } } : t === "add_role" || t === "remove_role" ? { type: t, roleId: a.roleId } : { type: t });
              }}
              aria-label="Action"
              className={small}
            >
              {ACTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            {(a.type === "add_role" || a.type === "remove_role") && <RoleChips guildId={guildId} ids={a.roleId ? [a.roleId] : []} max={1} onChange={(ids) => update(i, { ...a, roleId: ids[0] })} />}
            <span className="flex-1" />
            <IconRemove label="Retirer l'action" onClick={() => onChange(actions.filter((_, j) => j !== i))} />
          </div>
          {a.type === "add_role" && <p className="text-[10px] text-[var(--text-muted)]">Les rôles avec des permissions de modération ou d&apos;administration ne sont jamais donnés.</p>}
          {(a.type === "send_response" || a.type === "send_dm") && <ResponseEditor response={a.response ?? {}} onChange={(r) => update(i, { ...a, response: r })} />}
        </div>
      ))}
      {actions.length < 10 && (
        <GhostButton onClick={() => onChange([...actions, { type: "send_response", response: { content: "" } }])}>
          <Plus className="h-3.5 w-3.5" /> Action
        </GhostButton>
      )}
    </div>
  );
}

function ResponseEditor({ response, onChange }: { response: Response; onChange: (r: Response) => void }) {
  const embed = response.embed;
  const buttons = response.buttons ?? [];
  return (
    <div className="space-y-1.5">
      <textarea value={response.content ?? ""} maxLength={2000} rows={2} onChange={(e) => onChange({ ...response, content: e.target.value || undefined })} placeholder="Texte du message" aria-label="Texte du message" className={field} />
      <label className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
        <Switch checked={!!embed} onChange={(v) => onChange({ ...response, embed: v ? { title: "", description: "", color: "#6366F1", fields: [] } : undefined })} label="Embed" />
        Embed
      </label>
      {embed && (
        <div className={cn("space-y-1.5 border-l-4 pl-2")} style={{ borderColor: embed.color || "#6366F1" }}>
          <div className="flex items-center gap-1.5">
            <input value={embed.title ?? ""} maxLength={256} onChange={(e) => onChange({ ...response, embed: { ...embed, title: e.target.value } })} placeholder="Titre" aria-label="Titre de l'embed" className={`${small} min-w-0 flex-1`} />
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(embed.color ?? "") ? embed.color : "#6366f1"} onChange={(e) => onChange({ ...response, embed: { ...embed, color: e.target.value } })} aria-label="Couleur" className="h-8 w-9 cursor-pointer rounded border border-[var(--panel-border)] bg-transparent" />
          </div>
          <textarea value={embed.description ?? ""} maxLength={4000} rows={3} onChange={(e) => onChange({ ...response, embed: { ...embed, description: e.target.value } })} placeholder="Description" aria-label="Description de l'embed" className={field} />
          <div className="flex flex-wrap gap-1.5">
            <input value={embed.footerText ?? ""} maxLength={200} onChange={(e) => onChange({ ...response, embed: { ...embed, footerText: e.target.value || undefined } })} placeholder="Pied de page" aria-label="Pied de page" className={`${small} min-w-0 flex-1`} />
            <input value={embed.imageUrl ?? ""} maxLength={500} onChange={(e) => onChange({ ...response, embed: { ...embed, imageUrl: e.target.value || undefined } })} placeholder="Image (https://…)" aria-label="Image" className={`${small} min-w-0 flex-1`} />
          </div>
        </div>
      )}
      {buttons.map((b, j) => (
        <div key={j} className="flex flex-wrap items-center gap-1.5">
          <input value={b.label} maxLength={80} onChange={(e) => onChange({ ...response, buttons: buttons.map((x, k) => (k === j ? { ...x, label: e.target.value } : x)) })} placeholder="Texte du bouton" aria-label="Texte du bouton" className={`${small} w-36`} />
          <input value={b.url ?? ""} maxLength={500} onChange={(e) => onChange({ ...response, buttons: buttons.map((x, k) => (k === j ? { ...x, url: e.target.value, style: "link" } : x)) })} placeholder="Lien https://…" aria-label="Lien du bouton" className={`${small} min-w-0 flex-1`} />
          <IconRemove label="Retirer le bouton" onClick={() => onChange({ ...response, buttons: buttons.filter((_, k) => k !== j) })} />
        </div>
      ))}
      {buttons.length < 5 && (
        <GhostButton onClick={() => onChange({ ...response, buttons: [...buttons, { label: "", url: "", style: "link" }] })}>
          <Plus className="h-3.5 w-3.5" /> Bouton lien
        </GhostButton>
      )}
    </div>
  );
}
