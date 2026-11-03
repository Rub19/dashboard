import { CSSProperties, FormEvent, useEffect, useState } from "react";
import { contextMenu, copyText, toast } from "./qol";
import { usePersisted } from "./qol";
import { ArrowLeft, Check, Archive, Clock, Copy, Inbox, MailOpen, Minus, Paperclip, PenLine, RefreshCw, Reply, Search, Send, ShieldAlert, Star, Trash2, X } from "lucide-react";
import { apiCall, apiData } from "./api";
import { firstArray, Json, JsonList } from "./generic";
import { errorText, tr, lang } from "./i18n";
import { Drawer, Empty, ErrorBox, Field, PageHead, SideNav, Skeletons, Status, useLoad } from "./kit";
import { Button } from "./ui";
import { mailInitials, mailSenderHue, mailTime } from "./mail";

interface Message { id: string; thread_id: string; folder: string; direction: string; from_address: string; from_name?: string; to_addresses: string[]; subject: string; body_text?: string; body_html?: string; snippet?: string; is_read: boolean; is_starred: boolean; received_at: string; sent_at?: string; attachments?: { filename: string; size: number }[] }

type Folder = "inbox" | "sent" | "drafts" | "archive" | "spam" | "trash";
type Section = Folder | "contacts" | "aliases" | "labels" | "rules" | "templates" | "signatures";

const FOLDERS: { id: Folder; label: () => string; icon: React.ReactNode }[] = [
  { id: "inbox", label: () => tr("Réception", "Inbox"), icon: <Inbox size={16} /> },
  { id: "sent", label: () => tr("Envoyés", "Sent"), icon: <Send size={16} /> },
  { id: "drafts", label: () => tr("Brouillons", "Drafts"), icon: <PenLine size={16} /> },
  { id: "archive", label: () => tr("Archives", "Archive"), icon: <Archive size={16} /> },
  { id: "spam", label: () => tr("Indésirables", "Spam"), icon: <ShieldAlert size={16} /> },
  { id: "trash", label: () => tr("Corbeille", "Trash"), icon: <Trash2 size={16} /> },
];

function htmlToText(html: string): string {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  parsed.querySelectorAll("script,style,head").forEach((node) => node.remove());
  parsed.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
  parsed.querySelectorAll("p,div,tr,li,h1,h2,h3").forEach((node) => node.append("\n"));
  return (parsed.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

function Compose({ open, initial, onClose, onSent }: { open: boolean; initial: { to: string; subject: string; body: string; inReplyTo?: string }; onClose: () => void; onSent: () => void }) {
  const [to, setTo] = useState(initial.to);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [when, setWhen] = useState("");
  useEffect(() => {
    if (!open) return;
    setTo(initial.to);
    setSubject(initial.subject);
    setBody(initial.body);
    setError(null);
  }, [initial, open]);
  const send = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const recipients = to.split(/[,;]/).map((item) => item.trim()).filter(Boolean);
      if (when) await apiData("api/mail/schedule", "POST", { to: recipients, subject, text: body, scheduled_at: new Date(when).toISOString() });
      else await apiData("api/mail/send", "POST", { to: recipients, subject, text: body, in_reply_to: initial.inReplyTo });
      onSent();
      onClose();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Drawer open={open} title={tr("Nouveau message", "New message")} onClose={onClose} width={620}>
      <form className="mail-compose" onSubmit={(event) => void send(event)}>
        <Field label={tr("À", "To")}><input type="text" required value={to} autoComplete="off" onChange={(event) => setTo(event.target.value)} /></Field>
        <Field label={tr("Objet", "Subject")}><input value={subject} onChange={(event) => setSubject(event.target.value)} /></Field>
        <Field label={tr("Message", "Message")}><textarea rows={14} required value={body} onChange={(event) => setBody(event.target.value)} /></Field>
        <Field label={tr("Envoyer plus tard (facultatif)", "Send later (optional)")}><input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} /></Field>
        {error && <ErrorBox message={error} />}
        <div className="row"><Button type="submit" variant="primary" disabled={busy || !to.trim()}><Send size={15} />{busy ? tr("Envoi…", "Sending…") : when ? tr("Programmer", "Schedule") : tr("Envoyer", "Send")}</Button></div>
      </form>
    </Drawer>
  );
}

