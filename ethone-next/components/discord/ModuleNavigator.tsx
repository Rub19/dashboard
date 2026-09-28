"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Settings, Star } from "@/components/icons/ph";
import { cn } from "@/lib/utils";
import Input from "@/components/ui/Input";
import AnimatedFilterTabs, { type AnimatedFilterTab } from "@/components/ui/AnimatedFilterTabs";
import { EASE_OUT } from "@/lib/ease";

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
  /** Interrupteur général réel de chaque module (id → activé). Un module absent n'affiche pas de pastille. */
  status?: Record<string, boolean>;
  /** Interrupteur du module : appelé avec le nouvel état souhaité. Sans lui, la pastille reste en lecture seule. */
  onToggle?: (id: string, enabled: boolean) => void;
  /** Modules mis en avant par le filtre rapide « Recommandés ». Onglet masqué si vide/absent. */
  recommendedIds?: string[];
  /** IDs de modules dont le toggle est en cours d'envoi au bot (pulse visuel, toggle désactivé). */
  pendingIds?: Set<string>;
  /** Titre de la section (ex. « Modules »), affiché au-dessus de la recherche. */
  heading?: string;
  /** Résumé discret à côté du titre (ex. « 5 / 36 modules activés »). */
  summary?: string;
}

const FAV_KEY = "ethone.discord.favoriteModules";
type QuickFilter = "all" | "enabled" | "disabled" | "recommended";

/** Minuscules sans accents, pour une recherche tolérante (« moderation » trouve « Modération »). */
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Navigation des modules du bot, façon Dyno / MEE6 : catégories lisibles, recherche instantanée, favoris épinglés
 * en haut et accès direct à la page complète de chaque module. Un clic sur une carte ouvre sa configuration
 * rapide ; la flèche ouvre la page complète.
 */
