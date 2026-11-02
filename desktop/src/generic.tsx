import { useEffect, useMemo, useState } from "react";
import { toast } from "./qol";
import { AnimatePresence, motion } from "framer-motion";
import { errorText, lang, tr } from "./i18n";
import { LABELS } from "./labels";
import { Drawer, Empty, ErrorBox, formatBytes, Stagger, StaggerItem, staggerItem } from "./kit";
import { Button } from "./ui";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const TITLE_KEYS = ["alias", "title", "name", "label", "subject", "prize", "displayName", "device_name", "platform", "userTag", "tag", "username", "guildName", "email", "code", "event_type", "eventType", "kind", "id"];
const SUB_KEYS = ["status", "type", "category", "description", "reason", "authorTag", "action", "browser", "last_seen_at", "createdAt", "created_at", "updatedAt"];
const HIDDEN = new Set(["apiToken", "accountId", "ip_hash", "success", "ok", "__v", "_id", "id", "guildId", "user_id", "userId", "profile_id", "workspace_id", "slug", "public_id", "createdAt", "updatedAt", "created_at", "updated_at"]);
const PHRASES: Record<string, string> = {
  staffroleid: "Rôle de l'équipe", staffroleids: "Rôles de l'équipe", ignoredroleids: "Rôles ignorés", ignoredchannelids: "Salons ignorés", alloweduserids: "Utilisateurs autorisés", rulescount: "Règles", actionstoday: "Actions aujourd'hui", welcomechannelid: "Salon de bienvenue", goodbyechannelid: "Salon de départ", autoroleid: "Rôle automatique", autoroleids: "Rôles automatiques", retries: "Tentatives", enabled: "Activé", active: "Actif", online: "En ligne", channelid: "Salon", roleid: "Rôle", channelids: "Salons", roleids: "Rôles", logchannelid: "Salon des journaux", logsuccess: "Journaliser les réussites", botname: "Nom du bot", botpersonality: "Personnalité du bot", activepreset: "Préréglage actif", autodeletecommands: "Supprimer les commandes automatiquement", commandcooldown: "Délai entre les commandes", commandrules: "Règles des commandes", adminroles: "Rôles administrateurs", blacklist: "Liste noire", captcha: "Captcha", attempts: "Tentatives", delayminutes: "Délai en minutes", failaction: "Action en cas d'échec", givenroles: "Rôles donnés", removedroles: "Rôles retirés", mentiononjoin: "Mentionner à l'arrivée", panelmessageid: "Message du panneau", emergencycontacts: "Contacts d'urgence", mode: "Mode", userids: "Utilisateurs", emojis: "Émojis", errorcolor: "Couleur des erreurs", prefix: "Préfixe", language: "Langue", locale: "Langue", timezone: "Fuseau horaire", message: "Message", title: "Titre", description: "Description", color: "Couleur", name: "Nom", reason: "Raison", status: "État", type: "Type", duration: "Durée", threshold: "Seuil", action: "Action", membercount: "Membres", channelscount: "Salons", rolescount: "Rôles", totalcommands: "Commandes au total", commandstoday: "Commandes aujourd'hui", pingms: "Latence", uptimems: "Temps en ligne", count: "Nombre", total: "Total", level: "Niveau", xp: "XP", welcomemessage: "Message de bienvenue", goodbyemessage: "Message de départ", dmenabled: "Message privé activé",
};
const WORDS: Record<string, string> = { channel: "salon", channels: "salons", role: "rôle", roles: "rôles", user: "utilisateur", users: "utilisateurs", log: "journal", logs: "journaux", message: "message", messages: "messages", enabled: "activé", max: "maximum", min: "minimum", per: "par", delay: "délai", time: "durée", days: "jours", hours: "heures", minutes: "minutes", seconds: "secondes", day: "jour", auto: "automatique", member: "membre", members: "membres", admin: "administrateur", staff: "équipe", ignored: "ignorés", allowed: "autorisés", whitelist: "liste blanche", blacklist: "liste noire", welcome: "bienvenue", goodbye: "départ", reward: "récompense", rewards: "récompenses", command: "commande", commands: "commandes", limit: "limite", cooldown: "délai", notify: "notifier" };

