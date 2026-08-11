"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import { CHANGELOG } from "@/data/changelog";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/lib/hooks/useProfile";
import { useFocus } from "./FocusProvider";
import { useSettings } from "@/components/SettingsProvider";
import { usePresence } from "./PresenceProvider";

const HUBS = [
  { city: "Paris", zone: "Europe/Paris", label: "CET" },
  { city: "New York", zone: "America/New_York", label: "EST" },
  { city: "Tokyo", zone: "Asia/Tokyo", label: "JST" },
  { city: "San Francisco", zone: "America/Los_Angeles", label: "PST" },
];

const TABS = [
  { id: "widgets", label: "Widgets", icon: "panels-top-left" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "changelog", label: "Changelog", icon: "sparkles" },
  { id: "profile", label: "Profil", icon: "user-round" },
];

function useNow(ms: number) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function formatWorldTime(zone: string, now: Date, locale = "fr-FR") {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone: zone, hour: "2-digit", minute: "2-digit" }).format(now);
  } catch {
    return "--:--";
  }
}

function isDay(zone: string, now: Date) {
  try {
    const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", hour12: false }).format(now));
    return h >= 6 && h < 20;
  } catch {
    return true;
  }
}

export default function SidePanel() {
  const i18n = useI18n();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("widgets");
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) { e.preventDefault(); setOpen(false); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const now = useNow(1000);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
        aria-label={i18n("openPanel")}
      >
        <Icon name="panels-right-bottom" className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              ref={trapRef}
              role="dialog"
              aria-modal="true"
              aria-label={i18n("panel")}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 z-[61] flex h-full w-[min(100vw,420px)] flex-col border-l border-[var(--border)] bg-[var(--surface-raised)] shadow-2xl"
            >
              <header className="flex items-center justify-between border-b border-[var(--border)] p-4">
                <div className="flex items-center gap-2">
                  <Icon name="panels-right-bottom" className="h-5 w-5 text-[var(--accent)]" />
                  <strong className="text-lg">{i18n("panel")}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 hover:bg-[var(--surface)]"
                  aria-label={i18n("close")}
                >
                  <Icon name="x" className="h-5 w-5" />
                </button>
              </header>

              <nav className="flex border-b border-[var(--border)] p-2" role="tablist" aria-label={i18n("panelTabs")}>
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium transition-colors ${
                      tab === t.id ? "bg-[var(--surface)] text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <Icon name={t.icon} className="h-4 w-4" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                ))}
              </nav>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {tab === "widgets" && <WidgetsTab now={now} />}
                {tab === "notifications" && <NotificationsTab />}
                {tab === "changelog" && <ChangelogTab />}
                {tab === "profile" && <ProfileTab />}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function WidgetsTab({ now }: { now: Date }) {
  const i18n = useI18n();
  const { state } = useFocus();
  const { settings } = useSettings();
  const { unreadCount, importantCount } = useNotifications();
  const { state: presence } = usePresence();
  const progress = state.total > 0 ? ((state.total - state.remaining) / state.total) * 100 : 0;

  const statusMap: Record<string, string> = {
    online: "statusOnline",
    busy: "statusBusy",
    focus: "statusFocus",
    away: "statusAway",
    invisible: "statusInvisible",
  };

  const statusIconMap: Record<string, string> = {
    online: "circle",
    busy: "minus-circle",
    focus: "target",
    away: "moon",
    invisible: "eye-off",
  };

  const presenceMap: Record<string, string> = {
    online: "presenceOnline",
    away: "presenceAway",
    dnd: "presenceDnd",
    offline: "presenceOffline",
  };

  const statusIcon = statusIconMap[settings.status] || "circle";
  const presenceLabel = presenceMap[presence.status || "online"] || "presenceOnline";

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-3 gap-2">
        <Metric icon="bell" value={unreadCount} label={i18n("unread")} />
        <Metric icon="alert-triangle" value={importantCount} label={i18n("important")} />
        <Metric icon="timer" value={state.remaining} label={state.phase === "idle" ? i18n("focus") : i18n("remaining")} />
        <Metric icon="brain" value={settings.brainEnabled ? i18n("on") : i18n("off")} label={i18n("brain")} />
        <Metric icon={statusIcon} value={i18n(statusMap[settings.status] || "statusOnline")} label={i18n("sessionMode")} />
        <Metric icon="radio" value={i18n(presenceLabel)} label={i18n("presence")} />
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <strong className="mb-2 block text-sm">{i18n("quickActions")}</strong>
        <div className="grid grid-cols-2 gap-2">
          <QuickAction icon="file-plus-2" label={i18n("note")} href="/notes" />
          <QuickAction icon="list-plus" label={i18n("task")} href="/tasks" />
          <QuickAction icon="calendar-plus" label={i18n("event")} href="/calendar" />
          <QuickAction icon="brain" label="Brain" href="/brain" />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <strong className="mb-2 block text-sm">{i18n("worldClocks")}</strong>
        <div className="grid grid-cols-2 gap-2">
          {HUBS.map((hub) => {
            const time = formatWorldTime(hub.zone, now);
            const day = isDay(hub.zone, now);
            return (
              <div
                key={hub.city}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3"
              >
                <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>{hub.city}</span>
                  <span>{day ? "☀️ Jour" : "🌙 Nuit"}</span>
                </div>
                <p className="mt-1 text-xl font-semibold tabular-nums">{time}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-2 flex items-center justify-between">
          <strong className="text-sm">{i18n("focusExpress")}</strong>
          <span className="text-xs text-[var(--muted)]">{state.format(state.remaining)}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
          <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center" data-live-widget="metric" data-live-kind="metric">
      <Icon name={icon} className="h-5 w-5 text-[var(--accent)]" />
      <strong className="text-lg font-bold" data-live-number={value}>{value}</strong>
      <span className="text-[10px] text-[var(--muted)]">{label}</span>
    </div>
  );
}

function QuickAction({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 rounded-xl bg-[var(--surface-raised)] p-2 text-sm transition-colors hover:bg-[var(--accent)]/10"
      data-interactive
    >
      <Icon name={icon} className="h-4 w-4 text-[var(--accent)]" />
      {label}
    </a>
  );
}

function NotificationsTab() {
  const i18n = useI18n();
  const { activeItems, markRead, markAllRead, archive } = useNotifications();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return activeItems.filter((item) => {
      if (filter === "unread" && item.read) return false;
      if (filter !== "all" && filter !== "unread" && item.category !== filter) return false;
      if (!normalized) return true;
      const text = [item.title, item.message, item.category].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      return text.includes(normalized);
    });
  }, [activeItems, filter, query]);

  const categories = useMemo(() => Array.from(new Set(activeItems.map((i) => i.category))), [activeItems]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={i18n("search")}
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm"
        >
          <option value="all">{i18n("all")}</option>
          <option value="unread">{i18n("unread")}</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button type="button" onClick={() => markAllRead()} className="rounded-xl p-2 hover:bg-[var(--surface)]" aria-label={i18n("markAllRead")}>
          <Icon name="check-check" className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2" role="list">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]">
            {i18n("noNotifications")}
          </div>
        )}
        {filtered.map((item) => (
          <article
            key={item.id}
            role="listitem"
            className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 ${item.read ? "opacity-70" : ""}`}
          >
            <div className="flex items-start gap-3">
              <Icon name={item.icon || "info"} className="h-5 w-5 shrink-0 text-[var(--accent)]" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
                  <span>{formatTime(item.timestamp)}</span>
                  {item.category && <span className="rounded bg-[var(--surface-raised)] px-1.5 py-0.5">{item.category}</span>}
                </div>
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-[var(--muted)]">{item.message}</p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => markRead(item.id)} className="rounded p-1 hover:bg-[var(--surface-raised)]" aria-label={i18n("markRead")}>
                  <Icon name={item.read ? "mail" : "mail-check"} className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => archive(item.id)} className="rounded p-1 hover:bg-[var(--surface-raised)]" aria-label={i18n("archive")}>
                  <Icon name="archive" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

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

function ChangelogTab() {
  return (
    <div className="space-y-4">
      {CHANGELOG.map((entry) => (
        <article key={entry.version} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <header className="mb-2 flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="font-mono">{entry.version}</span>
            <time>{entry.date}</time>
          </header>
          <strong className="mb-2 block text-sm">{entry.title}</strong>
          <ul className="list-disc space-y-1 pl-4 text-xs text-[var(--muted)]">
            {entry.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function ProfileTab() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const i18n = useI18n();
  const email = user?.email || i18n("guest");
  const name = profile?.display_name || profile?.username || email;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-2xl text-white">
          {name.charAt(0).toUpperCase()}
        </div>
        <strong className="block text-lg">{name}</strong>
        <span className="text-sm text-[var(--muted)]">{email}</span>
      </div>
      <a href="/settings" className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm hover:bg-[var(--surface-raised)]" data-interactive>
        <span className="flex items-center gap-2">
          <Icon name="settings" className="h-4 w-4" />
          {i18n("settings")}
        </span>
        <Icon name="chevron-right" className="h-4 w-4" />
      </a>
      <a href="/profile" className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm hover:bg-[var(--surface-raised)]" data-interactive>
        <span className="flex items-center gap-2">
          <Icon name="user" className="h-4 w-4" />
          {i18n("profile")}
        </span>
        <Icon name="chevron-right" className="h-4 w-4" />
      </a>
    </div>
  );
}
