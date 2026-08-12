"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useLayer } from "@/components/LayerProvider";
import { useCommandItems, type CommandItem } from "@/lib/commands";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { searchCommands, commandScore } from "@/lib/command-search";

const ROUTE_CATEGORIES: Record<string, string> = {
  "/bills/": "Facturation",
  "/rss/": "RSS",
  "/scratchpad/": "Scratchpad",
  "/matches/": "Matchs",
  "/drop/": "Drops",
  "/system/": "Système",
  "/weather/": "Météo",
  "/plugins/": "Plugins",
  "/macros/": "Macros",
  "/mail/": "Mail",
  "/focus/": "Focus",
  "/brain/": "Brain",
  "/notes/": "Navigation",
  "/tasks/": "Navigation",
  "/calendar/": "Navigation",
  "/files/": "Navigation",
  "/activity/": "Navigation",
  "/interactions/": "Navigation",
  "/connections/": "Plugins",
  "/spaces/": "Spaces",
  "/flows/": "Navigation",
  "/team/": "Navigation",
  "/settings/": "Réglages",
  "/security/": "Compte",
  "/profile-selection/": "Compte",
  "/changelog/": "Navigation",
  "/": "Navigation",
};

function getRouteCategory(path: string): string | null {
  for (const [route, category] of Object.entries(ROUTE_CATEGORIES)) {
    if (path.startsWith(route)) return category;
  }
  return null;
}

