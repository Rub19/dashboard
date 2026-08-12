"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotifications, SNOOZE_OPTIONS, type Notification, type NotificationCategory, type SnoozeDuration } from "@/lib/hooks/useNotifications";
import { useI18n } from "@/lib/hooks/useI18n";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { Icon } from "@/lib/icons";
import { usePresence } from "@/components/PresenceProvider";
import BottomSheet from "@/components/BottomSheet";

const CATEGORY_ICONS: Record<NotificationCategory, string> = {
  mail: "mail",
  security: "shield",
  tracker: "activity",
  system: "settings",
  brain: "brain",
  integration: "plug",
  important: "star",
  messages: "mail",
  activity: "activity",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-rose-500/10 text-rose-400",
  important: "bg-amber-500/10 text-amber-400",
  normal: "bg-sky-500/10 text-sky-400",
  silent: "bg-zinc-500/10 text-zinc-400",
};

const TYPE_ICONS: Record<string, string> = {
  info: "info",
  success: "check-circle-2",
  error: "circle-alert",
  warning: "triangle-alert",
  mail: "mail",
  security: "shield-alert",
  brain: "brain",
  system: "settings",
  tracker: "activity",
  integration: "plug",
  "github-pr": "github",
  calendar: "calendar-days",
};

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
    markRead,
    markAllRead,
    archive,
    clear,
    snooze,
    markImportant,
    isMuted,
    muteCategory,
    unmuteCategory,
    getCategories,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [snoozeOpen, setSnoozeOpen] = useState<string | null>(null);
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

  const categories = useMemo(
    () => [
      { id: "all", label: i18n("all"), icon: "layout-grid" },
      { id: "unread", label: i18n("unread"), icon: "mail-open" },
      ...getCategories().map((cat) => ({
        id: cat,
        label: i18n(cat),
        icon: CATEGORY_ICONS[cat] || "bell",
      })),
    ],
    [i18n, getCategories]
  );

  const filtered = useMemo(() => {
    let list = activeItems;
    if (filter === "unread") list = list.filter((n) => !n.read);
    else if (filter !== "all") list = list.filter((n) => n.category === filter);

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
    markRead(n.id);
    if (n.data?.url && typeof n.data.url === "string") {
      window.open(n.data.url, "_blank");
    } else if (n.data?.route && typeof n.data.route === "string") {
      router.push(n.data.route === "home" ? "/" : `/${n.data.route}/`);
    }
  }

  function onSnooze(n: Notification, duration: SnoozeDuration) {
    snooze(n.id, duration);
    setSnoozeOpen(null);
  }

  const content = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">{i18n("notifications")}</h3>
          <p className="text-[10px] text-[var(--muted)]">
            {unreadCount} {i18n("unread")} · {importantCount} {i18n("importantCount")}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              
              className="text-xs text-[var(--accent)] hover:underline"
            >
              {i18n("markAllRead")}
            </button>
          )}
          {activeItems.length > 0 && (
            <button
              type="button"
              onClick={clear}
              
              className="text-xs text-red-400 hover:underline"
            >
              {i18n("clearAll")}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Icon name="search" className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={i18n("search")}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 text-sm outline-none"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setFilter(cat.id)}
            
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
              filter === cat.id
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface-raised)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Icon name={cat.icon} className="h-3 w-3" />
            {cat.label}
          </button>
        ))}
      </div>

      <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--muted)]">{i18n("noNotifications")}</p>
        )}
        {filtered.map((n) => {
          const iconName = n.icon || TYPE_ICONS[n.type || "info"] || "bell";
          return (
            <div
              key={n.id}
              onClick={() => onOpenItem(n)}
              className={`relative rounded-xl border p-3 text-sm transition-colors ${
                n.read ? "border-[var(--border)] bg-[var(--surface-raised)]" : "border-[var(--accent)]/30 bg-[var(--surface)]"
              }`}
            >
              <div className="flex items-start gap-2">
                <Icon
                  name={iconName}
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    n.priority === "critical" ? "text-rose-400" : n.priority === "important" ? "text-amber-400" : "text-[var(--muted)]"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{n.title}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                        PRIORITY_COLORS[n.priority] || PRIORITY_COLORS.normal
                      }`}
                    >
                      {i18n(n.priority)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)]">{n.message}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--muted)]/70">
                    <span>{n.source || i18n(n.category)}</span>
                    <span>·</span>
                    <span>{formatTime(n.timestamp)}</span>
                    {n.demo && (
                      <>
                        <span>·</span>
                        <span className="rounded bg-[var(--accent)]/10 px-1 py-0.5 text-[var(--accent)]">Demo</span>
                      </>
                    )}
                  </div>
                </div>
                {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {!n.read && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markRead(n.id);
                    }}
                    
                    className="rounded-lg bg-[var(--surface-raised)] px-2 py-1 text-[10px] text-[var(--foreground)] hover:bg-[var(--surface)]"
                  >
                    <Icon name="mail-open" className="mr-1 inline h-3 w-3" />
                    {i18n("markAsRead")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    archive(n.id);
                  }}
                  
                  className="rounded-lg bg-[var(--surface-raised)] px-2 py-1 text-[10px] text-[var(--foreground)] hover:bg-[var(--surface)]"
                >
                  <Icon name="archive" className="mr-1 inline h-3 w-3" />
                  {i18n("archive")}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSnoozeOpen(snoozeOpen === n.id ? null : n.id);
                  }}
                  
                  className="rounded-lg bg-[var(--surface-raised)] px-2 py-1 text-[10px] text-[var(--foreground)] hover:bg-[var(--surface)]"
                >
                  <Icon name="clock-3" className="mr-1 inline h-3 w-3" />
                  {i18n("snooze")}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    markImportant(n.id);
                  }}
                  
                  className={`rounded-lg px-2 py-1 text-[10px] ${
                    n.priority === "important" || n.priority === "critical"
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-[var(--surface-raised)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                  }`}
                >
                  <Icon name="alert-circle" className="mr-1 inline h-3 w-3" />
                  {i18n("markImportant")}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isMuted(n.category)) unmuteCategory(n.category);
                    else muteCategory(n.category);
                  }}
                  
                  className="rounded-lg bg-[var(--surface-raised)] px-2 py-1 text-[10px] text-[var(--foreground)] hover:bg-[var(--surface)]"
                >
                  <Icon name={isMuted(n.category) ? "bell" : "bell-off"} className="mr-1 inline h-3 w-3" />
                  {i18n(isMuted(n.category) ? "unmute" : "mute")}
                </button>
              </div>

              {snoozeOpen === n.id && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SNOOZE_OPTIONS.map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSnooze(n, dur);
                      }}
                      
                      className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 text-[10px] hover:bg-[var(--surface)]"
                    >
                      {i18n(SNOOZE_KEYS[dur])}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        
        data-tooltip={i18n("notifications")}
        className="relative rounded-xl p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
        aria-label={i18n("notifications")}
      >
        <Icon name="bell" className="h-5 w-5" />
        {unreadCount > 0 && (
          <span data-notification-badge className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white">
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
            <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
              {content}
            </div>
          )}
        </>
      )}
    </div>
  );
}
