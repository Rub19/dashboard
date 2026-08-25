"use client";

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";

import SearchInput from "@/components/ui/SearchInput";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useSettings, useActiveProfile } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useCommandItems, type CommandItem } from "@/lib/commands";
import { searchCommands, createCommandHistory, type SearchableCommandItem } from "@/lib/command-search";
import { Icon } from "@/lib/icons";
import { EASE_OUT } from "@/lib/ease";
import { useTouchCapable } from "@/lib/hooks/use-touch-capable";
import { cn } from "@/lib/utils";

const SECTION_ORDER = ["Navigation", "Actions Rapides", "Intégrations", "Thèmes & Apparence"];

const SECTION_MAP: Record<string, string> = {
  Navigation: "Navigation",
  Créer: "Actions Rapides",
  Fenêtres: "Actions Rapides",
  Spaces: "Actions Rapides",
  Focus: "Actions Rapides",
  Brain: "Actions Rapides",
  Système: "Actions Rapides",
  Compte: "Actions Rapides",
  Presets: "Actions Rapides",
  Ambiance: "Thèmes & Apparence",
  Réglages: "Thèmes & Apparence",
  Plugins: "Intégrations",
  RSS: "Intégrations",
  Scratchpad: "Intégrations",
  Matchs: "Intégrations",
  Drops: "Intégrations",
  Météo: "Intégrations",
  Macros: "Intégrations",
  Facturation: "Intégrations",
  Mail: "Intégrations",
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

const CommandItemRow = memo(function CommandItemRow({
  cmd,
  activeIndex,
  isActive,
  hasIcons,
  uid,
  setIndex,
  run,
  togglePin,
  isPinned,
  pinTitle,
  unpinTitle,
}: {
  cmd: CommandItem;
  activeIndex: number;
  isActive: boolean;
  hasIcons: boolean;
  uid: string;
  setIndex: (i: number) => void;
  run: (cmd: CommandItem) => void;
  togglePin: (cmd: CommandItem, e: React.MouseEvent<HTMLElement>) => void;
  isPinned: boolean;
  pinTitle: string;
  unpinTitle: string;
}) {
  const shortcut = cmd.shortcut ? `⌘${cmd.shortcut.toUpperCase()}` : null;
  return (
    <div
      id={`${uid}-opt-${activeIndex}`}
      role="option"
      aria-selected={isActive}
      data-index={activeIndex}
      onMouseEnter={() => setIndex(activeIndex)}
      onClick={() => run(cmd)}
      tabIndex={-1}
      className={cn(
        "relative isolate flex w-full items-center rounded-md text-left text-sm transition-colors duration-100 ease-out outline-0 focus:outline-0 focus-visible:outline-0",
        isActive ? "bg-[var(--text-primary)]/[0.08] text-[var(--accent)]" : "text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.04]"
      )}
    >
      <div className="relative z-10 flex flex-1 items-center gap-3 px-2 py-2">
        {cmd.icon ? (
          <span className="h-4 w-4 shrink-0">{cmd.icon}</span>
        ) : hasIcons ? (
          <span className="h-4 w-4 shrink-0" />
        ) : null}
        <span className="flex-1 truncate">{cmd.label}</span>
        <span className="flex shrink-0 items-center gap-2">
          {cmd.category && (
            <span
              className={cn(
                "text-[10px]",
                isActive ? "text-[var(--text-muted)]" : "text-[var(--text-muted)]/70"
              )}
            >
              {cmd.category}
            </span>
          )}
          {shortcut && (
            <kbd className="rounded border border-[var(--panel-border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
              {shortcut}
            </kbd>
          )}
        </span>
      </div>
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          togglePin(cmd, e as unknown as React.MouseEvent<HTMLElement>);
        }}
        className={cn(
          "relative z-10 shrink-0 rounded p-1 transition-colors outline-0 focus:outline-0 focus-visible:outline-0",
          isActive
            ? "text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10"
            : "text-[var(--text-muted)] hover:bg-[var(--surface)]"
        )}
        aria-label={isPinned ? unpinTitle : pinTitle}
        title={isPinned ? unpinTitle : pinTitle}
      >
        <Icon pack="phosphor" name={isPinned ? "pin-off" : "pin"} className="h-3.5 w-3.5" />
      </button>
    </div>
  );
});

