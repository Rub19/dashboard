"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { MemberIdsInput, MultiChannelPicker, MultiRolePicker, TagInput } from "@/components/discord/MultiPickers";
import { confirmDialog } from "@/lib/confirmDialog";
import { Field, NumberField, Switch, ToggleField, inputCls } from "@/components/discord/SettingsUI";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

type Action = "DELETE" | "WARN" | "STRIKE";
type DetKey = "keywords" | "invites" | "links" | "caps" | "emojis" | "mentions" | "pings" | "spam" | "markdown";
 
type Det = Record<string, any>;
interface Step {
  strikeCount: number;
  action: string;
  durationSeconds: number;
  reason: string;
}
interface Config {
  enabled: boolean;
  strikes?: { enabled: boolean; expirationDays: number; progressiveSteps: Step[] };
   
  [key: string]: any;
}

const CARDS: Array<{ key: DetKey; title: string; text: string }> = [
  { key: "keywords", title: "Vocabulaire interdit", text: "Détection de mots ou de vocabulaire interdits." },
  { key: "invites", title: "Invitations Discord", text: "Détection des liens d'invitation Discord." },
  { key: "links", title: "Liens externes", text: "Détection de l'utilisation de liens externes." },
  { key: "caps", title: "Majuscules excessives", text: "Détection des abus de majuscules." },
  { key: "emojis", title: "Émojis excessifs", text: "Détection de l'usage abusif d'émojis." },
  { key: "mentions", title: "Mentions excessives", text: "Détection de l'usage abusif de mentions." },
  { key: "pings", title: "Mentions interdites", text: "Détection de mentions précises (membres ou rôles)." },
  { key: "spam", title: "Messages en spam", text: "Détection de l'envoi massif de messages." },
  { key: "markdown", title: "Mise en forme interdite", text: "Détection des mises en forme (Markdown) interdites." },
];
/** Détections ajoutées avec cette version du bot : absentes de la configuration d'un bot pas encore mis à jour. */
const NEW_KEYS: DetKey[] = ["emojis", "pings", "markdown"];

const MARKDOWN_LABELS: Array<[string, string]> = [
  ["header", "Titres (# Titre)"],
  ["bold", "Gras (**texte**)"],
  ["italic", "Italique (*texte*)"],
  ["underline", "Souligné (__texte__)"],
  ["strikethrough", "Barré (~~texte~~)"],
  ["spoiler", "Spoiler (||texte||)"],
  ["inlineCode", "Code en ligne (`texte`)"],
  ["codeBlock", "Bloc de code"],
  ["quote", "Citation (> texte)"],
  ["list", "Listes"],
  ["maskedLink", "Liens masqués [texte](url)"],
  ["subtext", "Petit texte (-# texte)"],
];
const ACTION_LABELS: Array<[Action, string, string]> = [
  ["DELETE", "Supprimer le message", "Le message fautif est effacé."],
  ["WARN", "Avertir le membre", "Un message privé lui explique l'infraction."],
  ["STRIKE", "Compter comme infraction", "Alimente les sanctions automatiques ci-dessous."],
];
const SANCTIONS: Array<[string, string]> = [
  ["WARN", "Avertir"],
  ["TIMEOUT", "Exclure temporairement"],
  ["KICK", "Expulser"],
  ["BAN", "Bannir"],
];
const DURATIONS: Array<[number, string]> = [
  [60, "1 minute"],
  [300, "5 minutes"],
  [600, "10 minutes"],
  [3600, "1 heure"],
  [21600, "6 heures"],
  [86400, "1 jour"],
  [604800, "7 jours"],
  [2419200, "28 jours"],
];
const sanctionText = (s: Step) => {
  const a = SANCTIONS.find(([k]) => k === s.action)?.[1] ?? s.action;
  const d = s.action === "TIMEOUT" ? ` (${DURATIONS.find(([v]) => v === s.durationSeconds)?.[1] ?? `${Math.round(s.durationSeconds / 60)} min`})` : "";
  return `${a}${d}`;
};

