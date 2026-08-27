"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useNotifications, type Notification } from "@/lib/hooks/useNotifications";
import { useI18n } from "@/lib/hooks/useI18n";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { usePresence } from "@/components/PresenceProvider";
import NotificationItem from "@/components/NotificationItem";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/motion/Popover";
import { Icon } from "@/lib/icons";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "Toutes", icon: "tray" },
  { id: "unread", label: "Non lues", icon: "envelope" },
  { id: "important", label: "Importantes", icon: "star" },
] as const;

export default function NotificationCenter() {
  const i18n = useI18n();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { setNotification } = usePresence();
  const {
    activeItems,
    unreadCount,
    importantCount,
    markAllRead,
    clear,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

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

  const filtered = useMemo(() => {
    let list = [...activeItems];
    if (filter === "unread") list = list.filter((n) => !n.read);
    else if (filter === "important") list = list.filter((n) => n.priority === "critical" || n.priority === "important");

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.message?.toLowerCase().includes(q) ||
          n.source?.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [activeItems, filter, query]);

  function onOpenItem(n: Notification) {
    if (n.data?.url && typeof n.data.url === "string") {
      window.open(n.data.url, "_blank");
    } else if (n.data?.route && typeof n.data.route === "string") {
      router.push(n.data.route === "home" ? "/" : `/${n.data.route}/`);
      setOpen(false);
    }
  }

  const content = (
    <div className="flex h-full flex-col gap-3 select-none">
      {/* Header with Title & Action Controls */}
      <div className="flex items-center justify-between border-b border-[var(--panel-border)]/60 pb-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Notifications</h3>
          <p className="text-[10px] text-[var(--text-muted)]">
            {unreadCount > 0
              ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
              : "Toutes les notifications sont lues"}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all disabled:opacity-40"
            title="Tout marquer comme lu"
          >
            <Icon name="check" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={activeItems.length === 0}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)]/40 transition-all disabled:opacity-40"
            title="Tout effacer"
          >
            <Icon name="trash" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Icon
          name="magnifying-glass"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]"
        />
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
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-raised)]/50 border border-[var(--panel-border)]/60">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1 text-xs font-semibold transition-all",
              filter === f.id
                ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Icon name={f.icon} className="h-3.5 w-3.5" />
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="min-h-0 flex-1 overflow-y-auto os-scroll pr-1 max-h-[360px] space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-36 flex-col items-center justify-center gap-2 text-center text-xs text-[var(--text-muted)]"
            >
              <Icon name="bell-slash" className="h-6 w-6 opacity-60 text-[var(--text-muted)]" />
              <span>Aucune notification</span>
            </motion.div>
          ) : (
            filtered.map((n) => (
              <NotificationItem key={n.id} n={n} onOpen={onOpenItem} />
            ))
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
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          <Icon name="bell" className="h-4 w-4 pointer-events-none" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--accent-primary)] px-1 text-[9px] font-bold text-[var(--accent-contrast)] shadow-md">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      {!isMobile && (
        <PopoverContent className="w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 p-4 shadow-2xl backdrop-blur-2xl">
          {content}
        </PopoverContent>
      )}

      {isMobile && open && (
        <Modal
          isOpen={open}
          onClose={() => setOpen(false)}
          title="Notifications"
          size="sm"
          position="bottom"
          hideFooter
        >
          {content}
        </Modal>
      )}
    </Popover>
  );
}