export default function ModuleNavigator({
  modules,
  categories,
  activeId,
  onSelect,
  status = {},
  onToggle,
  recommendedIds,
  pendingIds,
  heading,
  summary,
}: ModuleNavigatorProps) {
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [filter, setFilter] = useState<QuickFilter>("all");
  const prefersReducedMotion = useReducedMotion();

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
  const matchesSearch = (m: NavigatorModule) => !q || fold(`${m.title} ${m.description} ${m.id}`).includes(q);
  const recommendedSet = useMemo(() => new Set(recommendedIds ?? []), [recommendedIds]);
  const matchesFilter = (m: NavigatorModule) => {
    if (filter === "enabled") return status[m.id] === true;
    if (filter === "disabled") return status[m.id] === false;
    if (filter === "recommended") return recommendedSet.has(m.id);
    return true;
  };
  const visible = (m: NavigatorModule) => matchesSearch(m) && matchesFilter(m);

  // Compteurs des filtres rapides : calculés après la recherche texte mais avant le filtre actif,
  // pour que chaque onglet affiche combien de résultats il donnerait si on le sélectionnait.
  const searchMatched = useMemo(() => modules.filter(matchesSearch), [modules, q]);
  const filterTabs: AnimatedFilterTab[] = useMemo(() => {
    const tabs: AnimatedFilterTab[] = [
      { id: "all", label: "Tous", count: searchMatched.length },
      { id: "enabled", label: "Activés", count: searchMatched.filter((m) => status[m.id] === true).length },
      { id: "disabled", label: "Désactivés", count: searchMatched.filter((m) => status[m.id] === false).length },
    ];
    if (recommendedSet.size > 0) {
      tabs.push({ id: "recommended", label: "Recommandés", count: searchMatched.filter((m) => recommendedSet.has(m.id)).length });
    }
    return tabs;
  }, [searchMatched, status, recommendedSet]);

  const favoriteModules = favorites.map((id) => byId.get(id)).filter((m): m is NavigatorModule => Boolean(m) && visible(m as NavigatorModule));
  const sections = categories
    .map((c) => ({ ...c, items: c.modules.map((id) => byId.get(id)).filter((m): m is NavigatorModule => Boolean(m) && visible(m as NavigatorModule)) }))
    .filter((c) => c.items.length > 0);
  const total = sections.reduce((n, c) => n + c.items.length, 0);

  const card = (m: NavigatorModule) => {
    const Icon = m.icon;
    const current = m.id === activeId;
    const fav = favorites.includes(m.id);
    const hasStatus = typeof status[m.id] === "boolean";
    const isOn = status[m.id] === true;
    const isPending = pendingIds?.has(m.id) ?? false;
    return (
      <motion.div
        key={m.id}
        aria-busy={isPending}
        animate={isPending && !prefersReducedMotion ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
        transition={isPending && !prefersReducedMotion ? { duration: 0.9, repeat: Infinity, ease: EASE_OUT } : { duration: 0.15, ease: EASE_OUT }}
        className={cn(
          "group relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors duration-150",
          current
            ? "border-emerald-500/40 bg-emerald-500/[0.07]"
            : "border-[var(--panel-border)] bg-[var(--surface-raised)]/50 hover:border-[var(--input-border-hover)] hover:bg-[var(--surface-raised)]/80"
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4 shrink-0", m.tint)} />
          <h4 className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">{m.title}</h4>
          <button
            type="button"
            onClick={() => toggleFavorite(m.id)}
            aria-label={fav ? `Retirer ${m.title} des favoris` : `Ajouter ${m.title} aux favoris`}
            aria-pressed={fav}
            title={fav ? "Retirer des favoris" : "Épingler en haut"}
            className={cn(
              "flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors",
              fav ? "text-amber-300" : "text-zinc-600 opacity-0 hover:text-amber-300 group-hover:opacity-100 focus:opacity-100"
            )}
          >
            <Star className="h-3.5 w-3.5" fill={fav ? "currentColor" : "none"} />
          </button>
          {hasStatus && onToggle && (
            <button
              type="button"
              role="switch"
              aria-checked={isOn}
              disabled={isPending}
              aria-label={`${isOn ? "Désactiver" : "Activer"} ${m.title}`}
              title={isPending ? "Envoi en cours…" : isOn ? "Désactiver ce module sur ce serveur" : "Activer ce module sur ce serveur"}
              onClick={() => onToggle(m.id, !isOn)}
              className={cn(
                "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                isPending ? "cursor-wait opacity-60" : "cursor-pointer",
                isOn ? "bg-emerald-500" : "bg-white/15"
              )}
            >
              <span className={cn("absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform", isOn ? "translate-x-4" : "translate-x-0")} />
            </button>
          )}
        </div>
        <p className="line-clamp-2 min-h-8 text-xs leading-4 text-[var(--text-muted)]">{m.description}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelect(m.id)}
            aria-pressed={current}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors",
              current ? "bg-emerald-500/20 text-emerald-200" : "bg-white/[0.07] text-zinc-100 hover:bg-white/[0.13]"
            )}
          >
            <Settings className="h-3.5 w-3.5" />
            Paramètres
          </button>
          <Link
            href={m.href}
            aria-label={`Ouvrir la page ${m.title}`}
            title="Ouvrir la page complète"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-5">
      {heading && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{heading}</h2>
          {summary && <span className="text-sm text-[var(--text-muted)]">{summary}</span>}
        </div>
      )}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-sm">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un module (musique, anti-raid, tickets…)"
            aria-label="Rechercher un module"
            icon="search"
            clearable
            inputSize="compact"
          />
        </div>
        <AnimatedFilterTabs tabs={filterTabs} activeId={filter} onChange={(id) => setFilter(id as QuickFilter)} />
      </div>

      {total === 0 && favoriteModules.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--panel-border)] p-8 text-center text-xs text-[var(--text-muted)]">
          Aucun module ne correspond{query ? ` à « ${query} »` : ""}
          {filter !== "all" ? " pour ce filtre" : ""}.
        </div>
      )}

      {favoriteModules.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300/90">
            <Star className="h-3.5 w-3.5" fill="currentColor" /> Favoris
          </h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{favoriteModules.map(card)}</div>
        </section>
      )}

      {sections.map((section) => (
        <section key={section.id}>
          <div className="mb-3 flex items-baseline gap-2 border-b border-[var(--panel-border)]/60 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">{section.label}</h3>
            <span className="text-xs text-zinc-500">{section.hint}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{section.items.map(card)}</div>
        </section>
      ))}
    </div>
  );
}
