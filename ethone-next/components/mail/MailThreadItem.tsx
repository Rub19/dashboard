"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { MailMessage } from "@/lib/hooks/useMail";

function formatThreadDate(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
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

type MailThreadItemProps = {
  messages: MailMessage[];
  active?: boolean;
  onClick: () => void;
  onToggleStar?: (e: React.MouseEvent) => void;
};

export default function MailThreadItem({ messages, active, onClick, onToggleStar }: MailThreadItemProps) {
  const last = messages[messages.length - 1];
  if (!last) return null;

  const first = messages[0];
  const hasUnread = messages.some((m) => !m.is_read);
  const isStarred = last.is_starred;
  const sender = first.from_name || first.from_address || "—";
  const subject = first.subject || "(aucun objet)";
  const snippet = last.snippet || last.body_text?.slice(0, 120) || "";

  return (
    <button
      type="button"
      data-testid="mail-thread-item"
      onClick={onClick}
      className={`group relative w-full border-b border-[var(--text-primary)]/[0.04] p-3.5 text-left transition-colors ${
        active ? "bg-[var(--text-primary)]/[0.04]" : "hover:bg-[var(--text-primary)]/[0.02]"
      }`}
    >
      {active && (
        <motion.div
          layoutId="activeThreadBar"
          className="pointer-events-none absolute left-0 top-2 bottom-2 w-1 rounded-r"
          style={{ background: "var(--accent-primary)" }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}

      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold truncate ${hasUnread ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]"}`}>{sender}</span>
        <span className="shrink-0 text-[10px] text-[var(--text-muted)]">{formatThreadDate(last.received_at)}</span>
      </div>

      <p className={`truncate text-xs font-medium ${hasUnread ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>{subject}</p>
      <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--text-muted)]">{snippet}</p>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] text-[10px] font-bold text-[var(--text-muted)]">
          {initialsFrom(first.from_name || "", first.from_address)}
        </span>
        {onToggleStar && (
          <button
            type="button"
            onClick={onToggleStar}
            className={`rounded p-1 transition-colors ${isStarred ? "text-[var(--warning)]" : "text-[var(--text-muted)] hover:text-[var(--warning)]"}`}
          >
            <Star className={`h-3.5 w-3.5 ${isStarred ? "fill-[var(--warning)]" : ""}`} />
          </button>
        )}
      </div>
    </button>
  );
}
