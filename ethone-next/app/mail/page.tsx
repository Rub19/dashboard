"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useMail, type MailMessage } from "@/lib/hooks/useMail";
import { useToast } from "@/components/ToastProvider";
import { Icon } from "@/lib/icons";
import Card3D from "@/components/Card3D";
import LiquidSidebar from "@/components/LiquidSidebar";
import MailAdvancedPanel from "@/components/MailAdvancedPanel";
import BottomSheet from "@/components/BottomSheet";
import ContextMenu from "@/components/ContextMenu";
import RichTextEditor from "@/components/RichTextEditor";

const FOLDERS = ["inbox", "starred", "sent", "drafts", "archive", "trash", "spam"];

const SNOOZE_KEYS: Record<string, string> = {
  "10m": "snooze10m",
  "1h": "snooze1h",
  tonight: "snoozeTonight",
  tomorrow: "snoozeTomorrow",
};

function formatMailDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function threadSnoozeUntil(duration: string, now = Date.now()) {
  const map: Record<string, () => number> = {
    "10m": () => now + 10 * 60 * 1000,
    "1h": () => now + 60 * 60 * 1000,
    tonight: () => {
      const d = new Date();
      d.setHours(22, 0, 0, 0);
      if (d.getTime() <= now) d.setDate(d.getDate() + 1);
      return d.getTime();
    },
    tomorrow: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d.getTime();
    },
  };
  return new Date(map[duration]?.() ?? now + 60 * 60 * 1000).toISOString();
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
    error,
    labels,
    signatures,
    templates,
    rules,
    blocked,
    trusted,
    aliases,
    defaultSignature,
    reload,
    getThread,
    sendMail,
    saveDraft,
    setFlags,
    bulkAction,
    moveMessages,
    assignLabel,
    snoozeMessage,
    scheduleMail,
    createLabel,
    deleteLabel,
    createSignature,
    deleteSignature,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createRule,
    deleteRule,
    blockSender,
    unblockSender,
    trustSender,
    untrustSender,
    createAlias,
    analyzeMessage,
    suggestReplies,
    getAnalytics,
  } = useMail();

  const [selected, setSelected] = useState<string[]>([]);
  const [activeThread, setActiveThread] = useState<MailMessage[] | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<"new" | "reply" | "replyAll" | "forward">("new");
  const [composeTo, setComposeTo] = useState<string[]>([]);
  const [composeCc, setComposeCc] = useState<string[]>([]);
  const [composeBcc, setComposeBcc] = useState<string[]>([]);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeAttachments, setComposeAttachments] = useState<{ filename: string; size: number; mime_type: string; content: string }[]>([]);
  const [composeScheduledAt, setComposeScheduledAt] = useState<string>("");
  const [composeDraftId, setComposeDraftId] = useState<string | undefined>();
  const [composeInReplyTo, setComposeInReplyTo] = useState<string | undefined>();
  const [composeReferences, setComposeReferences] = useState<string[] | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [panel, setPanel] = useState<"labels" | "signatures" | "templates" | "rules" | "blocked" | "trusted" | "aliases" | "analytics" | "accounts" | "pgp" | "push" | "lists" | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [brainSummary, setBrainSummary] = useState<string | null>(null);
  const [sort, setSort] = useState<"newest" | "oldest" | "sender" | "unread">("newest");
  const [filter, setFilter] = useState<"all" | "unread" | "starred" | "important">("all");
  const [sortOpen, setSortOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionsTarget, setActionsTarget] = useState<MailMessage | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const folders = useMemo(() => {
    return FOLDERS.map((id) => ({
      id,
      label: i18n(id),
      icon: <Icon name={folderIcon(id)} className="h-4 w-4" />,
    }));
  }, [i18n]);

  function folderIcon(id: string) {
    if (id === "inbox") return "inbox";
    if (id === "starred") return "star";
    if (id === "sent") return "send";
    if (id === "drafts") return "file-edit";
    if (id === "archive") return "archive";
    if (id === "trash") return "trash-2";
    if (id === "spam") return "alert-triangle";
    return "mail";
  }

  const groupedMessages = useMemo(() => {
    const map = new Map<string, MailMessage[]>();
    for (const msg of messages) {
      const key = msg.thread_id || msg.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(msg);
    }
    return Array.from(map.values()).map((list) => list.sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime()));
  }, [messages]);

  const filteredGroupedMessages = useMemo(() => {
    if (filter === "all") return groupedMessages;
    return groupedMessages.filter((g) => {
      const msg = g[g.length - 1];
      if (filter === "unread") return !msg.is_read;
      if (filter === "starred") return msg.is_starred;
      if (filter === "important") return msg.is_important;
      return true;
    });
  }, [groupedMessages, filter]);

  const sortedGroupedMessages = useMemo(() => {
    const list = [...filteredGroupedMessages];
    if (sort === "oldest") {
      list.sort((a, b) => new Date(a[a.length - 1].received_at).getTime() - new Date(b[b.length - 1].received_at).getTime());
    } else if (sort === "sender") {
      list.sort((a, b) => {
        const fromA = (a[0].from_name || a[0].from_address || "").toLowerCase();
        const fromB = (b[0].from_name || b[0].from_address || "").toLowerCase();
        return fromA.localeCompare(fromB);
      });
    } else if (sort === "unread") {
      list.sort((a, b) => Number(b[0].is_read) - Number(a[0].is_read));
    }
    return list;
  }, [filteredGroupedMessages, sort]);

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectAll() {
    const ids = sortedGroupedMessages.map((g) => g[0]?.id).filter(Boolean);
    setSelected(ids as string[]);
  }

  function deselectAll() {
    setSelected([]);
  }

  const openThread = useCallback(
    async (msg: MailMessage) => {
      if (!msg.is_read) {
        await setFlags([msg.id], { is_read: true });
      }
      if (msg.thread_id) {
        const thread = await getThread(msg.thread_id);
        setActiveThread(thread);
      } else {
        setActiveThread([msg]);
      }
    },
    [setFlags, getThread, setActiveThread]
  );

  function closeThread() {
    setActiveThread(null);
    setSuggestions([]);
    setBrainSummary(null);
  }

  function openCompose(mode: "new" | "reply" | "replyAll" | "forward", thread?: MailMessage[]) {
    setComposeMode(mode);
    const last = thread?.[thread.length - 1];
    const first = thread?.[0];
    if (mode === "new") {
      setComposeTo([]);
      setComposeCc([]);
      setComposeBcc([]);
      setComposeSubject("");
      setComposeBody(defaultSignature ? `\n\n${defaultSignature.content}` : "");
      setComposeInReplyTo(undefined);
      setComposeReferences(undefined);
    } else if (last && first) {
      const subject = first.subject.startsWith("Re:") ? first.subject : `Re: ${first.subject}`;
      setComposeSubject(subject);
      setComposeInReplyTo(last.headers?.["Message-ID"] || undefined);
      setComposeReferences([...(last.headers?.["References"] ? [last.headers["References"]] : []), last.headers?.["Message-ID"] || ""].filter(Boolean));
      if (mode === "reply") {
        setComposeTo([last.from_address]);
        setComposeCc([]);
        setComposeBcc([]);
      } else if (mode === "replyAll") {
        setComposeTo([last.from_address, ...(last.to_addresses || [])].filter((e) => e !== aliases[0]?.alias));
        setComposeCc([...(last.cc_addresses || [])].filter(Boolean));
        setComposeBcc([...(last.bcc_addresses || [])].filter(Boolean));
      } else if (mode === "forward") {
        setComposeTo([]);
        setComposeCc([]);
        setComposeBcc([]);
        setComposeSubject(`Fwd: ${first.subject}`);
      }
      setComposeBody(`\n\n----- Original Message -----\n${i18n("from")}: ${last.from_name || last.from_address}\n${i18n("date")}: ${formatMailDate(last.received_at)}\n${i18n("subject")}: ${first.subject}\n\n${last.body_text || last.snippet || ""}`);
      if (defaultSignature) setComposeBody((b) => `${b}\n\n${defaultSignature.content}`);
    }
    setComposeDraftId(undefined);
    setComposeScheduledAt("");
    setComposeAttachments([]);
    setComposeOpen(true);
  }

  async function handleSend() {
    if (!composeTo.length && !composeCc.length && !composeBcc.length) return;
    if (!composeSubject && !composeBody) return;
    setSubmitting(true);
    try {
      await sendMail({
        to: composeTo,
        cc: composeCc,
        bcc: composeBcc,
        subject: composeSubject,
        text: composeBody,
        html: composeBody.replace(/\n/g, "<br>"),
        attachments: composeAttachments.map((a) => ({ filename: a.filename, size: a.size, mime_type: a.mime_type })),
        in_reply_to: composeInReplyTo,
        references: composeReferences,
        draft_id: composeDraftId,
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

  async function handleSaveDraft() {
    setSubmitting(true);
    try {
      const draft = await saveDraft({
        id: composeDraftId,
        to: composeTo,
        cc: composeCc,
        bcc: composeBcc,
        subject: composeSubject,
        text: composeBody,
        html: composeBody.replace(/\n/g, "<br>"),
      });
      if (draft?.id) setComposeDraftId(draft.id);
      success(i18n("saved"));
    } catch (err) {
      toastError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSchedule() {
    if (!composeTo.length && !composeCc.length && !composeBcc.length) return;
    if (!composeSubject && !composeBody) return;
    if (!composeScheduledAt) return;
    setSubmitting(true);
    try {
      await scheduleMail({
        to: composeTo,
        cc: composeCc,
        bcc: composeBcc,
        subject: composeSubject,
        text: composeBody,
        html: composeBody.replace(/\n/g, "<br>"),
        attachments: composeAttachments.map((a) => ({ filename: a.filename, size: a.size, mime_type: a.mime_type })),
        scheduled_at: new Date(composeScheduledAt).toISOString(),
      });
      success(i18n("schedule"));
      setComposeOpen(false);
    } catch (err) {
      toastError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function addAttachment(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files).slice(0, 10)) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = String(reader.result || "").split(",")[1] || "";
        setComposeAttachments((prev) => [...prev, { filename: file.name, size: file.size, mime_type: file.type || "application/octet-stream", content: base64 }]);
      };
      reader.readAsDataURL(file);
    }
  }

  function removeAttachment(name: string) {
    setComposeAttachments((prev) => prev.filter((a) => a.filename !== name));
  }

  async function handleBulk(action: string, target?: string) {
    if (!selected.length) return;
    try {
      await bulkAction(selected, action, target);
      success(i18n("saved"));
      setSelected([]);
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleAnalyze() {
    if (!activeThread?.length) return;
    try {
      const res = await analyzeMessage(activeThread[activeThread.length - 1].id);
      setBrainSummary(res?.data?.summary || null);
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleSuggest() {
    if (!activeThread?.length) return;
    try {
      const res = await suggestReplies(activeThread[activeThread.length - 1].id);
      setSuggestions(Array.isArray(res?.data?.suggestions) ? res.data.suggestions : []);
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleThreadSnooze(duration: string) {
    if (!activeThread?.length) return;
    try {
      await snoozeMessage(activeThread[activeThread.length - 1].id, threadSnoozeUntil(duration));
      success(i18n("snooze"));
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleMoveSelected(target: string) {
    if (!selected.length) return;
    try {
      await moveMessages(selected, target);
      success(i18n("moveTo"));
      setSelected([]);
      setMoveOpen(false);
    } catch (err) {
      toastError(String(err));
    }
  }

  const handleMoveMessage = useCallback(
    async (msg: MailMessage, target: string) => {
      try {
        await moveMessages([msg.id], target);
        success(i18n("moveTo"));
        setActionsOpen(false);
      } catch (err) {
        toastError(String(err));
      }
    },
    [moveMessages, success, i18n, setActionsOpen, toastError]
  );

  function messageHasLabel(msg: MailMessage, labelName: string) {
    return (msg.labels || []).some((l) => l === labelName);
  }

  async function handleToggleSelectedLabel(labelId: string) {
    const label = labels.find((l) => l.id === labelId);
    if (!label || !selected.length) return;
    const hasIt = selected.every((id) => {
      const msg = messages.find((m) => m.id === id);
      return msg && messageHasLabel(msg, label.name);
    });
    try {
      await assignLabel(selected, label.id, hasIt);
      success(i18n("saved"));
      setLabelOpen(false);
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleCreateLabelFromSheet() {
    if (!newLabel.trim()) return;
    try {
      const created = (await createLabel(newLabel.trim())) as { id?: string } | undefined;
      if (created?.id && selected.length) {
        await assignLabel(selected, created.id, false);
      }
      setNewLabel("");
      success(i18n("saved"));
      setLabelOpen(false);
    } catch (err) {
      toastError(String(err));
    }
  }

  function openMessageActions(msg: MailMessage) {
    setActionsTarget(msg);
    setActionsOpen(true);
  }

  const messageContextItems = useCallback(
    (msg: MailMessage) => [
      { id: "open", label: i18n("open"), icon: "mail-open", onClick: () => openThread(msg) },
      {
        id: "read",
        label: msg.is_read ? i18n("markAsUnread") : i18n("markAsRead"),
        icon: msg.is_read ? "mail" : "mail-open",
        onClick: () => setFlags([msg.id], { is_read: !msg.is_read }),
      },
      { id: "star", label: msg.is_starred ? i18n("removeFromFavorites") : i18n("addToFavorites"), icon: msg.is_starred ? "star-off" : "star", onClick: () => setFlags([msg.id], { is_starred: !msg.is_starred }) },
      { id: "important", label: msg.is_important ? i18n("important") : i18n("markImportant"), icon: msg.is_important ? "circle" : "alert-circle", onClick: () => setFlags([msg.id], { is_important: !msg.is_important }) },
      { id: "archive", label: i18n("archive"), icon: "archive", onClick: () => handleMoveMessage(msg, "archive") },
      { id: "trash", label: i18n("delete"), icon: "trash-2", danger: true, onClick: () => handleMoveMessage(msg, "trash") },
    ],
    [i18n, openThread, setFlags, handleMoveMessage]
  );

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await getAnalytics(30);
      setAnalytics(res?.data || null);
    } catch (err) {
      toastError(String(err));
    }
  }, [getAnalytics, toastError]);

  useEffect(() => {
    if (panel === "analytics") loadAnalytics();
  }, [panel, loadAnalytics]);

  function onPanelSubmit(e: React.FormEvent) {
    e.preventDefault();
    const action = form._action;
    if (!action) return;
    if (action === "createLabel") {
      createLabel(form.name, form.color).then(() => setForm({})).catch((err) => toastError(String(err)));
    } else if (action === "deleteLabel") {
      deleteLabel(form.id).then(() => setForm({})).catch((err) => toastError(String(err)));
    } else if (action === "createSignature") {
      createSignature(form.name, form.content, form.is_default === "true").then(() => setForm({})).catch((err) => toastError(String(err)));
    } else if (action === "deleteSignature") {
      deleteSignature(form.id).then(() => setForm({})).catch((err) => toastError(String(err)));
    } else if (action === "createTemplate") {
      createTemplate(form.name, form.subject, form.content, form.is_default === "true").then(() => setForm({})).catch((err) => toastError(String(err)));
    } else if (action === "updateTemplate") {
      updateTemplate(form.id, { name: form.name, subject: form.subject, content: form.content }).then(() => setForm({})).catch((err) => toastError(String(err)));
    } else if (action === "deleteTemplate") {
      deleteTemplate(form.id).then(() => setForm({})).catch((err) => toastError(String(err)));
    } else if (action === "createRule") {
      createRule({
        name: form.name,
        is_active: true,
        priority: Number(form.priority) || 0,
        condition_from: form.condition_from,
        condition_domain: form.condition_domain,
        condition_subject: form.condition_subject,
        condition_body: form.condition_body,
        condition_has_attachments: form.condition_has_attachments === "true",
        action_move_to: form.action_move_to,
        action_label: form.action_label,
      }).then(() => setForm({})).catch((err) => toastError(String(err)));
    } else if (action === "deleteRule") {
      deleteRule(form.id).then(() => setForm({})).catch((err) => toastError(String(err)));
    } else if (action === "block") {
      blockSender({ email: form.email, domain: form.domain, reason: form.reason }).then(() => setForm({})).catch((err) => toastError(String(err)));
    } else if (action === "unblock") {
      unblockSender(form.id).then(() => setForm({})).catch((err) => toastError(String(err)));
    } else if (action === "trust") {
      trustSender({ email: form.email, domain: form.domain }).then(() => setForm({})).catch((err) => toastError(String(err)));
    } else if (action === "untrust") {
      untrustSender(form.id).then(() => setForm({})).catch((err) => toastError(String(err)));
    } else if (action === "createAlias") {
      createAlias(form.alias, form.display_name).then(() => setForm({})).catch((err) => toastError(String(err)));
    }
  }

  const defaultFrom = aliases[0]?.alias || "";

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[14rem_1fr]">
      <LiquidSidebar items={folders} active={folder} onChange={(id) => { setFolder(id); closeThread(); }} />

      <div className="min-w-0 space-y-3">
        <Card3D>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{i18n(folder)}</h1>
            {folder === "inbox" && (
              <span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-400">
                {unread} {i18n("unread")}
              </span>
            )}
            <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1">
              {(["all", "unread", "starred", "important"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                    filter === key ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {i18n(key)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => openCompose("new")}
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <Icon name="pencil" className="h-4 w-4" /> {i18n("compose")}
            </button>
            <input
              type="search"
              aria-label={i18n("searchMail")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={i18n("searchMail")}
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={reload}
              data-tooltip={i18n("refresh")}
              data-haptic
              aria-label={i18n("refresh")}
              className="rounded-xl border border-[var(--border)] p-2 text-[var(--muted)] hover:bg-[var(--surface-raised)]"
            >
              <Icon name="refresh-cw" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSortOpen(true)}
              data-tooltip={i18n("sort")}
              data-haptic
              aria-label={i18n("sort")}
              className="rounded-xl border border-[var(--border)] p-2 text-[var(--muted)] hover:bg-[var(--surface-raised)]"
            >
              <Icon name="arrow-up-down" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setMoveOpen(true)}
              data-tooltip={i18n("moveTo")}
              data-haptic
              aria-label={i18n("moveTo")}
              className="rounded-xl border border-[var(--border)] p-2 text-[var(--muted)] hover:bg-[var(--surface-raised)]"
            >
              <Icon name="folder-input" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setLabelOpen(true)}
              data-tooltip={i18n("labels")}
              data-haptic
              aria-label={i18n("labels")}
              className="rounded-xl border border-[var(--border)] p-2 text-[var(--muted)] hover:bg-[var(--surface-raised)]"
            >
              <Icon name="tag" className="h-4 w-4" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setPanel("labels")}
                className="rounded-xl border border-[var(--border)] p-2 text-[var(--muted)] hover:bg-[var(--surface-raised)]"
                aria-label={i18n("labels")}
              >
                <Icon name="tag" className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPanel("analytics")}
              className="rounded-xl border border-[var(--border)] p-2 text-[var(--muted)] hover:bg-[var(--surface-raised)]"
              aria-label={i18n("analytics")}
            >
              <Icon name="bar-chart-2" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPanel(panel ? null : "rules")}
              className="rounded-xl border border-[var(--border)] p-2 text-[var(--muted)] hover:bg-[var(--surface-raised)]"
              aria-label={i18n("more")}
            >
              <Icon name="more-horizontal" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPanel("accounts")}
              className="rounded-xl border border-[var(--border)] p-2 text-[var(--muted)] hover:bg-[var(--surface-raised)]"
              aria-label={i18n("accounts")}
            >
              <Icon name="cog" className="h-4 w-4" />
            </button>
          </div>
        </Card3D>

        {selected.length > 0 && (
          <Card3D>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={selectAll} className="rounded-xl border border-[var(--border)] px-2 py-1.5 text-xs hover:bg-[var(--surface-raised)]">{i18n("selectAll")}</button>
              <button type="button" onClick={deselectAll} className="rounded-xl border border-[var(--border)] px-2 py-1.5 text-xs hover:bg-[var(--surface-raised)]">{i18n("cancel")}</button>
              <button type="button" onClick={() => handleBulk("read")} className="rounded-xl border border-[var(--border)] px-2 py-1.5 text-xs hover:bg-[var(--surface-raised)]">{i18n("markAsRead")}</button>
              <button type="button" onClick={() => handleBulk("unread")} className="rounded-xl border border-[var(--border)] px-2 py-1.5 text-xs hover:bg-[var(--surface-raised)]">{i18n("markAsUnread")}</button>
              <button type="button" onClick={() => handleBulk("star")} className="rounded-xl border border-[var(--border)] px-2 py-1.5 text-xs hover:bg-[var(--surface-raised)]">{i18n("starred")}</button>
              <button type="button" onClick={() => handleBulk("archive")} className="rounded-xl border border-[var(--border)] px-2 py-1.5 text-xs hover:bg-[var(--surface-raised)]">{i18n("archive")}</button>
              <button type="button" onClick={() => handleBulk("delete")} className="rounded-xl border border-[var(--border)] px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10">{i18n("delete")}</button>
              {labels.length > 0 && (
                <select
                  aria-label={i18n("labels")}
                  value=""
                  onChange={(e) => e.target.value && handleBulk("label", e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs"
                >
                  <option value="">{i18n("labels")}</option>
                  {labels.map((l) => (
                    <option key={l.id} value={l.name}>{l.name}</option>
                  ))}
                </select>
              )}
            </div>
          </Card3D>
        )}

        {error && (
          <Card3D>
            <p className="text-sm text-red-400">{error.message}</p>
          </Card3D>
        )}

        {activeThread ? (
          <Card3D>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={closeThread} className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
                  <Icon name="arrow-left" className="mr-1 inline h-4 w-4" /> {i18n("back")}
                </button>
                <div className="flex gap-1">
                  <button type="button" onClick={() => openCompose("reply", activeThread)} className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--surface-raised)]">{i18n("reply")}</button>
                  <button type="button" onClick={() => openCompose("replyAll", activeThread)} className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--surface-raised)]">{i18n("replyAll")}</button>
                  <button type="button" onClick={() => openCompose("forward", activeThread)} className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--surface-raised)]">{i18n("forward")}</button>
                  <button
                    type="button"
                    onClick={() => { setActionsTarget(activeThread[activeThread.length - 1]); setActionsOpen(true); }}
                    className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--surface-raised)]"
                  >
                    {i18n("actions")}
                  </button>
                  <button type="button" onClick={handleAnalyze} className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--surface-raised)]">{i18n("brain")}</button>
                  <button type="button" onClick={handleSuggest} className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--surface-raised)]">{i18n("suggest")}</button>
                </div>
              </div>

              {brainSummary && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
                  <strong>{i18n("brain")}:</strong> {brainSummary}
                </div>
              )}

              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{i18n("suggest")}</p>
                  {suggestions.map((s, i) => (
                    <button key={i} type="button" onClick={() => setComposeBody(s)} className="block w-full rounded-xl border border-[var(--border)] p-2 text-left text-sm hover:bg-[var(--surface-raised)]">
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <h2 className="text-lg font-semibold">{activeThread[0]?.subject}</h2>

              <div className="space-y-3">
                {activeThread.map((msg) => (
                  <div key={msg.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
                      <span className="font-medium text-[var(--foreground)]">{msg.from_name || msg.from_address}</span>
                      <span>{formatMailDate(msg.received_at)}</span>
                    </div>
                    <div className="mt-2 text-sm whitespace-pre-wrap">{msg.body_text || msg.snippet || "-"}</div>
                    {msg.attachments?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.attachments.map((a) => (
                          <span key={a.filename} className="flex items-center gap-1 rounded-lg bg-[var(--surface-raised)] px-2 py-1 text-xs">
                            <Icon name="paperclip" className="h-3 w-3" /> {a.filename}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card3D>
        ) : loading ? (
          <Card3D>
            <div className="space-y-3">
              <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--border)]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--border)]" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--border)]" />
            </div>
          </Card3D>
        ) : sortedGroupedMessages.length === 0 ? (
          <Card3D>
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Icon name="mail" className="h-4 w-4" />
              <span>{i18n("noMail")}</span>
            </div>
          </Card3D>
        ) : (
          <div className="space-y-2">
            {sortedGroupedMessages.map((group) => {
              const msg = group[group.length - 1];
              const checked = selected.includes(msg.id);
              const contextItems = messageContextItems(msg);
              return (
                <ContextMenu key={msg.id} items={contextItems}>
                  <Card3D>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(msg.id)}
                        aria-label={i18n("selectAll")}
                        className="mt-1 h-4 w-4 rounded border-[var(--border)]"
                      />
                      <button
                        type="button"
                        onClick={() => openThread(msg)}
                        className={`min-w-0 flex-1 text-left ${msg.is_read ? "opacity-70" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-sm font-semibold">{msg.from_name || msg.from_address}</span>
                          <span className="shrink-0 text-[10px] text-[var(--muted)]">{formatMailDate(msg.received_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm text-[var(--foreground)]">{msg.subject || i18n("noResults")}</p>
                          {group.length > 1 && <span className="shrink-0 rounded-full bg-[var(--border)] px-1.5 py-0.5 text-[10px]">{group.length}</span>}
                        </div>
                        <p className="min-w-0 truncate text-xs text-[var(--muted)]">{msg.snippet}</p>
                        {msg.labels?.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {msg.labels.map((l) => (
                              <span key={l} className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-400">{l}</span>
                            ))}
                          </div>
                        )}
                      </button>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          aria-label={i18n("starred")}
                          data-tooltip={i18n("starred")}
                          data-haptic
                          onClick={() => setFlags([msg.id], { is_starred: !msg.is_starred })}
                          className={`rounded p-1 ${msg.is_starred ? "text-amber-400" : "text-[var(--muted)]"} hover:bg-[var(--surface-raised)]`}
                        >
                          <Icon name={msg.is_starred ? "star" : "star-off"} className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={i18n("important")}
                          data-tooltip={i18n("important")}
                          data-haptic
                          onClick={() => setFlags([msg.id], { is_important: !msg.is_important })}
                          className={`rounded p-1 ${msg.is_important ? "text-red-400" : "text-[var(--muted)]"} hover:bg-[var(--surface-raised)]`}
                        >
                          <Icon name={msg.is_important ? "alert-circle" : "circle"} className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={i18n("actions")}
                          data-tooltip={i18n("actions")}
                          data-haptic
                          onClick={(e) => {
                            e.stopPropagation();
                            openMessageActions(msg);
                          }}
                          className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-raised)]"
                        >
                          <Icon name="more-vertical" className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </Card3D>
                </ContextMenu>
              );
            })}
          </div>
        )}
      </div>

      <BottomSheet open={sortOpen} onClose={() => setSortOpen(false)} title={i18n("sort")} position="bottom" draggable>
        <div className="space-y-1">
          {[
            { id: "newest", icon: "arrow-down" },
            { id: "oldest", icon: "arrow-up" },
            { id: "sender", icon: "at-sign" },
            { id: "unread", icon: "mail" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => { setSort(opt.id as typeof sort); setSortOpen(false); }}
              data-haptic
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                sort === opt.id ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--surface-raised)]"
              }`}
            >
              <Icon name={opt.icon} className="h-4 w-4" />
              {i18n(opt.id)}
              {sort === opt.id && <Icon name="check" className="ml-auto h-4 w-4" />}
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={moveOpen} onClose={() => setMoveOpen(false)} title={i18n("moveTo")} position="bottom" draggable>
        <div className="space-y-1">
          {FOLDERS.filter((f) => f !== folder).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => handleMoveSelected(f)}
              data-haptic
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-raised)]"
            >
              <Icon name={folderIcon(f)} className="h-4 w-4" />
              {i18n(f)}
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={labelOpen} onClose={() => setLabelOpen(false)} title={i18n("labels")} position="bottom" draggable>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateLabelFromSheet()}
              placeholder={i18n("newLabel")}
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button type="button" onClick={handleCreateLabelFromSheet} data-haptic className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white">
              {i18n("create")}
            </button>
          </div>
          <div className="space-y-1">
            {labels.length === 0 && <p className="py-4 text-center text-sm text-[var(--muted)]">{i18n("noResults")}</p>}
            {labels.map((l) => {
              const hasIt = selected.length > 0 && selected.every((id) => {
                const msg = messages.find((m) => m.id === id);
                return msg && (msg.labels || []).includes(l.name);
              });
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => handleToggleSelectedLabel(l.id)}
                  data-haptic
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-raised)] ${hasIt ? "text-[var(--accent)]" : ""}`}
                >
                  <Icon name={hasIt ? "x" : "tag"} className="h-4 w-4" />
                  <span style={{ color: l.color }}>{l.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={actionsOpen} onClose={() => { setActionsOpen(false); setActionsTarget(null); }} title={i18n("actions")} position="bottom" draggable>
        <div className="space-y-1">
          {actionsTarget && (
            <>
              <button
                type="button"
                onClick={() => { openThread(actionsTarget); setActionsOpen(false); }}
                data-haptic
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-raised)]"
              >
                <Icon name="mail-open" className="h-4 w-4" /> {i18n("open")}
              </button>
              <button
                type="button"
                onClick={() => { setFlags([actionsTarget.id], { is_read: !actionsTarget.is_read }); setActionsOpen(false); }}
                data-haptic
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-raised)]"
              >
                <Icon name={actionsTarget.is_read ? "mail" : "mail-open"} className="h-4 w-4" />
                {i18n(actionsTarget.is_read ? "markAsUnread" : "markAsRead")}
              </button>
              <button
                type="button"
                onClick={() => { setFlags([actionsTarget.id], { is_starred: !actionsTarget.is_starred }); setActionsOpen(false); }}
                data-haptic
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-raised)]"
              >
                <Icon name={actionsTarget.is_starred ? "star-off" : "star"} className="h-4 w-4" />
                {actionsTarget.is_starred ? i18n("removeFromFavorites") : i18n("addToFavorites")}
              </button>
              <button
                type="button"
                onClick={() => { setFlags([actionsTarget.id], { is_important: !actionsTarget.is_important }); setActionsOpen(false); }}
                data-haptic
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-raised)]"
              >
                <Icon name={actionsTarget.is_important ? "circle" : "alert-circle"} className="h-4 w-4" />
                {i18n(actionsTarget.is_important ? "important" : "markImportant")}
              </button>
              <div className="my-2 border-t border-[var(--border)]" />
              <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-[var(--muted)]">{i18n("snooze")}</p>
              {Object.entries(SNOOZE_KEYS).map(([id, key]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleThreadSnooze(id)}
                  data-haptic
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-raised)]"
                >
                  <Icon name="clock-3" className="h-4 w-4" /> {i18n(key)}
                </button>
              ))}
              <div className="my-2 border-t border-[var(--border)]" />
              <button
                type="button"
                onClick={() => handleMoveMessage(actionsTarget, "archive")}
                data-haptic
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-raised)]"
              >
                <Icon name="archive" className="h-4 w-4" /> {i18n("archive")}
              </button>
              <button
                type="button"
                onClick={() => handleMoveMessage(actionsTarget, "trash")}
                data-haptic
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
              >
                <Icon name="trash-2" className="h-4 w-4" /> {i18n("delete")}
              </button>
            </>
          )}
        </div>
      </BottomSheet>

      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setComposeOpen(false)}>
          <div className="flex h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
              <h2 className="text-lg font-semibold">{composeMode === "new" ? i18n("compose") : i18n(composeMode)}</h2>
              <button type="button" onClick={() => setComposeOpen(false)} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface)]"><Icon name="x" className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 space-y-3 overflow-auto p-4">
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs text-[var(--muted)]">{i18n("from")}</span>
                <span className="text-sm">{defaultFrom}</span>
              </div>
              <MailRecipients label={i18n("to")} values={composeTo} onChange={setComposeTo} />
              <MailRecipients label={i18n("cc")} values={composeCc} onChange={setComposeCc} />
              <MailRecipients label={i18n("bcc")} values={composeBcc} onChange={setComposeBcc} />
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs text-[var(--muted)]">{i18n("subject")}</span>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </div>
              {templates.length > 0 && (
                <select
                  aria-label={i18n("templates")}
                  value=""
                  onChange={(e) => {
                    const t = templates.find((x) => x.id === e.target.value);
                    if (t) { setComposeSubject(t.subject); setComposeBody(t.content); }
                  }}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                >
                  <option value="">{i18n("templates")}</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
              <RichTextEditor
                defaultValue={composeBody}
                onChange={setComposeBody}
              />
              <div className="flex flex-wrap gap-2">
                {composeAttachments.map((a) => (
                  <span key={a.filename} className="flex items-center gap-1 rounded-lg bg-[var(--surface)] px-2 py-1 text-xs">
                    <Icon name="paperclip" className="h-3 w-3" /> {a.filename}
                    <button type="button" onClick={() => removeAttachment(a.filename)} className="text-red-400"><Icon name="x" className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => addAttachment(e.target.files)} />
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border)] p-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface)]"
                >
                  <Icon name="paperclip" className="h-4 w-4" /> {i18n("addAttachment")}
                </button>
                <input
                  type="datetime-local"
                  aria-label={i18n("schedule")}
                  value={composeScheduledAt}
                  onChange={(e) => setComposeScheduledAt(e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setComposeOpen(false)} className="rounded-xl px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface)]">{i18n("discard")}</button>
                <button type="button" onClick={handleSaveDraft} disabled={submitting} className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface)] disabled:opacity-50">{i18n("save")}</button>
                {composeScheduledAt && (
                  <button type="button" onClick={handleSchedule} disabled={submitting} className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface)] disabled:opacity-50">{i18n("schedule")}</button>
                )}
                <button type="button" onClick={handleSend} disabled={submitting} className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{i18n("send")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {panel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setPanel(null); setForm({}); }}>
          <div className="h-[80vh] w-full max-w-2xl overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{i18n(panel)}</h2>
              <button type="button" onClick={() => { setPanel(null); setForm({}); }} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface)]"><Icon name="x" className="h-4 w-4" /></button>
            </div>

            {panel === "labels" && (
              <div className="space-y-4">
                <form onSubmit={onPanelSubmit} className="flex gap-2">
                  <input type="hidden" name="_action" value="createLabel" />
                  <input type="text" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value, _action: "createLabel" })} placeholder={i18n("labels")} className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <input type="color" value={form.color || "#6366f1"} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-10 rounded" />
                  <button type="submit" className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white">{i18n("create")}</button>
                </form>
                <div className="space-y-2">
                  {labels.map((l) => (
                    <div key={l.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] p-2">
                      <span className="text-sm" style={{ color: l.color }}>{l.name}</span>
                      <button type="button" onClick={() => deleteLabel(l.id).catch((err) => toastError(String(err)))} className="text-red-400"><Icon name="trash-2" className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {panel === "signatures" && (
              <div className="space-y-4">
                <form onSubmit={onPanelSubmit} className="space-y-2">
                  <input type="hidden" name="_action" value="createSignature" />
                  <input type="text" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value, _action: "createSignature" })} placeholder={i18n("name")} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <textarea value={form.content || ""} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder={i18n("body")} className="h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-sm" />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_default === "true"} onChange={(e) => setForm({ ...form, is_default: e.target.checked ? "true" : "false" })} /> {i18n("default")}</label>
                  <button type="submit" className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white">{i18n("create")}</button>
                </form>
                <div className="space-y-2">
                  {signatures.map((s) => (
                    <div key={s.id} className="rounded-xl border border-[var(--border)] p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{s.name} {s.is_default && "(default)"}</span>
                        <button type="button" onClick={() => deleteSignature(s.id).catch((err) => toastError(String(err)))} className="text-red-400"><Icon name="trash-2" className="h-4 w-4" /></button>
                      </div>
                      <p className="text-xs text-[var(--muted)]">{s.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {panel === "templates" && (
              <div className="space-y-4">
                <form onSubmit={onPanelSubmit} className="space-y-2">
                  <input type="hidden" name="_action" value="createTemplate" />
                  <input type="text" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value, _action: "createTemplate" })} placeholder={i18n("name")} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <input type="text" value={form.subject || ""} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder={i18n("subject")} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <textarea value={form.content || ""} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder={i18n("body")} className="h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-sm" />
                  <button type="submit" className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white">{i18n("create")}</button>
                </form>
                <div className="space-y-2">
                  {templates.map((t) => (
                    <div key={t.id} className="rounded-xl border border-[var(--border)] p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t.name}</span>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setForm({ _action: "updateTemplate", id: t.id, name: t.name, subject: t.subject, content: t.content })} className="text-[var(--muted)]"><Icon name="pencil" className="h-4 w-4" /></button>
                          <button type="button" onClick={() => deleteTemplate(t.id).catch((err) => toastError(String(err)))} className="text-red-400"><Icon name="trash-2" className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {panel === "rules" && (
              <div className="space-y-4">
                <form onSubmit={onPanelSubmit} className="space-y-2">
                  <input type="hidden" name="_action" value="createRule" />
                  <input type="text" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value, _action: "createRule" })} placeholder={i18n("name")} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <input type="number" value={form.priority || ""} onChange={(e) => setForm({ ...form, priority: e.target.value })} placeholder={i18n("priority")} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <input type="text" value={form.condition_from || ""} onChange={(e) => setForm({ ...form, condition_from: e.target.value })} placeholder={i18n("from")} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <input type="text" value={form.condition_domain || ""} onChange={(e) => setForm({ ...form, condition_domain: e.target.value })} placeholder="Domain" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <input type="text" value={form.condition_subject || ""} onChange={(e) => setForm({ ...form, condition_subject: e.target.value })} placeholder={i18n("subject")} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <input type="text" value={form.condition_body || ""} onChange={(e) => setForm({ ...form, condition_body: e.target.value })} placeholder={i18n("body")} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <select value={form.action_move_to || ""} onChange={(e) => setForm({ ...form, action_move_to: e.target.value })} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
                    <option value="">{i18n("moveTo")}</option>
                    {FOLDERS.map((f) => <option key={f} value={f}>{i18n(f)}</option>)}
                  </select>
                  <input type="text" value={form.action_label || ""} onChange={(e) => setForm({ ...form, action_label: e.target.value })} placeholder={i18n("labels")} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <button type="submit" className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white">{i18n("create")}</button>
                </form>
                <div className="space-y-2">
                  {rules.map((r) => (
                    <div key={r.id} className="rounded-xl border border-[var(--border)] p-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.name} ({r.priority})</span>
                        <button type="button" onClick={() => deleteRule(r.id).catch((err) => toastError(String(err)))} className="text-red-400"><Icon name="trash-2" className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {panel === "blocked" && (
              <div className="space-y-4">
                <form onSubmit={onPanelSubmit} className="flex gap-2">
                  <input type="hidden" name="_action" value="block" />
                  <input type="text" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value, _action: "block" })} placeholder={i18n("email")} className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <input type="text" value={form.reason || ""} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder={i18n("reason")} className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <button type="submit" className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white">{i18n("add")}</button>
                </form>
                <div className="space-y-2">
                  {blocked.map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] p-2">
                      <span className="text-sm">{b.email || b.domain} {b.reason && `(${b.reason})`}</span>
                      <button type="button" onClick={() => unblockSender(b.id).catch((err) => toastError(String(err)))} className="text-red-400"><Icon name="trash-2" className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {panel === "trusted" && (
              <div className="space-y-4">
                <form onSubmit={onPanelSubmit} className="flex gap-2">
                  <input type="hidden" name="_action" value="trust" />
                  <input type="text" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value, _action: "trust" })} placeholder={i18n("email")} className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <input type="text" value={form.domain || ""} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="Domain" className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <button type="submit" className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white">{i18n("add")}</button>
                </form>
                <div className="space-y-2">
                  {trusted.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] p-2">
                      <span className="text-sm">{t.email || t.domain}</span>
                      <button type="button" onClick={() => untrustSender(t.id).catch((err) => toastError(String(err)))} className="text-red-400"><Icon name="trash-2" className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {panel === "aliases" && (
              <div className="space-y-4">
                <form onSubmit={onPanelSubmit} className="flex gap-2">
                  <input type="hidden" name="_action" value="createAlias" />
                  <input type="text" value={form.alias || ""} onChange={(e) => setForm({ ...form, alias: e.target.value, _action: "createAlias" })} placeholder={i18n("alias")} className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <input type="text" value={form.display_name || ""} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder={i18n("name")} className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <button type="submit" className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white">{i18n("create")}</button>
                </form>
                <div className="space-y-2">
                  {aliases.map((a) => (
                    <div key={a.id} className="rounded-xl border border-[var(--border)] p-2 text-sm">
                      <span className="font-medium">{a.alias}</span> {a.is_primary && "(primary)"} — {a.display_name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(panel === "accounts" || panel === "pgp" || panel === "push" || panel === "lists") && (
              <MailAdvancedPanel initialTab={panel} />
            )}

            {panel === "analytics" && analytics && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Card3D><div className="text-[var(--muted)]">{i18n("total")}</div><div className="text-lg font-semibold">{Number(analytics.total) || 0}</div></Card3D>
                  <Card3D><div className="text-[var(--muted)]">{i18n("inbound")}</div><div className="text-lg font-semibold">{Number(analytics.inbound) || 0}</div></Card3D>
                  <Card3D><div className="text-[var(--muted)]">{i18n("outbound")}</div><div className="text-lg font-semibold">{Number(analytics.outbound) || 0}</div></Card3D>
                  <Card3D><div className="text-[var(--muted)]">{i18n("unread")}</div><div className="text-lg font-semibold">{Number(analytics.unread) || 0}</div></Card3D>
                </div>
                {Array.isArray(analytics.topSenders) && (
                  <div>
                    <p className="font-medium">{i18n("from")}</p>
                    {analytics.topSenders.map((s, i) => {
                      const row = s as { email?: string; count?: number };
                      return (
                        <div key={i} className="flex justify-between text-xs text-[var(--muted)]"><span>{row.email}</span><span>{row.count}</span></div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MailRecipients({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(values.join(", "));
  useEffect(() => {
    setText(values.join(", "));
  }, [values]);
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-xs text-[var(--muted)]">{label}</span>
      <input
        type="text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value.split(/[,;]/).map((s) => s.trim()).filter(Boolean));
        }}
        placeholder={label}
        className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
      />
    </div>
  );
}