/** Réglages propres à chaque détection ; les réglages communs (actions, rôles/salons ignorés, silence) sont ajoutés après. */
function SpecificFields({ k, draft, set }: { k: DetKey; draft: Det; set: (patch: Det) => void; guildId: string }) {
  switch (k) {
    case "keywords":
      return (
        <>
          <Field label="Mots interdits" hint="Entrée ou virgule pour ajouter. Un mot peut être écrit avec * (ex. « bad* »).">
            <TagInput value={draft.blacklist ?? []} onChange={(v) => set({ blacklist: v })} placeholder="Ajouter un mot…" />
          </Field>
          <Field label="Mots autorisés (exceptions)">
            <TagInput value={draft.whitelist ?? []} onChange={(v) => set({ whitelist: v })} placeholder="Ajouter une exception…" />
          </Field>
          <ToggleField label="Jokers" text="Accepter * dans les mots interdits" checked={draft.wildcardsEnabled !== false} onChange={(v) => set({ wildcardsEnabled: v })} />
        </>
      );
    case "invites":
      return <ToggleField label="Invitations de ce serveur" text="Bloquer aussi les invitations vers ce serveur" checked={draft.blockAllInvites === true} onChange={(v) => set({ blockAllInvites: v })} />;
    case "links":
      return (
        <>
          <ToggleField label="Tous les liens" text="Bloquer tous les liens (sauf les domaines autorisés)" checked={draft.blockAllLinks === true} onChange={(v) => set({ blockAllLinks: v })} />
          <ToggleField label="Liens raccourcis" text="Bloquer bit.ly, tinyurl…" checked={draft.blockShortenedLinks !== false} onChange={(v) => set({ blockShortenedLinks: v })} />
          <Field label="Domaines autorisés">
            <TagInput value={draft.whitelistedDomains ?? []} onChange={(v) => set({ whitelistedDomains: v })} placeholder="ex. youtube.com" />
          </Field>
          <Field label="Domaines interdits">
            <TagInput value={draft.blacklistedDomains ?? []} onChange={(v) => set({ blacklistedDomains: v })} placeholder="ex. exemple.ru" />
          </Field>
        </>
      );
    case "caps":
      return (
        <>
          <NumberField label="Pourcentage maximum de majuscules" value={draft.maxCapsPercentage ?? 70} min={40} max={100} onChange={(n) => set({ maxCapsPercentage: n })} />
          <NumberField label="Longueur minimale du message" value={draft.minMessageLength ?? 10} min={5} max={50} hint="Les messages plus courts sont ignorés." onChange={(n) => set({ minMessageLength: n })} />
        </>
      );
    case "emojis":
      return <NumberField label="Nombre maximum d'émojis par message" value={draft.maxEmojis ?? 10} min={2} max={100} onChange={(n) => set({ maxEmojis: n })} />;
    case "mentions":
      return (
        <>
          <NumberField label="Mentions de membres maximum" value={draft.maxUserMentions ?? 5} min={2} max={50} onChange={(n) => set({ maxUserMentions: n })} />
          <NumberField label="Mentions de rôles maximum" value={draft.maxRoleMentions ?? 3} min={1} max={20} onChange={(n) => set({ maxRoleMentions: n })} />
          <NumberField label="Mentions au total maximum" value={draft.maxTotalMentions ?? 6} min={2} max={50} onChange={(n) => set({ maxTotalMentions: n })} />
          <ToggleField label="@everyone et @here" text="Interdire ces mentions" checked={draft.blockEveryoneHere !== false} onChange={(v) => set({ blockEveryoneHere: v })} />
        </>
      );
    case "spam":
      return (
        <>
          <NumberField label="Messages maximum" value={draft.maxMessages ?? 5} min={3} max={30} onChange={(n) => set({ maxMessages: n })} />
          <NumberField label="Sur combien de secondes" value={draft.timeWindowSeconds ?? 5} min={2} max={60} onChange={(n) => set({ timeWindowSeconds: n })} />
        </>
      );
    case "markdown":
      return (
        <>
          <Field label="Types interdits">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {MARKDOWN_LABELS.map(([id, label]) => {
                const on = (draft.types ?? []).includes(id);
                return (
                  <label key={id} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                    <input type="checkbox" checked={on} onChange={() => set({ types: on ? draft.types.filter((t: string) => t !== id) : [...(draft.types ?? []), id] })} />
                    {label}
                  </label>
                );
              })}
            </div>
          </Field>
          <ToggleField label="Retrait de la mise en forme" text="Renvoyer le message sans mise en forme ?" checked={draft.removeMarkdown !== false} onChange={(v) => set({ removeMarkdown: v })} />
        </>
      );
    case "pings":
      return null;
  }
}

