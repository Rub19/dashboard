"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWorker } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Clock, Coins, Info, Percent, RefreshCw, Search, SearchX, ShoppingBag, Sparkles } from "@/components/icons/ph";

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
  return days > 0 ? `${days} j ${hours} h restants` : `${hours} h ${Math.floor((ms % 3_600_000) / 60_000)} min restantes`;
}

function BundleItemCard({ item }: { item: StoreItem }) {
  return (
    <li className="group flex flex-col gap-1.5 rounded-xl border border-[var(--panel-border)] bg-white/[0.03] p-2.5 transition-all hover:-translate-y-0.5 hover:border-[var(--accent-primary)]/40 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-black/20">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black/20">
        {item.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt=""
            className="h-full w-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />
        )}
        {item.discountPercent > 0 && (
          <span className="absolute right-1 top-1 flex items-center gap-0.5 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
            <Percent className="h-2.5 w-2.5" />-{item.discountPercent}%
          </span>
        )}
      </div>
      <span className="truncate text-xs font-semibold leading-tight" title={item.name}>
        {item.name}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{ITEM_TYPE_LABELS[item.type] || item.type}</span>
      <span className="flex items-center gap-1.5 text-xs">
        <span className="font-mono font-bold text-[var(--text-primary)]">{formatVp(item.price)}</span>
        {item.discountPercent > 0 && (
          <span className="font-mono text-[10px] text-[var(--muted)] line-through">{item.basePrice.toLocaleString("fr-FR")}</span>
        )}
      </span>
    </li>
  );
}

function BundleCountdown({ expiresAt, now, large }: { expiresAt: string | null; now: number; large?: boolean }) {
  const label = remainingLabel(expiresAt, now);
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 font-semibold text-amber-300",
        large ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs"
      )}
    >
      <Clock className={large ? "h-4 w-4" : "h-3 w-3"} />
      {label}
    </span>
  );
}

function HeroBundle({ bundle, now }: { bundle: FeaturedBundle; now: number }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-gradient-to-br from-[var(--panel-bg)] via-[var(--panel-bg)] to-rose-500/[0.04] p-5 shadow-xl shadow-black/10 sm:p-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--accent-primary)]/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex shrink-0 items-center justify-center">
          {bundle.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bundle.image} alt="" className="h-32 w-32 object-contain drop-shadow-2xl sm:h-40 sm:w-40" loading="lazy" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)]/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
            <Sparkles className="h-3 w-3" />À la une
          </span>
          <h3 className="truncate text-2xl font-black tracking-tight sm:text-3xl">{bundle.name}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--panel-bg)] px-3 py-1.5 text-sm font-bold">
              <Coins className="h-4 w-4 text-amber-400" />
              {formatVp(bundle.price)}
            </span>
            {bundle.wholesaleOnly && (
              <span className="rounded-full border border-[var(--panel-border)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
                Achat groupé uniquement
              </span>
            )}
            <BundleCountdown expiresAt={bundle.expiresAt} now={now} large />
          </div>
        </div>
      </div>
      {bundle.items.length > 0 && (
        <ul className="relative mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {bundle.items.map((item, index) => (
            <BundleItemCard key={`${item.name}-${index}`} item={item} />
          ))}
        </ul>
      )}
    </article>
  );
}

function SecondaryBundle({ bundle, now }: { bundle: FeaturedBundle; now: number }) {
  return (
    <article className="v8-panel space-y-3 rounded-2xl p-4">
      <div className="flex flex-wrap items-center gap-3">
        {bundle.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bundle.image} alt="" className="h-16 w-16 shrink-0 object-contain" loading="lazy" />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold">{bundle.name}</h3>
          <p className="flex items-center gap-1 text-sm text-[var(--muted)]">
            <Coins className="h-3.5 w-3.5 text-amber-400" />
            {formatVp(bundle.price)}
            {bundle.wholesaleOnly ? " · groupé" : ""}
          </p>
        </div>
        <BundleCountdown expiresAt={bundle.expiresAt} now={now} />
      </div>
      {bundle.items.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {bundle.items.map((item, index) => (
            <BundleItemCard key={`${item.name}-${index}`} item={item} />
          ))}
        </ul>
      )}
    </article>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-52 animate-pulse rounded-2xl bg-[var(--panel-bg)]" />
      <div className="h-40 animate-pulse rounded-2xl bg-[var(--panel-bg)]" />
    </div>
  );
}

function CatalogueSkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <li key={index} className="aspect-[3/4] animate-pulse rounded-xl bg-[var(--panel-bg)]" />
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

  const filteredCatalogue = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = catalogue || [];
    return (q ? list.filter((b) => b.displayName.toLowerCase().includes(q)) : list).slice().reverse();
  }, [catalogue, query]);

  const [hero, ...rest] = featured || [];

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

      <section className="space-y-4" aria-labelledby="featured-title">
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
        {hero && <HeroBundle bundle={hero} now={now} />}
        {rest.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {rest.map((bundle) => (
              <SecondaryBundle key={bundle.uuid || bundle.name} bundle={bundle} now={now} />
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
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un bundle…"
              aria-label="Rechercher un bundle"
              className="w-full rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-[var(--accent-primary)]"
            />
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
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredCatalogue.map((bundle) => (
            <li
              key={bundle.uuid}
              className="group v8-panel flex flex-col gap-2 overflow-hidden rounded-xl p-2.5 transition-all hover:-translate-y-0.5 hover:border-[var(--accent-primary)]/40 hover:shadow-lg hover:shadow-black/20"
            >
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-black/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bundle.displayIcon || bundle.verticalPromoImage || ""}
                  alt=""
                  className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
              </div>
              <span className="truncate text-xs font-semibold" title={bundle.displayName}>
                {bundle.displayName}
              </span>
            </li>
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
