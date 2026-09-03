"use client";

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import {
  Search,
  X,
  Pin,
  Sparkles,
  Command,
  ArrowRight,
  Clock,
  Star,
  AlertTriangle,
  CornerDownLeft,
  ChevronRight,
  Brain,
} from "lucide-react";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useCommandItems, type CommandItem } from "@/lib/commands";
import {
  searchCommands,
  createCommandHistory,
  type SearchableCommandItem,
} from "@/lib/command-search";
import { cn } from "@/lib/utils";
import { useTouchCapable } from "@/lib/hooks/use-touch-capable";

const CATEGORY_CHIPS = [
  { id: "all", label: "Tous" },
  { id: "Actions Rapides", label: "Actions" },
  { id: "Navigation", label: "Pages" },
  { id: "Focus", label: "Focus" },
  { id: "Thèmes & Apparence", label: "Thèmes" },
  { id: "Intégrations", label: "Intégrations" },
  { id: "Réglages", label: "Réglages" },
  { id: "Brain", label: "Brain" },
];

export default function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const pathname = usePathname();
  const router = useRouter();
  const i18n = useI18n();
  const isTouch = useTouchCapable();
  const prefersReduced = useReducedMotion();

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [sensitivePrompt, setSensitivePrompt] = useState<CommandItem | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef(createCommandHistory());

  const allCommands = useCommandItems(setOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Global Keyboard Shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveCategory("all");
      setActiveIndex(0);
      setSensitivePrompt(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Search Context
  const searchContext = useMemo(() => {
    const hist = historyRef.current;
    return {
      route: pathname,
      pinned: new Set(hist.pinned()),
      recent: new Set(hist.recent()),
      frequency: hist.frequency(),
      categoryFilter: activeCategory === "all" ? "" : activeCategory,
    };
  }, [pathname, activeCategory, open]);

  // Filtered & Ranked commands
  const filteredCommands = useMemo(() => {
    return searchCommands(allCommands as SearchableCommandItem[], query, searchContext, 40);
  }, [allCommands, query, searchContext]);

  // Grouped commands
  const pinnedIds = useMemo(() => new Set(historyRef.current.pinned()), [open]);
  const recentIds = useMemo(() => new Set(historyRef.current.recent()), [open]);

  // Handle execution
  const executeCommand = useCallback(
    (cmd: CommandItem) => {
      if (cmd.isSensitive) {
        setSensitivePrompt(cmd);
        return;
      }
      historyRef.current.record(cmd.id);
      cmd.action();
      setOpen(false);
    },
    [setOpen]
  );

  const confirmSensitive = () => {
    if (sensitivePrompt) {
      historyRef.current.record(sensitivePrompt.id);
      sensitivePrompt.action();
      setSensitivePrompt(null);
      setOpen(false);
    }
  };

  const togglePin = useCallback(
    (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      historyRef.current.togglePin(id);
      // Force re-render
      setActiveIndex((prev) => prev);
    },
    []
  );

  // Keyboard Navigation inside Palette
  useEffect(() => {
    if (!open || sensitivePrompt) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1 < filteredCommands.length ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredCommands.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (query.trim().startsWith("ask ") || query.trim().startsWith("demande ")) {
          // Ask brain direct query
          const q = query.replace(/^(ask|demande)s+/i, "").trim();
          router.push(`/brain/?q=${encodeURIComponent(q)}`);
          setOpen(false);
          return;
        }
        const active = filteredCommands[activeIndex];
        if (active) executeCommand(active);
      } else if (e.key === "Tab") {
        e.preventDefault();
        const currentCatIdx = CATEGORY_CHIPS.findIndex((c) => c.id === activeCategory);
        const nextCat = CATEGORY_CHIPS[(currentCatIdx + 1) % CATEGORY_CHIPS.length];
        setActiveCategory(nextCat.id);
        setActiveIndex(0);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, sensitivePrompt, filteredCommands, activeIndex, activeCategory, query, router, executeCommand, setOpen]);

  // Auto scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.15 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-[var(--bg-overlay)] backdrop-blur-md"
          />

          {/* Dialog Body */}
          <motion.div
            initial={isTouch ? { y: "100%" } : { opacity: 0, scale: 0.96, y: -10 }}
            animate={isTouch ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isTouch ? { y: "100%" } : { opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: prefersReduced ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative flex flex-col w-full max-w-2xl overflow-hidden border border-[var(--panel-border)] shadow-2xl backdrop-blur-2xl",
              isTouch
                ? "rounded-t-3xl max-h-[88dvh] bg-[var(--bg-surface)] pb-[env(safe-area-inset-bottom)]"
                : "rounded-3xl max-h-[640px] bg-[var(--panel-bg)]"
            )}
          >
            {/* Mobile Sheet Handle */}
            {isTouch && (
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1.5 w-12 rounded-full bg-[var(--text-muted)]/30" />
              </div>
            )}

            {/* Header / Search Input */}
            <div className="relative flex items-center border-b border-[var(--panel-border)]/60 px-4 py-3.5 gap-3">
              <Search className="h-5 w-5 text-[var(--accent-primary)] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Rechercher une page, action, focus, thème ou demander à Brain..."
                className="flex-1 bg-transparent text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-2 py-1 font-mono text-[10px] text-[var(--text-muted)]">
                ESC
              </kbd>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 border-b border-[var(--panel-border)]/40 no-scrollbar">
              {CATEGORY_CHIPS.map((chip) => {
                const active = activeCategory === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => {
                      setActiveCategory(chip.id);
                      setActiveIndex(0);
                    }}
                    className={cn(
                      "rounded-xl px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all touch-manipulation",
                      active
                        ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                        : "border border-[var(--panel-border)]/40 bg-[var(--surface-raised)]/30 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                    )}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Sensitive Action Modal Prompt */}
            {sensitivePrompt ? (
              <div className="p-6 space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[var(--text-primary)]">
                    Confirmer l'action sensible
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Êtes-vous sûr de vouloir exécuter : <strong className="text-[var(--text-primary)]">{sensitivePrompt.label}</strong> ?
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSensitivePrompt(null)}
                    className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={confirmSensitive}
                    className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-rose-600"
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            ) : (
              /* Results List */
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto px-2 py-2 space-y-1 divide-y divide-transparent no-scrollbar max-h-[380px] sm:max-h-[440px]"
              >
                {/* Ask Brain Dynamic Card */}
                {query.trim().length > 1 && (
                  <div
                    onClick={() => {
                      router.push(`/brain/?q=${encodeURIComponent(query.trim())}`);
                      setOpen(false);
                    }}
                    className="group mx-2 mb-2 flex items-center justify-between gap-3 rounded-2xl border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 p-3.5 transition-all cursor-pointer hover:bg-[var(--accent-primary)]/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-md">
                        <Brain className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          Demander à ETHONE Brain
                        </p>
                        <p className="text-[11px] text-[var(--accent-primary)] font-medium line-clamp-1">
                          "{query}"
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[var(--accent-primary)] group-hover:translate-x-1 transition-transform" />
                  </div>
                )}

                {filteredCommands.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <Command className="mx-auto h-8 w-8 text-[var(--text-muted)] opacity-40" />
                    <p className="text-xs font-medium text-[var(--text-muted)]">
                      Aucun résultat trouvé pour "{query}"
                    </p>
                  </div>
                ) : (
                  filteredCommands.map((cmd, idx) => {
                    const isSelected = activeIndex === idx;
                    const isPinned = pinnedIds.has(cmd.id);
                    const isRecent = recentIds.has(cmd.id);

                    return (
                      <div
                        key={cmd.id}
                        data-index={idx}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          "group relative flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 transition-all cursor-pointer",
                          isSelected
                            ? "bg-[var(--surface-hover)] border border-[var(--accent-primary)]/30 shadow-md"
                            : "hover:bg-[var(--surface-raised)]/40 border border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Icon Container */}
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-sm transition-all",
                              isSelected
                                ? "border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shadow-sm"
                                : "border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/60 text-[var(--text-muted)]"
                            )}
                          >
                            {cmd.icon || <Sparkles className="h-4 w-4" />}
                          </div>

                          {/* Info Text */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                                {cmd.label}
                              </span>
                              {isPinned && (
                                <span className="rounded-md bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-400">
                                  Favori
                                </span>
                              )}
                              {isRecent && !isPinned && (
                                <span className="rounded-md bg-zinc-700/40 px-1 py-0.2 text-[9px] font-medium text-zinc-300">
                                  Récent
                                </span>
                              )}
                              {cmd.badge && (
                                <span className="rounded-md bg-[var(--accent-primary)]/20 px-1 py-0.2 text-[9px] font-bold text-[var(--accent-primary)]">
                                  {cmd.badge}
                                </span>
                              )}
                            </div>
                            {cmd.subtitle && (
                              <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                                {cmd.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right Actions & Shortcuts */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => togglePin(cmd.id, e)}
                            className={cn(
                              "p-1 rounded-lg transition-all",
                              isPinned
                                ? "text-amber-400 bg-amber-400/10"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100"
                            )}
                            title={isPinned ? "Retirer des favoris" : "Épingler en favori"}
                          >
                            <Star className="h-3.5 w-3.5" fill={isPinned ? "currentColor" : "none"} />
                          </button>

                          {cmd.shortcut && (
                            <kbd className="hidden sm:inline-flex items-center rounded-md border border-[var(--panel-border)]/80 bg-[var(--surface-raised)]/60 px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                              {cmd.shortcut}
                            </kbd>
                          )}

                          {isSelected && (
                            <CornerDownLeft className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Footer Navigation Hints */}
            <div className="hidden sm:flex items-center justify-between border-t border-[var(--panel-border)]/60 px-4 py-2.5 text-[11px] text-[var(--text-muted)]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-[var(--panel-border)] bg-[var(--surface-raised)] px-1 font-mono text-[9px]">↑↓</kbd> Naviguer
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-[var(--panel-border)] bg-[var(--surface-raised)] px-1 font-mono text-[9px]">↵</kbd> Exécuter
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-[var(--panel-border)] bg-[var(--surface-raised)] px-1 font-mono text-[9px]">TAB</kbd> Catégories
                </span>
              </div>
              <span className="font-semibold text-[var(--accent-primary)]">
                ETHONE Command Center
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
