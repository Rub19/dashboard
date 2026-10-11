"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CornerDownLeft, Search, SlidersHorizontal } from "lucide-react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { categoryById } from "./SettingsRail";
import { resolveCategory } from "./useSettingsNavigation";

export type PaletteResult = { type: "section" | "field"; id: string; label: string; sectionId?: string };

/**
 * Recherche des réglages (Ctrl K) : la saisie filtre la page en direct ; flèches + Entrée pour aller au réglage,
 * qui est mis en surbrillance une fois affiché.
 */
export default function SettingsPalette({
  open,
  query,
  onQuery,
  results,
  onClose,
  onPick,
}: {
  open: boolean;
  query: string;
  onQuery: (q: string) => void;
  results: PaletteResult[];
  onClose: () => void;
  onPick: (r: PaletteResult) => void;
}) {
  const reduced = useReducedMotion();
  const input = useRef<HTMLInputElement>(null);
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [query]);
  useEffect(() => {
    if (open) window.setTimeout(() => input.current?.focus(), 30);
  }, [open]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="settings-palette"
          className="fixed inset-0 z-[var(--z-modal,60)] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
        >
          <button type="button" aria-label="Fermer la recherche" onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-label="Rechercher un réglage"
            initial={reduced ? false : { opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: "spring", bounce: 0, duration: 0.32 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--bg-surface,var(--panel-bg))]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
          >
            <div className="flex items-center gap-3 border-b border-[var(--panel-border)] px-4">
              <Search className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
              <input
                ref={input}
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIndex((i) => Math.min(results.length - 1, i + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setIndex((i) => Math.max(0, i - 1));
                  } else if (e.key === "Enter" && results[index]) {
                    e.preventDefault();
                    onPick(results[index]);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    onClose();
                  }
                }}
                placeholder="Thème, sons, mot de passe, dock…"
                aria-label="Rechercher un réglage"
                className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
              <kbd className="rounded-md border border-[var(--panel-border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">Échap</kbd>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
              {!query.trim() ? (
                <li className="px-3 py-8 text-center text-sm text-[var(--text-muted)]">Tape le nom d&apos;un réglage ou d&apos;une catégorie.</li>
              ) : results.length === 0 ? (
                <li className="px-3 py-8 text-center text-sm text-[var(--text-muted)]">Aucun réglage pour « {query} ».</li>
              ) : (
                results.map((r, i) => {
                  const cat = categoryById(resolveCategory(r.sectionId || r.id));
                  const on = i === index;
                  return (
                    <li key={`${r.type}-${r.id}`} role="option" aria-selected={on}>
                      <button
                        type="button"
                        onMouseEnter={() => setIndex(i)}
                        onClick={() => onPick(r)}
                        className="relative isolate flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                      >
                        {on && <motion.span layoutId="settings-palette-active" transition={{ type: "spring", bounce: 0, duration: 0.25 }} className="absolute inset-0 -z-10 rounded-xl bg-[var(--accent-primary)]/12" />}
                        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", on ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]" : "bg-[var(--surface-raised)] text-[var(--text-muted)]")}>
                          {r.type === "section" ? <Icon name={cat.icon} className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-[var(--text-primary)]">{r.label}</span>
                          <span className="block truncate text-[11px] text-[var(--text-muted)]">
                            {r.type === "section" ? "Section" : "Réglage"} · {cat.label}
                          </span>
                        </span>
                        {on && <CornerDownLeft className="h-3.5 w-3.5 text-[var(--text-muted)]" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
