"use client";

import { useEffect, useMemo, useRef } from "react";
import { Inbox, Reply, Forward, Archive, Trash2, MailOpen, Star, Paperclip, Download } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import type { MailMessage, MailAttachment } from "@/lib/hooks/useMail";

function formatMailDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function initialsFrom(name: string, email: string) {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const first = parts[0]?.[0] || "?";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase();
}

type MailDetailViewProps = {
  thread: MailMessage[] | null;
  onReply: () => void;
  onForward: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onToggleRead: () => void;
  onToggleStar: () => void;
};

function AttachmentCard({ attachment }: { attachment: MailAttachment }) {
  function handleDownload() {
    // placeholder: real implementation would fetch attachment bytes
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="flex items-center gap-2 rounded-xl border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.03] p-2 text-left transition-colors hover:bg-[var(--text-primary)]/[0.06]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--text-primary)]/[0.05] text-[var(--text-muted)]">
        <Paperclip className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-[var(--text-primary)]">{attachment.filename}</p>
        <p className="text-[10px] text-[var(--text-muted)]">{attachment.mime_type}</p>
      </div>
      <Download className="h-3.5 w-3.5 text-[var(--text-muted)]" />
    </button>
  );
}

export default function MailDetailView({
  thread,
  onReply,
  onForward,
  onArchive,
  onTrash,
  onToggleRead,
  onToggleStar,
}: MailDetailViewProps) {
  const i18n = useI18n();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  const first = thread?.[0];
  const last = thread?.[thread.length - 1];
  const allAttachments = useMemo(() => {
    if (!thread) return [];
    return thread.flatMap((m) => m.attachments || []);
  }, [thread]);

  if (!thread || !first || !last) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center rounded-2xl v8-panel p-8 text-center backdrop-blur-xl">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.03] text-[var(--text-muted)] shadow-inner">
          <Inbox className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{i18n("inboxEmpty") || "Votre boîte est propre"}</h3>
        <p className="mt-1 max-w-xs text-xs text-[var(--text-muted)]">
          {i18n("inboxEmptyDescription") ||
            "Tous les messages ont été traités ou archivés. Vous êtes à jour."}
        </p>
      </div>
    );
  }

  const sender = first.from_name || first.from_address;
  const isStarred = last.is_starred;
  const isRead = last.is_read;

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden rounded-2xl v8-panel backdrop-blur-xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--text-primary)]/[0.06] px-4 py-2.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onReply}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
          >
            <Reply className="h-3.5 w-3.5" />
            {i18n("reply") || "Répondre"}
          </button>
          <button
            type="button"
            onClick={onForward}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
          >
            <Forward className="h-3.5 w-3.5" />
            {i18n("forward") || "Transférer"}
          </button>
          <button
            type="button"
            onClick={onToggleRead}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
          >
            <MailOpen className="h-3.5 w-3.5" />
            {i18n(isRead ? "markAsUnread" : "markAsRead")}
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleStar}
            className={`rounded p-1.5 transition-colors ${isStarred ? "text-[var(--warning)]" : "text-[var(--text-muted)] hover:text-[var(--warning)]"}`}
          >
            <Star className={`h-4 w-4 ${isStarred ? "fill-[var(--warning)]" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onArchive}
            className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
          >
            <Archive className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onTrash}
            className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-[var(--text-primary)]/[0.06] px-4 py-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{first.subject || "(aucun objet)"}</h2>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] text-xs font-bold text-[var(--text-primary)]">
            {initialsFrom(first.from_name || "", first.from_address)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{sender}</p>
            <p className="truncate text-[11px] text-[var(--text-muted)]">{first.from_address}</p>
          </div>
          <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{formatMailDate(last.received_at)}</span>
        </div>
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text-muted)]">{i18n("to") || "À"}:</span>{" "}
          {(first.to_addresses || []).join(", ")}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {thread.map((msg) => (
          <div key={msg.id} className="mb-4 last:mb-0">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] text-[var(--text-muted)]">
                <span className="font-medium text-[var(--text-muted)]">{msg.from_name || msg.from_address}</span>{" "}
                <span className="text-[var(--text-muted)]">•</span> {formatMailDate(msg.received_at)}
              </p>
            </div>
            <div
              className="prose prose-invert prose-sm max-w-none text-sm text-[var(--text-primary)]"
              dangerouslySetInnerHTML={{ __html: msg.body_html || msg.body_text?.replace(/\n/g, "<br>") || "" }}
            />
          </div>
        ))}

        {allAttachments.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
              {i18n("attachments") || "Pièces jointes"}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {allAttachments.map((a, i) => (
                <AttachmentCard key={`${a.filename}-${i}`} attachment={a} />
              ))}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}
