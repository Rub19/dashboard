"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWorker } from "@/lib/api";

type Champion = { id: number; name: string; title: string; icon: string };

type Rotation = {
  region: string;
  gameVersion: string;
  free: Champion[];
  freeForNewPlayers: Champion[];
  maxNewPlayerLevel: number;
};

const REGIONS: Array<{ id: string; label: string }> = [
  { id: "euw1", label: "Europe Ouest" },
  { id: "eun1", label: "Europe Nord-Est" },
  { id: "na1", label: "Amérique du Nord" },
  { id: "kr", label: "Corée" },
  { id: "br1", label: "Brésil" },
  { id: "la1", label: "Amérique latine Nord" },
  { id: "la2", label: "Amérique latine Sud" },
  { id: "jp1", label: "Japon" },
  { id: "oc1", label: "Océanie" },
  { id: "tr1", label: "Turquie" },
  { id: "ru", label: "Russie" },
];

function ChampionGrid({ champions }: { champions: Champion[] }) {
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
      {champions.map((champion, i) => (
        <li
          key={champion.id}
          style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
          className="rise-in group v8-panel flex flex-col items-center gap-1 rounded-[var(--panel-radius)] p-2 text-center transition-colors hover:border-[var(--accent-primary)]/30"
        >
          {champion.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={champion.icon} alt="" className="h-14 w-14 rounded-lg transition-transform duration-300 group-hover:scale-105" loading="lazy" />
          )}
          <span className="w-full truncate text-xs font-semibold" title={champion.name}>{champion.name}</span>
          {champion.title && <span className="w-full truncate text-[10px] text-[var(--text-muted)]" title={champion.title}>{champion.title}</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * League of Legends : rotation gratuite hebdomadaire (API officielle Riot). La boutique (skins en promotion, packs) n'a pas
 * d'API publique : seules la rotation et le catalogue des champions (Data Dragon) sont disponibles.
 */
export default function LolRotationView() {
  const [region, setRegion] = useState("euw1");
  const [rotation, setRotation] = useState<Rotation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWorker(`/api/stats/lol-rotation?region=${encodeURIComponent(region)}`);
      setRotation((res?.data as Rotation) || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rotation indisponible.");
    } finally {
      setLoading(false);
    }
  }, [region]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-y-auto p-1 pr-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Rotation League of Legends</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Champions gratuits de la semaine{rotation ? ` · patch ${rotation.gameVersion}` : ""}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="lol-region" className="sr-only">Région</label>
          <select
            id="lol-region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-transparent px-2 py-1.5 text-sm"
          >
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id} className="bg-[var(--panel-bg)]">{r.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-[var(--panel-radius)] bg-[var(--panel-bg)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent-primary)]/15 disabled:opacity-50"
          >
            {loading ? "Chargement…" : "Actualiser"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-[var(--panel-radius)] border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {rotation && (
        <>
          <section className="space-y-3" aria-labelledby="rotation-free">
            <h2 id="rotation-free" className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Rotation gratuite ({rotation.free.length})
            </h2>
            <ChampionGrid champions={rotation.free} />
          </section>
          <section className="space-y-3" aria-labelledby="rotation-new">
            <h2 id="rotation-new" className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Nouveaux joueurs (jusqu&apos;au niveau {rotation.maxNewPlayerLevel || 10}) ({rotation.freeForNewPlayers.length})
            </h2>
            <ChampionGrid champions={rotation.freeForNewPlayers} />
          </section>
        </>
      )}

      <p className="text-[11px] text-[var(--text-muted)]">
        La boutique de League of Legends (skins en promotion, packs) n&apos;a pas d&apos;API publique : elle ne peut pas être affichée ici.
      </p>
    </div>
  );
}
