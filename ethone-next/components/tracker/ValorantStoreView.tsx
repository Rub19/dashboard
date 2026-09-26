"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWorker } from "@/lib/api";
import { cn } from "@/lib/utils";

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

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-y-auto p-1 pr-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Boutique Valorant</h1>
          <p className="text-xs text-[var(--muted)]">Bundles à la une et catalogue des bundles.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-[var(--panel-radius)] bg-[var(--panel-bg)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent)]/20 disabled:opacity-50"
        >
          {loading ? "Chargement…" : "Actualiser"}
        </button>
      </div>

      <section className="space-y-3" aria-labelledby="featured-title">
        <h2 id="featured-title" className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          À la une en ce moment
        </h2>
        {featuredError && (
          <p role="alert" className="rounded-[var(--panel-radius)] border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            {featuredError} — vérifiez votre clé API HenrikDev dans Connexions.
          </p>
        )}
        {featured && featured.length === 0 && !featuredError && <p className="text-sm text-[var(--muted)]">Aucun bundle à la une.</p>}
        {(featured || []).map((bundle) => (
          <article key={bundle.uuid || bundle.name} className="v8-panel space-y-3 rounded-[var(--panel-radius)] p-4">
            <div className="flex flex-wrap items-center gap-4">
              {bundle.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bundle.image} alt="" className="h-24 w-24 rounded-lg object-contain" loading="lazy" />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-bold">{bundle.name}</h3>
                <p className="text-sm text-[var(--muted)]">
                  {formatVp(bundle.price)}
                  {bundle.wholesaleOnly ? " · achat groupé uniquement" : ""}
                </p>
                {remainingLabel(bundle.expiresAt, now) && (
                  <p className="text-xs font-semibold text-amber-400">{remainingLabel(bundle.expiresAt, now)}</p>
                )}
              </div>
            </div>
            {bundle.items.length > 0 && (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {bundle.items.map((item, index) => (
                  <li key={`${item.name}-${index}`} className="flex flex-col gap-1 rounded-lg border border-[var(--panel-border)] bg-white/[0.03] p-2">
                    {item.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="h-16 w-full object-contain" loading="lazy" />
                    )}
                    <span className="truncate text-xs font-semibold" title={item.name}>{item.name}</span>
                    <span className="text-[10px] uppercase text-[var(--muted)]">{ITEM_TYPE_LABELS[item.type] || item.type}</span>
                    <span className="flex items-center gap-1 text-xs">
                      <span className="font-mono font-bold">{formatVp(item.price)}</span>
                      {item.discountPercent > 0 && (
                        <>
                          <span className="font-mono text-[10px] text-[var(--muted)] line-through">{item.basePrice.toLocaleString("fr-FR")}</span>
                          <span className="rounded bg-emerald-500/15 px-1 text-[10px] font-bold text-emerald-400">-{item.discountPercent}%</span>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>

      <section className="space-y-3" aria-labelledby="catalogue-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="catalogue-title" className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            Catalogue des bundles {catalogue ? `(${filteredCatalogue.length})` : ""}
          </h2>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un bundle…"
            aria-label="Rechercher un bundle"
            className="w-full max-w-xs rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[var(--accent-primary)]"
          />
        </div>
        {catalogueError && <p role="alert" className="text-sm text-rose-300">{catalogueError}</p>}
        <ul className={cn("grid gap-3", "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5")}>
          {filteredCatalogue.map((bundle) => (
            <li key={bundle.uuid} className="v8-panel flex flex-col gap-2 rounded-[var(--panel-radius)] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bundle.displayIcon || bundle.verticalPromoImage || ""} alt="" className="h-28 w-full object-contain" loading="lazy" />
              <span className="truncate text-xs font-semibold" title={bundle.displayName}>{bundle.displayName}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[11px] text-[var(--muted)]">
        La boutique quotidienne personnelle (4 skins du jour, Marché nocturne) n&apos;est pas affichée : Riot ne propose pas d&apos;API publique pour
        elle, elle nécessiterait vos jetons de connexion Riot, qu&apos;ETHONE ne demande ni ne stocke.
      </p>
    </div>
  );
}
