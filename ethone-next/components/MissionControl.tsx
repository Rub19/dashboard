"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useWindowManager } from "./WindowManagerProvider";
import { useI18n } from "@/lib/hooks/useI18n";

const ROUTE_ICONS: Record<string, string> = {
  "/": "home",
  "/notes": "notes",
  "/tasks": "tasks",
  "/calendar": "calendar",
  "/files": "files",
  "/bills": "bills",
  "/mail": "mail",
  "/brain": "brain",
  "/focus": "focus",
  "/spaces": "spaces",
  "/flows": "flows",
  "/interactions": "interactions",
  "/connections": "connections",
  "/activity": "activity",
  "/settings": "settings",
  "/system": "system",
  "/team": "team",
  "/profile": "user",
  "/plugins": "plugins",
  "/drop": "drop",
  "/rss": "rss",
};

function routeIcon(route: string) {
  return ROUTE_ICONS[route] || "scan-search";
}

export function MissionControl() {
  const i18n = useI18n();
  const { windows, missionControl, setMissionControl, focusWindow, closeWindow } = useWindowManager();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!missionControl) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setMissionControl(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [missionControl, setMissionControl]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return windows;
    return windows.filter(
      (w) =>
        w.title.toLowerCase().includes(term) ||
        w.route.toLowerCase().includes(term)
    );
  }, [windows, query]);

  if (!missionControl) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-start bg-black/80 p-4 pt-12 backdrop-blur-sm sm:justify-center sm:p-8 sm:pt-8"
    >
      <div className="mb-4 flex w-full max-w-6xl items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          {i18n("missionControlTitle")}
        </h2>
        <button
          type="button"
          onClick={() => setMissionControl(false)}
          className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          aria-label={i18n("close")}
        >
          <Icon name="close" className="h-6 w-6" />
        </button>
      </div>

      <div className="mb-6 w-full max-w-6xl">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={i18n("searchWindows")}
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-[var(--accent)]"
            autoFocus
          />
        </div>
      </div>

      {windows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 text-center text-white/70">
          <Icon name="scan-search" className="h-10 w-10 opacity-50" />
          <p>{i18n("noOpenWindows")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 text-center text-white/70">
          <Icon name="scan-search" className="h-10 w-10 opacity-50" />
          <p>{i18n("noWindowsMatch")}</p>
        </div>
      ) : (
        <div className="grid max-h-[60vh] w-full max-w-6xl grid-cols-2 gap-4 overflow-auto sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((win) => (
            <motion.div
              key={win.id}
              layoutId={`win-${win.id}`}
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                focusWindow(win.id);
                setMissionControl(false);
              }}
              className="group relative flex aspect-video cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-raised)] p-4 text-left shadow-2xl"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  focusWindow(win.id);
                  setMissionControl(false);
                }
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeWindow(win.id);
                }}
                className="absolute right-2 top-2 z-10 rounded-full bg-black/40 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={i18n("closeWindow")}
              >
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>

              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                  <Icon name={routeIcon(win.route)} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">{win.title}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{win.route}</p>
                </div>
              </div>

              <div className="mt-auto h-16 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2">
                <div className="flex h-full w-full flex-col gap-1.5 opacity-40">
                  <div className="h-2 w-3/4 rounded bg-[var(--accent)]/30" />
                  <div className="h-2 w-1/2 rounded bg-[var(--muted)]/20" />
                  <div className="h-2 w-full rounded bg-[var(--border)]" />
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 h-1 bg-[var(--accent)]" />
            </motion.div>
          ))}
        </div>
      )}

      {windows.length > 0 && (
        <p className="mt-6 text-sm text-white/50">
          {filtered.length} / {windows.length} {i18n("windows")}
        </p>
      )}
    </motion.div>
  );
}