export function humanize(key: string): string {
  if (lang === "fr") {
    const normalized = key.replace(/[_\s-]/g, "").toLowerCase();
    const phrase = PHRASES[normalized] ?? LABELS[normalized];
    if (phrase) return phrase;
  }
  const words = key.replace(/_/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim().toLowerCase().split(" ").filter((word) => word !== "id" && word !== "ids");
  const text = (lang === "fr" ? words.map((word) => WORDS[word] ?? word) : words).join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const isEmpty = (value: Json | undefined) => value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0) || (typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length === 0);
const isIdLike = (key: string, value: Json) => /(^id$|Id$|_id$)/.test(key) || (typeof value === "string" && /^\d{16,}$/.test(value));

export function factsOf(value: Json): { key: string; value: Json }[] {
  const source = unwrapConfig(value).body;
  const facts: { key: string; value: Json }[] = [];
  for (const [key, item] of Object.entries(source)) {
    if (HIDDEN.has(key) || isIdLike(key, item) || isEmpty(item)) continue;
    if (typeof item === "number" || typeof item === "boolean" || (typeof item === "string" && item.length <= 40)) facts.push({ key, value: item });
    if (facts.length >= 8) break;
  }
  return facts;
}

export interface DirectoryEntry { id: string; name: string }
export interface Directory { channels: DirectoryEntry[]; roles: DirectoryEntry[] }

export function flattenEntries(value: Json, prefix = ""): DirectoryEntry[] {
  if (Array.isArray(value)) return value.flatMap((item) => flattenEntries(item, prefix));
  if (!value || typeof value !== "object") return [];
  const out: DirectoryEntry[] = [];
  if (typeof value.id === "string" && typeof value.name === "string") out.push({ id: value.id, name: prefix + value.name });
  for (const item of Object.values(value)) if (item && typeof item === "object") out.push(...flattenEntries(item, prefix));
  return out;
}

export function displayValue(value: Json | undefined): string {
  if (value === null || value === undefined || value === "") return "–";
  if (typeof value === "boolean") return value ? tr("Oui", "Yes") : tr("Non", "No");
  if (typeof value === "number") return value.toLocaleString(lang);
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toLocaleString(lang);
    }
    return (lang === "fr" ? VALUES[value] : undefined) ?? value;
  }
  if (Array.isArray(value)) return tr(`${value.length} élément${value.length > 1 ? "s" : ""}`, `${value.length} item${value.length > 1 ? "s" : ""}`);
  const entries = Object.entries(value);
  if (entries.length > 0 && entries.length <= 4 && entries.every(([, item]) => typeof item !== "object" || item === null)) return entries.map(([key, item]) => `${humanize(key)} : ${displayValue(item)}`).join(", ");
  return tr(`${entries.length} champs`, `${entries.length} fields`);
}

export function atPath(value: Json, path?: string | null): Json | undefined {
  if (!path) return value;
  let current: Json | undefined = value;
  for (const segment of path.split(".")) {
    if (current === null || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = current[segment];
  }
  return current;
}

export function firstArray(value: Json, key?: string | null): Json[] {
  const direct = atPath(value, key);
  if (Array.isArray(direct)) return direct;
  if (key) return [];
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    for (const name of ["data", "items", "results", "list", "rows"]) {
      const inner = value[name];
      if (Array.isArray(inner)) return inner;
      if (inner && typeof inner === "object") {
        const nested = firstArray(inner);
        if (nested.length) return nested;
      }
    }
    for (const inner of Object.values(value)) if (Array.isArray(inner)) return inner;
  }
  return [];
}

export function unwrapConfig(value: Json): { body: { [key: string]: Json }; wrapper: string | null } {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of ["config", "settings", "data"]) {
      const inner = value[key];
      if (inner && typeof inner === "object" && !Array.isArray(inner)) return { body: inner, wrapper: key };
    }
    return { body: value, wrapper: null };
  }
  return { body: {}, wrapper: null };
}