function Modal({ title, onClose, footer, children }: { title: string; onClose: () => void; footer: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--bg-surface)] shadow-2xl">
        <div className="overflow-y-auto p-6">
          <h3 className="mb-5 text-lg font-extrabold uppercase tracking-wide text-white">{title}</h3>
          <div className="space-y-5">{children}</div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--panel-border)] bg-black/20 px-6 py-4">{footer}</div>
      </div>
    </div>
  );
}

interface Props {
  guildId: string;
  config: Config;
  onConfigChange: (c: Config) => void;
}

/**
 * Détection des infractions façon DraftBot : neuf détections en cartes (interrupteur + réglages), toutes désactivées par défaut,
 * puis les sanctions automatiques (« à partir de N infractions, faire X »). Le moteur avancé (règles, sandbox…) reste dans les autres onglets.
 */
export default function InfractionsPanel({ guildId, config, onConfigChange }: Props) {
  const { success, error: showError } = useToast();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<DetKey | null>(null);
  const [draft, setDraft] = useState<Det>({});
  const [sanction, setSanction] = useState<Step | null>(null);
  const base = `${BOT_API_URL}/api/guilds/${encodeURIComponent(guildId)}/automod/config`;
  const outdated = NEW_KEYS.some((k) => config[k] === undefined);
  const strikes = config.strikes ?? { enabled: false, expirationDays: 7, progressiveSteps: [] };
  const steps = [...strikes.progressiveSteps].sort((a, b) => a.strikeCount - b.strikeCount);

  const save = async (patch: Record<string, unknown>, okTitle: string, okText = "") => {
    if (!BOT_API_URL) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return false;
    }
    setBusy(true);
    try {
      const res = await fetch(base, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.config) throw new Error(json?.error || String(res.status));
      onConfigChange(json.config as Config);
      success(okTitle, okText);
      return true;
    } catch (err) {
      showError("Enregistrement impossible", err instanceof Error && err.message ? err.message : "Le bot n'a pas répondu.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const toggle = (key: DetKey, on: boolean) => {
    const cur: Det = config[key] ?? {};
    // Activer une détection réveille l'interrupteur général : sans lui, rien n'agirait.
    const patch: Record<string, unknown> = { [key]: { ...cur, enabled: on } };
    if (on && !config.enabled) patch.enabled = true;
    void save(patch, on ? "Détection activée" : "Détection désactivée", on && !config.enabled ? "AutoMod est maintenant actif sur le serveur." : "");
  };

  const openSettings = (key: DetKey) => {
    setDraft({ ...(config[key] ?? {}) });
    setEditing(key);
  };
  const setD = (patch: Det) => setDraft((d) => ({ ...d, ...patch }));

  const saveSettings = async () => {
    if (!editing) return;
    if (editing === "pings" && (draft.userIds ?? []).length === 0 && (draft.roleIds ?? []).length === 0 && draft.enabled) {
      showError("Aucune cible", "Ajoutez au moins un rôle ou un membre à protéger, ou désactivez la détection.");
      return;
    }
    if (await save({ [editing]: draft }, "Réglages enregistrés")) setEditing(null);
  };

  const addSanction = async () => {
    if (!sanction) return;
    if (steps.some((s) => s.strikeCount === sanction.strikeCount)) {
      showError("Palier déjà utilisé", `Une sanction est déjà prévue à ${sanction.strikeCount} infraction(s).`);
      return;
    }
    const next = [...strikes.progressiveSteps, { ...sanction, reason: sanction.reason.trim() || `${sanction.strikeCount} infraction(s)` }];
    if (await save({ strikes: { ...strikes, enabled: true, progressiveSteps: next } }, "Sanction automatique créée", "Elle s'applique quand un membre atteint ce nombre d'infractions.")) setSanction(null);
  };

  const removeSanction = async (s: Step) => {
    if (!(await confirmDialog(`Supprimer la sanction automatique à ${s.strikeCount} infraction(s) ?`, { title: "Supprimer", confirmLabel: "Supprimer", tone: "danger" }))) return;
    await save({ strikes: { ...strikes, progressiveSteps: strikes.progressiveSteps.filter((x) => x.strikeCount !== s.strikeCount) } }, "Sanction supprimée");
  };

  const activeCount = CARDS.filter((c) => config[c.key]?.enabled).length;
  const editingCard = CARDS.find((c) => c.key === editing);
  const draftActions: Action[] = draft.actions ?? [];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-bold text-white">Détection des infractions</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Configurez les détections automatiques. Tout est désactivé par défaut : rien n&apos;agit tant que vous n&apos;avez pas activé une détection.{" "}
          <span className={cn("font-semibold", activeCount > 0 ? "text-emerald-300" : "text-zinc-300")}>{activeCount} active{activeCount > 1 ? "s" : ""}.</span>
        </p>
        {outdated && <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">Le bot n&apos;est pas encore à jour : les détections « Émojis excessifs », « Mentions interdites » et « Mise en forme interdite » ne sont pas disponibles tant qu&apos;il n&apos;est pas redéployé.</p>}
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {CARDS.map((c) => {
            const unavailable = NEW_KEYS.includes(c.key) && config[c.key] === undefined;
            const on = config[c.key]?.enabled === true;
            return (
              <div key={c.key} className={cn("flex items-center justify-between gap-3 rounded-xl border border-[var(--panel-border)] bg-white/[0.03] p-4", unavailable && "opacity-50")}>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{c.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{c.text}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <button type="button" disabled={busy || unavailable} onClick={() => openSettings(c.key)} aria-label={`Réglages : ${c.title}`} className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
                    </svg>
                  </button>
                  <Switch checked={on} disabled={busy || unavailable} onChange={(v) => toggle(c.key, v)} label={`Activer : ${c.title}`} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-white/10 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Sanctions automatiques</h2>
            <p className="mt-1 max-w-2xl text-sm text-zinc-400">Quand un membre cumule des infractions (détections avec « Compter comme infraction »), le bot le sanctionne tout seul. Les infractions expirent après {strikes.expirationDays} jour(s).</p>
          </div>
          <button type="button" disabled={busy} onClick={() => setSanction({ strikeCount: (steps.at(-1)?.strikeCount ?? 0) + 1, action: "TIMEOUT", durationSeconds: 3600, reason: "" })} className="cursor-pointer rounded-lg bg-[#c96a52] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d97a62] disabled:opacity-50">
            Créer une sanction automatique
          </button>
        </div>
        {steps.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-white/20 p-4 text-center text-sm text-zinc-400">Vous n&apos;avez créé aucune sanction automatique.</div>
        ) : (
          <ul className="mt-5 divide-y divide-white/5 rounded-xl border border-[var(--panel-border)]">
            {steps.map((s) => (
              <li key={s.strikeCount} className="flex flex-wrap items-center justify-between gap-3 p-3.5">
                <div>
                  <p className="text-sm font-semibold text-white">
                    À {s.strikeCount} infraction{s.strikeCount > 1 ? "s" : ""} : {sanctionText(s)}
                  </p>
                  <p className="text-xs text-zinc-500">{s.reason}</p>
                </div>
                <button type="button" disabled={busy} onClick={() => void removeSanction(s)} className="cursor-pointer rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50">
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
        <label className="mt-4 block max-w-xs text-xs text-zinc-400">
          Durée de vie d&apos;une infraction
          <select value={strikes.expirationDays} disabled={busy} onChange={(e) => void save({ strikes: { ...strikes, expirationDays: Number(e.target.value) } }, "Durée enregistrée")} className={cn(inputCls, "mt-1")}>
            {[1, 3, 7, 14, 30, 60, 90].map((d) => (
              <option key={d} value={d}>
                {d} jour{d > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>
      </section>

      {editing && editingCard && (
        <Modal
          title={editingCard.title}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button type="button" onClick={() => setEditing(null)} className="cursor-pointer rounded-lg border border-white/30 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                Fermer
              </button>
              <button type="button" disabled={busy} onClick={() => void saveSettings()} className="cursor-pointer rounded-lg bg-[#5865F2] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#4752C4] disabled:opacity-50">
                Enregistrer
              </button>
            </>
          }
        >
          {editing === "pings" && (
            <>
              <Field label="Membres protégés" hint="Personne ne peut les mentionner (sauf eux-mêmes).">
                <MemberIdsInput value={draft.userIds ?? []} onChange={(v) => setD({ userIds: v })} />
              </Field>
              <Field label="Rôles protégés">
                <MultiRolePicker guildId={guildId} value={draft.roleIds ?? []} onChange={(v) => setD({ roleIds: v })} />
              </Field>
            </>
          )}
          <SpecificFields k={editing} draft={draft} set={setD} guildId={guildId} />
          <Field label="Actions">
            <div className="space-y-2">
              {ACTION_LABELS.map(([id, label, text]) => (
                <label key={id} className="flex cursor-pointer items-start gap-2 text-sm text-zinc-300">
                  <input type="checkbox" className="mt-1" checked={draftActions.includes(id)} onChange={() => setD({ actions: draftActions.includes(id) ? draftActions.filter((a) => a !== id) : [...draftActions, id] })} />
                  <span>
                    {label}
                    <span className="block text-[11px] text-zinc-500">{text}</span>
                  </span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Rôles ignorés">
            <MultiRolePicker guildId={guildId} value={draft.ignoredRoleIds ?? []} onChange={(v) => setD({ ignoredRoleIds: v })} />
          </Field>
          <Field label="Salons ignorés">
            <MultiChannelPicker guildId={guildId} value={draft.ignoredChannelIds ?? []} onChange={(v) => setD({ ignoredChannelIds: v })} />
          </Field>
          <ToggleField label="Mode silencieux" text="Le bot ne répond pas publiquement au message fautif (le message privé d'avertissement reste envoyé)." checked={draft.silent === true} onChange={(v) => setD({ silent: v })} />
        </Modal>
      )}

      {sanction && (
        <Modal
          title="Créer une sanction automatique"
          onClose={() => setSanction(null)}
          footer={
            <>
              <button type="button" onClick={() => setSanction(null)} className="cursor-pointer rounded-lg border border-white/30 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                Annuler
              </button>
              <button type="button" disabled={busy} onClick={() => void addSanction()} className="cursor-pointer rounded-lg bg-[#5865F2] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#4752C4] disabled:opacity-50">
                Créer
              </button>
            </>
          }
        >
          <NumberField label="À partir de combien d'infractions" value={sanction.strikeCount} min={1} max={20} onChange={(n) => setSanction({ ...sanction, strikeCount: n })} />
          <Field label="Sanction">
            <select value={sanction.action} onChange={(e) => setSanction({ ...sanction, action: e.target.value })} className={inputCls}>
              {SANCTIONS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          {sanction.action === "TIMEOUT" && (
            <Field label="Durée de l'exclusion">
              <select value={sanction.durationSeconds} onChange={(e) => setSanction({ ...sanction, durationSeconds: Number(e.target.value) })} className={inputCls}>
                {DURATIONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Motif (visible dans les logs)">
            <input value={sanction.reason} maxLength={100} onChange={(e) => setSanction({ ...sanction, reason: e.target.value })} placeholder={`${sanction.strikeCount} infractions`} className={inputCls} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
