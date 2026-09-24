"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, Star, X } from "@/components/icons/ph";
import { cn } from "@/lib/utils";

export interface NavigatorModule {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  /** Teinte de l'icône (classe Tailwind text-*). */
  tint: string;
  /** Page complète du module. */
  href: string;
}

export interface NavigatorCategory {
  id: string;
  label: string;
  hint: string;
  modules: string[];
}

interface ModuleNavigatorProps {
  modules: NavigatorModule[];
  categories: NavigatorCategory[];
  activeId: string;
  onSelect: (id: string) => void;
}

const FAV_KEY = "ethone.discord.favoriteModules";

/** Minuscules sans accents, pour une recherche tolérante (« moderation » trouve « Modération »). */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Navigation des modules du bot, façon Dyno / MEE6 : catégories lisibles, recherche instantanée, favoris épinglés
 * en haut et accès direct à la page complète de chaque module. Un clic sur une carte ouvre sa configuration
 * rapide ; la flèche ouvre la page complète.
 */
export default function ModuleNavigator({ modules, categories, activeId, onSelect }: ModuleNavigatorProps) {
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FAV_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setFavorites(parsed.filter((v): v is string => typeof v === "string"));
    } catch {
      // stockage indisponible : pas de favoris, l'écran reste utilisable
    }
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      try {
        window.localStorage.setItem(FAV_KEY, JSON.stringify(next));
      } catch {
        // idem : la préférence n'est simplement pas conservée
      }
      return next;
    });
  };

  const byId = useMemo(() => new Map(modules.map((m) => [m.id, m])), [modules]);
  const q = fold(query.trim());
  const matches = (m: NavigatorModule) => !q || fold(`${m.title} ${m.description} ${m.id}`).includes(q);

  const favoriteModules = favorites.map((id) => byId.get(id)).filter((m): m is NavigatorModule => Boolean(m) && matches(m as NavigatorModule));
  const sections = categories
    .map((c) => ({ ...c, items: c.modules.map((id) => byId.get(id)).filter((m): m is NavigatorModule => Boolean(m) && matches(m as NavigatorModule)) }))
    .filter((c) => c.items.length > 0);
  const total = sections.reduce((n, c) => n + c.items.length, 0);

  const card = (m: NavigatorModule) => {
    const Icon = m.icon;
    const current = m.id === activeId;
    const fav = favorites.includes(m.id);
    return (
      <div
        key={m.id}
        role="button"
        tabIndex={0}
        onClick={() => onSelect(m.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(m.id);
          }
        }}
        aria-pressed={current}
        className={cn(
          "group flex cursor-pointer items-start gap-3 rounded-[var(--inset-radius)] border p-3 text-left transition-all duration-150",
          current
            ? "border-emerald-500/40 bg-emerald-500/[0.08] shadow-sm"
            : "border-[var(--panel-border)] bg-white/[0.02] hover:border-[var(--input-border-hover)] hover:bg-white/[0.04]"
        )}
      >
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/[0.04]", m.tint)}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-xs font-semibold", current ? "text-white" : "text-zinc-200")}>{m.title}</span>
          <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-zinc-500">{m.description}</span>
        </span>
        <span className="flex shrink-0 flex-col items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(m.id);
            }}
            aria-label={fav ? `Retirer ${m.title} des favoris` : `Ajouter ${m.title} aux favoris`}
            aria-pressed={fav}
            title={fav ? "Retirer des favoris" : "Épingler en haut"}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md transition-colors cursor-pointer",
              fav ? "text-amber-300" : "text-zinc-600 opacity-0 hover:text-amber-300 group-hover:opacity-100 focus:opacity-100"
            )}
          >
            <Star className="h-3.5 w-3.5" fill={fav ? "currentColor" : "none"} />
          </button>
          <Link
            href={m.href}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Ouvrir la page ${m.title}`}
            title="Ouvrir la page complète"
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 opacity-0 transition-colors hover:text-white group-hover:opacity-100 focus:opacity-100"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un module (musique, anti-raid, tickets…)"
            aria-label="Rechercher un module"
            className="h-10 w-full rounded-xl border border-[var(--panel-border)] bg-white/[0.03] pl-9 pr-9 text-xs text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-[var(--accent-primary)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-zinc-500">
          {total} module{total > 1 ? "s" : ""} · clic = configuration rapide · <ArrowUpRight className="inline h-3 w-3 -translate-y-px" /> = page complète · <Star className="inline h-3 w-3 -translate-y-px" /> = favori
        </p>
      </div>

      {total === 0 && favoriteModules.length === 0 && (
        <div className="rounded-[var(--inset-radius)] border border-dashed border-[var(--panel-border)] p-8 text-center text-xs text-zinc-500">
          Aucun module ne correspond à « {query} ».
        </div>
      )}

      {favoriteModules.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-300/90">
            <Star className="h-3.5 w-3.5" fill="currentColor" /> Favoris
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{favoriteModules.map(card)}</div>
        </section>
      )}

      {sections.map((section) => (
        <section key={section.id}>
          <div className="mb-2 flex items-baseline gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">{section.label}</h3>
            <span className="text-[11px] text-zinc-600">{section.hint}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{section.items.map(card)}</div>
        </section>
      ))}
    </div>
  );
}
