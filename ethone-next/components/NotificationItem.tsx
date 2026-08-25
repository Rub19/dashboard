"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNotifications, type Notification, type SnoozeDuration } from "@/lib/hooks/useNotifications";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import EthoneGlyph from "@/components/icons/EthoneGlyph";

const CATEGORY_ICONS: Record<string, string> = {
  mail: "mail",
  security: "shield-alert",
  tracker: "activity",
  system: "settings",
  brain: "brain",
  integration: "plug",
  important: "star",
  messages: "mail",
  activity: "activity",
};

const CATEGORY_TONES: Record<string, string> = {
  security: "bg-[var(--danger)]/10 text-[var(--danger)]",
  brain: "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  github: "bg-[var(--warning)]/10 text-[var(--warning)]",
  integration: "bg-[var(--info)]/10 text-[var(--info)]",
  system: "bg-[var(--text-muted)]/10 text-[var(--text-muted)]",
  important: "bg-[var(--warning)]/10 text-[var(--warning)]",
  messages: "bg-[var(--info)]/10 text-[var(--info)]",
  activity: "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  tracker: "bg-[var(--danger)]/10 text-[var(--danger)]",
  mail: "bg-[var(--info)]/10 text-[var(--info)]",
};

const PRIORITY_ACCENT: Record<string, string> = {
  critical: "border-l-[var(--danger)]",
  important: "border-l-[var(--warning)]",
  normal: "border-l-[var(--info)]",
  silent: "border-l-[var(--text-muted)]",
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-[var(--danger)]/10 text-[var(--danger)]",
  important: "bg-[var(--warning)]/10 text-[var(--warning)]",
  normal: "bg-[var(--info)]/10 text-[var(--info)]",
  silent: "bg-[var(--text-muted)]/10 text-[var(--text-muted)]",
};

const SNOOZE_OPTIONS: SnoozeDuration[] = ["10m", "1h", "tonight", "tomorrow"];

const SNOOZE_KEYS: Record<SnoozeDuration, string> = {
  "10m": "snooze10m",
  "1h": "snooze1h",
  tonight: "snoozeTonight",
  tomorrow: "snoozeTomorrow",
};

function formatTime(ts: number) {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "À l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}j`;
}

export default function NotificationItem({
  n,
  onOpen,
}: {
  n: Notification;
  onOpen?: (n: Notification) => void;
}) {
  const i18n = useI18n();
  const {
    markRead,
    archive,
    snooze,
    markImportant,
    remove,
    isMuted,
    muteCategory,
    unmuteCategory,
  } = useNotifications();

  const [menuOpen, setMenuOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
        setSnoozeOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const iconName = n.icon || CATEGORY_ICONS[n.type || n.category] || "bell";
  const iconTone = CATEGORY_TONES[n.type || n.category] || CATEGORY_TONES[n.category] || "bg-zinc-500/10 text-[var(--text-muted)]";
  const accent = PRIORITY_ACCENT[n.priority] || PRIORITY_ACCENT.normal;
  const badge = PRIORITY_BADGE[n.priority] || PRIORITY_BADGE.normal;

  const isUnread = !n.read;

  function handleMarkRead(e: React.MouseEvent) {
    e.stopPropagation();
    markRead(n.id, !n.read);
  }

  function handleArchive(e: React.MouseEvent) {
    e.stopPropagation();
    archive(n.id);
  }

  function handleImportant(e: React.MouseEvent) {
    e.stopPropagation();
    markImportant(n.id);
    setMenuOpen(false);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    remove(n.id);
    setMenuOpen(false);
  }

  function handleMute(e: React.MouseEvent) {
    e.stopPropagation();
    if (isMuted(n.category)) unmuteCategory(n.category);
    else muteCategory(n.category);
    setMenuOpen(false);
  }

  function handleSnooze(e: React.MouseEvent, duration: SnoozeDuration) {
    e.stopPropagation();
    snooze(n.id, duration);
    setMenuOpen(false);
    setSnoozeOpen(false);
  }

  const categoryLabel = i18n(n.category) || n.category;
  const priorityLabel = i18n(n.priority) || n.priority;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.15, ease: "easeOut" as const }}
      onClick={() => onOpen?.(n)}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl v8-panel p-3.5 transition-all hover:border-[var(--text-primary)]/[0.14] hover:bg-[var(--text-primary)]/[0.06] active:scale-[0.99] ${
        n.read ? "opacity-80" : ""
      } ${accent} border-l-2`}
      data-notification-item
    >
      <div className="flex items-start gap-3.5">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--text-primary)]/[0.08] ${iconTone}`}
        >
          <Icon name={iconName} className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]" translate="no">
              {n.title}
            </p>
            {isUnread && (
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--glow-color)]"
                aria-hidden="true"
              />
            )}
          </div>

          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]" translate="no">
            {n.message}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text-primary)]">{n.source || categoryLabel}</span>
            <span className="text-[var(--text-primary)]/20">·</span>
            <span>{formatTime(n.timestamp)}</span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge}`}
            >
              {priorityLabel}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-0.5 opacity-100 transition-opacity group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100">
          <button
            type="button"
            onClick={handleMarkRead}
            data-tooltip={isUnread ? i18n("markAsRead") : i18n("markAsUnread")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            aria-label={isUnread ? i18n("markAsRead") : i18n("markAsUnread")}
          >
            <EthoneGlyph name={isUnread ? "check" : "mail-open"} className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleArchive}
            data-tooltip={i18n("archive")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            aria-label={i18n("archive")}
          >
            <EthoneGlyph name="archive" className="h-4 w-4" />
          </button>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
                setSnoozeOpen(false);
              }}
              data-tooltip={i18n("moreActions")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              aria-label={i18n("moreActions")}
              aria-expanded={menuOpen}
            >
              <EthoneGlyph name="more" className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-[var(--z-dropdown)] mt-1.5 w-44 rounded-xl border border-[var(--text-primary)]/[0.1] bg-[var(--background)] p-1 shadow-2xl backdrop-blur-2xl">
                {snoozeOpen ? (
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSnoozeOpen(false);
                      }}
                      className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-xs text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                    >
                      <EthoneGlyph name="back" className="h-3.5 w-3.5" />
                      {i18n("back")}
                    </button>
                    {SNOOZE_OPTIONS.map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={(e) => handleSnooze(e, dur)}
                        className="h-9 w-full rounded-lg px-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                      >
                        {i18n(SNOOZE_KEYS[dur])}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSnoozeOpen(true);
                      }}
                      className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                    >
                      <EthoneGlyph name="clock" className="h-3.5 w-3.5" />
                      {i18n("snooze")}
                    </button>
                    <button
                      type="button"
                      onClick={handleImportant}
                      className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                    >
                      <EthoneGlyph name="alert" className="h-3.5 w-3.5" />
                      {i18n("markImportant")}
                    </button>
                    <button
                      type="button"
                      onClick={handleMute}
                      className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                    >
                      <EthoneGlyph name={isMuted(n.category) ? "bell" : "bell-off"} className="h-3.5 w-3.5" />
                      {i18n(isMuted(n.category) ? "unmute" : "mute")}
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-xs text-[var(--danger)] hover:bg-[var(--danger)]/10"
                    >
                      <EthoneGlyph name="trash" className="h-3.5 w-3.5" />
                      {i18n("delete")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
