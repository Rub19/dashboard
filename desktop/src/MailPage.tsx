import { FormEvent, useEffect, useState } from "react";
import { Archive, Inbox, PenLine, Reply, Search, Send, ShieldAlert, Star, Trash2 } from "lucide-react";
import { apiCall, apiData } from "./api";
import { firstArray, Json, JsonList } from "./generic";
import { errorText, tr } from "./i18n";
import { Drawer, Empty, ErrorBox, Field, PageHead, SideNav, Skeletons, Stagger, StaggerItem, staggerItem, Status, useLoad } from "./kit";
import { Button } from "./ui";

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
      await apiData("api/mail/send", "POST", { to: to.split(/[,;]/).map((item) => item.trim()).filter(Boolean), subject, text: body, in_reply_to: initial.inReplyTo });
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
        {error && <ErrorBox message={error} />}
        <div className="row"><Button type="submit" variant="primary" disabled={busy || !to.trim()}><Send size={15} />{busy ? tr("Envoi…", "Sending…") : tr("Envoyer", "Send")}</Button></div>
      </form>
    </Drawer>
  );
}

function Folder({ folder, onCompose }: { folder: Folder; onCompose: (draft: { to: string; subject: string; body: string; inReplyTo?: string }) => void }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Message | null>(null);
  const [error, setError] = useState<string | null>(null);
  const state = useLoad(async () => {
    const params = new URLSearchParams(search ? { q: search, limit: "50" } : { folder, limit: "50" });
    return firstArray(await apiCall<Json>(`api/mail/${search ? "search" : "inbox"}?${params}`)) as unknown as Message[];
  }, [folder, search]);
  const read = (message: Message) => {
    setOpen(message);
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
  const content = open ? (open.body_text?.trim() || (open.body_html ? htmlToText(open.body_html) : open.snippet ?? "")) : "";
  return (
    <>
      <PageHead title={FOLDERS.find((item) => item.id === folder)?.label() ?? ""} onRefresh={state.reload} refreshing={state.loading}>
        <Button variant="primary" onClick={() => onCompose({ to: "", subject: "", body: "" })}><PenLine size={15} />{tr("Écrire", "Compose")}</Button>
      </PageHead>
      <form className="discord-search files-search" onSubmit={(event) => { event.preventDefault(); setSearch(query.trim()); }}><Search size={14} /><input value={query} placeholder={tr("Chercher dans les mails, puis Entrée", "Search mail, then Enter")} aria-label={tr("Chercher dans les mails", "Search mail")} onChange={(event) => { setQuery(event.target.value); if (!event.target.value) setSearch(""); }} /></form>
      {(error || state.error) && <ErrorBox message={error ?? state.error ?? ""} onRetry={state.reload} />}
      {!state.data ? (state.loading ? <Skeletons count={6} height={58} /> : null) : state.data.length === 0 ? <Empty title={tr("Aucun message", "No messages")} /> : (
        <Stagger className="mail-list">
          {state.data.map((message) => (
            <StaggerItem key={message.id} variants={staggerItem} className={message.is_read ? "" : "unread"}>
              <button type="button" onClick={() => read(message)}>
                <span><b>{message.direction === "outbound" ? (message.to_addresses?.[0] ?? "") : message.from_name || message.from_address}</b><time>{new Date(message.received_at ?? message.sent_at ?? "").toLocaleDateString()}</time></span>
                <span className="mail-subject">{message.subject || tr("(sans objet)", "(no subject)")}</span>
                {message.snippet && <small>{message.snippet}</small>}
              </button>
            </StaggerItem>
          ))}
        </Stagger>
      )}
      <Drawer open={Boolean(open)} title={open?.subject || tr("(sans objet)", "(no subject)")} onClose={() => setOpen(null)} width={720}>
        {open && (
          <>
            <p className="muted small">{open.from_name ? `${open.from_name} <${open.from_address}>` : open.from_address}, {new Date(open.received_at ?? open.sent_at ?? "").toLocaleString()}</p>
            <div className="row">
              <Button onClick={() => onCompose({ to: open.from_address, subject: open.subject.startsWith("Re:") ? open.subject : `Re: ${open.subject}`, body: `\n\n> ${content.split("\n").join("\n> ")}`, inReplyTo: open.id })}><Reply size={15} />{tr("Répondre", "Reply")}</Button>
              <Button onClick={() => void act(() => apiData("api/mail/read", "POST", { id: open.id, is_starred: !open.is_starred }))}><Star size={15} />{open.is_starred ? tr("Retirer l'étoile", "Unstar") : tr("Étoile", "Star")}</Button>
              {folder !== "archive" && <Button onClick={() => void act(() => apiData("api/mail/move", "POST", { ids: [open.id], folder: "archive" }))}><Archive size={15} />{tr("Archiver", "Archive")}</Button>}
              {folder !== "trash" && <Button className="danger" onClick={() => void act(() => apiData("api/mail/move", "POST", { ids: [open.id], folder: "trash" }))}><Trash2 size={15} />{tr("Corbeille", "Trash")}</Button>}
            </div>
            {(open.attachments?.length ?? 0) > 0 && <ul className="eval-tags">{open.attachments?.map((item) => <li key={item.filename}>{item.filename}</li>)}</ul>}
            <pre className="mail-body">{content}</pre>
          </>
        )}
      </Drawer>
    </>
  );
}

function Remote({ title, path }: { title: string; path: string }) {
  const state = useLoad(() => apiCall<Json>(path), [path]);
  return (
    <>
      <PageHead title={title} onRefresh={state.reload} refreshing={state.loading} />
      <Status state={state}>{(data) => <JsonList rows={firstArray(data)} onChanged={state.reload} />}</Status>
    </>
  );
}

export default function MailPage() {
  const [section, setSection] = useState<Section>("inbox");
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
  const paths: Partial<Record<Section, { title: string; path: string }>> = {
    contacts: { title: tr("Contacts", "Contacts"), path: "api/mail/contacts" },
    aliases: { title: tr("Adresses", "Addresses"), path: "api/mail/alias" },
    labels: { title: tr("Étiquettes", "Labels"), path: "api/mail/labels" },
    rules: { title: tr("Règles", "Rules"), path: "api/mail/rules" },
    templates: { title: tr("Modèles", "Templates"), path: "api/mail/templates" },
    signatures: { title: tr("Signatures", "Signatures"), path: "api/mail/signatures" },
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
