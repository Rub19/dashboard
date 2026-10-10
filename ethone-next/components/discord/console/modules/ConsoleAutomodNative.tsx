"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChannelPicker, { fetchGuildChannels, type ChannelOption } from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { ChannelAdder, Chip, ConsolePage, EmptyLine, GhostButton, Panel, RoleChips, Row, Segmented, Stepper, Switch, useGuildApi } from "../kit";

type Trigger = "keyword" | "spam" | "keyword_preset" | "mention_spam" | "member_profile";
type Action = { type: "block_message" | "send_alert" | "timeout" | "block_member_interaction"; channelId?: string; durationSeconds?: number; customMessage?: string };
type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: Trigger | "unknown";
  triggerMetadata: { keywordFilter: string[]; regexPatterns: string[]; allowList: string[]; presets: string[]; mentionTotalLimit: number | null; mentionRaidProtectionEnabled: boolean };
  actions: Action[];
  exemptRoles: string[];
  exemptChannels: string[];
};
/** Brouillon envoyé au bot (même forme que son schéma de règle). */
type Draft = {
  name: string;
  triggerType: Trigger;
  keywords: string[];
  regexPatterns: string[];
  allowList: string[];
  presets: string[];
  mentionTotalLimit: number;
  mentionRaidProtection: boolean;
  actions: Action[];
  exemptRoles: string[];
  exemptChannels: string[];
};

const TRIGGER: Record<Trigger | "unknown", string> = {
  keyword: "Mots-clés",
  spam: "Spam suspect",
  keyword_preset: "Listes prédéfinies",
  mention_spam: "Spam de mentions",
  member_profile: "Profil des membres",
  unknown: "Autre",
};
const TRIGGER_HINT: Record<Trigger, string> = {
  keyword: "Bloque les messages contenant certains mots ou expressions.",
  spam: "Discord détecte lui-même les messages ressemblant à du spam.",
  keyword_preset: "Listes gérées par Discord : grossièretés, contenu sexuel, insultes.",
  mention_spam: "Bloque les messages avec trop de mentions.",
  member_profile: "Vérifie les pseudos et profils des membres.",
};
const QUOTA: Record<Trigger, number> = { keyword: 6, spam: 1, keyword_preset: 1, mention_spam: 1, member_profile: 1 };
const ACTION: Record<Action["type"], string> = { block_message: "bloque le message", send_alert: "alerte le staff", timeout: "exclut temporairement", block_member_interaction: "bloque le membre" };
const PRESET: [string, string][] = [
  ["profanity", "Grossièretés"],
  ["sexual_content", "Contenu sexuel"],
  ["slurs", "Insultes"],
];
const TIMEOUTS: [number, string][] = [
  [60, "1 min"],
  [600, "10 min"],
  [3600, "1 h"],
  [86400, "1 j"],
  [604800, "7 j"],
];
const field =
  "w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";
const lines = (s: string) => s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);

const emptyDraft = (t: Trigger): Draft => ({
  name: TRIGGER[t],
  triggerType: t,
  keywords: [],
  regexPatterns: [],
  allowList: [],
  presets: t === "keyword_preset" ? ["profanity", "slurs"] : [],
  mentionTotalLimit: 5,
  mentionRaidProtection: true,
  actions: t === "member_profile" ? [{ type: "block_member_interaction" }] : [{ type: "block_message" }],
  exemptRoles: [],
  exemptChannels: [],
});
const toDraft = (r: Rule): Draft => ({
  name: r.name,
  triggerType: r.triggerType === "unknown" ? "keyword" : r.triggerType,
  keywords: r.triggerMetadata.keywordFilter,
  regexPatterns: r.triggerMetadata.regexPatterns ?? [],
  allowList: r.triggerMetadata.allowList ?? [],
  presets: r.triggerMetadata.presets,
  mentionTotalLimit: r.triggerMetadata.mentionTotalLimit ?? 5,
  mentionRaidProtection: r.triggerMetadata.mentionRaidProtectionEnabled,
  actions: r.actions,
  exemptRoles: r.exemptRoles,
  exemptChannels: r.exemptChannels,
});

