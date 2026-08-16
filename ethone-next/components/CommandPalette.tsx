"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useSettings, useActiveProfile } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useLayer } from "@/components/LayerProvider";
import { useCommandItems, type CommandItem } from "@/lib/commands";
import { searchCommands, createCommandHistory } from "@/lib/command-search";

const SECTION_ORDER = ["Navigation", "Actions Rapides", "Intégrations", "Thèmes & Apparence"];

const SECTION_MAP: Record<string, string> = {
  Navigation: "Navigation",
  Créer: "Actions Rapides",
  "Fenêtres": "Actions Rapides",
  "Spaces": "Actions Rapides",
  "Focus": "Actions Rapides",
  "Brain": "Actions Rapides",
  "Système": "Actions Rapides",
  "Compte": "Actions Rapides",
  "Presets": "Actions Rapides",
  "Ambiance": "Thèmes & Apparence",
  "Réglages": "Thèmes & Apparence",
  "Plugins": "Intégrations",
  "RSS": "Intégrations",
  "Scratchpad": "Intégrations",
  "Matchs": "Intégrations",
  "Drops": "Intégrations",
  "Météo": "Intégrations",
  "Macros": "Intégrations",
  "Facturation": "Intégrations",
  "Mail": "Intégrations",
};

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

function getSection(category: string) {
  return SECTION_MAP[category] ?? "Actions Rapides";
}