export default function CommandPalette() {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { open, setOpen } = useCommandPalette();
  const dialogRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() ?? "/";
  const routeCategory = useMemo(() => getRouteCategory(pathname), [pathname]);

  useLayer(open, () => setOpen(false), {
    boundary: dialogRef,
    kind: "dialog",
    modal: true,
    trapFocus: true,
    closeOnEscape: true,
    closeOnOutside: true,
    closeOnResize: true,
    closeOnScroll: true,
    initialFocus: false,
  });
  const COMMANDS = useCommandItems(setOpen);

  const pinned = useMemo(() => new Set(settings.pinnedCommands || []), [settings.pinnedCommands]);
  const recent = useMemo(() => new Set(settings.commandHistory || []), [settings.commandHistory]);
  const [frequency, setFrequency] = useLocalStorage<Record<string, number>>("ethone-command-frequency", {});

  const run = useCallback(
    (cmd: CommandItem) => {
      cmd.action();
      const history = [cmd.id, ...(settings.commandHistory || []).filter((id) => id !== cmd.id)].slice(0, 10);
      update({ commandHistory: history });
      setFrequency((prev) => ({ ...prev, [cmd.id]: (prev[cmd.id] || 0) + 1 }));
      setOpen(false);
      setQuery("");
    },
    [setOpen, settings.commandHistory, update, setFrequency]
  );

  const togglePin = useCallback(
    (cmd: CommandItem, e: React.MouseEvent) => {
      e.stopPropagation();
      const next = pinned.has(cmd.id)
        ? (settings.pinnedCommands || []).filter((id) => id !== cmd.id)
        : [...(settings.pinnedCommands || []), cmd.id];
      update({ pinnedCommands: next });
    },
    [pinned, settings.pinnedCommands, update]
  );

  const { pinnedItems, recentItems, otherItems } = useMemo(() => {
    const pinnedItems = (settings.pinnedCommands || [])
      .map((id) => COMMANDS.find((c) => c.id === id))
      .filter(Boolean) as CommandItem[];

    const recentItems = (settings.commandHistory || [])
      .filter((id) => !pinned.has(id))
      .map((id) => COMMANDS.find((c) => c.id === id))
      .filter(Boolean) as CommandItem[];

    const used = new Set([...pinnedItems, ...recentItems].map((c) => c.id));
    const rest = COMMANDS.filter((c) => !used.has(c.id));

    const otherItems = [...rest]
      .map((cmd) => ({
        cmd,
        score: commandScore(cmd, "", { routeCategory, pinned, recent, frequency }),
      }))
      .sort((a, b) => b.score - a.score || a.cmd.label.localeCompare(b.cmd.label, "fr"))
      .map((s) => s.cmd);

    return { pinnedItems, recentItems, otherItems };
  }, [COMMANDS, settings.commandHistory, settings.pinnedCommands, pinned, recent, routeCategory, frequency]);

  const filtered = useMemo<CommandItem[]>(() => {
    const active = query.trim() !== "";
    if (!active) return [...pinnedItems, ...recentItems, ...otherItems];
    return searchCommands(COMMANDS, query, { routeCategory, pinned, recent, frequency }) as CommandItem[];
  }, [query, COMMANDS, pinnedItems, recentItems, otherItems, routeCategory, pinned, recent, frequency]);

  const sections = useMemo(() => {
    if (query.trim()) return [{ title: i18n("results"), items: filtered }];
    return [
      ...(pinnedItems.length ? [{ title: i18n("pinned"), items: pinnedItems, color: "text-amber-400" }] : []),
      ...(recentItems.length ? [{ title: i18n("recent"), items: recentItems }] : []),
      { title: i18n("all"), items: otherItems },
    ];
  }, [query, filtered, pinnedItems, recentItems, otherItems, i18n]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!open);
      }
      if (!open) return;

      const hasResults = filtered.length > 0;
      const lastIndex = Math.max(0, filtered.length - 1);

      if (event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey)) {
        event.preventDefault();
        if (hasResults) setIndex((i) => (i + 1) % filtered.length);
      } else if (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey)) {
        event.preventDefault();
        if (hasResults) setIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (event.key === "Home") {
        event.preventDefault();
        if (hasResults) setIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        if (hasResults) setIndex(lastIndex);
      } else if (event.key === "PageDown") {
        event.preventDefault();
        if (hasResults) setIndex((i) => (i + 5) % filtered.length);
      } else if (event.key === "PageUp") {
        event.preventDefault();
        if (hasResults) setIndex((i) => (i - 5 + filtered.length) % filtered.length);
      } else if (event.key === "Enter" && filtered[index]) {
        event.preventDefault();
        run(filtered[index]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, index, setOpen, run]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  function renderItem(cmd: CommandItem, itemIndex: number) {
    const active = itemIndex === index;
    return (
      <div
        key={cmd.id}
        onClick={() => run(cmd)}
        onMouseEnter={() => setIndex(itemIndex)}
        className={`group relative flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
          active ? "bg-[var(--accent)] text-white" : "cursor-pointer text-[var(--foreground)] hover:bg-[var(--surface)]"
        }`}
        role="button"
      >
        <span className="flex min-w-0 items-center gap-2">
          {cmd.icon && <span className="opacity-70">{cmd.icon}</span>}
          <span className="truncate">{cmd.label}</span>
          <span className={`whitespace-nowrap text-[10px] ${active ? "text-white/70" : "text-[var(--muted)]"}`}>{cmd.category}</span>
        </span>
        <span className="flex items-center gap-2">
          {cmd.shortcut && (
            <span className="flex items-center gap-1 text-[10px] opacity-60">
              <Icon name="command" className="h-3 w-3" />
              {cmd.shortcut}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => togglePin(cmd, e)}
            className={`rounded p-1 transition-colors ${active ? "text-white/70 hover:bg-white/20" : "text-[var(--muted)] hover:bg-[var(--surface-raised)]"}`}
            aria-label={pinned.has(cmd.id) ? i18n("unpin") : i18n("pin")}
            title={pinned.has(cmd.id) ? i18n("unpin") : i18n("pin")}
          >
            <Icon name={pinned.has(cmd.id) ? "pin-off" : "pin"} className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
    );
  }

  let globalIndex = 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)] lg:flex"
      >
        <Icon name="search" className="h-3.5 w-3.5" />
        <span>{i18n("commands")}</span>
        <kbd className="rounded bg-[var(--surface-raised)] px-1 py-0.5 text-[10px]">
          <Icon name="command" className="inline h-3 w-3" />K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 p-6 pt-32 backdrop-blur-sm"
          >
            <motion.div
              ref={dialogRef}
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
                <Icon name="search" className="h-5 w-5 text-[var(--muted)]" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={i18n("search")}
                  className="flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
                />
                <kbd className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">ESC</kbd>
              </div>

              <div className="max-h-80 overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <p className="p-4 text-center text-sm text-[var(--muted)]">{i18n("noResults")}</p>
                ) : (
                  sections.map((section) => (
                    <div key={section.title} className="mb-2 last:mb-0">
                      <p className={`mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] ${section.color || ""}`}>
                        {section.title}
                      </p>
                      {section.items.map((cmd) => renderItem(cmd, globalIndex++))}
                    </div>
                  ))
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-2.5 text-[10px] text-[var(--muted)]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[10px]">Esc</kbd>
                    <span>{i18n("close")}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[10px]">↑</kbd>
                    <kbd className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[10px]">↓</kbd>
                    <span>{i18n("spotlightNav")}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[10px]">Enter</kbd>
                    <span>{i18n("openHere")}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-60">
                  <Icon name="command" className="h-3 w-3" />
                  <span>{i18n("commands")}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