/** AutoMod Discord (format Keeper) : règles exécutées par Discord lui-même, même si Etho est hors ligne. Création et modification ici. */
export default function ConsoleAutomodNative({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [alertChannel, setAlertChannel] = useState("");
  const [editing, setEditing] = useState<string | null>(null); // id de règle, ou "new"
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ rules: Rule[] }>("/automod-native");
    setRules(r?.rules ?? []);
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (rule: Rule, enabled: boolean) => {
    setRules((l) => l?.map((x) => (x.id === rule.id ? { ...x, enabled } : x)) ?? null);
    if (!(await api(`/automod-native/${rule.id}/toggle`, { method: "PATCH", json: { enabled } }))) void load();
  };
  const remove = async (rule: Rule) => {
    if (!(await confirmDialog(`Supprimer la règle Discord « ${rule.name} » ?`, { title: "Supprimer", confirmLabel: "Supprimer" }))) return;
    if (await api(`/automod-native/${rule.id}`, { method: "DELETE" })) {
      setEditing(null);
      void load();
    }
  };
  const recommended = async () => {
    setBusy("rec");
    const r = await api<{ created: unknown[]; skipped: { name: string; reason: string }[] }>("/automod-native/recommended", { method: "POST", json: { alertChannelId: alertChannel || undefined } });
    setBusy(null);
    if (r) {
      setNote(`${r.created.length} règle(s) créée(s).${r.skipped.map((x) => ` ${x.name} : ${x.reason}`).join("")}`);
      void load();
    }
  };
  const saved = () => {
    setEditing(null);
    void load();
  };

  const summary = (r: Rule) => {
    const md = r.triggerMetadata;
    const what =
      r.triggerType === "keyword" || r.triggerType === "member_profile"
        ? `${md.keywordFilter.length} mot(s)-clé(s)${md.regexPatterns?.length ? `, ${md.regexPatterns.length} expression(s)` : ""}`
        : r.triggerType === "keyword_preset"
          ? md.presets.map((p) => PRESET.find(([k]) => k === p)?.[1].toLowerCase() ?? p).join(", ")
          : r.triggerType === "mention_spam"
            ? `plus de ${md.mentionTotalLimit ?? "?"} mentions${md.mentionRaidProtectionEnabled ? ", anti-raid" : ""}`
            : TRIGGER[r.triggerType];
    const how = r.actions.map((a) => ACTION[a.type] ?? a.type).join(", ");
    return `${what}${how ? ` · ${how}` : ""}${r.exemptRoles.length + r.exemptChannels.length ? ` · ${r.exemptRoles.length + r.exemptChannels.length} exception(s)` : ""}`;
  };
  const used = (t: Trigger) => (rules ?? []).filter((r) => r.triggerType === t).length;

  return (
    <ConsolePage
      title="AutoMod Discord"
      actions={
        <GhostButton disabled={editing === "new"} onClick={() => setEditing("new")}>
          Nouvelle règle
        </GhostButton>
      }
    >
      <AnimatePresence initial={false}>
        {editing === "new" && rules && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
            <Panel title="Nouvelle règle">
              <RuleEditor guildId={guildId} used={used} onCancel={() => setEditing(null)} onSaved={saved} />
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      <Panel title="Règles recommandées" subtitle="Grossièretés, contenu sexuel, insultes, spam et raids de mentions, bloqués par Discord avant même d'être publiés.">
        <Row label="Salon d'alerte" hint="Facultatif : Discord y signale chaque message bloqué.">
          <div className="flex flex-wrap items-center gap-2">
            <ChannelPicker guildId={guildId} value={alertChannel} filterTypes={[0]} placeholder="Aucun" onChange={(id) => setAlertChannel(id)} />
            <GhostButton disabled={busy === "rec"} onClick={recommended}>
              {busy === "rec" ? "Création…" : "Créer les règles recommandées"}
            </GhostButton>
          </div>
        </Row>
      </Panel>

      {note && (
        <Panel>
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <p className="text-xs text-[var(--text-primary)]">{note}</p>
            <GhostButton onClick={() => setNote(null)}>OK</GhostButton>
          </div>
        </Panel>
      )}

      <Panel title="Règles du serveur" subtitle="Discord limite : 6 règles Mots-clés, 1 de chaque autre type.">
        {!rules ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : rules.length === 0 ? (
          <EmptyLine>Aucune règle AutoMod Discord sur ce serveur.</EmptyLine>
        ) : (
          <ul>
            {rules.map((r) => (
              <li key={r.id} className="border-t border-[var(--panel-border)] first:border-t-0">
                <div className="flex items-center gap-3 px-5 py-3">
                  <button type="button" onClick={() => setEditing(editing === r.id ? null : r.id)} aria-expanded={editing === r.id} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                      {r.name} <span className="font-normal text-[var(--text-muted)]">· {TRIGGER[r.triggerType]}</span>
                    </p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">{summary(r)}</p>
                  </button>
                  <Switch checked={r.enabled} onChange={(v) => toggle(r, v)} label={`Activer ${r.name}`} />
                </div>
                <AnimatePresence initial={false}>
                  {editing === r.id && r.triggerType !== "unknown" && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
                      <div className="border-t border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40">
                        <RuleEditor guildId={guildId} rule={r} used={used} onCancel={() => setEditing(null)} onSaved={saved} onDelete={() => remove(r)} />
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

/** Éditeur d'une règle : déclencheur (à la création), contenu, actions et exceptions. Le bot revalide tout. */
function RuleEditor({ guildId, rule, used, onCancel, onSaved, onDelete }: { guildId: string; rule?: Rule; used: (t: Trigger) => number; onCancel: () => void; onSaved: () => void; onDelete?: () => void }) {
  const api = useGuildApi(guildId);
  const [d, setD] = useState<Draft>(() => (rule ? toDraft(rule) : emptyDraft("keyword")));
  const [kw, setKw] = useState(() => d.keywords.join("\n"));
  const [rx, setRx] = useState(() => d.regexPatterns.join("\n"));
  const [allow, setAllow] = useState(() => d.allowList.join("\n"));
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetchGuildChannels(guildId).then(setChannels);
  }, [guildId]);

  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const has = (t: Action["type"]) => d.actions.find((a) => a.type === t);
  const setAction = (t: Action["type"], on: boolean, extra?: Partial<Action>) =>
    set({ actions: on ? [...d.actions.filter((a) => a.type !== t), { type: t, ...(has(t) ?? {}), ...extra }] : d.actions.filter((a) => a.type !== t) });
  const pickTrigger = (t: Trigger) => {
    const fresh = emptyDraft(t);
    setD({ ...fresh, name: d.name === TRIGGER[d.triggerType] ? fresh.name : d.name });
    setKw("");
    setRx("");
    setAllow("");
  };

  const t = d.triggerType;
  const words = t === "keyword" || t === "member_profile";
  const canTimeout = t === "keyword" || t === "mention_spam";
  const save = async () => {
    setBusy(true);
    const body = { ...d, keywords: words ? lines(kw) : [], regexPatterns: words ? lines(rx) : [], allowList: words || t === "keyword_preset" ? lines(allow) : [] };
    const r = rule ? await api(`/automod-native/${rule.id}`, { method: "PUT", json: body }) : await api("/automod-native", { method: "POST", json: body });
    setBusy(false);
    if (r) onSaved();
  };
  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

  return (
    <>
      {!rule && (
        <Row label="Type" hint={TRIGGER_HINT[t]}>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(QUOTA) as Trigger[]).map((k) => {
              const full = used(k) >= QUOTA[k];
              return (
                <button
                  key={k}
                  type="button"
                  disabled={full}
                  onClick={() => pickTrigger(k)}
                  title={full ? "Limite Discord atteinte pour ce type" : undefined}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    t === k ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]" : "border-[var(--panel-border)] text-[var(--text-muted)]"
                  )}
                >
                  {TRIGGER[k]} <span className="font-normal">{used(k)}/{QUOTA[k]}</span>
                </button>
              );
            })}
          </div>
        </Row>
      )}
      <Row label="Nom">
        <input value={d.name} maxLength={100} onChange={(e) => set({ name: e.target.value })} aria-label="Nom de la règle" className={`${field} h-9 max-w-sm py-0`} />
      </Row>

      {words && (
        <>
          <Row label="Mots-clés" hint="Un par ligne. * pour « commence par » ou « finit par » (ex. arnaque*).">
            <textarea value={kw} rows={4} onChange={(e) => setKw(e.target.value)} aria-label="Mots-clés" className={`${field} font-mono`} />
          </Row>
          <Row label="Expressions régulières" hint="Facultatif, 10 au maximum.">
            <textarea value={rx} rows={2} onChange={(e) => setRx(e.target.value)} aria-label="Expressions régulières" className={`${field} font-mono`} />
          </Row>
        </>
      )}
      {t === "keyword_preset" && (
        <Row label="Listes">
          <div className="flex flex-wrap gap-1.5">
            {PRESET.map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={d.presets.includes(k)}
                onClick={() => set({ presets: d.presets.includes(k) ? d.presets.filter((x) => x !== k) : [...d.presets, k] })}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-xs font-semibold",
                  d.presets.includes(k) ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]" : "border-[var(--panel-border)] text-[var(--text-muted)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </Row>
      )}
      {(words || t === "keyword_preset") && (
        <Row label="Mots autorisés" hint="Jamais bloqués, même s'ils correspondent. Un par ligne.">
          <textarea value={allow} rows={2} onChange={(e) => setAllow(e.target.value)} aria-label="Mots autorisés" className={`${field} font-mono`} />
        </Row>
      )}
      {t === "mention_spam" && (
        <>
          <Row label="Mentions maximum par message">
            <Stepper value={d.mentionTotalLimit} min={1} max={50} unit="mentions" onCommit={(n) => set({ mentionTotalLimit: n })} />
          </Row>
          <Row label="Protection anti-raid" hint="Discord détecte aussi les vagues de mentions venant de plusieurs comptes.">
            <Switch checked={d.mentionRaidProtection} onChange={(v) => set({ mentionRaidProtection: v })} label="Protection anti-raid" />
          </Row>
        </>
      )}

      <Row label="Bloquer le message" hint={t === "member_profile" ? "Indisponible pour les profils." : "Le message n'est jamais publié."}>
        <div className="space-y-1.5">
          <Switch checked={!!has("block_message")} disabled={t === "member_profile"} onChange={(v) => setAction("block_message", v)} label="Bloquer le message" />
          {has("block_message") && (
            <input
              value={has("block_message")?.customMessage ?? ""}
              maxLength={150}
              onChange={(e) => setAction("block_message", true, { customMessage: e.target.value || undefined })}
              placeholder="Message montré au membre (facultatif)"
              aria-label="Message montré au membre"
              className={`${field} h-8 max-w-md py-0 text-xs`}
            />
          )}
        </div>
      </Row>
      <Row label="Alerter le staff">
        <div className="flex flex-wrap items-center gap-2">
          <Switch checked={!!has("send_alert")} onChange={(v) => setAction("send_alert", v)} label="Alerter le staff" />
          {has("send_alert") && <ChannelPicker guildId={guildId} value={has("send_alert")?.channelId ?? ""} filterTypes={[0]} allowClear={false} placeholder="Salon d'alerte" onChange={(id) => setAction("send_alert", true, { channelId: id })} />}
        </div>
      </Row>
      {canTimeout && (
        <Row label="Exclure temporairement">
          <div className="flex flex-wrap items-center gap-2">
            <Switch checked={!!has("timeout")} onChange={(v) => setAction("timeout", v, { durationSeconds: has("timeout")?.durationSeconds ?? 600 })} label="Exclure temporairement" />
            {has("timeout") && <Segmented label="Durée" value={has("timeout")?.durationSeconds ?? 600} options={TIMEOUTS} onChange={(n) => setAction("timeout", true, { durationSeconds: n })} />}
          </div>
        </Row>
      )}
      {t === "member_profile" && (
        <Row label="Bloquer le membre" hint="Le membre ne peut plus écrire ni réagir tant que son profil ne change pas.">
          <Switch checked={!!has("block_member_interaction")} onChange={(v) => setAction("block_member_interaction", v)} label="Bloquer le membre" />
        </Row>
      )}

      <Row label="Rôles exemptés">
        <RoleChips guildId={guildId} ids={d.exemptRoles} max={20} onChange={(ids) => set({ exemptRoles: ids })} />
      </Row>
      {t !== "member_profile" && (
        <Row label="Salons exemptés">
          <div className="flex flex-wrap items-center gap-1.5">
            {d.exemptChannels.map((id) => (
              <Chip key={id} label={`#${channelName(id)}`} onRemove={() => set({ exemptChannels: d.exemptChannels.filter((x) => x !== id) })} />
            ))}
            <ChannelAdder guildId={guildId} excludeIds={d.exemptChannels} onPick={(c) => set({ exemptChannels: [...d.exemptChannels, c.id] })} />
          </div>
        </Row>
      )}

      <div className="flex items-center gap-1.5 border-t border-[var(--panel-border)] px-5 py-3">
        <button type="button" disabled={busy || !d.name.trim() || d.actions.length === 0} onClick={save} className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
          {busy ? "Enregistrement…" : rule ? "Enregistrer" : "Créer la règle"}
        </button>
        <GhostButton onClick={onCancel}>Annuler</GhostButton>
        <span className="flex-1" />
        {onDelete && <GhostButton onClick={onDelete}>Supprimer</GhostButton>}
      </div>
    </>
  );
}
