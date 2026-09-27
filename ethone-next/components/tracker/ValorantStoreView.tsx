"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWorker } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Clock, Coins, Info, Percent, RefreshCw, Search, SearchX, ShoppingBag, Sparkles } from "@/components/icons/ph";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import AnimatedFilterTabs, { type AnimatedFilterTab } from "@/components/ui/AnimatedFilterTabs";

type StoreItem = {
  name: string;
  type: string;
  image: string;
  basePrice: number;
  price: number;
  discountPercent: number;
};

type FeaturedBundle = {
  uuid: string;
  name: string;
  image: string;
  price: number;
  wholesaleOnly: boolean;
  expiresAt: string | null;
  items: StoreItem[];
};

type CatalogueBundle = {
  uuid: string;
  displayName: string;
  displayIcon: string | null;
  verticalPromoImage: string | null;
};

const ITEM_TYPE_LABELS: Record<string, string> = {
  skin_level: "Skin",
  skin: "Skin",
  player_card: "Carte",
  spray: "Spray",
  buddy: "Porte-bonheur",
  title: "Titre",
  agent: "Agent",
};

type SortMode = "recent" | "az";
const SORT_TABS: AnimatedFilterTab[] = [
  { id: "recent", label: "Récents" },
  { id: "az", label: "A-Z" },
];

function formatVp(value: number): string {
  return `${value.toLocaleString("fr-FR")} VP`;
}

function remainingLabel(expiresAt: string | null, now: number): string | null {
  if (!expiresAt) return null;
  const ms = Date.parse(expiresAt) - now;
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return "Terminé";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return days > 0 ? `${days} j ${hours} h` : `${hours} h ${Math.floor((ms % 3_600_000) / 60_000)} min`;
}

/** Pastille de réduction discrète, superposée sur l'image — jamais un gros bloc plein. */
function DiscountChip({ percent }: { percent: number }) {
  if (percent <= 0) return null;
  return (
    <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full border border-emerald-400/30 bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 backdrop-blur-sm">
      <Percent className="h-2.5 w-2.5" />-{percent}%
    </span>
  );
}

function BundleCountdown({ expiresAt, now }: { expiresAt: string | null; now: number }) {
  const label = remainingLabel(expiresAt, now);
  if (!label) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
}

/**
 * Carte objet : l'image occupe la majorité de la carte sur un fond légèrement contrasté (pas de noir plat),
 * hiérarchie image → nom → type → prix. Hover léger (zoom + élévation), pas d'effet "RGB gaming".
 */
function ItemCard({ item }: { item: StoreItem }) {
  return (
    <li className="group relative flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--accent-primary)]/35 hover:bg-white/[0.04] hover:shadow-[0_10px_24px_-12px_rgba(0,0,0,0.6)]">
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-gradient-to-b from-white/[0.05] to-black/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.07),transparent_70%)]" />
        {item.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt=""
            className="relative h-full w-full object-contain p-2.5 drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out group-hover:scale-[1.07]"
            loading="lazy"
          />
        )}
        <DiscountChip percent={item.discountPercent} />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <p className="truncate text-[12.5px] font-semibold leading-tight text-[var(--text-primary)]" title={item.name}>
          {item.name}
        </p>
        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">{ITEM_TYPE_LABELS[item.type] || item.type}</p>
        <div className="mt-auto flex items-center gap-1.5 pt-1">
          <Coins className="h-3 w-3 shrink-0 text-amber-400" />
          <span className="font-mono text-[13px] font-bold text-[var(--text-primary)]">{item.price.toLocaleString("fr-FR")}</span>
          {item.discountPercent > 0 && (
            <span className="font-mono text-[10px] text-[var(--muted)] line-through">{item.basePrice.toLocaleString("fr-FR")}</span>
          )}
        </div>
      </div>
    </li>
  );
}

function ItemGridSkeleton({ count }: { count: number }) {
  return (
    <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, index) => (
        <li key={index} className="aspect-[4/5] animate-pulse rounded-xl bg-white/[0.03]" />
      ))}
    </ul>
  );
}

