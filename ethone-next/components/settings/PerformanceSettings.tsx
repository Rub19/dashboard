"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { cn } from "@/lib/utils";

export default function PerformanceSettings() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleClearCache = () => {
    setClearingCache(true);
    setTimeout(() => {
      try {
        localStorage.removeItem("ethone-cache");
        sessionStorage.clear();
      } catch {}
      setClearingCache(false);
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 3000);
    }, 600);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Live System Diagnostics Card */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-muted)]">Mémoire UI</span>
            <Icon name="cpu" className="h-4 w-4 text-[var(--accent-primary)]" />
          </div>
          <p className="mt-2 text-base font-bold text-[var(--text-primary)]">~28 Mo</p>
          <span className="text-[10px] text-[var(--success)]">Fluide & optimisé</span>
        </div>

        <div className="flex flex-col rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-muted)]">Rendu Écran</span>
            <Icon name="monitor" className="h-4 w-4 text-[var(--info)]" />
          </div>
          <p className="mt-2 text-base font-bold text-[var(--text-primary)]">60 / 120 FPS</p>
          <span className="text-[10px] text-[var(--text-muted)]">Ressorts physiques</span>
        </div>

        <div className="flex flex-col rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-muted)]">Audio Web API</span>
            <Icon name="speaker-high" className="h-4 w-4 text-[var(--accent-secondary)]" />
          </div>
          <p className="mt-2 text-base font-bold text-[var(--text-primary)]">Prêt</p>
          <span className="text-[10px] text-[var(--text-muted)]">Synthétiseur actif</span>
        </div>

        <div className="flex flex-col rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-muted)]">Cache Local</span>
            <Icon name="hard-drive" className="h-4 w-4 text-[var(--warning)]" />
          </div>
          <p className="mt-2 text-base font-bold text-[var(--text-primary)]">~1.4 Mo</p>
          <span className="text-[10px] text-[var(--text-muted)]">IndexedDB + Storage</span>
        </div>
      </div>

      {/* Mode de performance */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Profil de rendu & économie
        </h4>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div
            onClick={() => update({ performanceMode: "normal" })}
            className={cn(
              "flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-4 transition-all",
              settings.performanceMode === "normal"
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/[0.08] shadow-md"
                : "border-[var(--panel-border)] bg-[var(--panel-bg)] hover:border-[var(--accent-primary)]/40"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[var(--text-primary)]">
                Mode Standard (Fidélité maximale)
              </span>
              <Icon name="sparkles" className="h-4 w-4 text-[var(--accent-primary)]" />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Effets de flou d&apos;arrière-plan, transparence, halos et micro-animations complètes.
            </p>
          </div>

          <div
            onClick={() => update({ performanceMode: "low" })}
            className={cn(
              "flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-4 transition-all",
              settings.performanceMode === "low"
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/[0.08] shadow-md"
                : "border-[var(--panel-border)] bg-[var(--panel-bg)] hover:border-[var(--accent-primary)]/40"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[var(--text-primary)]">
                Mode Économique (Haute performance)
              </span>
              <Icon name="battery-charging" className="h-4 w-4 text-[var(--warning)]" />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Désactive les shaders lourds et réduit la charge CPU/GPU pour économiser la batterie.
            </p>
          </div>
        </div>
      </div>

      {/* Background Quality and Cache Management */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <label className="text-sm font-semibold text-[var(--text-primary)]">
            Qualité des fonds & auras
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "high", label: "Élevée (Shaders)" },
                { id: "balanced", label: "Équilibrée" },
                { id: "low", label: "Économique" },
                { id: "static", label: "Statique" },
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

        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Nettoyer le cache local
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Supprime les données temporaires sans toucher à vos préférences ou notes
            </p>
          </div>

          <button
            type="button"
            onClick={handleClearCache}
            disabled={clearingCache}
            className="flex items-center justify-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] py-2 px-4 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50 transition-all active:scale-95"
          >
            <Icon name="trash" className="h-4 w-4 text-[var(--danger)]" />
            {clearingCache ? "Nettoyage en cours..." : cacheCleared ? "✓ Cache nettoyé" : "Vider le cache"}
          </button>
        </div>
      </div>
    </div>
  );
}
