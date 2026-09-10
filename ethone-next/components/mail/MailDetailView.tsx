"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Reply,
  ReplyAll,
  Forward,
  Archive,
  Trash2,
  MailOpen,
  Mail,
  Star,
  Paperclip,
  Download,
  AlertTriangle,
  Send,
  Copy,
  CheckCircle2,
  FileText,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import type { MailMessage, MailAttachment } from "@/lib/hooks/useMail";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import MailAvatar from "./MailAvatar";

function formatMailDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function formatFileSize(bytes: number) {
  if (!bytes || bytes === 0) return "0 Ko";
  const k = 1024;
  const sizes = ["Octets", "Ko", "Mo", "Go"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getAttachmentIcon(mime: string, filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext || "")) {
    return <ImageIcon className="h-4 w-4 text-[var(--text-muted)]" />;
  }
  if (mime.includes("pdf") || ext === "pdf") return <FileText className="h-4 w-4 text-[var(--text-muted)]" />;
  if (mime.includes("zip") || mime.includes("tar") || ["zip", "rar", "7z", "tar", "gz"].includes(ext || "")) {
    return <FileArchive className="h-4 w-4 text-[var(--text-muted)]" />;
  }
  if (["js", "ts", "tsx", "py", "json", "html", "css", "rs", "go"].includes(ext || "")) {
    return <FileCode className="h-4 w-4 text-[var(--text-muted)]" />;
  }
  return <Paperclip className="h-4 w-4 text-[var(--text-muted)]" />;
}

type MailDetailViewProps = {
  thread: MailMessage[] | null;
  onBack?: () => void;
  onReply: () => void;
  onReplyAll?: () => void;
  onForward: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onSpam?: () => void;
  onToggleRead: () => void;
  onToggleStar: () => void;
  onQuickReplySend?: (text: string) => Promise<void>;
};

