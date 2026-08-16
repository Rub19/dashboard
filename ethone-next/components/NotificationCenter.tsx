"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useNotifications, type Notification } from "@/lib/hooks/useNotifications";
import { useI18n } from "@/lib/hooks/useI18n";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { usePresence } from "@/components/PresenceProvider";
import { Icon } from "@/lib/icons";
import NotificationItem from "@/components/NotificationItem";
import Modal from "@/components/ui/Modal";
import AnimatedFilterTabs from "@/components/ui/AnimatedFilterTabs";

const FILTERS: { id: string; labelKey: string; icon: string }[] = [
  { id: "all", labelKey: "all", icon: "layout-grid" },
  { id: "unread", labelKey: "unread", icon: "mail-open" },
  { id: "important", labelKey: "important", icon: "star" },
  { id: "system", labelKey: "system", icon: "settings" },
  { id: "github", labelKey: "github", icon: "github" },
  { id: "security", labelKey: "security", icon: "shield" },
];

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

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
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("v8:open-notifications", onOpen);
    return () => window.removeEventListener("v8:open-notifications", onOpen);
  }, []);

  useEffect(() => {
    if (unreadCount > 0) setNotification("important", 5000);
    else if (importantCount > 0) setNotification("important");
    else setNotification("idle");
  }, [unreadCount, importantCount, setNotification]);

  const filterCounts = useMemo(() => {
    return FILTERS.map((f) => {
      let count = activeItems.length;
      if (f.id === "unread") count = activeItems.filter((n) => !n.read).length;
      else if (f.id === "important") count = activeItems.filter((n) => n.priority === "critical" || n.priority === "important").length;
      else if (f.id === "system") count = activeItems.filter((n) => n.category === "system").length;
      else if (f.id === "github") count = activeItems.filter((n) => n.category === "integration" || n.type === "github-pr").length;
      else if (f.id === "security") count = activeItems.filter((n) => n.category === "security").length;
      return { id: f.id, count };
    });
  }, [activeItems]);

  const filterTabs = useMemo(
    () =>
      FILTERS.map((f) => ({
        id: f.id,
        label: i18n(f.labelKey),
        count: filterCounts.find((c) => c.id === f.id)?.count ?? 0,
        icon: <Icon name={f.icon} className="h-3.5 w-3.5" />,
      })),
    [filterCounts, i18n]
  );

  const filtered = useMemo(() => {
    let list = activeItems;

    if (filter === "unread") list = list.filter((n) => !n.read);
    else if (filter === "important") list = list.filter((n) => n.priority === "critical" || n.priority === "important");
    else if (filter === "system") list = list.filter((n) => n.category === "system");
    else if (filter === "github") list = list.filter((n) => n.category === "integration" || n.type === "github-pr");
    else if (filter === "security") list = list.filter((n) => n.category === "security");

    const q = normalizeText(query.trim());
    if (q) {
      list = list.filter(
        (n) =>
          normalizeText(n.title).includes(q) ||
          normalizeText(n.message).includes(q) ||
          normalizeText(n.source || "").includes(q) ||
          normalizeText(n.category).includes(q)
      );
    }
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [activeItems, filter, query]);

  function onOpenItem(n: Notification) {
    if (n.data?.url && typeof n.data.url === "string") {
      window.open(n.data.url, "_blank");
    } else if (n.data?.route && typeof n.data.route === "string") {
      router.push(n.data.route === "home" ? "/" : `/${n.data.route}/`);
    }
  }

  const content = (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[var(--foreground)]">{i18n("notifications")}</h3>
          <p className="text-[10px] text-[var(--muted)]">
            {unreadCount} {i18n("unread")} · {importantCount} {i18n("importantCount")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="flex h-9 items-center gap-1.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/[0.04] px-2.5 text-[11px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--panel-bg)]/[0.08] disabled:cursor-not-allowed disabled:opacity-40 backdrop-blur-[var(--panel-blur)]"
          >
            <Icon name="mail-open" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{i18n("markAllRead")}</span>
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={activeItems.length === 0}
            className="flex h-9 items-center gap-1.5 rounded-[var(--panel-radius)] border border-rose-500/20 bg-rose-500/10 px-2.5 text-[11px] font-medium text-rose-400 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="trash-2" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{i18n("clearAll")}</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={i18n("search")}
          className="h-11 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/50 py-2 pl-10 pr-4 text-base outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30 md:text-sm backdrop-blur-[var(--panel-blur)]"
        />
      </div>

      <AnimatedFilterTabs
        tabs={filterTabs}
        activeId={filter}
        onChange={setFilter}
      />

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch]">
        <AnimatePresence initial={false} mode="popLayout">
          {filtered.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center text-sm text-[var(--muted)]"
            >
              {i18n("noNotifications")}
            </motion.p>
          )}
          {filtered.map((n) => (
            <NotificationItem key={n.id} n={n} onOpen={onOpenItem} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        data-tooltip={i18n("notifications")}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--foreground)]"
        aria-label={i18n("notifications")}
      >
        <Icon name="bell" className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            data-notification-badge
            className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        {unreadCount === 0 && importantCount > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {isMobile ? (
            <Modal
              isOpen={open}
              onClose={() => setOpen(false)}
              title={i18n("notifications")}
              size="sm"
              position="bottom"
              hideFooter
            >
              {content}
            </Modal>
          ) : (
            <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 p-4 shadow-2xl backdrop-blur-md">
              {content}
            </div>
          )}
        </>
      )}
    </div>
  );
}
