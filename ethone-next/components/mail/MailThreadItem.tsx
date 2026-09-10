"use client";

import { Star, Paperclip, Archive, Trash2, MailOpen, Mail, AlertCircle } from "lucide-react";
import type { MailMessage } from "@/lib/hooks/useMail";
import { cn } from "@/lib/utils";
import MailAvatar from "./MailAvatar";

function formatThreadDate(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    const isThisYear = d.getFullYear() === now.getFullYear();
    if (isThisYear) return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return iso;
  }
}

export type MailThreadItemProps = {
  messages: MailMessage[];
  active?: boolean;
  selected?: boolean;
  onSelectToggle?: () => void;
  onClick: () => void;
  onToggleStar?: (e: React.MouseEvent) => void;
  onToggleRead?: (e: React.MouseEvent) => void;
  onArchive?: (e: React.MouseEvent) => void;
  onTrash?: (e: React.MouseEvent) => void;
};

export default function MailThreadItem({
  messages,
  active,
  selected = false,
  onSelectToggle,
  onClick,
  onToggleStar,
  onToggleRead,
  onArchive,
  onTrash,
}: MailThreadItemProps) {
  const last = messages[messages.length - 1];
  if (!last) return null;

  const first = messages[0];
  const hasUnread = messages.some((m) => !m.is_read);
  const isStarred = last.is_starred;
  const isImportant = last.is_important;
  const hasAttachments = messages.some((m) => m.attachments && m.attachments.length > 0);
  const sender = first.from_name || first.from_address || "Expéditeur inconnu";
  const subject = first.subject || "(Sans objet)";
  const snippet = last.snippet || last.body_text?.slice(0, 140) || "";
  const threadCount = messages.length;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      data-testid="mail-thread-item"
      className={cn(
        "group relative flex w-full cursor-pointer gap-3 px-3.5 py-3 text-left transition-colors duration-100 select-none",
        active
          ? "bg-[var(--accent-primary)]/[0.10]"
          : selected
          ? "bg-[var(--accent-primary)]/[0.05]"
          : "hover:bg-[var(--surface-2)]/50"
      )}
    >
      {/* Active / unread edge marker */}
      <span
        className={cn(
          "pointer-events-none absolute left-0 top-0 bottom-0 w-[3px] transition-colors",
          active ? "bg-[var(--accent-primary)]" : hasUnread ? "bg-[var(--accent-primary)]/40" : "bg-transparent"
        )}
      />

      {/* Avatar with selection checkbox overlay */}
      <div
        className="relative mt-0.5 h-9 w-9 shrink-0"
        onClick={(e) => {
          if (onSelectToggle) {
            e.stopPropagation();
            onSelectToggle();
          }
        }}
      >
        <MailAvatar name={first.from_name} email={first.from_address} />
        {onSelectToggle && (
          <span
            className={cn(
              "absolute inset-0 z-10 flex items-center justify-center rounded-full bg-[var(--bg-main)]/85 backdrop-blur-sm transition-opacity",
              selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => {}}
              className="h-3.5 w-3.5 rounded accent-[var(--accent-primary)]"
            />
          </span>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Row 1: sender + time */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {hasUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" title="Non lu" />}
            <span
              className={cn(
                "truncate text-[13px]",
                hasUnread ? "font-semibold text-[var(--text-primary)]" : "font-medium text-[var(--text-primary)]/85"
              )}
            >
              {sender}
            </span>
            {threadCount > 1 && (
              <span className="rounded-full bg-[var(--surface-2)] px-1.5 text-[10px] font-medium text-[var(--text-muted)]">
                {threadCount}
              </span>
            )}
          </div>
          <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{formatThreadDate(last.received_at)}</span>
        </div>

        {/* Row 2: subject */}
        <p
          className={cn(
            "mt-0.5 truncate text-[13px]",
            hasUnread ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-primary)]/70"
          )}
        >
          {subject}
        </p>

        {/* Row 3: snippet + hover actions */}
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="line-clamp-1 flex-1 text-xs text-[var(--text-muted)]">{snippet}</p>

          <div className="flex shrink-0 items-center gap-1.5">
            {/* Static badges (hidden while hover actions show) */}
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] group-hover:hidden">
              {hasAttachments && <Paperclip className="h-3 w-3" />}
              {isImportant && <AlertCircle className="h-3 w-3 text-[var(--warning)]" />}
              {isStarred && <Star className="h-3 w-3 fill-[var(--warning)] text-[var(--warning)]" />}
            </div>

            {/* Hover quick actions */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="hidden items-center gap-0.5 group-hover:flex"
            >
              {onToggleStar && (
                <button
                  type="button"
                  onClick={onToggleStar}
                  className={cn(
                    "rounded-md p-1 transition-colors",
                    isStarred
                      ? "text-[var(--warning)] hover:bg-[var(--warning)]/15"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--warning)]"
                  )}
                  title={isStarred ? "Retirer des suivis" : "Ajouter aux suivis"}
                >
                  <Star className={cn("h-3.5 w-3.5", isStarred && "fill-current")} />
                </button>
              )}
              {onToggleRead && (
                <button
                  type="button"
                  onClick={onToggleRead}
                  className="rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  title={hasUnread ? "Marquer comme lu" : "Marquer comme non lu"}
                >
                  {hasUnread ? <MailOpen className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                </button>
              )}
              {onArchive && (
                <button
                  type="button"
                  onClick={onArchive}
                  className="rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  title="Archiver"
                >
                  <Archive className="h-3.5 w-3.5" />
                </button>
              )}
              {onTrash && (
                <button
                  type="button"
                  onClick={onTrash}
                  className="rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--danger)]/15 hover:text-[var(--danger)]"
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
