"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Home, LayoutGrid, Search, X } from "@/components/icons/ph";
import { cn } from "@/lib/utils";
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

/**
 * Ligne de navigation : tuile d'icône teintée, libellé, état. L'élément actif reçoit un fond et un filet d'accent
 * qui glissent d'une ligne à l'autre ; au survol la ligne avance légèrement.
 */
function NavRow({ active, onClick, title, children }: { active: boolean; onClick: () => void; title?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-[var(--inset-radius)] pl-1.5 pr-2.5 text-left text-[13.5px] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50",
        active ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      )}
    >
      {active ? (
        <motion.span
          layoutId="hub-active"
          transition={SPRING_PILL}
          className="absolute inset-0 rounded-[var(--inset-radius)] border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.07] shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]"
        >
          <span className="absolute inset-y-2.5 -left-px w-[3px] rounded-full bg-[var(--accent-primary)]" />
        </motion.span>
      ) : (
        <span aria-hidden className="absolute inset-0 rounded-[var(--inset-radius)] bg-[var(--text-primary)]/[0.04] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      )}
      <span className="relative flex min-w-0 flex-1 items-center gap-2.5 transition-transform duration-300 [transition-timing-function:var(--ease-snap)] group-hover:translate-x-0.5">
        {children}
      </span>
    </button>
  );
}

/** Tuile carrée qui porte l'icône dans la teinte du module (fond = sa couleur à 12 %). */
function IconTile({ children, tint, active }: { children: ReactNode; tint?: string; active?: boolean }) {
  return (
    <span
      className={cn(
        "grid h-7 w-7 shrink-0 place-items-center rounded-[calc(var(--inset-radius)-3px)] transition-transform duration-300 [transition-timing-function:var(--ease-snap)] group-hover:scale-110",
        tint ?? "text-[var(--text-muted)]",
        active ? "bg-current/15" : "bg-current/10"
      )}
    >
      {children}
    </span>
  );
}

