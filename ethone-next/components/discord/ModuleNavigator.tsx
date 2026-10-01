"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Settings, Star } from "@/components/icons/ph";
import { cn } from "@/lib/utils";
import Input from "@/components/ui/Input";
import AnimatedFilterTabs, { type AnimatedFilterTab } from "@/components/ui/AnimatedFilterTabs";
import { EASE_OUT, EASE_SNAP, SPRING_PILL } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";

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
  const { reduced } = useMotionPref();
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [filter, setFilter] = useState<QuickFilter>("all");

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

  const card = (m: NavigatorModule, index: number, scope: string) => {
    const Icon = m.icon;
    const current = m.id === activeId;
    const fav = favorites.includes(m.id);
    const hasStatus = typeof status[m.id] === "boolean";
    const isOn = status[m.id] === true;
    const isPending = pendingIds?.has(m.id) ?? false;
    return (
      <motion.div
        key={`${scope}-${m.id}`}
        layout={reduced ? false : "position"}
        aria-busy={isPending}
        initial={reduced ? false : { opacity: 0, y: 12, scale: 0.98 }}
        animate={
          isPending && !reduced
            ? { opacity: [1, 0.55, 1], y: 0, scale: 1, transition: { duration: 0.9, repeat: Infinity, ease: EASE_OUT } }
            : { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: EASE_SNAP, delay: Math.min(index, 8) * 0.03 } }
        }
        exit={reduced ? undefined : { opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
        className={cn(
          "group relative flex flex-col gap-2.5 overflow-hidden rounded-[var(--panel-radius)] border p-4 text-left transition-[border-color,background-color,transform] duration-300 [transition-timing-function:var(--ease-snap)]",
          current
            ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/[0.07]"
            : isOn
              ? "border-[var(--success)]/25 bg-[var(--surface-raised)]/55 hover:border-[var(--success)]/40"
              : "border-[var(--panel-border)] bg-[var(--surface-raised)]/45 hover:border-[var(--text-primary)]/15 hover:bg-[var(--surface-raised)]/75"
        )}
      >
        {/* Filet lumineux en haut quand le module est actif */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[var(--success)] to-transparent transition-opacity duration-500",
            isOn ? "opacity-70" : "opacity-0"
          )}
        />
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.04] transition-transform duration-300 [transition-timing-function:var(--ease-snap)] group-hover:-rotate-6 group-hover:scale-105">
            <Icon className={cn("h-4 w-4", m.tint)} />
          </span>
          <h4 className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">{m.title}</h4>
          <button
            type="button"
            onClick={() => toggleFavorite(m.id)}
            aria-label={fav ? `Retirer ${m.title} des favoris` : `Ajouter ${m.title} aux favoris`}
            aria-pressed={fav}
            title={fav ? "Retirer des favoris" : "Épingler en haut"}
            className={cn(
              "flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none transition-[color,opacity,transform] duration-200 active:scale-75 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50",
              fav ? "text-amber-300" : "text-[var(--text-muted)] opacity-0 hover:text-amber-300 group-hover:opacity-100 focus:opacity-100"
            )}
          >
            <motion.span key={String(fav)} initial={reduced ? false : { scale: 0.5, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={SPRING_PILL}>
              <Star className="h-3.5 w-3.5" fill={fav ? "currentColor" : "none"} />
            </motion.span>
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
                "relative h-5 w-9 shrink-0 rounded-full outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50",
                isPending ? "cursor-wait opacity-60" : "cursor-pointer",
                isOn ? "bg-[var(--success)]" : "bg-[var(--text-primary)]/15"
              )}
            >
              <motion.span
                className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow"
                initial={false}
                animate={{ x: isOn ? 16 : 0 }}
                transition={SPRING_PILL}
              />
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
              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--inset-radius)] px-3 text-xs font-semibold outline-none transition-[background-color,transform] duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50",
              current ? "bg-[var(--accent-primary)]/20 text-[var(--text-primary)]" : "bg-[var(--text-primary)]/[0.07] text-[var(--text-primary)] hover:bg-[var(--text-primary)]/[0.12]"
            )}
          >
            <Settings className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-90" />
            Paramètres
          </button>
          <Link
            href={m.href}
            aria-label={`Ouvrir la page ${m.title}`}
            title="Ouvrir la page complète"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-[var(--inset-radius)] text-[var(--text-muted)] outline-none transition-[background-color,color] duration-200 hover:bg-[var(--text-primary)]/[0.07] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
          >
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </motion.div>
    );
  };

  const sectionHeader = (label: string, hint: string, count: number, extra?: string) => (
    <div className="mb-3 flex items-center gap-3">
      <h3 className={cn("text-[11px] font-bold uppercase tracking-[0.14em]", extra ?? "text-[var(--text-primary)]/90")}>{label}</h3>
      <span className="rounded-full bg-[var(--text-primary)]/[0.06] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--text-muted)]">{count}</span>
      {hint && <span className="hidden truncate text-xs text-[var(--text-muted)] sm:inline">{hint}</span>}
      <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-[var(--panel-border)] to-transparent" />
    </div>
  );

  return (
    <div className="space-y-7">
      {heading && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_SNAP }}
          className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
        >
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{heading}</h2>
          {summary && <span className="text-sm text-[var(--text-muted)]">{summary}</span>}
        </motion.div>
      )}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_SNAP, delay: 0.06 }}
        className="sticky top-0 z-10 -mx-2 flex flex-col gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)]/70 bg-[var(--background)]/80 p-2 backdrop-blur-xl lg:flex-row lg:items-center"
      >
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
      </motion.div>

      <AnimatePresence>
        {total === 0 && favoriteModules.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-[var(--panel-radius)] border border-dashed border-[var(--panel-border)] p-10 text-center text-sm text-[var(--text-muted)]"
          >
            Aucun module ne correspond{query ? ` à « ${query} »` : ""}
            {filter !== "all" ? " pour ce filtre" : ""}.
          </motion.div>
        )}
      </AnimatePresence>

      {favoriteModules.length > 0 && (
        <section>
          {sectionHeader("Favoris", "", favoriteModules.length, "flex items-center gap-1.5 text-amber-300/90")}
          <motion.div layout={!reduced} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {favoriteModules.map((m, i) => card(m, i, "fav"))}
            </AnimatePresence>
          </motion.div>
        </section>
      )}

      <AnimatePresence mode="popLayout" initial={false}>
        {sections.map((section) => (
          <motion.section
            key={section.id}
            layout={reduced ? false : "position"}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
          >
            {sectionHeader(section.label, section.hint, section.items.length)}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout" initial={!reduced}>
                {section.items.map((m, i) => card(m, i, section.id))}
              </AnimatePresence>
            </div>
          </motion.section>
        ))}
      </AnimatePresence>
    </div>
  );
}
