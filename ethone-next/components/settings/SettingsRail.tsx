"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Search } from "lucide-react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { SPRING_PILL } from "@/lib/ease";
import { CATEGORY_ORDER, type CategoryDef } from "./SettingsNavigation";

/** Catégories rangées en groupes, comme les réglages d'un système d'exploitation. */
export const SETTINGS_GROUPS: Array<{ id: string; label: string; ids: string[] }> = [
  { id: "you", label: "Toi", ids: ["general", "profile"] },
  { id: "look", label: "Apparence", ids: ["appearance", "themes", "animations", "dynamic-island", "dock", "workspace"] },
  { id: "sound", label: "Son & alertes", ids: ["audio", "soundscapes", "notifications"] },
  { id: "system", label: "Système", ids: ["language", "connections", "sync", "storage", "performance", "accessibility", "shortcuts"] },
  { id: "safety", label: "Sécurité", ids: ["privacy", "security"] },
  { id: "more", label: "Plus", ids: ["advanced", "about"] },
];

export const categoryById = (id: string): CategoryDef => CATEGORY_ORDER.find((c) => c.id === id) ?? CATEGORY_ORDER[0];

/** Navigation de gauche (PC) : groupes, pastille active qui glisse d'une catégorie à l'autre. */
export default function SettingsRail({ active, onSelect, onOpenSearch }: { active: string; onSelect: (id: string) => void; onOpenSearch: () => void }) {
  const reduced = useReducedMotion();
  return (
    <nav aria-label="Catégories des réglages" className="flex h-full min-h-0 flex-col">
      <button
        type="button"
        onClick={onOpenSearch}
        className="group mb-4 flex h-10 w-full items-center gap-2.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-3 text-left text-sm text-[var(--text-muted)] transition-[border-color,background-color] duration-200 hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-raised)]"
      >
        <Search className="h-4 w-4 shrink-0 transition-colors group-hover:text-[var(--accent-primary)]" />
        <span className="flex-1 truncate">Rechercher un réglage</span>
        <kbd className="rounded-md border border-[var(--panel-border)] bg-[var(--background)]/60 px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">Ctrl K</kbd>
      </button>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SETTINGS_GROUPS.map((group, gi) => (
          <motion.div
            key={group.id}
            initial={reduced ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: reduced ? 0 : gi * 0.04, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]/80">{group.label}</p>
            <ul className="space-y-0.5">
              {group.ids.map((id) => {
                const c = categoryById(id);
                const on = active === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => onSelect(id)}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "group relative isolate flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50",
                        on ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {on && (
                        <motion.span
                          layoutId="settings-rail-active"
                          transition={SPRING_PILL}
                          className="absolute inset-0 -z-10 rounded-lg bg-[var(--accent-primary)]/12 ring-1 ring-[var(--accent-primary)]/25"
                        />
                      )}
                      {!on && <span className="absolute inset-0 -z-10 rounded-lg bg-[var(--text-primary)]/[0.04] opacity-0 transition-opacity group-hover:opacity-100" />}
                      <Icon name={c.icon} className={cn("h-4 w-4 shrink-0 transition-[color,transform] duration-200 group-hover:scale-110", on ? "text-[var(--accent-primary)]" : "")} />
                      <span className="truncate">{c.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ))}
      </div>
    </nav>
  );
}
