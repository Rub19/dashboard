"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Search, Star, X } from "@/components/icons/ph";
import { cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
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
}

const FAV_KEY = "ethone.discord.favoriteModules";
type QuickFilter = "all" | "enabled" | "disabled" | "recommended";

/** Minuscules sans accents, pour une recherche tolérante (« moderation » trouve « Modération »). */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

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
        aria-busy={isPending}
        animate={isPending && !prefersReducedMotion ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
        transition={isPending && !prefersReducedMotion ? { duration: 0.9, repeat: Infinity, ease: EASE_OUT } : { duration: 0.15, ease: EASE_OUT }}
        className={cn(
          "group relative flex cursor-pointer items-start gap-3 overflow-hidden rounded-[var(--inset-radius)] border p-3 text-left transition-colors duration-150",
          current
            ? "border-emerald-500/40 bg-emerald-500/[0.08] shadow-sm"
            : isOn
            ? "border-[var(--panel-border)] bg-emerald-500/[0.035] hover:border-[var(--input-border-hover)] hover:bg-emerald-500/[0.06]"
            : "border-[var(--panel-border)] bg-white/[0.02] hover:border-[var(--input-border-hover)] hover:bg-white/[0.04]"
        )}
      >
        {isOn && <span className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-full bg-emerald-400/80" />}
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/[0.04]", m.tint)}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={cn("block truncate text-xs font-semibold", current ? "text-white" : "text-zinc-200")}>{m.title}</span>
            {hasStatus && (
              <Badge variant={isOn ? "success" : "offline"} dot size="sm" className="shrink-0">
                {isOn ? "Activé" : "Désactivé"}
              </Badge>
            )}
          </span>
          <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-zinc-500">{m.description}</span>
        </span>
        <span className="flex shrink-0 flex-col items-center gap-1">
          {hasStatus && onToggle && (
            <button
              type="button"
              role="switch"
              aria-checked={isOn}
              disabled={isPending}
              aria-label={`${isOn ? "Désactiver" : "Activer"} ${m.title}`}
              title={isPending ? "Envoi en cours…" : isOn ? "Désactiver ce module sur ce serveur" : "Activer ce module sur ce serveur"}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(m.id, !isOn);
              }}
              className={cn(
                "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                isPending ? "cursor-wait opacity-60" : "cursor-pointer",
                isOn ? "bg-emerald-500" : "bg-white/15"
              )}
            >
              <span className={cn("absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", isOn ? "translate-x-4" : "translate-x-0")} />
            </button>
          )}
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
      </motion.div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
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
        <p className="text-[11px] text-zinc-500">
          {total} module{total > 1 ? "s" : ""} · clic = configuration rapide · <ArrowUpRight className="inline h-3 w-3 -translate-y-px" /> = page complète · <Star className="inline h-3 w-3 -translate-y-px" /> = favori
        </p>
      </div>

      <AnimatedFilterTabs tabs={filterTabs} activeId={filter} onChange={(id) => setFilter(id as QuickFilter)} />

      {total === 0 && favoriteModules.length === 0 && (
        <div className="rounded-[var(--inset-radius)] border border-dashed border-[var(--panel-border)] p-8 text-center text-xs text-zinc-500">
          Aucun module ne correspond{query ? ` à « ${query} »` : ""}
          {filter !== "all" ? " pour ce filtre" : ""}.
        </div>
      )}

      {favoriteModules.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-300/90">
            <Star className="h-3.5 w-3.5" fill="currentColor" /> Favoris
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{favoriteModules.map(card)}</div>
        </section>
      )}

      {sections.map((section) => (
        <section key={section.id}>
          <div className="mb-2 flex items-baseline gap-2 border-b border-[var(--panel-border)]/60 pb-1.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">{section.label}</h3>
            <span className="text-[11px] text-zinc-600">{section.hint}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{section.items.map(card)}</div>
        </section>
      ))}
    </div>
  );
}