/**
 * Section boutique unique pour CHAQUE bundle à la une (Champions 2026, lancement Warden, etc.) : un en-tête
 * compact (artwork, nom, VP, temps restant) puis la grille d'objets — même système visuel pour tous les
 * bundles, pas de "hero" disproportionné suivi de cartes secondaires plus petites.
 */
function FeaturedSection({ bundle, now }: { bundle: FeaturedBundle; now: number }) {
  const maxDiscount = useMemo(() => Math.max(0, ...bundle.items.map((i) => i.discountPercent)), [bundle.items]);

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] bg-gradient-to-r from-white/[0.03] to-transparent p-3.5 sm:p-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.04] sm:h-14 sm:w-14">
          {bundle.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bundle.image} alt="" className="h-full w-full object-contain p-1.5" loading="lazy" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold text-[var(--text-primary)] sm:text-base">{bundle.name}</h3>
            <Badge variant="primary" dot size="sm">
              À la une
            </Badge>
            {maxDiscount > 0 && (
              <Badge variant="success" size="sm">
                Jusqu&apos;à -{maxDiscount}%
              </Badge>
            )}
            {bundle.wholesaleOnly && (
              <Badge variant="muted" size="sm">
                Achat groupé
              </Badge>
            )}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--muted)]">
            <Coins className="h-3 w-3 text-amber-400" />
            {formatVp(bundle.price)}
          </p>
        </div>
        <BundleCountdown expiresAt={bundle.expiresAt} now={now} />
      </div>
      {bundle.items.length > 0 && (
        <ul className="grid grid-cols-3 gap-2.5 p-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 sm:p-3.5">
          {bundle.items.map((item, index) => (
            <ItemCard key={`${item.name}-${index}`} item={item} />
          ))}
        </ul>
      )}
    </article>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]">
          <div className="h-16 animate-pulse bg-white/[0.03]" />
          <div className="p-3">
            <ItemGridSkeleton count={6} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Carte catalogue : privilégie l'artwork promotionnel vertical (bien plus flatteur qu'une simple icône) quand il existe. */
function CatalogueCard({ bundle }: { bundle: CatalogueBundle }) {
  const promo = bundle.verticalPromoImage;
  const fallback = bundle.displayIcon;
  return (
    <li className="group relative flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--accent-primary)]/35 hover:bg-white/[0.04] hover:shadow-[0_10px_24px_-12px_rgba(0,0,0,0.6)]">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gradient-to-b from-white/[0.05] to-black/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.06),transparent_70%)]" />
        {promo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={promo}
            alt=""
            className="relative h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.06]"
            loading="lazy"
          />
        ) : fallback ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fallback}
            alt=""
            className="relative h-full w-full object-contain p-4 drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out group-hover:scale-[1.07]"
            loading="lazy"
          />
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/70 to-transparent" />
        <span className="absolute inset-x-0 bottom-0 truncate p-2 text-xs font-semibold text-white" title={bundle.displayName}>
          {bundle.displayName}
        </span>
      </div>
    </li>
  );
}

function CatalogueSkeleton() {
  return (
    <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, index) => (
        <li key={index} className="aspect-[3/4] animate-pulse rounded-xl bg-white/[0.03]" />
      ))}
    </ul>
  );
}

/**
 * Boutique Valorant : bundles à la une (HenrikDev) + catalogue des bundles (valorant-api.com).
 * La boutique quotidienne PERSONNELLE de chaque joueur n'est pas proposée : Riot ne fournit aucune API publique pour elle
 * (elle exige les jetons de connexion du joueur, que ETHONE ne demande ni ne stocke).
 */
