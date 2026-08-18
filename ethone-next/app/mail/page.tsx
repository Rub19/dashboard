"use client";

import { useCallback, useMemo, useState } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useMail, type MailMessage } from "@/lib/hooks/useMail";
import { useToast } from "@/components/ToastProvider";
import MailSidebar, { FOLDERS, type MailFolder } from "@/components/mail/MailSidebar";
import MailThreadList from "@/components/mail/MailThreadList";
import MailDetailView from "@/components/mail/MailDetailView";
import ComposeMailModal, { type ComposeState } from "@/components/mail/ComposeMailModal";
import MailAliasSetup from "@/components/mail/MailAliasSetup";

function formatMailDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function MailPage() {
  const i18n = useI18n();
  const { success, error: toastError } = useToast();
  const {
    messages,
    folder,
    setFolder,
    search,
    setSearch,
    unread,
    loading,
    getThread,
    sendMail,
    saveDraft,
    setFlags,
    moveMessages,
    createLabel,
    aliases,
    aliasesLoading,
    createAlias,
  } = useMail();

  const [activeThread, setActiveThread] = useState<MailMessage[] | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeInitial, setComposeInitial] = useState<Partial<ComposeState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [composeDraftId, setComposeDraftId] = useState<string | undefined>();
  const [composeInReplyTo, setComposeInReplyTo] = useState<string | undefined>();
  const [composeReferences, setComposeReferences] = useState<string[] | undefined>();

  const folderMessages = useMemo(() => {
    if (folder === "inbox") return messages.filter((m) => m.folder === "inbox" || m.folder === "archive" || m.folder === "sent");
    return messages.filter((m) => m.folder === folder);
  }, [messages, folder]);

  const groupedFolderMessages = useMemo(() => {
    const map = new Map<string, MailMessage[]>();
    for (const msg of folderMessages) {
      const key = msg.thread_id || msg.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(msg);
    }
    return Array.from(map.values()).map((list) =>
      list.sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime())
    );
  }, [folderMessages]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const id of FOLDERS) {
      if (id === "inbox") {
        c[id] = messages.filter((m) => m.folder === "inbox").length;
      } else if (id === "starred") {
        c[id] = messages.filter((m) => m.is_starred).length;
      } else if (id === "sent") {
        c[id] = messages.filter((m) => m.folder === "sent" || m.direction === "outbound").length;
      } else if (id === "drafts") {
        c[id] = messages.filter((m) => m.folder === "drafts").length;
      } else if (id === "archive") {
        c[id] = messages.filter((m) => m.folder === "archive").length;
      } else if (id === "trash") {
        c[id] = messages.filter((m) => m.folder === "trash").length;
      } else if (id === "spam") {
        c[id] = messages.filter((m) => m.folder === "spam").length;
      }
    }
    return c;
  }, [messages]);

  const openThread = useCallback(
    async (thread: MailMessage[]) => {
      const last = thread[thread.length - 1];
      if (last && !last.is_read) {
        await setFlags([last.id], { is_read: true });
      }
      if (last?.thread_id) {
        const full = await getThread(last.thread_id);
        setActiveThread(full);
      } else {
        setActiveThread(thread);
      }
    },
    [setFlags, getThread]
  );

  function closeThread() {
    setActiveThread(null);
  }

  function handleFolderChange(newFolder: MailFolder) {
    setFolder(newFolder);
    closeThread();
  }

  function openCompose(mode: "new" | "reply" | "forward") {
    setComposeOpen(true);
    const last = activeThread?.[activeThread.length - 1];
    const first = activeThread?.[0];
    if (mode === "new" || !last || !first) {
      setComposeInitial({ to: [], cc: [], bcc: [], subject: "", body: "" });
      setComposeInReplyTo(undefined);
      setComposeReferences(undefined);
    } else if (mode === "reply") {
      const subject = first.subject.startsWith("Re:") ? first.subject : `Re: ${first.subject}`;
      setComposeInitial({
        to: [last.from_address],
        cc: [],
        bcc: [],
        subject,
        body: `\n\n----- Original Message -----\n${i18n("from")}: ${last.from_name || last.from_address}\n${i18n("date")}: ${formatMailDate(last.received_at)}\n${i18n("subject")}: ${first.subject}\n\n${last.body_text || last.snippet || ""}`,
      });
      setComposeInReplyTo(last.headers?.["Message-ID"] || undefined);
      setComposeReferences([...(last.headers?.["References"] ? [last.headers["References"]] : []), last.headers?.["Message-ID"] || ""].filter(Boolean));
    } else if (mode === "forward") {
      setComposeInitial({
        to: [],
        cc: [],
        bcc: [],
        subject: `Fwd: ${first.subject}`,
        body: `\n\n----- Forwarded Message -----\n${i18n("from")}: ${last.from_name || last.from_address}\n${i18n("date")}: ${formatMailDate(last.received_at)}\n${i18n("subject")}: ${first.subject}\n\n${last.body_text || last.snippet || ""}`,
      });
    }
    setComposeDraftId(undefined);
    setComposeOpen(true);
  }

  async function handleSend(state: ComposeState) {
    if (!state.to.length && !state.cc.length && !state.bcc.length) return;
    if (!state.subject && !state.body) return;
    setSubmitting(true);
    try {
      await sendMail({
        to: state.to,
        cc: state.cc,
        bcc: state.bcc,
        subject: state.subject,
        text: state.body,
        html: state.body.replace(/\n/g, "<br>"),
        attachments: state.attachments.map((a) => ({ filename: a.filename, size: a.size, mime_type: a.mime_type })),
        in_reply_to: composeInReplyTo,
        references: composeReferences,
        draft_id: composeDraftId,
        alias_id: state.aliasId,
      });
      success(i18n("sent"));
      setComposeOpen(false);
      closeThread();
    } catch (err) {
      toastError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveDraft(state: ComposeState) {
    try {
      const draft = await saveDraft({
        id: composeDraftId,
        to: state.to,
        cc: state.cc,
        bcc: state.bcc,
        subject: state.subject,
        text: state.body,
        html: state.body.replace(/\n/g, "<br>"),
        alias_id: state.aliasId,
      });
      if (draft?.id) setComposeDraftId(draft.id);
      success(i18n("saved"));
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleToggleStar(msg: MailMessage) {
    try {
      await setFlags([msg.id], { is_starred: !msg.is_starred });
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleArchive() {
    const last = activeThread?.[activeThread?.length - 1 || 0];
    if (!last) return;
    try {
      await moveMessages([last.id], "archive");
      success(i18n("moveTo"));
      closeThread();
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleTrash() {
    const last = activeThread?.[activeThread?.length - 1 || 0];
    if (!last) return;
    try {
      await moveMessages([last.id], "trash");
      success(i18n("moveTo"));
      closeThread();
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleToggleRead() {
    const last = activeThread?.[activeThread?.length - 1 || 0];
    if (!last) return;
    try {
      await setFlags([last.id], { is_read: !last.is_read });
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleToggleStarThread() {
    const last = activeThread?.[activeThread?.length - 1 || 0];
    if (!last) return;
    try {
      await setFlags([last.id], { is_starred: !last.is_starred });
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleAiAssist(body: string) {
    if (!activeThread?.length) return body;
    try {
      const res = await createLabel(body);
      return res?.message || body;
    } catch {
      return body;
    }
  }

  const activeThreadId = activeThread?.[0]?.thread_id || activeThread?.[0]?.id;

  if (aliasesLoading) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
      </div>
    );
  }

  if (aliases.length === 0) {
    return (
      <MailAliasSetup
        createAlias={createAlias}
        onCreated={() => {
          setActiveThread(null);
          setComposeOpen(false);
        }}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full gap-3 overflow-hidden">
      <MailSidebar
        active={folder as MailFolder}
        onChange={handleFolderChange}
        counts={counts}
        unread={unread}
        onCompose={() => openCompose("new")}
        canCompose={aliases.length > 0}
      />

      <MailThreadList
        title={i18n(folder) || folder}
        grouped={groupedFolderMessages}
        activeThreadId={activeThreadId}
        loading={loading}
        search={search}
        onSearch={setSearch}
        onSelect={openThread}
        onToggleStar={handleToggleStar}
      />

      <MailDetailView
        thread={activeThread}
        onReply={() => openCompose("reply")}
        onForward={() => openCompose("forward")}
        onArchive={handleArchive}
        onTrash={handleTrash}
        onToggleRead={handleToggleRead}
        onToggleStar={handleToggleStarThread}
      />

      <ComposeMailModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        initial={composeInitial}
        onSend={handleSend}
        onSave={handleSaveDraft}
        onAiAssist={handleAiAssist}
        loading={submitting}
        aliases={aliases}
        createAlias={createAlias}
      />
    </div>
  );
}
