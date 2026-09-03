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
  Inbox,
  Star,
  Brain,
  Plug,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  useNotifications,
  type Notification,
  type NotificationGroup,
  type NotificationListItem,
} from "@/lib/hooks/useNotifications";
import { useI18n } from "@/lib/hooks/useI18n";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { usePresence } from "@/components/PresenceProvider";
import { useToast } from "@/components/ToastProvider";
import NotificationItem from "@/components/NotificationItem";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/motion/Popover";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "Toutes" },
  { id: "unread", label: "Non lues" },
  { id: "brain", label: "Brain" },
  { id: "integration", label: "Intégrations" },
  { id: "system", label: "Système" },
] as const;

export default function NotificationCenter() {
  const i18n = useI18n();
  const router = useRouter();
  const isMobile = useIsMobile();
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
      success("Toutes les notifications ont été marquées comme lues");
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
    success("Toutes les notifications marquées comme lues");
  }

  function handleClear() {
    clear();
    success("Toutes les notifications ont été effacées");
  }

  const content = (
    <div className="flex h-full flex-col gap-3 select-none">
      {/* Header with Title & Action Controls */}
      <div className="flex items-center justify-between border-b border-[var(--panel-border)]/60 pb-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            <Bell className="h-4 w-4 text-[var(--accent-primary)]" />
            <span>Centre de Notifications</span>
          </h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {unreadCount > 0
              ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
              : "Toutes les notifications sont lues"}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all active:scale-95 disabled:opacity-30 cursor-pointer shadow-xs"
            title="Tout marquer comme lu"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={activeItems.length === 0}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-rose-400 hover:border-rose-500/40 transition-all active:scale-95 disabled:opacity-30 cursor-pointer shadow-xs"
            title="Tout effacer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Focus Digest Banner if accumulated */}
      {focusDigest.length > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="truncate">
              {focusDigest.length} notification{focusDigest.length > 1 ? "s" : ""} reportée{focusDigest.length > 1 ? "s" : ""} pendant Focus
            </span>
          </div>
          <button
            type="button"
            onClick={clearFocusDigest}
            className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold text-amber-200 hover:bg-amber-500/30 transition-all"
          >
            Tout voir
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
          placeholder="Rechercher dans les notifications..."
          className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 py-1.5 pl-8 pr-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-xl px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer",
                active
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                  : "border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/30 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
              )}
            >
              {f.label}
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
              <BellOff className="h-7 w-7 opacity-50 text-[var(--text-muted)]" />
              <span className="font-semibold text-white/70">Aucune notification</span>
              <p className="text-[11px] text-[var(--text-muted)]">Vous êtes à jour</p>
            </motion.div>
          ) : (
            filteredItems.map((item) => {
              if ("isGroup" in item) {
                const isExpanded = expandedGroups.has(item.groupKey);
                return (
                  <div
                    key={item.groupKey}
                    className="rounded-2xl border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/40 overflow-hidden transition-all shadow-xs"
                  >
                    {/* Group Header */}
                    <div
                      onClick={() => toggleGroup(item.groupKey)}
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-[var(--surface-hover)]/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold text-xs">
                          {item.count}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] capitalize truncate">
                            {item.source}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] truncate">
                            {item.count} activités récentes ({item.unreadCount} non lue{item.unreadCount > 1 ? "s" : ""})
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
            "relative flex h-8 w-8 items-center justify-center rounded-xl border transition-all active:scale-95 cursor-pointer shadow-xs",
            unreadCount > 0
              ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/25"
              : "border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
          title="Centre de notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-primary)] px-1 text-[9px] font-black text-[var(--accent-contrast)] shadow-md">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[380px] max-w-[95vw] rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 p-4 shadow-2xl backdrop-blur-2xl">
        {content}
      </PopoverContent>
    </Popover>
  );
}
