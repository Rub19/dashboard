"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Home, LayoutGrid, X } from "@/components/icons/ph";
import { cn } from "@/lib/utils";
import Input from "@/components/ui/Input";
import { EASE_SNAP, SPRING_PILL } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { fold, type NavigatorCategory, type NavigatorModule } from "@/components/discord/ModuleNavigator";

export type HubView = "home" | "modules" | "module";

interface HubSidebarProps {
  guildName: string;
  guildIconUrl?: string | null;
  modules: NavigatorModule[];
  categories: NavigatorCategory[];
  view: HubView;
  /** Module dont la configuration est ouverte (ligne surlignée). */
  activeId: string;
  /** Interrupteur réel de chaque module : pastille verte si activé, grise si désactivé, absente si inconnu. */
  status: Record<string, boolean>;
  onHome: () => void;
  onAllModules: () => void;
  onSelect: (id: string) => void;
  /** Tiroir mobile (< lg) : ouvert / fermeture. Sur grand écran la barre est toujours visible. */
  open: boolean;
  onClose: () => void;
}

/** Ligne de navigation. L'élément actif reçoit un fond + un filet d'accent qui glissent d'une ligne à l'autre. */
function NavRow({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-[var(--inset-radius)] px-2.5 text-left text-sm outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50",
        active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.04] hover:text-[var(--text-primary)]"
      )}
    >
      {active && (
        <motion.span layoutId="hub-active" transition={SPRING_PILL} className="absolute inset-0 rounded-[var(--inset-radius)] bg-[var(--text-primary)]/[0.08]">
          <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--accent-primary)]" />
        </motion.span>
      )}
      {children}
    </button>
  );
}

/** Barre latérale du hub Discord : serveur, recherche, Accueil, « Tous les modules », puis les modules par catégorie repliable. */
export default function HubSidebar({ guildName, guildIconUrl, modules, categories, view, activeId, status, onHome, onAllModules, onSelect, open, onClose }: HubSidebarProps) {
  const { reduced } = useMotionPref();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const q = fold(query.trim());
  const byId = new Map(modules.map((m) => [m.id, m]));
  const sections = categories
    .map((c) => ({
      ...c,
      items: c.modules.map((id) => byId.get(id)).filter((m): m is NavigatorModule => Boolean(m) && (!q || fold(`${m!.title} ${m!.id}`).includes(q))),
    }))
    .filter((c) => c.items.length > 0);
  const toggleSection = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="hub-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-30 bg-black/60 backdrop-blur-[2px] lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
      <aside
        aria-label="Navigation du bot"
        className={cn(
          "absolute inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-[var(--panel-border)] bg-[var(--background)] transition-transform duration-300 [transition-timing-function:var(--ease-snap)] lg:static lg:z-auto lg:translate-x-0 lg:bg-transparent",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-2.5 px-4 pb-2 pt-4">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[var(--inset-radius)] bg-[var(--surface-raised)] bg-cover bg-center text-xs font-bold text-[var(--text-primary)] ring-1 ring-[var(--panel-border)]"
            style={guildIconUrl ? { backgroundImage: `url(${guildIconUrl})` } : undefined}
            aria-hidden="true"
          >
            {guildIconUrl ? null : guildName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">{guildName}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--inset-radius)] text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.05] hover:text-[var(--text-primary)] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un module" aria-label="Rechercher un module" icon="search" clearable inputSize="compact" />
        </div>

        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4 pt-1 [scrollbar-width:thin]" aria-label="Modules">
          <div className="space-y-0.5">
            <NavRow active={view === "home"} onClick={onHome}>
              <Home className="relative h-4 w-4 shrink-0" />
              <span className="relative">Accueil</span>
            </NavRow>
            <NavRow active={view === "modules"} onClick={onAllModules}>
              <LayoutGrid className="relative h-4 w-4 shrink-0" />
              <span className="relative">Tous les modules</span>
            </NavRow>
          </div>

          {sections.length === 0 && <p className="px-2.5 text-xs text-[var(--text-muted)]">Aucun module ne correspond.</p>}
          {sections.map((section) => {
            const expanded = Boolean(q) || section.items.some((m) => view === "module" && m.id === activeId) || !collapsed.has(section.id);
            return (
              <div key={section.id}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={expanded}
                  className="mb-1 flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] outline-none transition-colors hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                >
                  <span className="truncate">{section.label}</span>
                  <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform duration-300 [transition-timing-function:var(--ease-snap)]", !expanded && "-rotate-90")} />
                </button>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.ul
                      key="items"
                      initial={reduced ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduced ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: EASE_SNAP }}
                      className="space-y-0.5 overflow-hidden"
                    >
                      {section.items.map((m) => {
                        const Icon = m.icon;
                        const current = view === "module" && m.id === activeId;
                        const known = typeof status[m.id] === "boolean";
                        return (
                          <li key={m.id}>
                            <NavRow active={current} onClick={() => onSelect(m.id)}>
                              <Icon className={cn("relative h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110", m.tint)} />
                              <span className="relative min-w-0 flex-1 truncate">{m.title}</span>
                              {known && (
                                <span
                                  className={cn(
                                    "relative h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-300",
                                    status[m.id] ? "bg-[var(--success)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--success)_18%,transparent)]" : "bg-[var(--text-primary)]/20"
                                  )}
                                  title={status[m.id] ? "Activé" : "Désactivé"}
                                  aria-label={status[m.id] ? "Activé" : "Désactivé"}
                                />
                              )}
                            </NavRow>
                          </li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
