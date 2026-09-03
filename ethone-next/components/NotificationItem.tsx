"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  CheckCheck,
  Archive,
  Trash2,
  MoreHorizontal,
  Clock,
  Star,
  Bell,
  BellOff,
  ShieldAlert,
  Activity,
  Settings,
  Brain,
  Plug,
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useNotifications, type Notification, type SnoozeDuration } from "@/lib/hooks/useNotifications";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

const SNOOZE_OPTIONS: SnoozeDuration[] = ["10m", "1h", "tonight", "tomorrow"];

const SNOOZE_KEYS: Record<SnoozeDuration, string> = {
  "10m": "10 minutes",
  "1h": "1 heure",
  tonight: "Ce soir",
  tomorrow: "Demain",
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

function getIcon(category?: string, priority?: string) {
  if (priority === "critical") return <ShieldAlert className="h-4 w-4 text-rose-400" />;
  switch (category) {
    case "security":
      return <ShieldAlert className="h-4 w-4 text-rose-400" />;
    case "brain":
      return <Brain className="h-4 w-4 text-[var(--accent-primary)]" />;
    case "tracker":
      return <Activity className="h-4 w-4 text-amber-400" />;
    case "system":
      return <Settings className="h-4 w-4 text-sky-400" />;
    case "integration":
      return <Plug className="h-4 w-4 text-emerald-400" />;
    case "mail":
      return <Mail className="h-4 w-4 text-indigo-400" />;
    default:
      return <Bell className="h-4 w-4 text-[var(--accent-primary)]" />;
  }
}

export default function NotificationItem({
  n,
  onOpen,
}: {
  n: Notification;
  onOpen?: (n: Notification) => void;
}) {
  const i18n = useI18n();
  const { success } = useToast();
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
  const [expanded, setExpanded] = useState(false);
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

  const isCritical = n.priority === "critical";
  const isImportant = n.priority === "important";
  const isUnread = !n.read;

  function handleMarkRead(e: React.MouseEvent) {
    e.stopPropagation();
    archive(n.id);
    success("Notification marquée comme lue");
  }

  function handleArchive(e: React.MouseEvent) {
    e.stopPropagation();
    archive(n.id);
    success("Notification archivée");
  }

  function handleImportant(e: React.MouseEvent) {
    e.stopPropagation();
    markImportant(n.id);
    setMenuOpen(false);
    success("Marqué comme important");
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    remove(n.id);
    setMenuOpen(false);
    success("Notification supprimée");
  }

  function handleMute(e: React.MouseEvent) {
    e.stopPropagation();
    if (isMuted(n.category)) {
      unmuteCategory(n.category);
      success("Notifications rétablies pour cette catégorie");
    } else {
      muteCategory(n.category);
      success("Catégorie mise en sourdine");
    }
    setMenuOpen(false);
  }

  function handleSnooze(e: React.MouseEvent, duration: SnoozeDuration) {
    e.stopPropagation();
    snooze(n.id, duration);
    setMenuOpen(false);
    setSnoozeOpen(false);
    success(`Rappel dans ${SNOOZE_KEYS[duration]}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      onClick={() => onOpen?.(n)}
      className={cn(
        "group relative flex flex-col gap-2 rounded-2xl border p-3.5 transition-all duration-150 cursor-pointer shadow-xs",
        isUnread
          ? isCritical
            ? "border-l-4 border-l-rose-500 border-rose-500/30 bg-rose-950/25 hover:bg-rose-950/35"
            : isImportant
            ? "border-l-4 border-l-amber-500 border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/30"
            : "border-l-4 border-l-[var(--accent-primary)] border-[var(--panel-border)] bg-[var(--surface-raised)]/70 hover:bg-[var(--surface-raised)]"
          : "border-[var(--panel-border)]/40 bg-[var(--surface-raised)]/25 hover:bg-[var(--surface-raised)]/50 opacity-60 hover:opacity-90"
      )}
    >
      {/* Top Header Row: Icon + Title + Status Badges + Action Buttons */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: Icon & Title */}
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-xs",
              isUnread
                ? isCritical
                  ? "border-rose-500/40 bg-rose-500/20"
                  : isImportant
                  ? "border-amber-500/40 bg-amber-500/20"
                  : "border-[var(--panel-border)] bg-[var(--surface-raised)]"
                : "border-[var(--panel-border)]/40 bg-white/[0.02]"
            )}
          >
            {getIcon(n.category, isUnread ? n.priority : undefined)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={cn(
                "text-xs font-bold leading-snug break-words",
                isUnread ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] line-through opacity-75"
              )}>
                {n.title || "Notification ETHONE"}
              </h4>
              {isUnread && (
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-primary)] shadow-[0_0_6px_var(--glow-color)]"
                  title="Non lu"
                />
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] mt-0.5">
              <span className="font-semibold text-[var(--text-primary)]/80">
                {n.source || "ETHONE"}
              </span>
              <span>•</span>
              <span>{formatTime(n.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* Right: Action Buttons Toolbar */}
        <div className="flex items-center gap-1 shrink-0">
          {isUnread ? (
            <button
              type="button"
              onClick={handleMarkRead}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/25 transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Marquer comme lu et masquer"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-400/60"
              title="Déjà lue"
            >
              <CheckCheck className="h-3.5 w-3.5" />
            </span>
          )}

          <button
            type="button"
            onClick={handleDelete}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-rose-400 hover:border-rose-500/40 transition-all active:scale-95 cursor-pointer shadow-xs"
            title="Supprimer la notification"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
                setSnoozeOpen(false);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-white hover:border-[var(--accent-primary)]/40 transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Plus d'actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {menuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full z-[var(--z-dropdown)] mt-1.5 w-48 rounded-2xl border border-[var(--panel-border)] bg-[#0d0e12] p-1.5 shadow-2xl backdrop-blur-2xl text-xs space-y-0.5"
              >
                {snoozeOpen ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setSnoozeOpen(false)}
                      className="flex h-8 w-full items-center gap-2 rounded-xl px-2 text-[var(--text-muted)] hover:bg-white/5 cursor-pointer"
                    >
                      <span>← Retour</span>
                    </button>
                    {SNOOZE_OPTIONS.map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={(e) => handleSnooze(e, dur)}
                        className="flex h-8 w-full items-center gap-2 rounded-xl px-2 text-white hover:bg-white/5 cursor-pointer"
                      >
                        <Clock className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                        <span>{SNOOZE_KEYS[dur]}</span>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSnoozeOpen(true)}
                      className="flex h-8 w-full items-center gap-2 rounded-xl px-2 text-[var(--text-primary)] hover:bg-white/5 cursor-pointer"
                    >
                      <Clock className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                      <span>Mettre en veille</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleImportant}
                      className="flex h-8 w-full items-center gap-2 rounded-xl px-2 text-[var(--text-primary)] hover:bg-white/5 cursor-pointer"
                    >
                      <Star className="h-3.5 w-3.5 text-amber-400" />
                      <span>Marquer comme important</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleMute}
                      className="flex h-8 w-full items-center gap-2 rounded-xl px-2 text-[var(--text-primary)] hover:bg-white/5 cursor-pointer"
                    >
                      <BellOff className="h-3.5 w-3.5 text-sky-400" />
                      <span>{isMuted(n.category) ? "Rétablir la catégorie" : "Muter la catégorie"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="flex h-8 w-full items-center gap-2 rounded-xl px-2 text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Supprimer</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification Body / Message Text */}
      {n.message && (
        <p
          className={cn(
            "text-xs text-[var(--text-muted)] leading-relaxed pl-11 pr-2 break-words",
            !expanded && "line-clamp-3"
          )}
        >
          {n.message}
        </p>
      )}

      {/* Priority Pill & Optional Actions Footer */}
      <div className="flex items-center justify-between gap-2 pl-11 pt-1">
        <div className="flex items-center gap-1.5">
          {isCritical ? (
            <span className="rounded-md border border-rose-500/40 bg-rose-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-300">
              CRITIQUE
            </span>
          ) : isImportant ? (
            <span className="rounded-md border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300">
              IMPORTANT
            </span>
          ) : (
            <span className="rounded-md border border-[var(--panel-border)] bg-[var(--surface-raised)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {n.category || "Système"}
            </span>
          )}
          {n.action && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (n.action?.onClick) n.action.onClick();
                else if (n.action?.route) {
                  window.location.href = n.action.route === "home" ? "/" : `/${n.action.route}/`;
                } else if (n.action?.url) {
                  window.open(n.action.url, "_blank");
                }
              }}
              className="rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 px-3 py-1 text-[11px] font-bold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/25 transition-all active:scale-95 shadow-xs"
            >
              {n.action.label}
            </button>
          )}
        </div>

        {n.data?.url || n.data?.route ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--accent-primary)] hover:underline">
            <span>Ouvrir</span>
            <ExternalLink className="h-3 w-3" />
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}
