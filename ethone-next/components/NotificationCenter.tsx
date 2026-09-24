"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BellOff,
  Check,
  Trash2,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "@/components/icons/ph";
import {
  useNotifications,
  type Notification,
  type NotificationListItem,
} from "@/lib/hooks/useNotifications";
import { useI18n } from "@/lib/hooks/useI18n";
import { usePresence } from "@/components/PresenceProvider";
import { useToast } from "@/components/ToastProvider";
import NotificationItem from "@/components/NotificationItem";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/motion/Popover";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", key: "tbFAll", label: "Toutes" },
  { id: "unread", key: "tbFUnread", label: "Non lues" },
  { id: "brain", key: "tbFBrain", label: "Brain" },
  { id: "integration", key: "tbFInteg", label: "Intégrations" },
  { id: "system", key: "tbFSystem", label: "Système" },
] as const;

export default function NotificationCenter() {
  const router = useRouter();
  const i18n = useI18n();
  const { success } = useToast();
  const { setNotification } = usePresence();
  const {
    activeItems,
    groupedItems,
    focusDigest,
    clearFocusDigest,
    unreadCount,
    importantCount,
    markAllRead,
    clear,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleToggleOpen() {
      setOpen((v) => !v);
    }
    function handleForceOpen() {
      setOpen(true);
    }
    function handleMarkAll() {
      markAllRead();
      success(i18n("tbNotifMarked", "Notifications marquées comme lues"));
    }
    window.addEventListener("v8:open-notifications", handleToggleOpen);
    window.addEventListener("ethone:open-notifications", handleForceOpen);
    window.addEventListener("v8:mark-all-notifications-read", handleMarkAll);
    return () => {
      window.removeEventListener("v8:open-notifications", handleToggleOpen);
      window.removeEventListener("ethone:open-notifications", handleForceOpen);
      window.removeEventListener("v8:mark-all-notifications-read", handleMarkAll);
    };
  }, []);

  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (unreadCount > 0) setNotification("important", 5000);
    else if (importantCount > 0) setNotification("important");
    else setNotification("idle");
  }, [unreadCount, importantCount, setNotification]);

  const filteredItems = useMemo(() => {
    let list: NotificationListItem[] = [...groupedItems];

    if (filter === "unread") {
      list = list.filter((item) => ("isGroup" in item ? item.unreadCount > 0 : !item.read));
    } else if (filter === "brain") {
      list = list.filter((item) => item.category === "brain");
    } else if (filter === "integration") {
      list = list.filter((item) => item.category === "integration" || item.category === "mail");
    } else if (filter === "system") {
      list = list.filter((item) => item.category === "system" || item.category === "security");
    }

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((item) => {
        if ("isGroup" in item) {
          return (
            item.source?.toLowerCase().includes(q) ||
            item.items.some((i: Notification) => i.title.toLowerCase().includes(q) || i.message.toLowerCase().includes(q))
          );
        }
        return (
          item.title?.toLowerCase().includes(q) ||
          item.message?.toLowerCase().includes(q) ||
          item.source?.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [groupedItems, filter, query]);

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function onOpenItem(n: Notification) {
    if (n.data?.url && typeof n.data.url === "string") {
      window.open(n.data.url, "_blank");
    } else if (n.data?.route && typeof n.data.route === "string") {
      router.push(n.data.route === "home" ? "/" : `/${n.data.route}/`);
      setOpen(false);
    }
  }

  function handleMarkAllRead() {
    markAllRead();
    success(i18n("tbNotifMarked", "Notifications marquées comme lues"));
  }

  function handleClear() {
    clear();
    success(i18n("tbNotifCleared", "Notifications effacées"));
  }

  const content = (
    <div className="flex h-full flex-col gap-3 select-none">
      {/* En-tête : titre, compteur de non lues, actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent-primary)]">
            <Bell className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold leading-tight text-[var(--text-primary)]">
              {i18n("tbNotifTitle", "Notifications")}
            </h3>
            <p className="truncate text-[11px] text-[var(--text-muted)]">
              {unreadCount > 0 ? `${unreadCount} ${i18n("tbNotifUnread", "non lue(s)")}` : i18n("tbNotifAllRead", "Tout est lu")}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30 cursor-pointer"
            title={i18n("tbNotifMarkAll", "Tout marquer comme lu")}
            aria-label={i18n("tbNotifMarkAll", "Tout marquer comme lu")}
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={activeItems.length === 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] disabled:pointer-events-none disabled:opacity-30 cursor-pointer"
            title={i18n("tbNotifClear", "Tout effacer")}
            aria-label={i18n("tbNotifClear", "Tout effacer")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Focus Digest Banner if accumulated */}
      {focusDigest.length > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-2.5 text-xs text-[var(--warning)]">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {focusDigest.length} {i18n("tbNotifDigest", "notification(s) reportée(s) pendant Focus")}
            </span>
          </div>
          <button
            type="button"
            onClick={clearFocusDigest}
            className="shrink-0 rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/15 px-2.5 py-1 text-[10px] font-bold hover:bg-[var(--warning)]/25 transition-all cursor-pointer"
          >
            {i18n("tbNotifSeeAll", "Tout voir")}
          </button>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={i18n("tbNotifSearch", "Rechercher une notification…")}
          className="h-9 w-full rounded-lg border border-[var(--menu-border)] bg-transparent pl-8 pr-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[var(--accent-primary)]/50 focus:outline-none"
        />
      </div>

      {/* Filter Tabs */}
      <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-0.5 no-scrollbar" role="tablist">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer",
                active
                  ? "bg-[var(--menu-hover)] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--menu-hover)] hover:text-[var(--text-primary)]"
              )}
            >
              {i18n(f.key, f.label)}
              {f.id === "unread" && unreadCount > 0 && (
                <span
                  className={cn(
                    "rounded-full bg-[var(--accent-primary)]/20 px-1.5 text-[10px] font-semibold leading-4 text-[var(--accent-primary)]"
                  )}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="min-h-0 flex-1 overflow-y-auto os-scroll pr-1 max-h-[380px] space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredItems.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-40 flex-col items-center justify-center gap-2 text-center text-xs text-[var(--text-muted)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-raised)]">
                <BellOff className="h-6 w-6 text-[var(--text-muted)]" />
              </span>
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">{i18n("tbNotifEmpty", "Aucune notification")}</span>
              <p className="text-[11px] text-[var(--text-muted)]">{i18n("tbNotifEmptyDesc", "Vous êtes à jour")}</p>
            </motion.div>
          ) : (
            filteredItems.map((item) => {
              if ("isGroup" in item) {
                const isExpanded = expandedGroups.has(item.groupKey);
                return (
                  <div
                    key={item.groupKey}
                    className="overflow-hidden rounded-lg border border-[var(--menu-border)]"
                  >
                    {/* Group Header */}
                    <div
                      onClick={() => toggleGroup(item.groupKey)}
                      className="flex cursor-pointer items-center justify-between p-2.5 transition-colors hover:bg-[var(--menu-hover)]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--menu-hover)] text-xs font-semibold text-[var(--text-primary)]">
                          {item.count}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] capitalize truncate">
                            {item.source}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] truncate">
                            {item.count} {i18n("tbNotifGroupRecent", "activités récentes")} · {item.unreadCount} {i18n("tbNotifUnread", "non lue(s)")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>

                    {/* Group Expanded Items */}
                    {isExpanded && (
                      <div className="border-t border-[var(--panel-border)]/40 p-2 space-y-2 bg-[var(--bg-surface)]/20">
                        {item.items.map((subItem: Notification) => (
                          <NotificationItem key={subItem.id} n={subItem} onOpen={onOpenItem} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return <NotificationItem key={item.id} n={item} onOpen={onOpenItem} />;
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      side="bottom"
      align="end"
      sideOffset={10}
      panelRadius={20}
      gooStrength={0}
    >
      <PopoverTrigger>
        <button
          type="button"
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-[var(--inset-radius)] border transition-all active:scale-95 cursor-pointer shadow-xs",
            unreadCount > 0
              ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/25"
              : "border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
          title={i18n("tbNotifBell", "Centre de notifications")}
          aria-label={i18n("tbNotifBell", "Centre de notifications")}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-primary)] px-1 text-[9px] font-black text-[var(--accent-contrast)] shadow-md">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="ethone-menu w-[380px] max-w-[calc(100vw-1.5rem)] p-3.5">
        {content}
      </PopoverContent>
    </Popover>
  );
}