export default function CommandPalette() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { activeProfile } = useActiveProfile();
  const pathname = usePathname() ?? "/";
  const { open, setOpen } = useCommandPalette();

  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const commandHistory = useMemo(() => createCommandHistory(), []);
  const [frequency, setFrequency] = useState(() => commandHistory.frequency());

  const COMMANDS = useCommandItems(setOpen);
  const routeCategory = useMemo(() => getRouteCategory(pathname), [pathname]);
  const space = activeProfile?.workspace ?? "personal";
  const pinned = useMemo(() => new Set(settings.pinnedCommands || []), [settings.pinnedCommands]);
  const recent = useMemo(() => new Set(settings.commandHistory || []), [settings.commandHistory]);

  const uid = useId();
  const reduce = useReducedMotion();
  const canTouch = useTouchCapable();

  useEffect(() => setMounted(true), []);

  const context = useMemo(
    () => ({ route: pathname, routeCategory, space, pinned, recent, frequency }),
    [pathname, routeCategory, space, pinned, recent, frequency]
  );

  const filtered = useMemo<CommandItem[]>(() => {
    return searchCommands(COMMANDS as unknown as SearchableCommandItem[], query.trim(), context) as CommandItem[];
  }, [COMMANDS, query, context]);

  useEffect(() => {
    if (!open || !filtered.length) return;
    const el = document.getElementById(`${uid}-opt-${index}`);
    if (el) el.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [index, open, filtered.length, uid, reduce]);

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
    (cmd: CommandItem, e: React.MouseEvent<HTMLElement>) => {
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

  const updateQuery = useCallback((value: string) => {
    setQuery(value);
    setIndex(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) {
      updateQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, updateQuery]);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const count = filtered.length;
    if (count === 0) return;

    if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      setIndex((i) => (i + 1) % count);
    } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
      e.preventDefault();
      setIndex((i) => (i - 1 + count) % count);
    } else if (e.key === "Home") {
      e.preventDefault();
      setIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setIndex(count - 1);
    } else if (e.key === "PageDown") {
      e.preventDefault();
      setIndex((i) => Math.min(count - 1, i + 5));
    } else if (e.key === "PageUp") {
      e.preventDefault();
      setIndex((i) => Math.max(0, i - 5));
    } else if (e.key === "Enter" && filtered[index]) {
      e.preventDefault();
      run(filtered[index]);
    }
  };

  const hasIcons = useMemo(() => filtered.some((it) => it.icon), [filtered]);

  if (!mounted) return null;

  let flatIndex = 0;

  return createPortal(
    <div
      aria-hidden={!open}
      inert={!open}
      className={cn(
        "fixed inset-0 z-[var(--z-modal)]",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <motion.button
        type="button"
        aria-label={i18n("closeCommandPalette", "Close command palette")}
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: open ? 0.18 : 0.12, ease: EASE_OUT }}
        onClick={() => setOpen(false)}
        className={cn(
          "absolute inset-0 bg-[var(--background)]/5 [backdrop-filter:blur(12px)_saturate(140%)] [-webkit-backdrop-filter:blur(12px)_saturate(140%)]",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      />

      <div className="pointer-events-none absolute inset-0 flex items-start justify-center p-4 pt-[18vh]">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          initial={false}
          animate={{
            opacity: open ? 1 : 0,
            y: open || reduce ? 0 : -8,
            scale: open || reduce ? 1 : 0.97,
          }}
          transition={{ duration: reduce ? 0.1 : 0.15, ease: EASE_OUT }}
          onKeyDown={onKeyDown}
          className={cn(
            "w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] shadow-2xl will-change-transform",
            open ? "pointer-events-auto" : "pointer-events-none",
          )}
        >
          <div className="flex items-center gap-3 border-b border-[var(--text-primary)]/[0.06] px-4">
            <SearchInput
              ref={inputRef}
              value={query}
              onChange={(e) => updateQuery(e.target.value)}
              placeholder={i18n("search")}
              tabIndex={open ? 0 : -1}
              role="combobox"
              style={{ outline: "none" }}
              aria-expanded={open}
              aria-controls={`${uid}-list`}
              aria-activedescendant={
                filtered.length > 0 ? `${uid}-opt-${index}` : undefined
              }
              aria-autocomplete="list"
              shortcut="ESC"
              inputSize="large"
              inputClassName={canTouch ? "text-base" : ""}
              className="min-w-0 flex-1"
            />
          </div>

          <div
            id={`${uid}-list`}
            role="listbox"
            aria-label="Commands"
            className="max-h-[54vh] overflow-y-auto overscroll-contain p-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ scrollPaddingBlock: "8px" }}
          >
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--text-muted)]">
                {i18n("noResults")}
              </div>
            ) : (
              sections.map((section) => (
                <div key={section.title} className="mb-1 last:mb-0">
                  <div
                    aria-hidden
                    className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                  >
                    {section.title}
                  </div>
                  {section.items.map((cmd) => {
                    const activeIndex = flatIndex++;
                    const isActive = activeIndex === index;

                    return (
                      <CommandItemRow
                        key={cmd.id}
                        cmd={cmd}
                        activeIndex={activeIndex}
                        isActive={isActive}
                        hasIcons={hasIcons}
                        uid={uid}
                        setIndex={setIndex}
                        run={run}
                        togglePin={togglePin}
                        isPinned={pinned.has(cmd.id)}
                        pinTitle={i18n("pin")}
                        unpinTitle={i18n("unpin")}
                      />
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--text-primary)]/[0.06] px-4 py-2.5 text-[10px] text-[var(--text-muted)]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-[var(--panel-border)] bg-[var(--background)] px-1.5 py-0.5">Esc</kbd>
                <span>{i18n("close")}</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-[var(--panel-border)] bg-[var(--background)] px-1.5 py-0.5">↑</kbd>
                <kbd className="rounded border border-[var(--panel-border)] bg-[var(--background)] px-1.5 py-0.5">↓</kbd>
                <span>{i18n("spotlightNav")}</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-[var(--panel-border)] bg-[var(--background)] px-1.5 py-0.5">Enter</kbd>
                <span>{i18n("openHere")}</span>
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>,
    document.body,
    uid,
  );
}
