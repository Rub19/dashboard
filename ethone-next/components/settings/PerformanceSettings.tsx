"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/lib/icons";
import { useSettings } from "@/components/SettingsProvider";
import { useSound } from "@/lib/sound";
import { useI18n } from "@/lib/hooks/useI18n";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number, kb = "Ko", mb = "Mo"): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return `0 ${kb}`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${kb}`;
  return `${(bytes / 1024 / 1024).toFixed(1)} ${mb}`;
}

/** Measures the real browser refresh rate by averaging a short run of animation frame deltas. */
function useMeasuredRefreshRate() {
  const [fps, setFps] = useState<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || typeof requestAnimationFrame === "undefined") return;
    let raf = 0;
    let frames = 0;
    let start = 0;
    const samples: number[] = [];
    let last = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      if (last) samples.push(t - last);
      last = t;
      frames++;
      if (t - start < 500 && frames < 40) {
        raf = requestAnimationFrame(tick);
      } else if (samples.length > 0) {
        const avgDelta = samples.reduce((a, b) => a + b, 0) / samples.length;
        setFps(Math.round(1000 / avgDelta));
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}

function useLocalStorageUsage() {
  const [bytes, setBytes] = useState<number | null>(null);
  useEffect(() => {
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        total += key.length + (localStorage.getItem(key)?.length ?? 0);
      }
      setBytes(total * 2); // UTF-16 code units are 2 bytes each
    } catch {
      setBytes(null);
    }
  }, []);
  return bytes;
}

export default function PerformanceSettings() {
  const { settings, update } = useSettings();
  const i18n = useI18n();
  const unitKB = i18n("sPerfUnitKB", "Ko");
  const unitMB = i18n("sPerfUnitMB", "Mo");
  const { enabled: audioEnabled } = useSound();
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const measuredFps = useMeasuredRefreshRate();
  const localStorageBytes = useLocalStorageUsage();
  const [heapUsed, setHeapUsed] = useState<string | null>(null);

  useEffect(() => {
    const perf = typeof performance !== "undefined" ? (performance as Performance & { memory?: { usedJSHeapSize?: number } }) : undefined;
    const used = perf?.memory?.usedJSHeapSize;
    setHeapUsed(used !== undefined ? formatBytes(used, unitKB, unitMB) : null);
  }, [unitKB, unitMB]);

  const handleClearCache = () => {
    setClearingCache(true);
    (async () => {
      try {
        sessionStorage.clear();
      } catch {}
      try {
        if (typeof window !== "undefined" && "caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {}
      setClearingCache(false);
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 3000);
    })();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Live System Diagnostics Card */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-muted)]">{i18n("sPerfMemory", "Mémoire UI")}</span>
            <Icon name="cpu" className="h-4 w-4 text-[var(--accent-primary)]" />
          </div>
          <p className="mt-2 text-base font-bold text-[var(--text-primary)]">{heapUsed ?? "N/A"}</p>
          <span className="text-[10px] text-[var(--text-muted)]">{heapUsed ? i18n("sPerfHeapUsed", "Heap JS utilisé") : i18n("sPerfHeapNA", "Non disponible sur ce navigateur")}</span>
        </div>

        <div className="flex flex-col rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-muted)]">{i18n("sPerfRender", "Rendu Écran")}</span>
            <Icon name="monitor" className="h-4 w-4 text-[var(--info)]" />
          </div>
          <p className="mt-2 text-base font-bold text-[var(--text-primary)]">{measuredFps ? `~${measuredFps} FPS` : i18n("sPerfMeasuring", "Mesure...")}</p>
          <span className="text-[10px] text-[var(--text-muted)]">{i18n("sPerfRefreshRate", "Fréquence d'affichage mesurée")}</span>
        </div>

        <div className="flex flex-col rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-muted)]">{i18n("sPerfAudio", "Audio Web API")}</span>
            <Icon name="speaker-high" className="h-4 w-4 text-[var(--accent-secondary)]" />
          </div>
          <p className="mt-2 text-base font-bold text-[var(--text-primary)]">{audioEnabled ? i18n("sPerfActive", "Actif") : i18n("sPerfDisabled", "Désactivé")}</p>
          <span className="text-[10px] text-[var(--text-muted)]">{audioEnabled ? i18n("sPerfSynthAvailable", "Synthétiseur disponible") : i18n("sPerfSoundsOff", "Sons désactivés dans les réglages")}</span>
        </div>

        <div className="flex flex-col rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-muted)]">{i18n("sPerfStorage", "Stockage local")}</span>
            <Icon name="hard-drive" className="h-4 w-4 text-[var(--warning)]" />
          </div>
          <p className="mt-2 text-base font-bold text-[var(--text-primary)]">{localStorageBytes !== null ? formatBytes(localStorageBytes, unitKB, unitMB) : "N/A"}</p>
          <span className="text-[10px] text-[var(--text-muted)]">{i18n("sPerfStorageUsed", "localStorage utilisé")}</span>
        </div>
      </div>

      {/* Mode de performance */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {i18n("sPerfProfile", "Profil de rendu & économie")}
        </h4>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div
            onClick={() => update({ performanceMode: "normal" })}
            className={cn(
              "flex cursor-pointer flex-col gap-1.5 rounded-[var(--panel-radius)] border p-4 transition-all",
              settings.performanceMode === "normal"
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/[0.08] shadow-md"
                : "border-[var(--panel-border)] bg-[var(--panel-bg)] hover:border-[var(--accent-primary)]/40"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {i18n("sPerfModeStandard", "Mode Standard (Fidélité maximale)")}
              </span>
              <Icon name="sparkles" className="h-4 w-4 text-[var(--accent-primary)]" />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {i18n("sPerfModeStandardDesc", "Effets de flou d'arrière-plan, transparence, halos et micro-animations complètes.")}
            </p>
          </div>

          <div
            onClick={() => update({ performanceMode: "low" })}
            className={cn(
              "flex cursor-pointer flex-col gap-1.5 rounded-[var(--panel-radius)] border p-4 transition-all",
              settings.performanceMode === "low"
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/[0.08] shadow-md"
                : "border-[var(--panel-border)] bg-[var(--panel-bg)] hover:border-[var(--accent-primary)]/40"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {i18n("sPerfModeEco", "Mode Économique (Haute performance)")}
              </span>
              <Icon name="battery-charging" className="h-4 w-4 text-[var(--warning)]" />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {i18n("sPerfModeEcoDesc", "Désactive les shaders lourds et réduit la charge CPU/GPU pour économiser la batterie.")}
            </p>
          </div>
        </div>
      </div>

      {/* Background Quality and Cache Management */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <label className="text-sm font-semibold text-[var(--text-primary)]">
            {i18n("sPerfBgQuality", "Qualité des fonds & auras")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "high", label: i18n("sPerfQHigh", "Élevée (Shaders)") },
                { id: "balanced", label: i18n("sPerfQBalanced", "Équilibrée") },
                { id: "low", label: i18n("sPerfQLow", "Économique") },
                { id: "static", label: i18n("sPerfQStatic", "Statique") },
              ] as const
            ).map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => update({ backgroundQuality: q.id })}
                className={cn(
                  "rounded-xl py-2 px-3 text-xs font-semibold transition-all",
                  settings.backgroundQuality === q.id
                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-md"
                    : "bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {i18n("sPerfClearCache", "Nettoyer le cache local")}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {i18n("sPerfClearCacheDesc", "Supprime les données temporaires sans toucher à vos préférences ou notes")}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClearCache}
            disabled={clearingCache}
            className="flex items-center justify-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)] py-2 px-4 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50 transition-all active:scale-95"
          >
            <Icon name="trash" className="h-4 w-4 text-[var(--danger)]" />
            {clearingCache ? i18n("sPerfClearing", "Nettoyage en cours...") : cacheCleared ? i18n("sPerfCleared", "✓ Cache nettoyé") : i18n("sPerfClearBtn", "Vider le cache")}
          </button>
        </div>
      </div>
    </div>
  );
}
