"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Info, Pencil, Plus, RefreshCw, ShieldCheck, Sparkles, Trash2 } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";
import { confirmDialog } from "@/lib/confirmDialog";
import { errorReason, fetchJson } from "@/lib/format-error";
import { cn } from "@/lib/utils";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import ChannelPicker from "@/components/discord/ChannelPicker";
import { MultiChannelPicker, MultiRolePicker } from "@/components/discord/MultiPickers";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

type TriggerType = "keyword" | "spam" | "keyword_preset" | "mention_spam" | "member_profile";
type PresetKey = "profanity" | "sexual_content" | "slurs";
type ActionType = "block_message" | "send_alert" | "timeout" | "block_member_interaction";

interface RuleAction {
  type: ActionType;
  channelId?: string;
  durationSeconds?: number;
  customMessage?: string;
}

interface NativeRule {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: TriggerType | "unknown";
  triggerMetadata: {
    keywordFilter: string[];
    regexPatterns: string[];
    allowList: string[];
    presets: PresetKey[];
    mentionTotalLimit: number | null;
    mentionRaidProtectionEnabled: boolean;
  };
  actions: RuleAction[];
  exemptRoles: string[];
  exemptChannels: string[];
}

const TRIGGERS: Record<TriggerType, { label: string; max: number; hint: string }> = {
  keyword: { label: "Mots-clés", max: 6, hint: "Bloque les messages contenant certains mots ou expressions (jokers * et regex acceptés)." },
  spam: { label: "Spam suspect", max: 1, hint: "Détecte automatiquement le contenu suspecté d'être du spam." },
  keyword_preset: { label: "Listes prédéfinies", max: 1, hint: "Listes tenues à jour par Discord : grossièretés, contenu sexuel, insultes." },
  mention_spam: { label: "Spam de mentions", max: 1, hint: "Bloque les messages qui mentionnent trop de membres ou de rôles." },
  member_profile: { label: "Profil des membres", max: 1, hint: "Filtre les pseudos, noms d'affichage et présentations selon vos mots-clés." },
};

const PRESETS: Array<{ id: PresetKey; label: string }> = [
  { id: "profanity", label: "Grossièretés" },
  { id: "sexual_content", label: "Contenu sexuel" },
  { id: "slurs", label: "Insultes et propos haineux" },
];

const ACTION_LABELS: Record<ActionType, string> = {
  block_message: "Blocage du message",
  send_alert: "Alerte dans un salon",
  timeout: "Exclusion temporaire",
  block_member_interaction: "Interactions bloquées",
};

const TIMEOUTS: Array<{ seconds: number; label: string }> = [
  { seconds: 60, label: "1 minute" },
  { seconds: 300, label: "5 minutes" },
  { seconds: 600, label: "10 minutes" },
  { seconds: 3600, label: "1 heure" },
  { seconds: 86400, label: "1 jour" },
  { seconds: 604800, label: "1 semaine" },
  { seconds: 2419200, label: "28 jours" },
];

function formatDuration(s: number): string {
  const known = TIMEOUTS.find((t) => t.seconds === s);
  if (known) return known.label;
  if (s % 3600 === 0) return `${s / 3600} h`;
  if (s % 60 === 0) return `${s / 60} min`;
  return `${s} s`;
}

interface Draft {
  id: string | null;
  name: string;
  triggerType: TriggerType;
  enabled: boolean;
  keywords: string;
  regex: string;
  allow: string;
  presets: PresetKey[];
  mentionLimit: string;
  raid: boolean;
  block: boolean;
  customMessage: string;
  alert: boolean;
  alertChannel: string;
  timeout: boolean;
  timeoutSeconds: number;
  blockInteraction: boolean;
  exemptRoles: string[];
  exemptChannels: string[];
}

