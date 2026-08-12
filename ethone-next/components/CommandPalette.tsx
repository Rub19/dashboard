"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useLayer } from "@/components/LayerProvider";
import { useCommandItems, type CommandItem } from "@/lib/commands";

export default function CommandPalette() {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { open, setOpen } = useCommandPalette();
  useLayer(open, () => setOpen(false));
  const COMMANDS = useCommandItems(setOpen);

  const pinned = useMemo(() => new Set(settings.pinnedCommands || []), [settings.pinnedCommands]);

  const run = useCallback(
    (cmd: CommandItem) => {
      cmd.action();
      const history = [cmd.id, ...(settings.commandHistory || []).filter((id) => id !== cmd.id)].slice(0, 10);
      update({ commandHistory: history });
      setOpen(false);
      setQuery("");
    },
    [setOpen, settings.commandHistory, update]
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
    const otherItems = COMMANDS.filter((c) => !used.has(c.id));

    return { pinnedItems, recentItems, otherItems };
  }, [COMMANDS, settings.commandHistory, settings.pinnedCommands, pinned]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...pinnedItems, ...recentItems, ...otherItems];
    return COMMANDS.filter((c) => `${c.label} ${c.category}`.toLowerCase().includes(q));
  }, [query, COMMANDS, pinnedItems, recentItems, otherItems]);

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
      if (event.key === "Escape") {
        setOpen(false);
      }
      if (!open) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setIndex((i) => (i + 1) % filtered.length);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setIndex((i) => (i - 1 + filtered.length) % filtered.length);
      }
      if (event.key === "Enter" && filtered[index]) {
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
            onClick={() => setOpen(false)}
          >
            <motion.div
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