/** Barre latérale du hub Discord : serveur, recherche, Accueil, « Tous les modules », modules par catégorie, bilan d'activation. */
export default function HubSidebar({ guildName, guildIconUrl, modules, categories, view, activeId, status, onHome, onAllModules, onSelect, open, onClose }: HubSidebarProps) {
  const { reduced } = useMotionPref();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  const q = fold(query.trim());
  const byId = new Map(modules.map((m) => [m.id, m]));
  const sections = categories
    .map((c) => ({
      ...c,
      items: c.modules.map((id) => byId.get(id)).filter((m): m is NavigatorModule => Boolean(m) && (!q || fold(`${m!.title} ${m!.id}`).includes(q))),
    }))
    .filter((c) => c.items.length > 0);
  const known = modules.filter((m) => typeof status[m.id] === "boolean");
  const enabled = known.filter((m) => status[m.id]).length;

  // « / » place le curseur dans la recherche (hors champs de saisie).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
          "absolute inset-y-0 left-0 z-40 flex w-[17.5rem] shrink-0 flex-col border-r border-[var(--panel-border)] bg-[var(--background)] transition-transform duration-300 [transition-timing-function:var(--ease-snap)] lg:static lg:z-auto lg:translate-x-0 lg:bg-[var(--text-primary)]/[0.015]",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Serveur */}
        <div className="flex items-center gap-3 px-3.5 pb-3 pt-4">
          <span className="relative shrink-0">
            <span
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[var(--inset-radius)] bg-[var(--surface-raised)] bg-cover bg-center text-xs font-bold text-[var(--text-primary)] ring-1 ring-[var(--panel-border)]"
              style={guildIconUrl ? { backgroundImage: `url(${guildIconUrl})` } : undefined}
              aria-hidden="true"
            >
              {guildIconUrl ? null : guildName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[var(--text-primary)]" title={guildName}>
              {guildName}
            </span>
            <span className="block text-[11px] text-[var(--text-muted)]">Console Etho</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--inset-radius)] text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.05] hover:text-[var(--text-primary)] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Recherche */}
        <div className="px-3 pb-3">
          <label className="group flex h-9 items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] px-2.5 transition-[border-color,background-color,box-shadow] duration-200 focus-within:border-[var(--accent-primary)]/50 focus-within:bg-[var(--text-primary)]/[0.05] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-primary)_14%,transparent)] hover:border-[var(--text-primary)]/15">
            <Search className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--accent-primary)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && (setQuery(""), e.currentTarget.blur())}
              placeholder="Rechercher un module"
              aria-label="Rechercher un module"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Effacer la recherche" className="grid h-5 w-5 cursor-pointer place-items-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="h-3 w-3" />
              </button>
            ) : (
              <kbd className="hidden rounded border border-[var(--panel-border)] px-1.5 font-mono text-[10px] text-[var(--text-muted)] lg:inline">/</kbd>
            )}
          </label>
        </div>

        <nav
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-1 [scrollbar-width:thin]"
          style={{ maskImage: "linear-gradient(to bottom, transparent, black 12px, black calc(100% - 20px), transparent)", WebkitMaskImage: "linear-gradient(to bottom, transparent, black 12px, black calc(100% - 20px), transparent)" }}
          aria-label="Modules"
        >
          <div className="space-y-0.5">
            <NavRow active={view === "home"} onClick={onHome}>
              <IconTile active={view === "home"} tint={view === "home" ? "text-[var(--accent-primary)]" : undefined}>
                <Home className="h-3.5 w-3.5" />
              </IconTile>
              <span className="truncate">Accueil</span>
            </NavRow>
            <NavRow active={view === "modules"} onClick={onAllModules}>
              <IconTile active={view === "modules"} tint={view === "modules" ? "text-[var(--accent-primary)]" : undefined}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </IconTile>
              <span className="min-w-0 flex-1 truncate">Tous les modules</span>
              <span className="rounded-full bg-[var(--text-primary)]/[0.06] px-1.5 text-[10px] font-semibold tabular-nums text-[var(--text-muted)]">{modules.length}</span>
            </NavRow>
          </div>

          {sections.length === 0 && <p className="px-2.5 text-xs text-[var(--text-muted)]">Aucun module ne correspond.</p>}
          {sections.map((section, si) => {
            const expanded = Boolean(q) || section.items.some((m) => view === "module" && m.id === activeId) || !collapsed.has(section.id);
            const onCount = section.items.filter((m) => status[m.id]).length;
            return (
              <motion.div
                key={section.id}
                initial={reduced ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: EASE_SNAP, delay: 0.05 + si * 0.05 }}
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={expanded}
                  className="group mb-1 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] outline-none transition-colors hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                >
                  <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform duration-300 [transition-timing-function:var(--ease-snap)]", !expanded && "-rotate-90")} />
                  <span className="min-w-0 flex-1 truncate text-left">{section.label}</span>
                  <span className="font-mono text-[10px] normal-case tracking-normal tabular-nums opacity-70">
                    {onCount}/{section.items.length}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.ul
                      key="items"
                      initial={reduced ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduced ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE_SNAP }}
                      className="space-y-0.5 overflow-hidden"
                    >
                      {section.items.map((m) => {
                        const Icon = m.icon;
                        const current = view === "module" && m.id === activeId;
                        const isKnown = typeof status[m.id] === "boolean";
                        return (
                          <li key={m.id}>
                            <NavRow active={current} onClick={() => onSelect(m.id)} title={m.title}>
                              <IconTile tint={m.tint} active={current}>
                                <Icon className="h-3.5 w-3.5" />
                              </IconTile>
                              <span className="min-w-0 flex-1 truncate">{m.title}</span>
                              {isKnown && (
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 shrink-0 rounded-full transition-[background-color,box-shadow] duration-300",
                                    status[m.id] ? "bg-[var(--success)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--success)_16%,transparent)]" : "bg-[var(--text-primary)]/15"
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
              </motion.div>
            );
          })}
        </nav>

        {/* Bilan d'activation (réel : interrupteurs connus) */}
        {known.length > 0 && (
          <div className="border-t border-[var(--panel-border)] px-4 py-3">
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>Modules actifs</span>
              <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                {enabled} / {known.length}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--text-primary)]/[0.07]">
              <motion.div
                className="h-full rounded-full bg-[var(--success)]"
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${(enabled / known.length) * 100}%` }}
                transition={{ duration: 0.8, ease: EASE_SNAP }}
              />
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