const BLANK: Draft = {
  id: null,
  name: "",
  triggerType: "keyword",
  enabled: true,
  keywords: "",
  regex: "",
  allow: "",
  presets: ["profanity", "sexual_content", "slurs"],
  mentionLimit: "8",
  raid: true,
  block: true,
  customMessage: "",
  alert: false,
  alertChannel: "",
  timeout: false,
  timeoutSeconds: 600,
  blockInteraction: false,
  exemptRoles: [],
  exemptChannels: [],
};

const lines = (text: string): string[] => [...new Set(text.split("\n").map((l) => l.trim()).filter(Boolean))];

function draftFromRule(r: NativeRule): Draft {
  const act = (t: ActionType) => r.actions.find((a) => a.type === t);
  return {
    id: r.id,
    name: r.name,
    triggerType: r.triggerType === "unknown" ? "keyword" : r.triggerType,
    enabled: r.enabled,
    keywords: r.triggerMetadata.keywordFilter.join("\n"),
    regex: r.triggerMetadata.regexPatterns.join("\n"),
    allow: r.triggerMetadata.allowList.join("\n"),
    presets: r.triggerMetadata.presets,
    mentionLimit: String(r.triggerMetadata.mentionTotalLimit ?? 8),
    raid: r.triggerMetadata.mentionRaidProtectionEnabled,
    block: !!act("block_message"),
    customMessage: act("block_message")?.customMessage ?? "",
    alert: !!act("send_alert"),
    alertChannel: act("send_alert")?.channelId ?? "",
    timeout: !!act("timeout"),
    timeoutSeconds: act("timeout")?.durationSeconds ?? 600,
    blockInteraction: !!act("block_member_interaction"),
    exemptRoles: r.exemptRoles,
    exemptChannels: r.exemptChannels,
  };
}

