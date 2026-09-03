"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useMail, type MailMessage } from "@/lib/hooks/useMail";
import { useToast } from "@/components/ToastProvider";
import { useUserState } from "@/lib/hooks/useUserState";
import { useIslandQueueStore } from "@/lib/stores/dynamic-island-queue";
import MailSidebar, { FOLDERS, type MailFolder } from "@/components/mail/MailSidebar";
import MailThreadList from "@/components/mail/MailThreadList";
import MailDetailView from "@/components/mail/MailDetailView";
import ComposeMailModal, { type ComposeState } from "@/components/mail/ComposeMailModal";
import MailOnboarding from "@/components/mail/MailOnboarding";
import { cn } from "@/lib/utils";

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
  const registerIsland = useIslandQueueStore((s) => s.register);
  const unregisterIsland = useIslandQueueStore((s) => s.unregister);

  const {
    messages,
    folder,
    setFolder,
    search,
    setSearch,
    unread,
    loading,
    labels,
    getThread,
    sendMail,
    saveDraft,
    setFlags,
    moveMessages,
    createLabel,
    bulkAction,
    aliases,
    aliasesLoading,
    createAlias,
    updateAlias,
  } = useMail();

  const [activeThread, setActiveThread] = useState<MailMessage[] | null>(null);
  const [activeLabel, setActiveLabel] = useState<string | undefined>();
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeInitial, setComposeInitial] = useState<Partial<ComposeState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [composeDraftId, setComposeDraftId] = useState<string | undefined>();
  const [onboardingCompleted, setOnboardingCompleted] = useUserState("mailOnboardingCompleted", false);
  const [composeInReplyTo, setComposeInReplyTo] = useState<string | undefined>();
  const [composeReferences, setComposeReferences] = useState<string[] | undefined>();

  // Filter messages based on active folder and label
  const folderMessages = useMemo(() => {
    let list = messages;
    if (activeLabel) {
      list = list.filter((m) => m.labels?.includes(activeLabel));
    } else if (folder === "inbox") {
      list = list.filter((m) => m.folder === "inbox" || m.folder === "archive" || m.folder === "sent");
    } else {
      list = list.filter((m) => m.folder === folder);
    }
    return list;
  }, [messages, folder, activeLabel]);

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
    setActiveLabel(undefined);
    closeThread();
  }

  function handleSelectLabel(labelId: string | undefined) {
    setActiveLabel(labelId);
    closeThread();
  }

  function openCompose(mode: "new" | "reply" | "replyAll" | "forward") {
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
        body: `\n\n----- Message d'origine -----\nDe : ${last.from_name || last.from_address}\nDate : ${formatMailDate(last.received_at)}\nObjet : ${first.subject}\n\n${last.body_text || last.snippet || ""}`,
      });
      setComposeInReplyTo(last.headers?.["Message-ID"] || undefined);
      setComposeReferences([...(last.headers?.["References"] ? [last.headers["References"]] : []), last.headers?.["Message-ID"] || ""].filter(Boolean));
    } else if (mode === "replyAll") {
      const subject = first.subject.startsWith("Re:") ? first.subject : `Re: ${first.subject}`;
      const allTo = Array.from(new Set([last.from_address, ...(first.to_addresses || [])]));
      setComposeInitial({
        to: allTo,
        cc: first.cc_addresses || [],
        bcc: [],
        subject,
        body: `\n\n----- Message d'origine -----\nDe : ${last.from_name || last.from_address}\nDate : ${formatMailDate(last.received_at)}\nObjet : ${first.subject}\n\n${last.body_text || last.snippet || ""}`,
      });
      setComposeInReplyTo(last.headers?.["Message-ID"] || undefined);
      setComposeReferences([...(last.headers?.["References"] ? [last.headers["References"]] : []), last.headers?.["Message-ID"] || ""].filter(Boolean));
    } else if (mode === "forward") {
      setComposeInitial({
        to: [],
        cc: [],
        bcc: [],
        subject: first.subject.startsWith("Fwd:") ? first.subject : `Fwd: ${first.subject}`,
        body: `\n\n----- Message transféré -----\nDe : ${last.from_name || last.from_address}\nDate : ${formatMailDate(last.received_at)}\nObjet : ${first.subject}\n\n${last.body_text || last.snippet || ""}`,
      });
    }
    setComposeDraftId(undefined);
    setComposeOpen(true);
  }

  async function handleSend(state: ComposeState) {
    if (!state.to.length && !state.cc.length && !state.bcc.length) return;
    if (!state.subject && !state.body) return;
    setSubmitting(true);

    // Notify Dynamic Island - Sending
    registerIsland({
      id: "mail-sending",
      type: "mail",
      priority: 7,
      content: {
        title: "Envoi en cours...",
        sender: state.to.join(", "),
        subject: state.subject,
        status: "sending",
      },
    });

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

      // Update Dynamic Island - Sent
      registerIsland({
        id: "mail-sending",
        type: "mail",
        priority: 7,
        duration: 3500,
        content: {
          title: "Message envoyé !",
          sender: state.to.join(", "),
          subject: state.subject,
          status: "sent",
        },
      });

      success(i18n("sent", "Message envoyé"));
      setComposeOpen(false);
      closeThread();
    } catch (err) {
      registerIsland({
        id: "mail-sending",
        type: "mail",
        priority: 7,
        duration: 4000,
        content: {
          title: "Échec de l'envoi",
          subject: String(err),
          status: "error",
        },
      });
      toastError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickReplySend(text: string) {
    const last = activeThread?.[activeThread.length - 1];
    const first = activeThread?.[0];
    const primary = aliases.find((a) => a.is_primary) || aliases[0];
    if (!last || !first || !primary) return;

    registerIsland({
      id: "mail-sending",
      type: "mail",
      priority: 7,
      content: {
        title: "Envoi de la réponse...",
        sender: last.from_address,
        subject: `Re: ${first.subject}`,
        status: "sending",
      },
    });

    try {
      await sendMail({
        to: [last.from_address],
        cc: [],
        bcc: [],
        subject: first.subject.startsWith("Re:") ? first.subject : `Re: ${first.subject}`,
        text,
        html: text.replace(/\n/g, "<br>"),
        in_reply_to: last.headers?.["Message-ID"] || undefined,
        references: [...(last.headers?.["References"] ? [last.headers["References"]] : []), last.headers?.["Message-ID"] || ""].filter(Boolean),
        alias_id: primary.id,
      });

      registerIsland({
        id: "mail-sending",
        type: "mail",
        priority: 7,
        duration: 3500,
        content: {
          title: "Réponse envoyée !",
          sender: last.from_address,
          status: "sent",
        },
      });

      success("Réponse envoyée");
      if (last.thread_id) {
        const full = await getThread(last.thread_id);
        setActiveThread(full);
      }
    } catch (err) {
      registerIsland({
        id: "mail-sending",
        type: "mail",
        priority: 7,
        duration: 4000,
        content: {
          title: "Échec de l'envoi",
          subject: String(err),
          status: "error",
        },
      });
      toastError(String(err));
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
      success(i18n("saved", "Brouillon enregistré"));
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

  async function handleToggleReadMsg(msg: MailMessage) {
    try {
      await setFlags([msg.id], { is_read: !msg.is_read });
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleArchiveMsg(msg: MailMessage) {
    try {
      await moveMessages([msg.id], "archive");
      success("Archivé");
      if (activeThread?.some((m) => m.id === msg.id)) closeThread();
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleTrashMsg(msg: MailMessage) {
    try {
      await moveMessages([msg.id], "trash");
      success("Déplacé vers la corbeille");
      if (activeThread?.some((m) => m.id === msg.id)) closeThread();
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleArchive() {
    const last = activeThread?.[activeThread?.length - 1 || 0];
    if (!last) return;
    await handleArchiveMsg(last);
  }

  async function handleTrash() {
    const last = activeThread?.[activeThread?.length - 1 || 0];
    if (!last) return;
    await handleTrashMsg(last);
  }

  async function handleSpam() {
    const last = activeThread?.[activeThread?.length - 1 || 0];
    if (!last) return;
    try {
      await moveMessages([last.id], "spam");
      success("Signalé comme spam");
      closeThread();
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleToggleRead() {
    const last = activeThread?.[activeThread?.length - 1 || 0];
    if (!last) return;
    await handleToggleReadMsg(last);
  }

  async function handleToggleStarThread() {
    const last = activeThread?.[activeThread?.length - 1 || 0];
    if (!last) return;
    await handleToggleStar(last);
  }

  async function handleBulkAction(action: "read" | "unread" | "star" | "unstar" | "archive" | "trash", messageIds: string[]) {
    try {
      if (action === "read") await setFlags(messageIds, { is_read: true });
      else if (action === "unread") await setFlags(messageIds, { is_read: false });
      else if (action === "star") await setFlags(messageIds, { is_starred: true });
      else if (action === "unstar") await setFlags(messageIds, { is_starred: false });
      else if (action === "archive") await moveMessages(messageIds, "archive");
      else if (action === "trash") await moveMessages(messageIds, "trash");
      success("Actions groupées appliquées");
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

  // Keyboard Navigation & Shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
        e.preventDefault();
        openCompose("new");
        return;
      }

      if (isInput) return;

      if (e.key === "c") {
        e.preventDefault();
        openCompose("new");
      } else if (e.key === "r" && activeThread) {
        e.preventDefault();
        openCompose("reply");
      } else if (e.key === "e" && activeThread) {
        e.preventDefault();
        handleArchive();
      } else if ((e.key === "d" || e.key === "#") && activeThread) {
        e.preventDefault();
        handleTrash();
      } else if (e.key === "s" && activeThread) {
        e.preventDefault();
        handleToggleStarThread();
      } else if (e.key === "Escape") {
        if (composeOpen) setComposeOpen(false);
        else if (activeThread) closeThread();
      } else if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const currentIndex = groupedFolderMessages.findIndex(
          (t) => (t[0]?.thread_id || t[0]?.id) === activeThreadId
        );
        if (currentIndex < groupedFolderMessages.length - 1) {
          openThread(groupedFolderMessages[currentIndex + 1]);
        } else if (currentIndex === -1 && groupedFolderMessages.length > 0) {
          openThread(groupedFolderMessages[0]);
        }
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const currentIndex = groupedFolderMessages.findIndex(
          (t) => (t[0]?.thread_id || t[0]?.id) === activeThreadId
        );
        if (currentIndex > 0) {
          openThread(groupedFolderMessages[currentIndex - 1]);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeThread, groupedFolderMessages, composeOpen]);

  const activeThreadId = activeThread?.[0]?.thread_id || activeThread?.[0]?.id;

  if (aliasesLoading) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--panel-border)] border-t-[var(--accent-primary)]" />
      </div>
    );
  }

  if (!onboardingCompleted) {
    return (
      <MailOnboarding
        aliases={aliases}
        createAlias={createAlias}
        updateAlias={updateAlias}
        onComplete={() => setOnboardingCompleted(true)}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full gap-3 overflow-hidden p-2 select-none">
      {/* 1. Sidebar (Desktop / Tablet wide) */}
      <div className="hidden lg:flex h-full">
        <MailSidebar
          active={folder as MailFolder}
          onChange={handleFolderChange}
          counts={counts}
          unread={unread}
          onCompose={() => openCompose("new")}
          canCompose={aliases.length > 0}
          aliases={aliases}
          labels={labels}
          activeLabel={activeLabel}
          onSelectLabel={handleSelectLabel}
          createAlias={createAlias}
          updateAlias={updateAlias}
        />
      </div>

      {/* 2. Mail Thread List (Full on mobile if no active thread, side on desktop) */}
      <div className={cn("h-full flex-1 flex-col", activeThread ? "hidden md:flex md:max-w-xs lg:max-w-sm" : "flex")}>
        <MailThreadList
          title={activeLabel ? `Étiquette : ${activeLabel}` : i18n(folder, folder)}
          grouped={groupedFolderMessages}
          activeThreadId={activeThreadId}
          loading={loading}
          search={search}
          onSearch={setSearch}
          onSelect={openThread}
          onToggleStar={handleToggleStar}
          onToggleRead={handleToggleReadMsg}
          onArchive={handleArchiveMsg}
          onTrash={handleTrashMsg}
          onBulkAction={handleBulkAction}
        />
      </div>

      {/* 3. Reading Pane (Full on mobile if active thread, side on desktop) */}
      <div className={cn("h-full flex-1 flex-col", activeThread ? "flex" : "hidden md:flex")}>
        <MailDetailView
          thread={activeThread}
          onBack={closeThread}
          onReply={() => openCompose("reply")}
          onReplyAll={() => openCompose("replyAll")}
          onForward={() => openCompose("forward")}
          onArchive={handleArchive}
          onTrash={handleTrash}
          onSpam={handleSpam}
          onToggleRead={handleToggleRead}
          onToggleStar={handleToggleStarThread}
          onQuickReplySend={handleQuickReplySend}
        />
      </div>

      {/* 4. Modern Composer */}
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