export default function CommandPalette() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { activeProfile } = useActiveProfile();
  const pathname = usePathname() ?? "/";
  const { open, setOpen } = useCommandPalette();

  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commandHistory = useMemo(() => createCommandHistory(), []);
  const [frequency, setFrequency] = useState(() => commandHistory.frequency());

  const COMMANDS = useCommandItems(setOpen);
  const routeCategory = useMemo(() => getRouteCategory(pathname), [pathname]);
  const space = activeProfile?.workspace ?? "personal";
  const pinned = useMemo(() => new Set(settings.pinnedCommands || []), [settings.pinnedCommands]);
  const recent = useMemo(() => new Set(settings.commandHistory || []), [settings.commandHistory]);

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

  const context = useMemo(
    () => ({ route: pathname, routeCategory, space, pinned, recent, frequency }),
    [pathname, routeCategory, space, pinned, recent, frequency]
  );

  const filtered = useMemo<CommandItem[]>(() => {
    return searchCommands(COMMANDS, query.trim(), context) as CommandItem[];
  }, [COMMANDS, query, context]);

  const sections = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const cmd of filtered) {
      const section = getSection(cmd.category);
      (groups[section] ??= []).push(cmd);
    }
    return SECTION_ORDER.filter((s) => groups[s]?.length).map((s) => ({ title: s, items: groups[s] }));
  }, [filtered]);

  const run = useCallback(
    (cmd: CommandItem) => {
      cmd.action();
      const history = [cmd.id, ...(settings.commandHistory || []).filter((id) => id !== cmd.id)].slice(0, 10);
      update({ commandHistory: history });
      commandHistory.record(cmd.id);
      setFrequency(commandHistory.frequency());
      setOpen(false);
      setQuery("");
      setIndex(0);
    },
    [settings.commandHistory, update, commandHistory, setOpen]
  );

  const togglePin = useCallback(
    (cmd: CommandItem, e: React.MouseEvent) => {
      e.stopPropagation();
      const next = pinned.has(cmd.id)
        ? (settings.pinnedCommands || []).filter((id) => id !== cmd.id)
        : [...(settings.pinnedCommands || []), cmd.id];
      update({ pinnedCommands: next });
      commandHistory.togglePin(cmd.id);
      setFrequency(commandHistory.frequency());
    },
    [pinned, settings.pinnedCommands, update, commandHistory]
  );

  useEffect(() => {
    setIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const active = dialogRef.current?.querySelector('[data-active="true"]') as HTMLElement | null;
    active?.scrollIntoView({ block: "nearest" });
  }, [open, index, filtered]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!open);
        return;
      }

      if (!open) return;

      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      const count = filtered.length;
      if (count === 0) return;
      const last = Math.max(0, count - 1);

      if (event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey)) {
        event.preventDefault();
        setIndex((i) => (i + 1) % count);
      } else if (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey)) {
        event.preventDefault();
        setIndex((i) => (i - 1 + count) % count);
      } else if (event.key === "Home") {
        event.preventDefault();
        setIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setIndex(last);
      } else if (event.key === "PageDown") {
        event.preventDefault();
        setIndex((i) => (i + 5) % count);
      } else if (event.key === "PageUp") {
        event.preventDefault();
        setIndex((i) => (i - 5 + count) % count);
      } else if (event.key === "Enter" && filtered[index]) {
        event.preventDefault();
        run(filtered[index]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, index, run, setOpen]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  let globalIndex = 0;

  function renderItem(cmd: CommandItem) {
    const itemIndex = globalIndex++;
    const active = itemIndex === index;
    const shortcut = cmd.shortcut ? `⌘${cmd.shortcut.toUpperCase()}` : null;

    return (
      <div
        key={cmd.id}
        role="button"
        tabIndex={-1}
        data-active={active}
        onClick={() => run(cmd)}
        onMouseEnter={() => setIndex(itemIndex)}
        onMouseMove={() => setIndex(itemIndex)}
        className={`group relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors ${
          active ? "bg-white/[0.08] text-white" : "cursor-pointer text-zinc-300 hover:bg-white/[0.04]"
        }`}
      >
        <span className="flex min-w-0 items-center gap-3">
          {cmd.icon ? (
            <span className={`shrink-0 ${active ? "text-white" : "text-zinc-400"}`}>{cmd.icon}</span>
          ) : (
            <Icon name="chevron-right" className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-zinc-500"}`} />
          )}
          <span className="truncate">{cmd.label}</span>
        </span>
        <span className="ml-3 flex shrink-0 items-center gap-2">
          {cmd.category && (
            <span className={`text-[10px] ${active ? "text-zinc-300" : "text-zinc-500"}`}>{cmd.category}</span>
          )}
          {shortcut && (
            <kbd
              className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                active
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-white/10 bg-white/[0.03] text-zinc-500"
              }`}
            >
              {shortcut}
            </kbd>
          )}
          <button
            type="button"
            onClick={(e) => togglePin(cmd, e)}
            className={`rounded p-1 transition-colors ${
              active ? "text-white/70 hover:bg-white/20" : "text-zinc-500 hover:bg-white/[0.06]"
            }`}
            aria-label={pinned.has(cmd.id) ? i18n("unpin") : i18n("pin")}
            title={pinned.has(cmd.id) ? i18n("unpin") : i18n("pin")}
          >
            <Icon name={pinned.has(cmd.id) ? "pin-off" : "pin"} className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-full border border-white/10 bg-zinc-950/80 px-3 py-1.5 text-xs text-zinc-400 backdrop-blur-md transition-colors hover:border-white/20 hover:text-zinc-100 xl:flex"
      >
        <Search className="h-3.5 w-3.5" />
        <span>{i18n("commands")}</span>
        <kbd className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px]">
          <span className="mr-0.5">⌘</span>K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[15vh] backdrop-blur-md"
            onClick={() => setOpen(false)}
          >
            <motion.div
              ref={dialogRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/90 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                <Search className="h-5 w-5 text-zinc-400" />
                <input
                  ref={inputRef}
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={i18n("search")}
                  className="flex-1 bg-transparent border-0 py-4 px-3 text-base text-zinc-100 placeholder-zinc-500 outline-none focus:ring-0"
                />
                <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-zinc-500">
                  ESC
                </kbd>
              </div>

              <div className="max-h-[60vh] min-h-[8rem] overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <p className="py-8 text-center text-sm text-zinc-500">{i18n("noResults")}</p>
                ) : (
                  sections.map((section) => (
                    <div key={section.title} className="mb-3 last:mb-0">
                      <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        {section.title}
                      </p>
                      {section.items.map((cmd) => renderItem(cmd))}
                    </div>
                  ))
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-2.5 text-[10px] text-zinc-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5">Esc</kbd>
                    <span>{i18n("close")}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5">↑</kbd>
                    <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5">↓</kbd>
                    <span>{i18n("spotlightNav")}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5">Enter</kbd>
                    <span>{i18n("openHere")}</span>
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
