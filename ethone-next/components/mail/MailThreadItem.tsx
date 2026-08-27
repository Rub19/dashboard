"use client";

import { motion } from "framer-motion";
import { Star, Paperclip, Archive, Trash2, MailOpen, Mail, AlertCircle } from "lucide-react";
import type { MailMessage } from "@/lib/hooks/useMail";
import { cn } from "@/lib/utils";

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
  const snippet = last.snippet || last.body_text?.slice(0, 120) || "";
  const threadCount = messages.length;
  const avatarGradient = getAvatarColor(sender);

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
        "group relative flex w-full cursor-pointer flex-col gap-1.5 border-b border-[var(--panel-border)]/[0.08] p-3 transition-all duration-150 select-none text-left",
        active
          ? "bg-[var(--accent-primary)]/[0.12] border-[var(--accent-primary)]/20"
          : selected
          ? "bg-[var(--accent-primary)]/[0.06]"
          : "hover:bg-[var(--panel-bg)]/[0.7] hover:border-[var(--panel-border)]/[0.15]",
        hasUnread && !active && "bg-[var(--text-primary)]/[0.02]"
      )}
    >
      {/* Active Pill Indicator */}
      {active && (
        <motion.div
          layoutId="activeThreadIndicator"
          className="pointer-events-none absolute left-0 top-1 bottom-1 w-1 rounded-r-full bg-[var(--accent-primary)] shadow-[0_0_8px_var(--glow-color)]"
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
        />
      )}

      {/* Row 1: Avatar + Sender + Time + Badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar / Selection Checkbox toggle */}
          <div
            className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-xl overflow-hidden text-[10px] font-bold text-white shadow-sm"
            onClick={(e) => {
              if (onSelectToggle) {
                e.stopPropagation();
                onSelectToggle();
              }
            }}
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br transition-transform", avatarGradient)} />
            <span className="relative z-10">{initialsFrom(first.from_name || "", first.from_address)}</span>

            {/* Checkbox Overlay on hover or when selected */}
            {onSelectToggle && (
              <div
                className={cn(
                  "absolute inset-0 z-20 flex items-center justify-center bg-[var(--bg-main)]/90 backdrop-blur-sm transition-opacity",
                  selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {}}
                  className="h-3.5 w-3.5 rounded accent-[var(--accent-primary)] cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Sender Name & Unread Dot */}
          <div className="flex items-center gap-1.5 min-w-0">
            {hasUnread && (
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-primary)] shadow-[0_0_6px_var(--glow-color)]"
                title="Non lu"
              />
            )}
            <span
              className={cn(
                "truncate text-xs",
                hasUnread
                  ? "font-bold text-[var(--text-primary)]"
                  : "font-medium text-[var(--text-primary)]/90"
              )}
            >
              {sender}
            </span>
            {threadCount > 1 && (
              <span className="rounded-full bg-[var(--panel-border)]/[0.2] px-1.5 text-[9px] font-mono font-semibold text-[var(--text-muted)]">
                {threadCount}
              </span>
            )}
          </div>
        </div>

        {/* Timestamp & Flags */}
        <div className="flex items-center gap-1.5 shrink-0">
          {hasAttachments && (
            <span title="Pièces jointes">
              <Paperclip className="h-3 w-3 text-[var(--text-muted)]" />
            </span>
          )}
          {isImportant && (
            <span title="Important">
              <AlertCircle className="h-3 w-3 text-[var(--danger)]" />
            </span>
          )}
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            {formatThreadDate(last.received_at)}
          </span>
        </div>
      </div>

      {/* Row 2: Subject */}
      <p
        className={cn(
          "truncate text-xs transition-colors",
          hasUnread
            ? "font-semibold text-[var(--text-primary)]"
            : "text-[var(--text-primary)]/80 group-hover:text-[var(--text-primary)]"
        )}
      >
        {subject}
      </p>

      {/* Row 3: Snippet + Quick Action Bar on Hover */}
      <div className="flex items-center justify-between gap-2 min-h-[1.25rem]">
        <p className="line-clamp-1 flex-1 text-[11px] text-[var(--text-muted)]">
          {snippet}
        </p>

        {/* Hover Quick Action Buttons */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {onToggleStar && (
            <button
              type="button"
              onClick={onToggleStar}
              className={cn(
                "rounded-md p-1 transition-colors",
                isStarred
                  ? "text-[var(--warning)] hover:bg-[var(--warning)]/15"
                  : "text-[var(--text-muted)] hover:bg-[var(--panel-bg)] hover:text-[var(--warning)]"
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
              className="rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
              title={hasUnread ? "Marquer comme lu" : "Marquer comme non lu"}
            >
              {hasUnread ? <MailOpen className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
            </button>
          )}

          {onArchive && (
            <button
              type="button"
              onClick={onArchive}
              className="rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
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
  );
}
