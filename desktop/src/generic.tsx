import { useEffect, useMemo, useState } from "react";
import { errorText, tr } from "./i18n";
import { Drawer, Empty, ErrorBox, Stagger, StaggerItem, staggerItem } from "./kit";
import { Button } from "./ui";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const TITLE_KEYS = ["title", "name", "label", "subject", "prize", "displayName", "userTag", "tag", "username", "guildName", "email", "id"];
const SUB_KEYS = ["status", "type", "category", "description", "reason", "authorTag", "action", "createdAt", "created_at", "updatedAt"];
const HIDDEN = new Set(["__v", "_id"]);

export function humanize(key: string): string {
  const text = key.replace(/_/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function displayValue(value: Json | undefined): string {
  if (value === null || value === undefined || value === "") return "–";
  if (typeof value === "boolean") return value ? tr("Oui", "Yes") : tr("Non", "No");
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toLocaleString();
    }
    return value;
  }
  if (Array.isArray(value)) return tr(`${value.length} élément${value.length > 1 ? "s" : ""}`, `${value.length} item${value.length > 1 ? "s" : ""}`);
  return tr(`${Object.keys(value).length} champs`, `${Object.keys(value).length} fields`);
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
    return <ul className="generic-nested">{value.slice(0, 200).map((item, index) => <li key={index}>{item && typeof item === "object" ? <JsonFields value={item} /> : displayValue(item)}</li>)}</ul>;
  }
  const entries = Object.entries(value).filter(([key]) => !HIDDEN.has(key));
  return (
    <dl className="generic-fields">
      {entries.map(([key, item]) => (
        <div key={key} className={item && typeof item === "object" ? "block" : ""}>
          <dt>{humanize(key)}</dt>
          <dd>{item && typeof item === "object" ? (Object.keys(item).length ? <JsonFields value={item} /> : "–") : displayValue(item)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ConfigForm({ value, onSave }: { value: { [key: string]: Json }; onSave: (next: { [key: string]: Json }) => Promise<void> }) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(value), [value]);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(value), [draft, value]);
  const change = (path: string[], next: Json) => {
    setSaved(false);
    setDraft((current) => {
      const copy = structuredClone(current);
      let node = copy as { [key: string]: Json };
      for (const segment of path.slice(0, -1)) node = node[segment] as { [key: string]: Json };
      node[path[path.length - 1]] = next;
      return copy;
    });
  };
  const render = (node: { [key: string]: Json }, path: string[]) =>
    Object.entries(node).filter(([key]) => !HIDDEN.has(key) && key !== "guildId" && key !== "id" && key !== "createdAt" && key !== "updatedAt").map(([key, item]) => {
      const next = [...path, key];
      const id = next.join(".");
      if (typeof item === "boolean") {
        return <label key={id} className="generic-toggle"><span>{humanize(key)}</span><input type="checkbox" role="switch" checked={item} onChange={(event) => change(next, event.target.checked)} /></label>;
      }
      if (typeof item === "number") {
        return <label key={id} className="kit-field"><span>{humanize(key)}</span><input type="number" value={item} onChange={(event) => change(next, Number(event.target.value))} /></label>;
      }
      if (typeof item === "string" || item === null) {
        const text = item ?? "";
        return <label key={id} className="kit-field"><span>{humanize(key)}</span>{text.length > 80 ? <textarea rows={4} value={text} onChange={(event) => change(next, event.target.value)} /> : <input value={text} onChange={(event) => change(next, event.target.value)} />}</label>;
      }
      if (Array.isArray(item)) {
        if (item.every((entry) => typeof entry === "string" || typeof entry === "number")) {
          return <label key={id} className="kit-field"><span>{humanize(key)}</span><textarea rows={2} value={item.join("\n")} placeholder={tr("Une valeur par ligne", "One value per line")} onChange={(event) => change(next, event.target.value.split("\n").map((line) => line.trim()).filter(Boolean))} /></label>;
        }
        return <div key={id} className="generic-readonly"><span>{humanize(key)}</span><JsonFields value={item} /></div>;
      }
      return <fieldset key={id} className="generic-group"><legend>{humanize(key)}</legend>{render(item, next)}</fieldset>;
    });
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setSaved(true);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setSaving(false);
    }
  };
  if (Object.keys(draft).length === 0) return <p className="muted">{tr("Aucun réglage disponible.", "No settings available.")}</p>;
  return (
    <div className="generic-form">
      {render(draft, [])}
      {error && <ErrorBox message={error} />}
      <div className="row">
        <Button variant="primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? tr("Enregistrement…", "Saving…") : tr("Enregistrer", "Save")}</Button>
        {saved && !dirty && <span className="ok">{tr("Enregistré.", "Saved.")}</span>}
      </div>
    </div>
  );
}

export interface RowAction<T> {
  title: string;
  destructive?: boolean;
  run: (row: T) => Promise<unknown>;
}

export function JsonList({ rows, actions = [], onChanged, emptyTitle, emptyText, onOpen }: { rows: Json[]; actions?: RowAction<Json>[]; onChanged?: () => void; emptyTitle?: string; emptyText?: string; onOpen?: (row: Json) => void }) {
  const [open, setOpen] = useState<Json | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (rows.length === 0) return <Empty title={emptyTitle ?? tr("Rien pour l'instant", "Nothing yet")} text={emptyText} />;
  const run = async (action: RowAction<Json>, row: Json) => {
    setBusy(true);
    setError(null);
    try {
      await action.run(row);
      setOpen(null);
      setConfirm(null);
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
      <Drawer open={open !== null} title={open === null ? "" : rowTitle(open)} onClose={() => { setOpen(null); setConfirm(null); setError(null); }}>
        {open !== null && <JsonFields value={open} />}
        {error && <ErrorBox message={error} />}
        {actions.length > 0 && open !== null && (
          <div className="row generic-actions">
            {actions.map((action) => confirm === action.title ? (
              <span key={action.title} className="row">
                <span className="bad">{tr("Confirmer ?", "Confirm?")}</span>
                <Button onClick={() => setConfirm(null)}>{tr("Annuler", "Cancel")}</Button>
                <Button disabled={busy} className="danger" onClick={() => void run(action, open)}>{action.title}</Button>
              </span>
            ) : (
              <Button key={action.title} disabled={busy} className={action.destructive ? "danger" : ""} onClick={() => (action.destructive ? setConfirm(action.title) : void run(action, open))}>{action.title}</Button>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}
