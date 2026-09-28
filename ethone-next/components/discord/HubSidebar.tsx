"use client";

import { useState } from "react";
import { ChevronDown, Home, LayoutGrid, X } from "@/components/icons/ph";
import { cn } from "@/lib/utils";
import Input from "@/components/ui/Input";
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

/** Ligne de navigation ; l'active porte un filet d'accent de 2 px à gauche. */
const row = (active: boolean) =>
  cn(
    "relative flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors",
    active
      ? "bg-white/[0.08] text-[var(--text-primary)] before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-[var(--accent-primary)]"
      : "text-[var(--text-muted)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]"
  );

/** Barre latérale du hub Discord : serveur, recherche, Accueil, « Tous les modules », puis les modules par catégorie repliable. */
export default function HubSidebar({ guildName, guildIconUrl, modules, categories, view, activeId, status, onHome, onAllModules, onSelect, open, onClose }: HubSidebarProps) {
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
      {open && <div className="absolute inset-0 z-30 bg-black/60 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        aria-label="Navigation du bot"
        className={cn(
          "absolute inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-[var(--panel-border)] bg-[var(--background)] transition-transform duration-150 lg:static lg:z-auto lg:translate-x-0 lg:bg-transparent",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-2.5 px-4 pb-2 pt-4">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--surface-raised)] bg-cover bg-center text-xs font-bold text-[var(--text-primary)]"
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
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-white/[0.05] hover:text-[var(--text-primary)] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un module" aria-label="Rechercher un module" icon="search" clearable inputSize="compact" />
        </div>

        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4 pt-1" aria-label="Modules">
          <div className="space-y-0.5">
            <button type="button" onClick={onHome} aria-current={view === "home" ? "page" : undefined} className={row(view === "home")}>
              <Home className="h-4 w-4 shrink-0" />
              Accueil
            </button>
            <button type="button" onClick={onAllModules} aria-current={view === "modules" ? "page" : undefined} className={row(view === "modules")}>
              <LayoutGrid className="h-4 w-4 shrink-0" />
              Tous les modules
            </button>
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
                  className="mb-1 flex w-full cursor-pointer items-center justify-between px-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                >
                  <span className="truncate">{section.label}</span>
                  <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", !expanded && "-rotate-90")} />
                </button>
                {expanded && (
                  <ul className="space-y-0.5">
                    {section.items.map((m) => {
                      const Icon = m.icon;
                      const current = view === "module" && m.id === activeId;
                      const known = typeof status[m.id] === "boolean";
                      return (
                        <li key={m.id}>
                          <button type="button" onClick={() => onSelect(m.id)} aria-current={current ? "page" : undefined} className={row(current)}>
                            <Icon className={cn("h-4 w-4 shrink-0", m.tint)} />
                            <span className="min-w-0 flex-1 truncate">{m.title}</span>
                            {known && (
                              <span
                                className={cn("h-1.5 w-1.5 shrink-0 rounded-full", status[m.id] ? "bg-emerald-400" : "bg-white/20")}
                                title={status[m.id] ? "Activé" : "Désactivé"}
                                aria-label={status[m.id] ? "Activé" : "Désactivé"}
                              />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
