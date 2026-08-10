"use client";

import { useState } from "react";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";

const CATEGORY_ICONS: Record<string, string> = {
  mail: "mail",
  security: "shield",
  tracker: "activity",
  system: "settings",
  brain: "brain",
  integration: "plug",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-sky-500/10 text-sky-400",
  normal: "bg-amber-500/10 text-amber-400",
  high: "bg-rose-500/10 text-rose-400",
};

export default function NotificationCenter() {
  const i18n = useI18n();
  const { settings } = useSettings();
  const { items, unreadCount, markRead, markAllRead, remove, clear, snooze } = useNotifications();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all" ? items : items.filter((n) => n.category === filter);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative rounded-xl p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
        aria-label={i18n("notifications")}
      >
        <Icon name="bell" className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{i18n("notifications")}</h3>
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
                  {items.length > 0 && (
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

              <div className="flex flex-wrap gap-1.5">
                {["all", "mail", "security", "tracker", "system", "brain", "integration"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilter(cat)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      filter === cat
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {i18n(cat)}
                  </button>
                ))}
              </div>

              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {filtered.length === 0 && (
                  <p className="py-8 text-center text-sm text-[var(--muted)]">
                    {i18n("noNotifications")}
                  </p>
                )}
                {filtered.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`relative rounded-xl border p-3 text-sm transition-colors ${
                      n.read
                        ? "border-[var(--border)] bg-[var(--surface)]"
                        : "border-[var(--accent)]/30 bg-[var(--surface-raised)]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon
                        name={CATEGORY_ICONS[n.category] || "bell"}
                        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{n.title}</span>
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                              PRIORITY_COLORS[n.priority]
                            }`}
                          >
                            {i18n(n.priority)}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--muted)]">{n.message}</p>
                        <p className="mt-1 text-[10px] text-[var(--muted)]/70">
                          {new Date(n.createdAt).toLocaleString(settings.language, { dateStyle: "short", timeStyle: "short" })}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
                      )}
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      {!n.read && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            snooze(n.id);
                          }}
                          className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)]"
                        >
                          {i18n("snooze")}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(n.id);
                        }}
                        className="text-[10px] text-red-400 hover:text-red-300"
                      >
                        {i18n("delete")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