function AttachmentCard({ attachment }: { attachment: MailAttachment }) {
  function handleDownload() {
    if (attachment.content) {
      const link = document.createElement("a");
      link.href = `data:${attachment.mime_type || "application/octet-stream"};base64,${attachment.content}`;
      link.download = attachment.filename;
      link.click();
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="group flex items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-2)]/40 p-2.5 text-left transition-colors hover:bg-[var(--surface-2)]"
      title={`Télécharger ${attachment.filename}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)]">
        {getAttachmentIcon(attachment.mime_type || "", attachment.filename)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-[var(--text-primary)]">{attachment.filename}</span>
        <span className="block text-[11px] text-[var(--text-muted)]">{formatFileSize(attachment.size || 0)}</span>
      </span>
      <Download className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent-primary)]" />
    </button>
  );
}

const SHORTCUTS: [string, string][] = [
  ["J / K", "Naviguer"],
  ["R", "Répondre"],
  ["E", "Archiver"],
  ["Ctrl+U", "Composer"],
];

export default function MailDetailView({
  thread,
  onBack,
  onReply,
  onReplyAll,
  onForward,
  onArchive,
  onTrash,
  onSpam,
  onToggleRead,
  onToggleStar,
  onQuickReplySend,
}: MailDetailViewProps) {
  const i18n = useI18n();
  const endRef = useRef<HTMLDivElement>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [quickReplyText, setQuickReplyText] = useState("");
  const [sendingQuick, setSendingQuick] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (thread && thread.length > 0) {
      const initial: Record<string, boolean> = {};
      thread.forEach((msg, index) => {
        initial[msg.id] = index === thread.length - 1;
      });
      setExpandedMessages(initial);
    }
  }, [thread]);

  const first = thread?.[0];
  const last = thread?.[thread.length - 1];

  const allAttachments = useMemo(() => {
    if (!thread) return [];
    return thread.flatMap((m) => m.attachments || []);
  }, [thread]);

  function copySenderEmail(email: string) {
    navigator.clipboard
      .writeText(email)
      .then(() => {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      })
      .catch(() => {});
  }

  async function handleSendQuickReply() {
    if (!quickReplyText.trim() || !onQuickReplySend) return;
    setSendingQuick(true);
    try {
      await onQuickReplySend(quickReplyText);
      setQuickReplyText("");
    } finally {
      setSendingQuick(false);
    }
  }

  function toggleMessageExpand(id: string) {
    setExpandedMessages((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Empty state
  if (!thread || !first || !last) {
    return (
      <div className="v8-panel flex h-full flex-1 flex-col items-center justify-center p-8 text-center select-none">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
          <Mail className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          {i18n("inboxEmptyTitle", "Sélectionnez un message")}
        </h3>
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--text-muted)]">
          {i18n(
            "inboxEmptyDesc",
            "Choisissez un email dans la liste pour lire son contenu, répondre ou gérer la conversation."
          )}
        </p>

        <div className="mt-7 grid w-full max-w-md grid-cols-2 gap-1.5 sm:grid-cols-4">
          {SHORTCUTS.map(([key, label]) => (
            <div
              key={key}
              className="flex flex-col items-center gap-1 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-2)]/40 p-2.5"
            >
              <kbd className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-primary)]">
                {key}
              </kbd>
              <span className="text-[11px] text-[var(--text-muted)]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const sender = first.from_name || first.from_address || "Expéditeur inconnu";
  const isStarred = last.is_starred;
  const isRead = last.is_read;

  return (
    <div className="v8-panel relative flex h-full flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--panel-border)] px-3 py-2 select-none">
        <div className="flex items-center gap-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] md:hidden"
              aria-label="Retour"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={onReply} leftIcon={<Reply className="h-3.5 w-3.5" />} className="text-xs">
            {i18n("reply", "Répondre")}
          </Button>
          {onReplyAll && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReplyAll}
              leftIcon={<ReplyAll className="h-3.5 w-3.5" />}
              className="hidden text-xs sm:inline-flex"
            >
              {i18n("replyAll", "Répondre à tous")}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onForward}
            leftIcon={<Forward className="h-3.5 w-3.5" />}
            className="text-xs"
          >
            {i18n("forward", "Transférer")}
          </Button>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onToggleStar}
            className={cn(
              "rounded-lg p-2 transition-colors",
              isStarred
                ? "text-[var(--warning)] hover:bg-[var(--warning)]/15"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--warning)]"
            )}
            title={isStarred ? "Retirer des suivis (S)" : "Suivre (S)"}
          >
            <Star className={cn("h-4 w-4", isStarred && "fill-current")} />
          </button>
          <button
            type="button"
            onClick={onToggleRead}
            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            title={isRead ? "Marquer comme non lu (U)" : "Marquer comme lu (U)"}
          >
            {isRead ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onArchive}
            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            title="Archiver (E)"
          >
            <Archive className="h-4 w-4" />
          </button>
          {onSpam && (
            <button
              type="button"
              onClick={onSpam}
              className="hidden rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--warning)] sm:inline-flex"
              title="Signaler comme spam"
            >
              <AlertTriangle className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onTrash}
            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--danger)]/15 hover:text-[var(--danger)]"
            title="Supprimer (D)"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-[var(--panel-border)] px-5 py-4">
        <h1 data-testid="mail-detail-subject" className="text-[17px] font-semibold leading-snug text-[var(--text-primary)]">
          {first.subject || "(Sans objet)"}
        </h1>

        <div className="mt-3.5 flex items-center gap-3">
          <MailAvatar name={first.from_name} email={first.from_address} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{sender}</span>
              <button
                type="button"
                onClick={() => copySenderEmail(first.from_address)}
                className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                title="Copier l'adresse"
              >
                <span className="max-w-[200px] truncate font-mono">{first.from_address}</span>
                {copiedEmail ? <CheckCircle2 className="h-3 w-3 text-[var(--success)]" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
              À&nbsp;: {(first.to_addresses || []).join(", ") || "moi"}
              {first.cc_addresses && first.cc_addresses.length > 0 && ` · Cc : ${first.cc_addresses.join(", ")}`}
            </p>
          </div>
          <span className="shrink-0 self-start text-[11px] text-[var(--text-muted)]">{formatMailDate(last.received_at)}</span>
        </div>
      </div>

      {/* Thread body */}
      <div className="flex-1 space-y-3 overflow-y-auto os-scroll p-5">
        {thread.map((msg, index) => {
          const isLatest = index === thread.length - 1;
          const isExpanded = expandedMessages[msg.id] ?? isLatest;

          return (
            <div
              key={msg.id}
              className={cn(
                "rounded-xl border border-[var(--panel-border)]",
                isLatest ? "bg-transparent p-1" : "bg-[var(--surface-2)]/30 p-3"
              )}
            >
              {thread.length > 1 && (
                <button
                  type="button"
                  onClick={() => toggleMessageExpand(msg.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 select-none text-left",
                    isExpanded && "mb-3 border-b border-[var(--panel-border)] pb-2"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <MailAvatar name={msg.from_name} email={msg.from_address} size="sm" />
                    <span className="truncate text-xs font-medium text-[var(--text-primary)]">
                      {msg.from_name || msg.from_address}
                    </span>
                    <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{formatMailDate(msg.received_at)}</span>
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  )}
                </button>
              )}

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div
                      className="max-w-none overflow-x-auto break-words px-1 text-sm leading-relaxed text-[var(--text-primary)] [&_a]:text-[var(--accent-primary)] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--panel-border)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--text-muted)] [&_img]:max-w-full"
                      dangerouslySetInnerHTML={{
                        __html: msg.body_html || (msg.body_text || msg.snippet || "").replace(/\n/g, "<br>"),
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {allAttachments.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              <Paperclip className="h-3.5 w-3.5" />
              Pièces jointes ({allAttachments.length})
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {allAttachments.map((a, i) => (
                <AttachmentCard key={`${a.filename}-${i}`} attachment={a} />
              ))}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Quick reply */}
      {onQuickReplySend && (
        <div className="border-t border-[var(--panel-border)] p-3 select-none">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={quickReplyText}
              onChange={(e) => setQuickReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendQuickReply();
                }
              }}
              placeholder={`Répondre à ${sender}…`}
              disabled={sendingQuick}
              inputSize="compact"
              className="flex-1 text-xs"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSendQuickReply}
              disabled={!quickReplyText.trim() || sendingQuick}
              isLoading={sendingQuick}
              leftIcon={<Send className="h-3.5 w-3.5" />}
              className="px-4"
            >
              Envoyer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
