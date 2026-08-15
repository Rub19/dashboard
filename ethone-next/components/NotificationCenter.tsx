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
import BottomSheet from "@/components/BottomSheet";

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
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-zinc-100">{i18n("notifications")}</h3>
          <p className="text-[10px] text-zinc-500">
            {unreadCount} {i18n("unread")} · {importantCount} {i18n("importantCount")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="mail-open" className="h-3.5 w-3.5" />
            {i18n("markAllRead")}
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={activeItems.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-400 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="trash-2" className="h-3.5 w-3.5" />
            {i18n("clearAll")}
          </button>
        </div>
      </div>

      <div className="relative">
        <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={i18n("search")}
          className="h-10 w-full rounded-xl border border-white/10 bg-zinc-900/50 py-2 pl-10 pr-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto py-1 no-scrollbar">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors ${
                active
                  ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                  : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <Icon name={f.icon} className="h-3 w-3" />
              {i18n(f.labelKey)}
            </button>
          );
        })}
      </div>

      <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-track]:bg-transparent">
        <AnimatePresence initial={false} mode="popLayout">
          {filtered.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center text-sm text-zinc-500"
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
        className="relative rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-900/60 hover:text-zinc-100"
        aria-label={i18n("notifications")}
      >
        <Icon name="bell" className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            data-notification-badge
            className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white"
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
            <BottomSheet open={open} onClose={() => setOpen(false)} title={i18n("notifications")} position="bottom" draggable>
              {content}
            </BottomSheet>
          ) : (
            <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-white/10 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-md">
              {content}
            </div>
          )}
        </>
      )}
    </div>
  );
}