export default function ValorantStoreView() {
  const [featured, setFeatured] = useState<FeaturedBundle[] | null>(null);
  const [featuredError, setFeaturedError] = useState<string | null>(null);
  const [catalogue, setCatalogue] = useState<CatalogueBundle[] | null>(null);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    const [featuredResult, catalogueResult] = await Promise.allSettled([
      fetchWorker("/api/stats/valorant-store"),
      fetch("https://valorant-api.com/v1/bundles?language=fr-FR").then((r) => {
        if (!r.ok) throw new Error(`valorant-api.com ${r.status}`);
        return r.json();
      }),
    ]);
    if (featuredResult.status === "fulfilled") {
      setFeatured((featuredResult.value?.data?.bundles as FeaturedBundle[]) || []);
      setFeaturedError(null);
    } else {
      setFeaturedError(featuredResult.reason instanceof Error ? featuredResult.reason.message : "Boutique indisponible.");
    }
    if (catalogueResult.status === "fulfilled") {
      const list = (catalogueResult.value?.data as CatalogueBundle[]) || [];
      setCatalogue(list.filter((b) => b.displayName && (b.displayIcon || b.verticalPromoImage)));
      setCatalogueError(null);
    } else {
      setCatalogueError("Catalogue indisponible.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Ordre "Récents" = ordre renvoyé par l'API inversé (le plus récent en premier, déjà le comportement d'origine) ;
  // "A-Z" = tri alphabétique. Pas de tri par prix/réduction/popularité : le catalogue (valorant-api.com) ne fournit
  // aucune de ces données par bundle — les ajouter inventerait une information qui n'existe pas côté Riot.
  const filteredCatalogue = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (catalogue || []).slice().reverse();
    const filtered = q ? list.filter((b) => b.displayName.toLowerCase().includes(q)) : list;
    if (sort === "az") return filtered.slice().sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));
    return filtered;
  }, [catalogue, query, sort]);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto p-1 pr-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">Boutique Valorant</h1>
            <p className="text-xs text-[var(--muted)]">Bundles à la une et catalogue complet.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2 text-sm font-medium transition-colors hover:border-[var(--accent-primary)]/40 hover:bg-[var(--accent-primary)]/10 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          {loading ? "Chargement…" : "Actualiser"}
        </button>
      </div>

      <section className="space-y-3" aria-labelledby="featured-title">
        <h2 id="featured-title" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
          <Sparkles className="h-3.5 w-3.5" />À la une en ce moment
        </h2>
        {featuredError && (
          <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            <Info className="h-4 w-4 shrink-0" />
            {featuredError} — vérifiez votre clé API HenrikDev dans Connexions.
          </p>
        )}
        {featured === null && !featuredError && <FeaturedSkeleton />}
        {featured && featured.length === 0 && !featuredError && (
          <p className="v8-panel flex items-center gap-2 rounded-2xl p-4 text-sm text-[var(--muted)]">
            <Info className="h-4 w-4 shrink-0" />
            Aucun bundle à la une.
          </p>
        )}
        {featured && featured.length > 0 && (
          <div className="space-y-3">
            {featured.map((bundle) => (
              <FeaturedSection key={bundle.uuid || bundle.name} bundle={bundle} now={now} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="catalogue-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="catalogue-title" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
            <ShoppingBag className="h-3.5 w-3.5" />
            Catalogue des bundles {catalogue ? `(${filteredCatalogue.length})` : ""}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <AnimatedFilterTabs tabs={SORT_TABS} activeId={sort} onChange={(id) => setSort(id as SortMode)} />
            <div className="w-full max-w-xs sm:w-56">
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un bundle…"
                aria-label="Rechercher un bundle"
                icon="search"
                clearable
                inputSize="compact"
              />
            </div>
          </div>
        </div>
        {catalogueError && (
          <p role="alert" className="flex items-center gap-2 text-sm text-rose-300">
            <Info className="h-4 w-4 shrink-0" />
            {catalogueError}
          </p>
        )}
        {catalogue === null && !catalogueError && <CatalogueSkeleton />}
        {catalogue && filteredCatalogue.length === 0 && (
          <p className="v8-panel flex items-center gap-2 rounded-2xl p-4 text-sm text-[var(--muted)]">
            <SearchX className="h-4 w-4 shrink-0" />
            Aucun bundle ne correspond à « {query} ».
          </p>
        )}
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
          {filteredCatalogue.map((bundle) => (
            <CatalogueCard key={bundle.uuid} bundle={bundle} />
          ))}
        </ul>
      </section>

      <p className="flex items-start gap-2 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 text-[11px] leading-relaxed text-[var(--muted)]">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        La boutique quotidienne personnelle (4 skins du jour, Marché nocturne) n&apos;est pas affichée : Riot ne propose pas d&apos;API publique pour
        elle, elle nécessiterait vos jetons de connexion Riot, qu&apos;ETHONE ne demande ni ne stocke.
      </p>
    </div>
  );
}
