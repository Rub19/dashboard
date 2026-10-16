"use client";

import { useState } from "react";
import { Plus, Trash2 } from "@/components/icons/ph";
import ChannelPicker from "../../ChannelPicker";
import { cn } from "@/lib/utils";
import { GhostButton, RoleChips, Row, Segmented, Select, Stepper, Switch, useGuildApi } from "../kit";
import { tx } from "@/lib/tx";

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
  const [previews, setPreviews] = useState<{ content: string | null; embed: { title?: string; description?: string; color?: number | string; footer?: { text?: string } } | null; buttons?: boolean }[] | null>(null);
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
    setBusy(true);
    if (dirty) {
      const r = await api<{ command: Command }>(`/custom-commands/${c.id}`, {
        method: "PUT",
        json: { description: c.description, triggerType: c.triggerType, cooldownSeconds: c.cooldownSeconds, requiredRoleIds: c.requiredRoleIds, arguments: c.arguments, conditions: c.conditions, defaultActions: c.defaultActions },
      });
      if (r?.command) {
        setC(structuredClone(r.command));
        onSaved(r.command);
      }
    }
    const res = await api<{ previews: typeof previews }>(`/custom-commands/${c.id}/test`, { method: "POST", json: { args: {} } });
    setBusy(false);
    if (res) setPreviews(res.previews ?? []);
  };

  return (
    <>
      <Row label={tx("Description")} hint={tx("Affichée dans la liste des commandes / de Discord.")}>
        <input value={c.description} maxLength={100} onChange={(e) => set({ description: e.target.value })} aria-label={tx("Description")} className={`${field} h-9 py-0`} />
      </Row>
      <Row label={tx("Déclenchement")}>
        <Segmented label={tx("Déclenchement")} value={c.triggerType} options={TRIGGERS} onChange={(v) => set({ triggerType: v })} />
      </Row>
      <Row label={tx("Délai entre deux utilisations")} hint={tx("Par membre. 0 = aucun.")}>
        <Stepper value={c.cooldownSeconds} min={0} max={3600} step={5} unit="secondes" onCommit={(n) => set({ cooldownSeconds: n })} />
      </Row>
      <Row label={tx("Rôles requis")} hint={tx("Vide : tout le monde.")}>
        <RoleChips guildId={guildId} ids={c.requiredRoleIds} onChange={(ids) => set({ requiredRoleIds: ids })} />
      </Row>

      <Row label={tx("Arguments")} hint={tx("Valeurs saisies par le membre, utilisables avec {args.nom}.")}>
        <div className="space-y-1.5">
          {c.arguments.map((a, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1.5">
              <input
                value={a.name}
                maxLength={32}
                onChange={(e) => set({ arguments: c.arguments.map((x, j) => (j === i ? { ...x, name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") } : x)) })}
                placeholder="nom"
                aria-label={tx("Nom de l'argument")}
                className={`${small} w-28 font-mono`}
              />
              <Select
                value={a.type}
                options={ARG_TYPES}
                onChange={(v) => set({ arguments: c.arguments.map((x, j) => (j === i ? { ...x, type: v as ArgType } : x)) })}
                aria-label={tx("Type")}
                size="sm"
              />
              <input
                value={a.description}
                maxLength={100}
                onChange={(e) => set({ arguments: c.arguments.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })}
                placeholder={tx("Description")}
                aria-label={tx("Description de l'argument")}
                className={`${small} min-w-0 flex-1`}
              />
              <label className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                <Switch checked={a.required} onChange={(v) => set({ arguments: c.arguments.map((x, j) => (j === i ? { ...x, required: v } : x)) })} label={tx("Obligatoire")} />
                {tx("Obligatoire")}
              </label>
              <IconRemove label={tx("Retirer l'argument")} onClick={() => set({ arguments: c.arguments.filter((_, j) => j !== i) })} />
            </div>
          ))}
          {c.arguments.length < 10 && (
            <GhostButton onClick={() => set({ arguments: [...c.arguments, { name: `arg${c.arguments.length + 1}`, description: "", type: "string", required: false }] })}>
              <Plus className="h-3.5 w-3.5" /> {" "}{tx("Argument")}
            </GhostButton>
          )}
        </div>
      </Row>

      <div className="border-t border-[var(--panel-border)] px-5 py-3.5">
        <p className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">{tx("Conditions")}</p>
        <div className="space-y-2">
          {c.conditions.map((b, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-[var(--panel-border)] p-3">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-semibold text-[var(--text-muted)]">{tx("Si le membre")}</span>
                <Select
                  value={b.condition.type}
                  options={CONDITIONS}
                  onChange={(v) => set({ conditions: c.conditions.map((x, j) => (j === i ? { ...x, condition: { type: v as CondType } } : x)) })}
                  aria-label={tx("Condition")}
                  size="sm"
                />
                <CondTarget guildId={guildId} block={b} args={c.arguments} onChange={(cond) => set({ conditions: c.conditions.map((x, j) => (j === i ? { ...x, condition: cond } : x)) })} />
                <span className="flex-1" />
                <IconRemove label={tx("Retirer la condition")} onClick={() => set({ conditions: c.conditions.filter((_, j) => j !== i) })} />
              </div>
              <p className="text-[11px] font-semibold text-[var(--success)]">{tx("Alors")}</p>
              <ActionList guildId={guildId} actions={b.thenActions} onChange={(a) => set({ conditions: c.conditions.map((x, j) => (j === i ? { ...x, thenActions: a } : x)) })} />
              <p className="text-[11px] font-semibold text-[var(--warning)]">{tx("Sinon")}</p>
              <ActionList guildId={guildId} actions={b.elseActions ?? []} onChange={(a) => set({ conditions: c.conditions.map((x, j) => (j === i ? { ...x, elseActions: a } : x)) })} />
            </div>
          ))}
          {c.conditions.length < 10 && (
            <GhostButton onClick={() => set({ conditions: [...c.conditions, { condition: { type: "has_role" }, thenActions: [{ type: "send_response", response: { content: "" } }], elseActions: [] }] })}>
              <Plus className="h-3.5 w-3.5" /> {" "}{tx("Condition")}
            </GhostButton>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--panel-border)] px-5 py-3.5">
        <p className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">{c.conditions.length ? tx("Ensuite, dans tous les cas") : tx("Actions")}</p>
        <ActionList guildId={guildId} actions={c.defaultActions} onChange={(a) => set({ defaultActions: a })} />
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">{tx("Variables :")}{" "} {VARS.join(" ")} {" "}{tx("et")}{" "} {tx("{args.nom}")}.</p>
      </div>

      {previews && (
        <div className="space-y-2 border-t border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[var(--text-primary)]">{tx("Rendu simulé de la commande (Discord)")}</p>
            <GhostButton onClick={() => setPreviews(null)}>{tx("Fermer l'aperçu")}</GhostButton>
          </div>
          {previews.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">{tx("Aucune réponse à afficher.")}</p>
          ) : (
            previews.map((p, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-hover)] p-3">
                {p.content && <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">{p.content}</p>}
                {p.embed && (
                  <div
                    className="space-y-1.5 rounded-lg border-l-4 bg-[var(--surface-base,var(--bg-main))] p-3"
                    style={{
                      borderColor: p.embed.color
                        ? typeof p.embed.color === "number"
                          ? `#${p.embed.color.toString(16).padStart(6, "0")}`
                          : p.embed.color
                        : "var(--accent-primary)",
                    }}
                  >
                    {p.embed.title && <p className="text-sm font-bold text-[var(--text-primary)]">{p.embed.title}</p>}
                    {p.embed.description && <p className="whitespace-pre-wrap text-xs text-[var(--text-muted)]">{p.embed.description}</p>}
                    {p.embed.footer?.text && <p className="pt-1 text-[11px] text-[var(--text-muted)] opacity-75">{p.embed.footer.text}</p>}
                  </div>
                )}
                {p.buttons && (
                  <div className="flex items-center gap-2 pt-1 text-xs font-semibold text-[var(--accent-primary)]">
                    <span>{tx("🔘 Boutons interactifs inclus")}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--panel-border)] px-5 py-3">
        <button type="button" disabled={!dirty || busy} onClick={save} className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
          {busy ? tx("Enregistrement…") : tx("Enregistrer")}
        </button>
        {dirty && <GhostButton onClick={() => setC(structuredClone(command))}>{tx("Annuler les changements")}</GhostButton>}
        <GhostButton disabled={busy} onClick={test}>
          {busy ? tx("Test en cours…") : tx("Tester la commande")}
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
  if (cond.type === "channel_equals") return <ChannelPicker guildId={guildId} value={cond.targetId ?? ""} filterTypes={[0, 5]} placeholder={tx("Salon")} onChange={(id) => onChange({ ...cond, targetId: id || undefined })} />;
  if (cond.type === "arg_equals" || cond.type === "arg_contains")
    return (
      <>
        <Select
          value={cond.argName ?? ""}
          options={[["", "argument…"], ...args.map((a) => [a.name, a.name] as const)]}
          onChange={(v) => onChange({ ...cond, argName: v })}
          aria-label={tx("Argument")}
          size="sm"
        />
        <input value={cond.value ?? ""} maxLength={100} onChange={(e) => onChange({ ...cond, value: e.target.value })} placeholder="valeur" aria-label={tx("Valeur")} className={`${small} w-32`} />
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
            <Select
              value={a.type}
              options={ACTIONS}
              onChange={(t) => {
                const actType = t as Action["type"];
                update(i, actType === "send_response" || actType === "send_dm" ? { type: actType, response: a.response ?? { content: "" } } : actType === "add_role" || actType === "remove_role" ? { type: actType, roleId: a.roleId } : { type: actType });
              }}
              aria-label={tx("Action")}
              size="sm"
            />
            {(a.type === "add_role" || a.type === "remove_role") && <RoleChips guildId={guildId} ids={a.roleId ? [a.roleId] : []} max={1} onChange={(ids) => update(i, { ...a, roleId: ids[0] })} />}
            <span className="flex-1" />
            <IconRemove label={tx("Retirer l'action")} onClick={() => onChange(actions.filter((_, j) => j !== i))} />
          </div>
          {a.type === "add_role" && <p className="text-[10px] text-[var(--text-muted)]">{tx("Les rôles avec des permissions de modération ou d'administration ne sont jamais donnés.")}</p>}
          {(a.type === "send_response" || a.type === "send_dm") && <ResponseEditor response={a.response ?? {}} onChange={(r) => update(i, { ...a, response: r })} />}
        </div>
      ))}
      {actions.length < 10 && (
        <GhostButton onClick={() => onChange([...actions, { type: "send_response", response: { content: "" } }])}>
          <Plus className="h-3.5 w-3.5" /> {" "}{tx("Action")}
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
      <textarea value={response.content ?? ""} maxLength={2000} rows={2} onChange={(e) => onChange({ ...response, content: e.target.value || undefined })} placeholder={tx("Texte du message")} aria-label={tx("Texte du message")} className={field} />
      <label className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
        <Switch checked={!!embed} onChange={(v) => onChange({ ...response, embed: v ? { title: "", description: "", color: "#6366F1", fields: [] } : undefined })} label={tx("Embed")} />
        {tx("Embed")}
      </label>
      {embed && (
        <div className={cn("space-y-1.5 border-l-4 pl-2")} style={{ borderColor: embed.color || "#6366F1" }}>
          <div className="flex items-center gap-1.5">
            <input value={embed.title ?? ""} maxLength={256} onChange={(e) => onChange({ ...response, embed: { ...embed, title: e.target.value } })} placeholder={tx("Titre")} aria-label={tx("Titre de l'embed")} className={`${small} min-w-0 flex-1`} />
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(embed.color ?? "") ? embed.color : "#6366f1"} onChange={(e) => onChange({ ...response, embed: { ...embed, color: e.target.value } })} aria-label={tx("Couleur")} className="h-8 w-9 cursor-pointer rounded border border-[var(--panel-border)] bg-transparent" />
          </div>
          <textarea value={embed.description ?? ""} maxLength={4000} rows={3} onChange={(e) => onChange({ ...response, embed: { ...embed, description: e.target.value } })} placeholder={tx("Description")} aria-label={tx("Description de l'embed")} className={field} />
          <div className="flex flex-wrap gap-1.5">
            <input value={embed.footerText ?? ""} maxLength={200} onChange={(e) => onChange({ ...response, embed: { ...embed, footerText: e.target.value || undefined } })} placeholder={tx("Pied de page")} aria-label={tx("Pied de page")} className={`${small} min-w-0 flex-1`} />
            <input value={embed.imageUrl ?? ""} maxLength={500} onChange={(e) => onChange({ ...response, embed: { ...embed, imageUrl: e.target.value || undefined } })} placeholder={tx("Image (https://…)")} aria-label={tx("Image")} className={`${small} min-w-0 flex-1`} />
          </div>
        </div>
      )}
      {buttons.map((b, j) => (
        <div key={j} className="flex flex-wrap items-center gap-1.5">
          <input value={b.label} maxLength={80} onChange={(e) => onChange({ ...response, buttons: buttons.map((x, k) => (k === j ? { ...x, label: e.target.value } : x)) })} placeholder={tx("Texte du bouton")} aria-label={tx("Texte du bouton")} className={`${small} w-36`} />
          <input value={b.url ?? ""} maxLength={500} onChange={(e) => onChange({ ...response, buttons: buttons.map((x, k) => (k === j ? { ...x, url: e.target.value, style: "link" } : x)) })} placeholder={tx("Lien https://…")} aria-label={tx("Lien du bouton")} className={`${small} min-w-0 flex-1`} />
          <IconRemove label={tx("Retirer le bouton")} onClick={() => onChange({ ...response, buttons: buttons.filter((_, k) => k !== j) })} />
        </div>
      ))}
      {buttons.length < 5 && (
        <GhostButton onClick={() => onChange({ ...response, buttons: [...buttons, { label: "", url: "", style: "link" }] })}>
          <Plus className="h-3.5 w-3.5" /> {" "}{tx("Bouton lien")}
        </GhostButton>
      )}
    </div>
  );
}