export const rowTitle = (row: Json): string => {
  if (row && typeof row === "object" && !Array.isArray(row)) {
    for (const key of TITLE_KEYS) {
      const value = row[key];
      if (typeof value === "string" && value) return value;
      if (typeof value === "number") return String(value);
    }
  }
  return typeof row === "string" || typeof row === "number" ? String(row) : tr("Élément", "Item");
};

export const rowSubtitle = (row: Json): string => {
  if (row && typeof row === "object" && !Array.isArray(row)) {
    const parts = SUB_KEYS.filter((key) => row[key] !== undefined && row[key] !== null && row[key] !== "").slice(0, 2).map((key) => displayValue(row[key]));
    return parts.join(", ");
  }
  return "";
};

export function JsonFields({ value }: { value: Json }) {
  if (value === null || typeof value !== "object") return <p className="generic-scalar">{displayValue(value)}</p>;
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item !== "object")) return <p className="generic-scalar">{value.map(displayValue).join(", ")}</p>;
    return <ul className="generic-nested">{value.slice(0, 100).map((item, index) => <li key={index}>{item && typeof item === "object" ? <JsonFields value={item} /> : displayValue(item)}</li>)}</ul>;
  }
  const entries = Object.entries(value).filter(([key, item]) => !HIDDEN.has(key) && !isEmpty(item) && !isIdLike(key, item));
  const plain = entries.filter(([, item]) => typeof item !== "object" || item === null);
  const nested = entries.filter(([, item]) => item && typeof item === "object");
  return (
    <div className="generic-view">
      {plain.length > 0 && <dl className="generic-fields">{plain.map(([key, item]) => <div key={key}><dt>{humanize(key)}</dt><dd>{fieldValue(key, item)}</dd></div>)}</dl>}
      {nested.map(([key, item]) => <details key={key} className="generic-details"><summary>{humanize(key)}<small>{displayValue(item)}</small></summary><JsonFields value={item} /></details>)}
    </div>
  );
}

const ENUMS: Record<string, [string, string][]> = {
  botpersonality: [["FRIENDLY", "Amical"], ["PROFESSIONAL", "Professionnel"], ["HUMOROUS", "Humoristique"], ["CONCISE", "Concis"], ["CYBER", "Cyber"]],
  themepreset: [["DEFAULT", "Par défaut"], ["CYBERPUNK", "Cyberpunk"], ["EMERALD", "Émeraude"], ["SUNSET", "Coucher de soleil"], ["DARK", "Sombre"]],
  responsevisibility: [["PUBLIC", "Visible par tous"], ["EPHEMERAL", "Visible par l'auteur seulement"]],
  activepreset: [["PRESET_BALANCED", "Équilibré"], ["PRESET_STRICT", "Strict"], ["PRESET_COMMUNITY", "Communauté"]],
  language: [["fr", "Français"], ["en", "English"], ["es", "Español"], ["de", "Deutsch"]],
  preferredlocale: [["fr", "Français"], ["en-US", "English (US)"], ["en-GB", "English (UK)"], ["es-ES", "Español"], ["de", "Deutsch"]],
  loglevel: [["debug", "Détaillé"], ["info", "Normal"], ["warn", "Avertissements"], ["error", "Erreurs seulement"]],
  defaultsafetylevel: [["SAFE", "Prudent"], ["STANDARD", "Standard"], ["DESTRUCTIVE", "Complet, peut supprimer"]],
  risksensitivity: [["low", "Faible"], ["standard", "Normale"], ["high", "Élevée"]],
  verificationlevel: [["0", "Aucun"], ["1", "Faible, e-mail vérifié"], ["2", "Moyen, inscrit depuis 5 minutes"], ["3", "Élevé, membre depuis 10 minutes"], ["4", "Maximum, téléphone vérifié"]],
  explicitcontentfilter: [["0", "Désactivé"], ["1", "Membres sans rôle"], ["2", "Tous les membres"]],
  defaultmessagenotifications: [["0", "Tous les messages"], ["1", "Mentions seulement"]],
};
const VALUES: Record<string, string> = { online: "En ligne", idle: "Absent", dnd: "Ne pas déranger", offline: "Hors ligne", invisible: "Invisible" };
const fieldValue = (key: string, item: Json) => (typeof item === "number" && /size$/i.test(key) ? formatBytes(item) : displayValue(item));
const isColorKey = (key: string) => /colou?r\d?$/i.test(key);
const READ_ONLY = /^(last|total|current|next|high|started|published)[A-Z]|(At|Count|Today|Masked)$/;
const ADVANCED = /(threshold|interval|retention|window|burst|strategy|regex|webhook|template|cooldown|seconds|minutes|hours|percent|multiplier|maximum|^max|^min)/i;

