"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { confirmDialog } from "@/lib/confirmDialog";

interface BoostClientProps {
  id?: string;
}

interface Metrics {
  fps: number | null;
  heapUsedMb: number | null;
  heapLimitMb: number | null;
  cores: number | null;
  deviceMemoryGb: number | null;
  rttMs: number | null;
  downlinkMbps: number | null;
  online: boolean;
}

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: { rtt?: number; downlink?: number };
};

/**
 * Performance de l'appareil : mesures RÉELLES fournies par le navigateur (images par seconde mesurées, mémoire JavaScript,
 * cœurs, réseau). Un site web ne peut ni « purger la RAM » ni « booster le GPU » : ces faux boutons ont été retirés.
 * La seule action proposée agit vraiment : vider les caches de l'application pour repartir d'une version propre.
 */
export default function BoostClient(_props: BoostClientProps) {
  const { success, error } = useToast();
  const [metrics, setMetrics] = useState<Metrics>({ fps: null, heapUsedMb: null, heapLimitMb: null, cores: null, deviceMemoryGb: null, rttMs: null, downlinkMbps: null, online: true });
  const [clearing, setClearing] = useState(false);
  const frames = useRef({ count: 0, last: 0 });

  useEffect(() => {
    let raf = 0;
    frames.current = { count: 0, last: performance.now() };
    const loop = (now: number) => {
      frames.current.count += 1;
      if (now - frames.current.last >= 1000) {
        const fps = Math.round((frames.current.count * 1000) / (now - frames.current.last));
        frames.current = { count: 0, last: now };
        setMetrics((prev) => ({ ...prev, fps }));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const sample = () => {
      const nav = navigator as NavigatorExtras;
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      setMetrics((prev) => ({
        ...prev,
        heapUsedMb: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
        heapLimitMb: mem ? Math.round(mem.jsHeapSizeLimit / 1048576) : null,
        cores: navigator.hardwareConcurrency || null,
        deviceMemoryGb: nav.deviceMemory ?? null,
        rttMs: nav.connection?.rtt ?? null,
        downlinkMbps: nav.connection?.downlink ?? null,
        online: navigator.onLine,
      }));
    };
    sample();
    const timer = setInterval(sample, 2000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
    };
  }, []);

  const clearCaches = useCallback(async () => {
    if (!(await confirmDialog("Vider les caches de l'application et recharger la page ? Vos données et réglages ne sont pas touchés.", { title: "Vider le cache", confirmLabel: "Vider et recharger", tone: "default" }))) return;
    setClearing(true);
    try {
      if ("serviceWorker" in navigator) for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister();
      if ("caches" in window) for (const key of await caches.keys()) await caches.delete(key);
      success("Cache vidé", "La page va se recharger.");
      setTimeout(() => window.location.reload(), 600);
    } catch {
      error("Échec", "Le navigateur a refusé de vider le cache.");
      setClearing(false);
    }
  }, [success, error]);

  const cards: Array<{ label: string; value: string; hint: string }> = [
    { label: "Images par seconde", value: metrics.fps === null ? "…" : String(metrics.fps), hint: "Fluidité mesurée en direct sur cet écran" },
    { label: "Mémoire JavaScript", value: metrics.heapUsedMb === null ? "Non fournie" : `${metrics.heapUsedMb} Mo`, hint: metrics.heapLimitMb ? `sur ${metrics.heapLimitMb} Mo autorisés` : "Mesure disponible sur Chrome / Edge" },
    { label: "Cœurs du processeur", value: metrics.cores === null ? "Non fourni" : String(metrics.cores), hint: "Cœurs logiques visibles par le navigateur" },
    { label: "Mémoire de l'appareil", value: metrics.deviceMemoryGb === null ? "Non fournie" : `≈ ${metrics.deviceMemoryGb} Go`, hint: "Valeur arrondie par le navigateur" },
    { label: "Latence réseau", value: metrics.rttMs === null ? "Non fournie" : `${metrics.rttMs} ms`, hint: metrics.online ? "Estimation du navigateur" : "Hors ligne" },
    { label: "Débit descendant", value: metrics.downlinkMbps === null ? "Non fourni" : `${metrics.downlinkMbps} Mb/s`, hint: "Estimation du navigateur" },
  ];

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] p-4 pb-32 text-white sm:p-8">
      <header className="mb-6 border-b border-[var(--panel-border)] pb-6">
        <h1 className="text-xl font-bold tracking-tight">Performance de l&apos;appareil</h1>
        <p className="mt-1 max-w-2xl text-xs text-zinc-400">
          Mesures réelles fournies par votre navigateur. Une page web ne peut pas libérer la mémoire du système ni accélérer le processeur graphique : seules des mesures et un nettoyage du cache de l&apos;application sont proposés.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-4">
            <p className="text-[11px] text-zinc-500">{c.label}</p>
            <p className="mt-1 text-xl font-semibold">{c.value}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{c.hint}</p>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold">Cache de l&apos;application</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Supprime les fichiers gardés en cache par ETHONE (service worker et caches du navigateur) puis recharge la page. Utile après une mise à jour qui ne s&apos;affiche pas.
        </p>
        <button
          type="button"
          onClick={clearCaches}
          disabled={clearing}
          className="mt-4 cursor-pointer rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/5 disabled:opacity-50"
        >
          {clearing ? "Nettoyage…" : "Vider le cache"}
        </button>
      </section>
    </div>
  );
}