function payloadFromDraft(d: Draft) {
  const actions: RuleAction[] = [];
  if (d.block && d.triggerType !== "member_profile") {
    actions.push({ type: "block_message", ...(d.customMessage.trim() ? { customMessage: d.customMessage.trim() } : {}) });
  }
  if (d.alert) actions.push({ type: "send_alert", channelId: d.alertChannel });
  if (d.timeout && (d.triggerType === "keyword" || d.triggerType === "mention_spam")) {
    actions.push({ type: "timeout", durationSeconds: d.timeoutSeconds });
  }
  if (d.blockInteraction) actions.push({ type: "block_member_interaction" });
  const usesKeywords = d.triggerType === "keyword" || d.triggerType === "member_profile";
  return {
    name: d.name.trim(),
    triggerType: d.triggerType,
    enabled: d.enabled,
    keywords: usesKeywords ? lines(d.keywords) : [],
    regexPatterns: usesKeywords ? lines(d.regex) : [],
    allowList: usesKeywords || d.triggerType === "keyword_preset" ? lines(d.allow) : [],
    presets: d.triggerType === "keyword_preset" ? d.presets : [],
    ...(d.triggerType === "mention_spam" ? { mentionTotalLimit: Number(d.mentionLimit), mentionRaidProtection: d.raid } : {}),
    actions,
    exemptRoles: d.exemptRoles,
    exemptChannels: d.exemptChannels,
  };
}

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-emerald-500" : "bg-white/15"
      )}
    >
      <span className={cn("block h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
      {children}
      {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

const textareaCls =
  "min-h-[96px] w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-emerald-500/60 focus:outline-none";

const cardCls = "rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4";
const primaryBtn =
  "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50";
const ghostBtn =
  "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--panel-border)] px-3 text-sm font-medium text-[var(--text-primary)] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50";

function ActionSummary({ actions }: { actions: RuleAction[] }) {
  if (actions.length === 0) return <span className="text-xs text-[var(--text-muted)]">Aucune action</span>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {actions.map((a, i) => (
        <li key={i} className="rounded-md border border-[var(--panel-border)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
          {ACTION_LABELS[a.type]}
          {a.type === "timeout" && a.durationSeconds ? ` · ${formatDuration(a.durationSeconds)}` : ""}
        </li>
      ))}
    </ul>
  );
}

function ruleDetail(r: NativeRule): string {
  const m = r.triggerMetadata;
  switch (r.triggerType) {
    case "keyword":
    case "member_profile":
      return `${m.keywordFilter.length} mot(s)-clé(s), ${m.regexPatterns.length} regex${m.allowList.length ? `, ${m.allowList.length} exception(s)` : ""}`;
    case "keyword_preset":
      return PRESETS.filter((p) => m.presets.includes(p.id)).map((p) => p.label).join(", ") || "Aucune liste";
    case "mention_spam":
      return `Maximum ${m.mentionTotalLimit ?? "?"} mention(s) par message${m.mentionRaidProtectionEnabled ? " · protection anti-raid" : ""}`;
    default:
      return "";
  }
}

export default function AutomodNativeClient() {
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const guildId = useResolvedGuildId(searchParams.get("guildId"), profile?.guilds);
  const { success, error: showError } = useToast();

  const [rules, setRules] = useState<NativeRule[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [recAlert, setRecAlert] = useState("");
  const [recBusy, setRecBusy] = useState(false);

  const base = `${BOT_API_URL}/api/guilds/${encodeURIComponent(guildId)}/automod-native`;

  const load = useCallback(async () => {
    if (!guildId) return;
    if (!BOT_API_URL) {
      setLoadError("Le bot est injoignable : l'adresse de son API n'est pas configurée.");
      return;
    }
    try {
      const data = await fetchJson<{ rules: NativeRule[] }>(`${base}/`);
      setRules(data.rules ?? []);
      setLoadError(null);
    } catch (err) {
      setRules(null);
      setLoadError(errorReason(err, "Impossible de joindre le bot. Réessayez dans un instant."));
    }
  }, [guildId, base]);

  useEffect(() => {
    setRules(null);
    setDraft(null);
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Partial<Record<TriggerType, number>> = {};
    for (const r of rules ?? []) if (r.triggerType !== "unknown") c[r.triggerType] = (c[r.triggerType] ?? 0) + 1;
    return c;
  }, [rules]);

  const typeOptions = (Object.keys(TRIGGERS) as TriggerType[]).map((t) => {
    const used = counts[t] ?? 0;
    return { id: t, label: `${TRIGGERS[t].label} (${used}/${TRIGGERS[t].max})`, disabled: draft?.id ? false : used >= TRIGGERS[t].max };
  });

  const toggle = async (rule: NativeRule, enabled: boolean) => {
    setBusyId(rule.id);
    try {
      await fetchJson(`${base}/${encodeURIComponent(rule.id)}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      setRules((prev) => prev?.map((r) => (r.id === rule.id ? { ...r, enabled } : r)) ?? prev);
    } catch (err) {
      showError("Changement impossible", errorReason(err, "Impossible de joindre le bot."));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (rule: NativeRule) => {
    if (!(await confirmDialog(`Supprimer la règle « ${rule.name} » ? Elle sera aussi supprimée dans Discord.`))) return;
    setBusyId(rule.id);
    try {
      await fetchJson(`${base}/${encodeURIComponent(rule.id)}`, { method: "DELETE" });
      success("Règle supprimée", rule.name);
      if (draft?.id === rule.id) setDraft(null);
      await load();
    } catch (err) {
      showError("Suppression impossible", errorReason(err, "Impossible de joindre le bot."));
    } finally {
      setBusyId(null);
    }
  };

  const save = async () => {
    if (!draft) return;
    const problem = validateDraft(draft);
    if (problem) {
      showError("Formulaire incomplet", problem);
      return;
    }
    setSaving(true);
    try {
      await fetchJson(draft.id ? `${base}/${encodeURIComponent(draft.id)}` : `${base}/`, {
        method: draft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromDraft(draft)), // PUT : le bot ignore triggerType (non modifiable)
      });
      success(draft.id ? "Règle modifiée" : "Règle créée", draft.name.trim());
      setDraft(null);
      await load();
    } catch (err) {
      showError("Enregistrement impossible", errorReason(err, "Impossible de joindre le bot."));
    } finally {
      setSaving(false);
    }
  };

  const createRecommended = async () => {
    setRecBusy(true);
    try {
      const res = await fetchJson<{ created: NativeRule[]; skipped: Array<{ name: string; reason: string }> }>(`${base}/recommended`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertChannelId: recAlert || undefined }),
      });
      const skipped = res.skipped.length ? ` ${res.skipped.length} ignorée(s) : une règle de ce type existe déjà.` : "";
      success("Règles recommandées", `${res.created.length} règle(s) créée(s).${skipped}`);
      await load();
    } catch (err) {
      showError("Création impossible", errorReason(err, "Impossible de joindre le bot."));
    } finally {
      setRecBusy(false);
    }
  };

  const patch = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));
  const isKeywordy = draft?.triggerType === "keyword" || draft?.triggerType === "member_profile";
  const timeoutOptions = useMemo(() => {
    const opts = TIMEOUTS.map((t) => ({ id: String(t.seconds), label: t.label }));
    if (draft && !TIMEOUTS.some((t) => t.seconds === draft.timeoutSeconds)) opts.push({ id: String(draft.timeoutSeconds), label: formatDuration(draft.timeoutSeconds) });
    return opts;
  }, [draft]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="space-y-3">
        <Link
          href={guildId ? `/discord?guildId=${encodeURIComponent(guildId)}` : "/discord"}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--panel-border)] text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">AutoMod natif</h1>
              <p className="text-sm text-[var(--text-muted)]">Les règles de modération intégrées à Discord, gérées depuis ETHONE.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} className={ghostBtn} aria-label="Actualiser">
              <RefreshCw className="h-4 w-4" /> Actualiser
            </button>
            <button type="button" onClick={() => setDraft({ ...BLANK })} disabled={!rules} className={primaryBtn}>
              <Plus className="h-4 w-4" /> Nouvelle règle
            </button>
          </div>
        </div>
      </div>

      <div className={cn(cardCls, "flex items-start gap-3")}>
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <p className="text-sm text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-primary)]">Exécuté directement par Discord, même si le bot est hors ligne.</span> Ces règles apparaissent aussi dans Paramètres du serveur, AutoMod. Le bot doit avoir la
          permission « Gérer le serveur » (et « Exclure temporairement des membres » pour l&apos;exclusion temporaire).
        </p>
      </div>

      {!guildId && <div className={cardCls}><p className="text-sm text-[var(--text-muted)]">Aucun serveur sélectionné. Choisissez un serveur depuis le tableau de bord.</p></div>}

      {loadError && (
        <div className={cn(cardCls, "flex flex-wrap items-center justify-between gap-3 border-rose-500/40")}>
          <p className="text-sm text-rose-400">{loadError}</p>
          <button type="button" onClick={() => void load()} className={ghostBtn}>Réessayer</button>
        </div>
      )}

      {rules && (
        <div className={cardCls}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Règles recommandées</p>
                <p className="text-xs text-[var(--text-muted)]">Listes prédéfinies (grossièretés, contenu sexuel, insultes), spam suspect et limite de 8 mentions. Les types déjà présents sont conservés.</p>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <div className="w-full sm:w-56">
                <ChannelPicker value={recAlert} onChange={setRecAlert} guildId={guildId} filterTypes={[0, 5]} allowClear size="sm" placeholder="Salon d'alerte (facultatif)" />
              </div>
              <button type="button" onClick={() => void createRecommended()} disabled={recBusy} className={primaryBtn}>
                {recBusy ? "Création…" : "Créer les règles"}
              </button>
            </div>
          </div>
        </div>
      )}

      {draft && (
        <div className={cn(cardCls, "space-y-5")}>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{draft.id ? "Modifier la règle" : "Nouvelle règle"}</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom de la règle">
              <Input value={draft.name} maxLength={100} onChange={(e) => patch("name", e.target.value)} placeholder="Ex. Liens interdits" />
            </Field>
            <Field label="Type de règle" hint={TRIGGERS[draft.triggerType].hint}>
              <Select value={draft.triggerType} onChange={(v) => patch("triggerType", v as TriggerType)} options={typeOptions} disabled={!!draft.id} aria-label="Type de règle" />
            </Field>
          </div>

          {isKeywordy && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Mots-clés" hint="Un par ligne, 60 caractères max. Jokers : mot*, *mot, *mot*.">
                <textarea className={textareaCls} value={draft.keywords} onChange={(e) => patch("keywords", e.target.value)} placeholder={"exemple\nbadword*"} />
              </Field>
              <Field label="Expressions régulières" hint="Une par ligne, 10 max, syntaxe Rust.">
                <textarea className={textareaCls} value={draft.regex} onChange={(e) => patch("regex", e.target.value)} placeholder="^https?://.*\.xyz$" />
              </Field>
              <Field label="Exceptions autorisées" hint="Une par ligne : mots jamais bloqués.">
                <textarea className={textareaCls} value={draft.allow} onChange={(e) => patch("allow", e.target.value)} />
              </Field>
            </div>
          )}

          {draft.triggerType === "keyword_preset" && (
            <div className="space-y-3">
              <Field label="Listes à appliquer">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {PRESETS.map((p) => (
                    <Checkbox
                      key={p.id}
                      label={p.label}
                      checked={draft.presets.includes(p.id)}
                      onCheckedChange={(v) => patch("presets", v ? [...draft.presets, p.id] : draft.presets.filter((x) => x !== p.id))}
                    />
                  ))}
                </div>
              </Field>
              <Field label="Exceptions autorisées" hint="Une par ligne : mots jamais bloqués par ces listes.">
                <textarea className={textareaCls} value={draft.allow} onChange={(e) => patch("allow", e.target.value)} />
              </Field>
            </div>
          )}

          {draft.triggerType === "mention_spam" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mentions maximum par message" hint="Entre 1 et 50 (membres et rôles confondus).">
                <Input type="number" min={1} max={50} value={draft.mentionLimit} onChange={(e) => patch("mentionLimit", e.target.value)} />
              </Field>
              <Field label="Protection anti-raid">
                <Checkbox label="Bloquer aussi les vagues de mentions" checked={draft.raid} onCheckedChange={(v) => patch("raid", v)} />
              </Field>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-semibold text-[var(--text-primary)]">Actions</p>
            {draft.triggerType !== "member_profile" && (
              <div className="space-y-2">
                <Checkbox label="Bloquer le message" checked={draft.block} onCheckedChange={(v) => patch("block", v)} />
                {draft.block && (
                  <Input value={draft.customMessage} maxLength={150} onChange={(e) => patch("customMessage", e.target.value)} placeholder="Message affiché au membre (facultatif, 150 caractères max)" />
                )}
              </div>
            )}
            <div className="space-y-2">
              <Checkbox label="Envoyer une alerte dans un salon" checked={draft.alert} onCheckedChange={(v) => patch("alert", v)} />
              {draft.alert && (
                <div className="max-w-sm">
                  <ChannelPicker value={draft.alertChannel} onChange={(id) => patch("alertChannel", id)} guildId={guildId} filterTypes={[0, 5]} placeholder="Salon d'alerte" />
                </div>
              )}
            </div>
            {(draft.triggerType === "keyword" || draft.triggerType === "mention_spam") && (
              <div className="space-y-2">
                <Checkbox label="Exclure temporairement le membre" checked={draft.timeout} onCheckedChange={(v) => patch("timeout", v)} />
                {draft.timeout && (
                  <div className="max-w-xs">
                    <Select value={String(draft.timeoutSeconds)} onChange={(v) => patch("timeoutSeconds", Number(v))} options={timeoutOptions} aria-label="Durée de l'exclusion" />
                  </div>
                )}
              </div>
            )}
            <Checkbox label="Bloquer les interactions du membre" checked={draft.blockInteraction} onCheckedChange={(v) => patch("blockInteraction", v)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rôles exemptés" hint="20 maximum.">
              <MultiRolePicker guildId={guildId} value={draft.exemptRoles} onChange={(v) => patch("exemptRoles", v.slice(0, 20))} />
            </Field>
            <Field label="Salons exemptés" hint="50 maximum.">
              <MultiChannelPicker guildId={guildId} value={draft.exemptChannels} onChange={(v) => patch("exemptChannels", v.slice(0, 50))} />
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--panel-border)] pt-4">
            <div className="flex items-center gap-3">
              <Switch checked={draft.enabled} onChange={(v) => patch("enabled", v)} label="Règle activée" />
              <span className="text-sm text-[var(--text-muted)]">{draft.enabled ? "Activée" : "Désactivée"}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDraft(null)} className={ghostBtn}>Annuler</button>
              <button type="button" onClick={() => void save()} disabled={saving} className={primaryBtn}>
                {saving ? "Enregistrement…" : draft.id ? "Enregistrer" : "Créer la règle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!rules && !loadError && guildId && <p className="text-sm text-[var(--text-muted)]">Chargement des règles…</p>}

      {rules && rules.length === 0 && !draft && (
        <div className={cardCls}>
          <p className="text-sm text-[var(--text-muted)]">Aucune règle AutoMod native sur ce serveur. Créez-en une ou utilisez les règles recommandées ci-dessus.</p>
        </div>
      )}

      {rules && rules.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {rules.map((r) => (
            <li key={r.id} className={cn(cardCls, "space-y-3", !r.enabled && "opacity-70")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{r.name}</p>
                  <span className="mt-1 inline-block rounded-md border border-emerald-500/30 px-2 py-0.5 text-xs text-emerald-400">
                    {r.triggerType === "unknown" ? "Type inconnu" : TRIGGERS[r.triggerType].label}
                  </span>
                </div>
                <Switch checked={r.enabled} onChange={(v) => void toggle(r, v)} label={`Activer ${r.name}`} disabled={busyId === r.id} />
              </div>
              <p className="text-xs text-[var(--text-muted)]">{ruleDetail(r)}</p>
              <ActionSummary actions={r.actions} />
              {(r.exemptRoles.length > 0 || r.exemptChannels.length > 0) && (
                <p className="text-xs text-[var(--text-muted)]">Exemptions : {r.exemptRoles.length} rôle(s), {r.exemptChannels.length} salon(s)</p>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setDraft(draftFromRule(r))} disabled={r.triggerType === "unknown"} className={ghostBtn}>
                  <Pencil className="h-4 w-4" /> Modifier
                </button>
                <button type="button" onClick={() => void remove(r)} disabled={busyId === r.id} className={cn(ghostBtn, "text-rose-400")}>
                  <Trash2 className="h-4 w-4" /> Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Contrôles rapides côté navigateur ; le bot re-valide tout (Zod) et renvoie un message précis. */
function validateDraft(d: Draft): string | null {
  if (!d.name.trim()) return "Donnez un nom à la règle.";
  if ((d.triggerType === "keyword" || d.triggerType === "member_profile") && lines(d.keywords).length + lines(d.regex).length === 0) {
    return "Indiquez au moins un mot-clé ou une expression régulière.";
  }
  if (d.triggerType === "keyword_preset" && d.presets.length === 0) return "Choisissez au moins une liste prédéfinie.";
  if (d.triggerType === "mention_spam") {
    const n = Number(d.mentionLimit);
    if (!Number.isInteger(n) || n < 1 || n > 50) return "La limite de mentions doit être comprise entre 1 et 50.";
  }
  if (d.alert && !d.alertChannel) return "Choisissez le salon où envoyer l'alerte.";
  const hasAction = (d.block && d.triggerType !== "member_profile") || d.alert || d.blockInteraction || (d.timeout && (d.triggerType === "keyword" || d.triggerType === "mention_spam"));
  return hasAction ? null : "Ajoutez au moins une action.";
}