export function toHex(value: Json | undefined): string | null {
  if (typeof value === "number") return `#${Math.max(0, value).toString(16).padStart(6, "0").slice(0, 6)}`;
  if (typeof value !== "string") return null;
  const short = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
  const long = /^#?([0-9a-f]{6})/i.exec(value);
  return long ? `#${long[1]}`.toLowerCase() : null;
}

export function ColorField({ label, value, onChange }: { label: string; value: Json | undefined; onChange: (next: string) => void }) {
  const hex = toHex(value);
  return (
    <label className="color-field">
      <input type="color" value={hex ?? "#5865f2"} onChange={(event) => onChange(event.target.value)} />
      <span>{label}</span>
      <small>{hex ? hex.toUpperCase() : tr("Par défaut", "Default")}</small>
    </label>
  );
}

export function ConfigForm({ value, onSave, directory }: { value: { [key: string]: Json }; onSave: (next: { [key: string]: Json }) => Promise<void>; directory?: Directory }) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setDraft(value), [value]);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(value), [draft, value]);
  const change = (path: string[], next: Json) => {
    setDraft((current) => {
      const copy = structuredClone(current);
      let node = copy as { [key: string]: Json };
      for (const segment of path.slice(0, -1)) node = node[segment] as { [key: string]: Json };
      node[path[path.length - 1]] = next;
      return copy;
    });
  };
  const pick = (key: string, entries: DirectoryEntry[], current: string, next: string[], id: string, sign: string) => (
    <label key={id} className="kit-field"><span>{humanize(key)}</span>
      <select value={current} onChange={(event) => change(next, event.target.value || null)}>
        <option value="">{tr("Aucun", "None")}</option>
        {!entries.some((entry) => entry.id === current) && current && <option value={current}>{current}</option>}
        {entries.map((entry) => <option key={entry.id} value={entry.id}>{sign}{entry.name}</option>)}
      </select>
    </label>
  );
  const pickMany = (key: string, entries: DirectoryEntry[], current: string[], next: string[], id: string, sign: string) => (
    <div key={id} className="kit-field"><span>{humanize(key)}</span>
      <div className="generic-chips">
        {current.map((item) => <button key={item} type="button" title={tr("Retirer", "Remove")} onClick={() => change(next, current.filter((other) => other !== item))}>{sign}{entries.find((entry) => entry.id === item)?.name ?? item} ×</button>)}
        <select value="" aria-label={tr(`Ajouter : ${humanize(key)}`, `Add: ${humanize(key)}`)} onChange={(event) => event.target.value && change(next, [...current, event.target.value])}>
          <option value="">{tr("Ajouter…", "Add…")}</option>
          {entries.filter((entry) => !current.includes(entry.id)).map((entry) => <option key={entry.id} value={entry.id}>{sign}{entry.name}</option>)}
        </select>
      </div>
    </div>
  );
  const render = (node: { [key: string]: Json }, path: string[]) => {
    return fields(Object.entries(node).filter(([key]) => !HIDDEN.has(key) && !READ_ONLY.test(key)), path);
  };
  const fields = (entries: [string, Json][], path: string[]) => {
    const rank = ([key, item]: [string, Json]) => (typeof item === "boolean" ? 0 : isColorKey(key) ? 1 : item && typeof item === "object" && !Array.isArray(item) ? 3 : 2);
    return [...entries].sort((left, right) => rank(left) - rank(right)).map(([key, item]) => {
      const next = [...path, key];
      const id = next.join(".");
      const lower = key.toLowerCase();
      if (isColorKey(key) && (typeof item === "string" || typeof item === "number" || item === null)) {
        return <ColorField key={id} label={humanize(key)} value={item} onChange={(hex) => change(next, typeof item === "number" ? parseInt(hex.slice(1), 16) : hex)} />;
      }
      const choices = lower === "timezone" ? Intl.supportedValuesOf("timeZone").map((zone): [string, string] => [zone, zone]) : ENUMS[lower];
      if (choices && (typeof item === "string" || typeof item === "number" || item === null)) {
        const current = item === null ? "" : String(item);
        return (
          <label key={id} className="kit-field"><span>{humanize(key)}</span>
            <select value={current} onChange={(event) => change(next, typeof item === "number" ? Number(event.target.value) : event.target.value)}>
              {!choices.some(([option]) => option === current) && <option value={current}>{current || tr("Par défaut", "Default")}</option>}
              {choices.map(([option, label]) => <option key={option} value={option}>{label}</option>)}
            </select>
          </label>
        );
      }
      if (typeof item === "boolean") {
        return <label key={id} className="generic-toggle"><span>{humanize(key)}</span><input type="checkbox" role="switch" checked={item} onChange={(event) => change(next, event.target.checked)} /></label>;
      }
      if (typeof item === "number") {
        return <label key={id} className="kit-field"><span>{humanize(key)}</span><input type="number" value={item} onChange={(event) => change(next, Number(event.target.value))} /></label>;
      }
      if (directory && (typeof item === "string" || item === null) && lower.endsWith("channelid")) return pick(key, directory.channels, item ?? "", next, id, "#");
      if (directory && (typeof item === "string" || item === null) && lower.endsWith("roleid")) return pick(key, directory.roles, item ?? "", next, id, "@");
      if (typeof item === "string" || item === null) {
        const text = item ?? "";
        return <label key={id} className="kit-field"><span>{humanize(key)}</span>{text.length > 80 ? <textarea rows={4} value={text} onChange={(event) => change(next, event.target.value)} /> : <input value={text} onChange={(event) => change(next, event.target.value)} />}</label>;
      }
      if (Array.isArray(item)) {
        if (item.every((entry) => typeof entry === "string" || typeof entry === "number")) {
          const values = item.map(String);
          if (directory && /channels?(ids)?$/.test(lower)) return pickMany(key, directory.channels, values, next, id, "#");
          if (directory && /roles?(ids)?$/.test(lower)) return pickMany(key, directory.roles, values, next, id, "@");
          return <label key={id} className="kit-field"><span>{humanize(key)}</span><textarea rows={2} value={item.join("\n")} placeholder={tr("Une valeur par ligne", "One value per line")} onChange={(event) => change(next, event.target.value.split("\n").map((line) => line.trim()).filter(Boolean))} /></label>;
        }
        return null;
      }
      return <details key={id} className="generic-details"><summary>{humanize(key)}</summary><div className="generic-form-grid">{render(item, next)}</div></details>;
    });
  };
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      toast(tr("Réglages enregistrés", "Settings saved"));
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setSaving(false);
    }
  };
  const visible = Object.entries(draft).filter(([key, item]) => !HIDDEN.has(key) && !READ_ONLY.test(key) && !(Array.isArray(item) && item.some((entry) => entry !== null && typeof entry === "object")));
  if (visible.length === 0) return <p className="muted">{tr("Aucun réglage disponible.", "No settings available.")}</p>;
  const advanced = (key: string, item: Json) => (item !== null && typeof item === "object" && !Array.isArray(item)) || (typeof item !== "boolean" && !isColorKey(key) && ADVANCED.test(key));
  const main = visible.filter(([key, item]) => !advanced(key, item));
  const more = visible.filter(([key, item]) => advanced(key, item));
  const master = main.filter(([key]) => key === "enabled");
  const rest = main.filter(([key]) => key !== "enabled");
  return (
    <div className="generic-form">
      {master.length > 0 && <div className="generic-master">{fields(master, [])}</div>}
      {rest.length > 0 && <div className="generic-form-grid">{fields(rest, [])}</div>}
      {more.length > 0 && <details className="generic-more" open={rest.length < 3}><summary>{tr(`Options avancées (${more.length})`, `Advanced options (${more.length})`)}</summary><div className="generic-form-grid">{fields(more, [])}</div></details>}
      {error && <ErrorBox message={error} />}
      <AnimatePresence initial={false}>
        {dirty && (
          <motion.div className="generic-savebar" initial={{ opacity: 0, transform: "translateY(8px)" }} animate={{ opacity: 1, transform: "translateY(0px)" }} exit={{ opacity: 0, transform: "translateY(8px)" }} transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}>
            <span>{tr("Modifications non enregistrées", "Unsaved changes")}</span>
            <Button disabled={saving} onClick={() => setDraft(value)}>{tr("Annuler", "Discard")}</Button>
            <Button variant="primary" disabled={saving} onClick={() => void save()}>{saving ? tr("Enregistrement…", "Saving…") : tr("Enregistrer", "Save")}</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface RowAction<T> {
  title: string;
  destructive?: boolean;
  prompt?: string;
  run: (row: T, text?: string) => Promise<unknown>;
}

export function JsonList({ rows, actions = [], onChanged, emptyTitle, emptyText, onOpen }: { rows: Json[]; actions?: RowAction<Json>[]; onChanged?: () => void; emptyTitle?: string; emptyText?: string; onOpen?: (row: Json) => void }) {
  const [open, setOpen] = useState<Json | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [text, setText] = useState("");
  if (rows.length === 0) return <Empty title={emptyTitle ?? tr("Rien pour l'instant", "Nothing yet")} text={emptyText} />;
  const run = async (action: RowAction<Json>, row: Json) => {
    setBusy(true);
    setError(null);
    try {
      await action.run(row, text.trim());
      toast(tr(`Fait : ${action.title}`, `Done: ${action.title}`));
      setOpen(null);
      setConfirm(null);
      setAsking(null);
      setText("");
      onChanged?.();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Stagger className="generic-list">
        {rows.slice(0, 300).map((row, index) => (
          <StaggerItem key={index} variants={staggerItem}>
            <button type="button" onClick={() => (onOpen ? onOpen(row) : setOpen(row))}>
              <b>{rowTitle(row)}</b>
              {rowSubtitle(row) && <small>{rowSubtitle(row)}</small>}
            </button>
          </StaggerItem>
        ))}
      </Stagger>
      <Drawer open={open !== null} title={open === null ? "" : rowTitle(open)} onClose={() => { setOpen(null); setConfirm(null); setAsking(null); setError(null); }}>
        {open !== null && <JsonFields value={open} />}
        {error && <ErrorBox message={error} />}
        {actions.length > 0 && open !== null && (
          <div className="row generic-actions">
            {actions.map((action) => asking === action.title ? (
              <form key={action.title} className="row" onSubmit={(event) => { event.preventDefault(); if (text.trim()) void run(action, open); }}>
                <input className="generic-prompt" autoFocus value={text} placeholder={action.prompt} aria-label={action.prompt} onChange={(event) => setText(event.target.value)} />
                <Button type="submit" variant="primary" disabled={busy || !text.trim()}>{action.title}</Button>
                <Button onClick={() => setAsking(null)}>{tr("Annuler", "Cancel")}</Button>
              </form>
            ) : confirm === action.title ? (
              <span key={action.title} className="row">
                <span className="bad">{tr("Confirmer ?", "Confirm?")}</span>
                <Button onClick={() => setConfirm(null)}>{tr("Annuler", "Cancel")}</Button>
                <Button disabled={busy} className="danger" onClick={() => void run(action, open)}>{action.title}</Button>
              </span>
            ) : (
              <Button key={action.title} disabled={busy} className={action.destructive ? "danger" : ""} onClick={() => (action.prompt ? setAsking(action.title) : action.destructive ? setConfirm(action.title) : void run(action, open))}>{action.title}</Button>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}
