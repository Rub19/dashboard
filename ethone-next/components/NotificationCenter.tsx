"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FloatingPortal } from "@floating-ui/react";
import { useNotifications, type Notification } from "@/lib/hooks/useNotifications";
import { useI18n } from "@/lib/hooks/useI18n";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { usePresence } from "@/components/PresenceProvider";
import { useTopbarDropdown } from "@/lib/hooks/useTopbarDropdown";
import { Icon } from "@/lib/icons";
import NotificationItem from "@/components/NotificationItem";
import Modal from "@/components/ui/Modal";
import AnimatedFilterTabs from "@/components/ui/AnimatedFilterTabs";

const FILTERS: { id: string; labelKey: string; icon: string }[] = [
  { id: "all", labelKey: "all", icon: "inbox" },
  { id: "unread", labelKey: "unread", icon: "mail-open" },
  { id: "important", labelKey: "important", icon: "star" },
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

  const { setTrigger, setPanel, floatingStyles } = useTopbarDropdown({
    open,
    onClose: () => setOpen(false),
  });

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

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-[var(--foreground)]">{i18n("notifications")}</h3>
        <p className="text-xs text-[var(--muted)]">
          {unreadCount > 0 ? (
            <>
              {unreadCount} {i18n("unread")}
              {importantCount > 0 && (
                <>
                  {" "}
                  · {importantCount} {i18n("importantCount")}
                </>
              )}
            </>
          ) : importantCount > 0 ? (
            <>
              {importantCount} {i18n("importantCount")}
            </>
          ) : (
            i18n("allCaughtUp")
          )}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-zinc-950/50 text-[var(--foreground)] transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={i18n("markAllRead")}
          title={i18n("markAllRead")}
        >
          <Icon name="mail-open" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={activeItems.length === 0}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={i18n("clearAll")}
          title={i18n("clearAll")}
        >
          <Icon name="trash-2" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const search = (
    <div className="relative">
      <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
      <input
        ref={searchRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={i18n("search")}
        className="h-11 w-full rounded-xl border border-white/[0.08] bg-zinc-950/50 py-2 pl-10 pr-4 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)]"
      />
    </div>
  );

  const list = (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch]">
      <AnimatePresence initial={false} mode="popLayout">
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-40 flex-col items-center justify-center gap-3 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-zinc-950/50 text-[var(--muted)]">
              <Icon name="bell-off" className="h-5 w-5" />
            </div>
            <p className="text-sm text-[var(--muted)]">{i18n("noNotifications")}</p>
          </motion.div>
        )}
        <div className="space-y-2">
          {filtered.map((n) => (
            <NotificationItem key={n.id} n={n} onOpen={onOpenItem} />
          ))}
        </div>
      </AnimatePresence>
    </div>
  );

  const content = (
    <div className="flex h-full flex-col gap-3">
      {header}
      {search}
      <AnimatedFilterTabs
        tabs={filterTabs}
        activeId={filter}
        onChange={setFilter}
      />
      {list}
    </div>
  );

  return (
    <div className="relative">
      <button
        type="button"
        ref={setTrigger as unknown as React.Ref<HTMLButtonElement>}
        onClick={() => setOpen(!open)}
        data-tooltip={i18n("notifications")}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-all hover:bg-white/[0.08] hover:text-white active:scale-95 cursor-pointer select-none"
        aria-label={i18n("notifications")}
      >
        <Icon name="bell" className="pointer-events-none h-5 w-5" />
        {unreadCount > 0 && (
          <span
            data-notification-badge
            className="pointer-events-none absolute right-1.5 top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-lg bg-[var(--accent)] px-1 text-[10px] font-bold text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        {unreadCount === 0 && importantCount > 0 && (
          <span className="pointer-events-none absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-amber-400" />
        )}
      </button>

      {open && isMobile && (
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
      )}

      {open && !isMobile && (
        <FloatingPortal>
          <div
            ref={setPanel as unknown as React.Ref<HTMLDivElement>}
            style={floatingStyles}
            className="z-[100] flex w-[28rem] max-w-[calc(100vw-1rem)] max-h-[min(80vh,44rem)] flex-col rounded-2xl border border-white/[0.08] bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-2xl"
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}