function Folder({ folder, onCompose }: { folder: Folder; onCompose: (draft: { to: string; subject: string; body: string; inReplyTo?: string }) => void }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Message | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const state = useLoad(async () => {
    const params = new URLSearchParams(search ? { q: search, limit: "50" } : { folder, limit: "50" });
    return firstArray(await apiCall<Json>(`api/mail/${search ? "search" : "inbox"}?${params}`)) as unknown as Message[];
  }, [folder, search]);
  const read = (message: Message) => {
    setOpen(message);
    if (!message.body_text && !message.body_html && message.thread_id) {
      void apiCall<Json>(`api/mail/thread?thread_id=${encodeURIComponent(message.thread_id)}`).then((thread) => {
        const full = (firstArray(thread) as unknown as Message[]).find((item) => item.id === message.id);
        if (full) setOpen((current) => (current?.id === message.id ? { ...current, ...full } : current));
      }).catch(() => null);
    }
    if (!message.is_read) void apiData("api/mail/read", "POST", { id: message.id, is_read: true }).then(state.reload).catch(() => null);
  };
  const act = async (run: () => Promise<unknown>) => {
    setError(null);
    try {
      await run();
      setOpen(null);
      state.reload();
    } catch (reason) {
      setError(errorText(reason));
    }
  };
  const move = (message: Message, target: string, done: string) => {
    void act(() => apiData("api/mail/move", "POST", { ids: [message.id], folder: target })).then(() => toast(done, { action: { label: tr("Annuler", "Undo"), run: () => void act(() => apiData("api/mail/move", "POST", { ids: [message.id], folder })) } }));
  };
  const pick = (id: string) => setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  const moveMany = (target: string, done: string) => {
    const ids = picked;
    setPicked([]);
    void act(() => apiData("api/mail/move", "POST", { ids, folder: target })).then(() => toast(done, { action: { label: tr("Annuler", "Undo"), run: () => void act(() => apiData("api/mail/move", "POST", { ids, folder })) } }));
  };
  const readMany = () => {
    const ids = picked;
    setPicked([]);
    void act(() => Promise.all(ids.map((id) => apiData("api/mail/read", "POST", { id, is_read: true }))));
  };
  const star = (message: Message) => void apiData("api/mail/read", "POST", { id: message.id, is_starred: !message.is_starred }).then(state.reload, (reason) => setError(errorText(reason)));
  const content = open ? (open.body_text?.trim() || (open.body_html ? htmlToText(open.body_html) : open.snippet ?? "")) : "";
  const sender = (message: Message) => message.direction === "outbound" ? (message.to_addresses?.[0] ?? "") : message.from_name || message.from_address;
  const rows = state.data ?? [];
  const allPicked = rows.length > 0 && picked.length === rows.length;
  const reply = (message: Message, body = "") => onCompose({ to: message.from_address, subject: message.subject.startsWith("Re:") ? message.subject : `Re: ${message.subject}`, body, inReplyTo: message.id });
  const iconButton = (label: string, icon: React.ReactNode, run: () => void, danger = false) => <button type="button" className={danger ? "gm-icon danger" : "gm-icon"} aria-label={label} title={label} onClick={run}>{icon}</button>;
  if (open) {
    const when = new Date(open.received_at ?? open.sent_at ?? "");
    return (
      <div className="gm-view">
        <div className="gm-toolbar">
          {iconButton(tr("Retour à la liste", "Back to the list"), <ArrowLeft size={17} />, () => setOpen(null))}
          <span className="gm-sep" />
          {folder !== "archive" && iconButton(tr("Archiver", "Archive"), <Archive size={16} />, () => move(open, "archive", tr("Message archivé", "Message archived")))}
          {folder !== "trash" && iconButton(tr("Corbeille", "Trash"), <Trash2 size={16} />, () => move(open, "trash", tr("Message mis à la corbeille", "Message moved to trash")))}
          {iconButton(tr("Reporter à demain 9 h", "Snooze until tomorrow 9 am"), <Clock size={16} />, () => { const date = new Date(); date.setDate(date.getDate() + 1); date.setHours(9, 0, 0, 0); void act(() => apiData("api/mail/snooze", "POST", { id: open.id, snoozed_until: date.toISOString() })); })}
          {iconButton(tr("Copier l'adresse", "Copy address"), <Copy size={16} />, () => void copyText(open.from_address, tr("Adresse copiée", "Address copied")))}
        </div>
        {error && <ErrorBox message={error} />}
        <article className="gm-message">
          <h1>{open.subject || tr("(sans objet)", "(no subject)")}</h1>
          <header>
            <span className="mail-avatar large" style={{ "--mail-hue": mailSenderHue(open.from_address) } as CSSProperties}>{mailInitials(open.from_name, open.from_address)}</span>
            <span className="gm-from"><b>{open.from_name || open.from_address}</b><small>{open.from_name ? open.from_address : ""}{open.to_addresses?.length ? ` ${tr("à", "to")} ${open.to_addresses.join(", ")}` : ""}</small></span>
            <time>{Number.isNaN(when.getTime()) ? "" : when.toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" })}</time>
            {iconButton(open.is_starred ? tr("Retirer l'étoile", "Unstar") : tr("Ajouter une étoile", "Star"), <Star size={16} fill={open.is_starred ? "currentColor" : "none"} />, () => { star(open); setOpen({ ...open, is_starred: !open.is_starred }); })}
          </header>
          {(open.attachments?.length ?? 0) > 0 && <ul className="mail-attachments">{open.attachments?.map((item) => <li key={item.filename}><Paperclip size={14} /><span><b>{item.filename}</b><small>{Math.max(1, Math.round(item.size / 1024))} Ko</small></span></li>)}</ul>}
          {content ? <pre className="mail-body">{content}</pre> : <p className="muted">{tr("Ce message ne contient pas de texte.", "This message has no text.")}</p>}
          <footer><Button onClick={() => reply(open, `\n\n> ${content.split("\n").join("\n> ")}`)}><Reply size={15} />{tr("Répondre", "Reply")}</Button></footer>
        </article>
      </div>
    );
  }
  return (
    <div className="gm-view">
      <div className="gm-top">
        <form className="gm-search" onSubmit={(event) => { event.preventDefault(); setSearch(query.trim()); }}>
          <Search size={16} />
          <input value={query} placeholder={tr("Rechercher dans les messages", "Search mail")} aria-label={tr("Rechercher dans les messages", "Search mail")} onChange={(event) => setQuery(event.target.value)} />
          {search && <button type="button" aria-label={tr("Effacer la recherche", "Clear search")} onClick={() => { setQuery(""); setSearch(""); }}><X size={15} /></button>}
        </form>
        <Button variant="primary" onClick={() => onCompose({ to: "", subject: "", body: "" })}><PenLine size={15} />{tr("Nouveau message", "Compose")}</Button>
      </div>
      <div className="gm-toolbar">
        <button type="button" className={allPicked ? "gm-check on" : picked.length ? "gm-check some" : "gm-check"} role="checkbox" aria-checked={allPicked ? true : picked.length ? "mixed" : false} aria-label={tr("Tout sélectionner", "Select all")} title={tr("Tout sélectionner", "Select all")} onClick={() => setPicked(picked.length ? [] : rows.map((message) => message.id))}>{allPicked ? <Check size={12} /> : picked.length ? <Minus size={12} /> : null}</button>
        {picked.length > 0 ? (
          <>
            <small className="gm-count">{tr(`${picked.length} sélectionné(s)`, `${picked.length} selected`)}</small>
            <span className="gm-sep" />
            {folder !== "archive" && iconButton(tr("Archiver", "Archive"), <Archive size={16} />, () => moveMany("archive", tr("Messages archivés", "Messages archived")))}
            {folder !== "trash" && iconButton(tr("Corbeille", "Trash"), <Trash2 size={16} />, () => moveMany("trash", tr("Messages mis à la corbeille", "Messages moved to trash")))}
            {iconButton(tr("Marquer comme lu", "Mark as read"), <MailOpen size={16} />, readMany)}
          </>
        ) : iconButton(tr("Actualiser", "Refresh"), <RefreshCw size={15} className={state.loading ? "spin" : ""} />, state.reload)}
        <small className="gm-range">{rows.length ? tr(`${rows.length} message(s)`, `${rows.length} message(s)`) : ""}</small>
      </div>
      {(error || state.error) && <ErrorBox message={error ?? state.error ?? ""} onRetry={state.reload} />}
      {!state.data ? (state.loading ? <Skeletons count={8} height={40} /> : null) : rows.length === 0 ? <Empty title={search ? tr("Aucun résultat", "No results") : tr("Aucun message", "No messages")} /> : (
        <ul className="gm-list">
          {rows.map((message) => {
            const isPicked = picked.includes(message.id);
            return (
              <li key={message.id} className={`${message.is_read ? "" : "unread"} ${isPicked ? "picked" : ""}`} onContextMenu={(event) => contextMenu(event, [
                { label: tr("Ouvrir", "Open"), run: () => read(message) },
                { label: tr("Répondre", "Reply"), run: () => reply(message) },
                { label: tr("Copier l'adresse", "Copy address"), run: () => void copyText(message.from_address, tr("Adresse copiée", "Address copied")) },
                ...(folder !== "archive" ? [{ label: tr("Archiver", "Archive"), run: () => move(message, "archive", tr("Message archivé", "Message archived")) }] : []),
                ...(folder !== "trash" ? [{ label: tr("Corbeille", "Trash"), danger: true, run: () => move(message, "trash", tr("Message mis à la corbeille", "Message moved to trash")) }] : []),
              ])}>
                <button type="button" className={isPicked ? "gm-check on" : "gm-check"} role="checkbox" aria-checked={isPicked} aria-label={tr(`Sélectionner ${message.subject || "ce message"}`, `Select ${message.subject || "this message"}`)} onClick={() => pick(message.id)}>{isPicked && <Check size={12} />}</button>
                <button type="button" className={message.is_starred ? "gm-star on" : "gm-star"} aria-pressed={Boolean(message.is_starred)} aria-label={message.is_starred ? tr("Retirer l'étoile", "Unstar") : tr("Ajouter une étoile", "Star")} onClick={() => star(message)}><Star size={15} fill={message.is_starred ? "currentColor" : "none"} /></button>
                <button type="button" className="gm-open" onClick={() => read(message)}>
                  <span className="gm-sender">{sender(message)}</span>
                  <span className="gm-line"><b>{message.subject || tr("(sans objet)", "(no subject)")}</b>{message.snippet && <small>{message.snippet}</small>}</span>
                  {(message.attachments?.length ?? 0) > 0 && <Paperclip size={13} className="gm-clip" />}
                  <time>{mailTime(message.received_at ?? message.sent_at ?? "", new Date(), lang)}</time>
                </button>
                <span className="gm-actions">
                  {folder !== "archive" && iconButton(tr("Archiver", "Archive"), <Archive size={15} />, () => move(message, "archive", tr("Message archivé", "Message archived")))}
                  {folder !== "trash" && iconButton(tr("Corbeille", "Trash"), <Trash2 size={15} />, () => move(message, "trash", tr("Message mis à la corbeille", "Message moved to trash")))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface ManageField { key: string; label: string; multiline?: boolean }

function Remote({ title, path, fields, deletable }: { title: string; path: string; fields?: ManageField[]; deletable?: boolean }) {
  const state = useLoad(() => apiCall<Json>(path), [path]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const ready = (fields ?? []).every((field) => (values[field.key] ?? "").trim());
  const add = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    apiData(path, "POST", values).then(() => { setValues({}); state.reload(); }, (reason) => setError(errorText(reason)));
  };
  return (
    <>
      <PageHead title={title} onRefresh={state.reload} refreshing={state.loading} />
      {fields && (
        <form className="mail-manage" onSubmit={add}>
          {fields.map((field) => <Field key={field.key} label={field.label}>{field.multiline ? <textarea rows={4} value={values[field.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} /> : <input value={values[field.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />}</Field>)}
          <div className="row"><Button type="submit" variant="primary" disabled={!ready}>{tr("Ajouter", "Add")}</Button></div>
        </form>
      )}
      {error && <ErrorBox message={error} />}
      <Status state={state}>{(data) => <JsonList rows={firstArray(data)} onChanged={state.reload} actions={deletable ? [{ title: tr("Supprimer", "Delete"), destructive: true, run: (row) => apiData(path, "DELETE", { id: row && typeof row === "object" && !Array.isArray(row) ? row.id : null }) }] : []} />}</Status>
    </>
  );
}

export default function MailPage() {
  const [section, setSection] = usePersisted<Section>("ethone-section-mail", "inbox");
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState<{ to: string; subject: string; body: string; inReplyTo?: string }>({ to: "", subject: "", body: "" });
  const [version, setVersion] = useState(0);
  const items = [
    ...FOLDERS.map((folder) => ({ id: folder.id as Section, label: folder.label(), icon: folder.icon, group: tr("Messages", "Messages") })),
    { id: "contacts" as Section, label: tr("Contacts", "Contacts"), group: tr("Gestion", "Manage") },
    { id: "aliases" as Section, label: tr("Adresses", "Addresses"), group: tr("Gestion", "Manage") },
    { id: "labels" as Section, label: tr("Étiquettes", "Labels"), group: tr("Gestion", "Manage") },
    { id: "rules" as Section, label: tr("Règles", "Rules"), group: tr("Gestion", "Manage") },
    { id: "templates" as Section, label: tr("Modèles", "Templates"), group: tr("Gestion", "Manage") },
    { id: "signatures" as Section, label: tr("Signatures", "Signatures"), group: tr("Gestion", "Manage") },
  ];
  const isFolder = FOLDERS.some((folder) => folder.id === section);
  const paths: Partial<Record<Section, { title: string; path: string; fields?: ManageField[]; deletable?: boolean }>> = {
    contacts: { title: tr("Contacts", "Contacts"), path: "api/mail/contacts" },
    aliases: { title: tr("Adresses", "Addresses"), path: "api/mail/alias" },
    labels: { title: tr("Étiquettes", "Labels"), path: "api/mail/labels", deletable: true, fields: [{ key: "name", label: tr("Nom", "Name") }] },
    rules: { title: tr("Règles", "Rules"), path: "api/mail/rules" },
    templates: { title: tr("Modèles", "Templates"), path: "api/mail/templates", deletable: true, fields: [{ key: "name", label: tr("Nom", "Name") }, { key: "subject", label: tr("Objet", "Subject") }, { key: "content", label: tr("Contenu", "Content"), multiline: true }] },
    signatures: { title: tr("Signatures", "Signatures"), path: "api/mail/signatures", deletable: true, fields: [{ key: "name", label: tr("Nom", "Name") }, { key: "content", label: tr("Contenu", "Content"), multiline: true }] },
  };
  return (
    <div className="kit-split">
      <SideNav items={items} value={section} onChange={setSection} id="mail" label="Mail" />
      <div className="kit-split-body">
        {isFolder ? <Folder key={`${section}-${version}`} folder={section as Folder} onCompose={(next) => { setDraft(next); setComposing(true); }} /> : paths[section] && <Remote {...paths[section]} />}
      </div>
      <Compose open={composing} initial={draft} onClose={() => setComposing(false)} onSent={() => setVersion((value) => value + 1)} />
    </div>
  );
}
