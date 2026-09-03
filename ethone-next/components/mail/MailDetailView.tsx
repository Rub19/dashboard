"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
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
  MoreVertical,
  Copy,
  CheckCircle2,
  FileText,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import type { MailMessage, MailAttachment } from "@/lib/hooks/useMail";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function formatMailDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "full",
      timeStyle: "short",
    });
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

function getAvatarColor(name: string) {
  const colors = [
    "from-indigo-500 to-purple-600",
    "from-purple-500 to-pink-600",
    "from-cyan-500 to-blue-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-red-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initialsFrom(name: string, email: string) {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const first = parts[0]?.[0] || "?";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase();
}

function getAttachmentIcon(mime: string, filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext || "")) {
    return <ImageIcon className="h-4 w-4 text-purple-400" />;
  }
  if (mime.includes("pdf") || ext === "pdf") {
    return <FileText className="h-4 w-4 text-rose-400" />;
  }
  if (mime.includes("zip") || mime.includes("tar") || ["zip", "rar", "7z", "tar", "gz"].includes(ext || "")) {
    return <FileArchive className="h-4 w-4 text-amber-400" />;
  }
  if (["js", "ts", "tsx", "py", "json", "html", "css", "rs", "go"].includes(ext || "")) {
    return <FileCode className="h-4 w-4 text-cyan-400" />;
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
      className="group flex items-center gap-3 rounded-xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.4] p-2.5 text-left transition-all hover:border-[var(--accent-primary)]/30 hover:bg-[var(--panel-bg)]/[0.8]"
      title={`Télécharger ${attachment.filename}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)] shadow-sm group-hover:scale-105 transition-transform">
        {getAttachmentIcon(attachment.mime_type || "", attachment.filename)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{attachment.filename}</p>
        <p className="font-mono text-[10px] text-[var(--text-muted)]">
          {formatFileSize(attachment.size || 0)}
        </p>
      </div>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--panel-border)]/[0.1] text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors">
        <Download className="h-3.5 w-3.5" />
      </div>
    </button>
  );
}

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
    navigator.clipboard.writeText(email).then(() => {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }).catch(() => {});
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

  // Premium Empty State
  if (!thread || !first || !last) {
    return (
      <div className="relative flex h-full flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.45] p-8 text-center shadow-sm backdrop-blur-[var(--panel-blur)] select-none">
        {/* Subtle Background Glow */}
        <div className="absolute top-1/3 h-56 w-56 rounded-full bg-[var(--accent-primary)]/5 blur-3xl pointer-events-none" />

        {/* Vector SVG Illustration */}
        <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-[var(--panel-border)]/[0.15] bg-gradient-to-b from-[var(--panel-bg)]/80 to-[var(--panel-bg)]/[0.2] shadow-2xl backdrop-blur-xl">
          <svg className="h-12 w-12 text-[var(--accent-primary)]" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="10" width="36" height="28" rx="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" fill="currentColor" fillOpacity="0.04" />
            <path d="M6 14L22.4 25.4667C23.3778 26.1511 24.6222 26.1511 25.6 25.4667L42 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="38" cy="14" r="3" fill="var(--accent-primary)" />
          </svg>
        </div>

        <h3 className="text-base font-bold text-[var(--text-primary)]">
          {i18n("inboxEmptyTitle", "Sélectionnez un message")}
        </h3>
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--text-muted)]">
          {i18n(
            "inboxEmptyDesc",
            "Choisissez un email dans la liste pour lire son contenu, répondre ou gérer la conversation."
          )}
        </p>

        {/* Keyboard Shortcuts Cheat Sheet */}
        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 max-w-md w-full">
          <div className="flex flex-col items-center gap-1 rounded-xl border border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)]/[0.3] p-2.5">
            <kbd className="rounded-md border border-[var(--panel-border)]/[0.2] bg-[var(--panel-bg)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--text-primary)] shadow-sm">
              J / K
            </kbd>
            <span className="text-[10px] text-[var(--text-muted)]">Naviguer</span>
          </div>

          <div className="flex flex-col items-center gap-1 rounded-xl border border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)]/[0.3] p-2.5">
            <kbd className="rounded-md border border-[var(--panel-border)]/[0.2] bg-[var(--panel-bg)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--text-primary)] shadow-sm">
              R
            </kbd>
            <span className="text-[10px] text-[var(--text-muted)]">Répondre</span>
          </div>

          <div className="flex flex-col items-center gap-1 rounded-xl border border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)]/[0.3] p-2.5">
            <kbd className="rounded-md border border-[var(--panel-border)]/[0.2] bg-[var(--panel-bg)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--text-primary)] shadow-sm">
              E
            </kbd>
            <span className="text-[10px] text-[var(--text-muted)]">Archiver</span>
          </div>

          <div className="flex flex-col items-center gap-1 rounded-xl border border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)]/[0.3] p-2.5">
            <kbd className="rounded-md border border-[var(--panel-border)]/[0.2] bg-[var(--panel-bg)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--text-primary)] shadow-sm">
              Ctrl+U
            </kbd>
            <span className="text-[10px] text-[var(--text-muted)]">Composer</span>
          </div>
        </div>
      </div>
    );
  }

  const sender = first.from_name || first.from_address || "Expéditeur inconnu";
  const isStarred = last.is_starred;
  const isRead = last.is_read;
  const avatarGradient = getAvatarColor(sender);

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.45] shadow-sm backdrop-blur-[var(--panel-blur)]">
      {/* Top Action Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--panel-border)]/[0.1] px-4 py-2.5 select-none bg-[var(--panel-bg)]/[0.3]">
        <div className="flex items-center gap-1.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
              aria-label="Retour à la boîte de réception"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReply}
            leftIcon={<Reply className="h-3.5 w-3.5" />}
            className="text-xs font-semibold"
          >
            {i18n("reply", "Répondre")}
          </Button>

          {onReplyAll && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReplyAll}
              leftIcon={<ReplyAll className="h-3.5 w-3.5" />}
              className="text-xs font-semibold hidden sm:inline-flex"
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
            className="text-xs font-semibold"
          >
            {i18n("forward", "Transférer")}
          </Button>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleStar}
            className={cn(
              "rounded-lg p-2 transition-colors",
              isStarred
                ? "text-[var(--warning)] hover:bg-[var(--warning)]/15"
                : "text-[var(--text-muted)] hover:bg-[var(--panel-bg)] hover:text-[var(--warning)]"
            )}
            title={isStarred ? "Retirer des suivis (S)" : "Suivre ce message (S)"}
          >
            <Star className={cn("h-4 w-4", isStarred && "fill-current")} />
          </button>

          <button
            type="button"
            onClick={onToggleRead}
            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
            title={isRead ? "Marquer comme non lu (U)" : "Marquer comme lu (U)"}
          >
            {isRead ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onArchive}
            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
            title="Archiver (E)"
          >
            <Archive className="h-4 w-4" />
          </button>

          {onSpam && (
            <button
              type="button"
              onClick={onSpam}
              className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--warning)] hidden sm:inline-flex"
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

      {/* Main Mail Header */}
      <div className="border-b border-[var(--panel-border)]/[0.1] p-5">
        <h1 data-testid="mail-detail-subject" className="text-base font-bold text-[var(--text-primary)] tracking-tight">
          {first.subject || "(Sans objet)"}
        </h1>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Sender Avatar */}
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl overflow-hidden font-bold text-white shadow-md">
              <div className={cn("absolute inset-0 bg-gradient-to-br", avatarGradient)} />
              <span className="relative z-10 text-xs">{initialsFrom(first.from_name || "", first.from_address)}</span>
            </div>

            {/* Sender Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-[var(--text-primary)]">{sender}</span>
                <button
                  type="button"
                  onClick={() => copySenderEmail(first.from_address)}
                  className="flex items-center gap-1 rounded-md border border-[var(--panel-border)]/[0.1] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  title="Copier l'adresse"
                >
                  <span className="truncate max-w-[160px]">{first.from_address}</span>
                  {copiedEmail ? <CheckCircle2 className="h-3 w-3 text-[var(--success)]" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>

              {/* To / Cc Recipients */}
              <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--text-muted)]">À :</span>{" "}
                {(first.to_addresses || []).join(", ") || "moi"}
                {first.cc_addresses && first.cc_addresses.length > 0 && (
                  <>
                    <span className="mx-1">•</span>
                    <span className="font-semibold text-[var(--text-muted)]">Cc :</span>{" "}
                    {first.cc_addresses.join(", ")}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Date & Time */}
          <div className="shrink-0 text-right">
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              {formatMailDate(last.received_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Thread Content */}
      <div className="flex-1 overflow-y-auto p-5 [scrollbar-width:thin] space-y-4">
        {thread.map((msg, index) => {
          const isLatest = index === thread.length - 1;
          const isExpanded = expandedMessages[msg.id] ?? isLatest;

          return (
            <div
              key={msg.id}
              className={cn(
                "rounded-2xl border transition-all",
                isLatest
                  ? "border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.3] p-4 shadow-sm"
                  : "border-[var(--panel-border)]/[0.08] bg-[var(--panel-bg)]/[0.15] p-3"
              )}
            >
              {/* Message Header (when multiple messages in thread) */}
              {thread.length > 1 && (
                <div
                  onClick={() => toggleMessageExpand(msg.id)}
                  className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-[var(--panel-border)]/[0.08] mb-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {msg.from_name || msg.from_address}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">• {formatMailDate(msg.received_at)}</span>
                  </div>
                  <button type="button" className="text-[var(--text-muted)]">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              )}

              {/* Message Body */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className="prose prose-invert max-w-none text-sm text-[var(--text-primary)] leading-relaxed selection:bg-[var(--accent-primary)]/30 selection:text-[var(--text-primary)]"
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

        {/* Attachments Section */}
        {allAttachments.length > 0 && (
          <div className="pt-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Pièces jointes ({allAttachments.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {allAttachments.map((a, i) => (
                <AttachmentCard key={`${a.filename}-${i}`} attachment={a} />
              ))}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Quick Reply Bar at the bottom */}
      {onQuickReplySend && (
        <div className="border-t border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)]/[0.3] p-3.5 select-none">
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
              placeholder={`Répondre rapidement à ${sender}...`}
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
              className="rounded-xl px-4"
            >
              Envoyer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
