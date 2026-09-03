"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, History, ArrowUpRight, Loader2, Sparkles } from "lucide-react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { MarketplaceItem } from "@/lib/marketplace/marketplace-registry";
import type { InstalledExtensionRecord } from "@/lib/marketplace/marketplace-store";

interface MarketplaceUpdatesViewProps {
  updates: Array<{ item: MarketplaceItem; record: InstalledExtensionRecord }>;
  onUpdateOne: (itemId: string) => Promise<boolean>;
  onUpdateAll: () => Promise<void>;
  onRollback: (itemId: string) => Promise<boolean>;
}

export default function MarketplaceUpdatesView({
  updates,
  onUpdateOne,
  onUpdateAll,
  onRollback,
}: MarketplaceUpdatesViewProps) {
  const [updatingAll, setUpdatingAll] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdateAllClick = async () => {
    setUpdatingAll(true);
    try {
      await onUpdateAll();
    } finally {
      setUpdatingAll(false);
    }
  };

  const handleUpdateSingle = async (id: string) => {
    setUpdatingId(id);
    try {
      await onUpdateOne(id);
    } finally {
      setUpdatingId(null);
    }
  };

  if (updates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/30 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 mb-4 shadow-sm">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)]">Tout est à jour !</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm">
          Toutes vos extensions, widgets et thèmes installés bénéficient des dernières fonctionnalités et optimisations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-950/15 p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-200">
              {updates.length} mise{updates.length > 1 ? "s" : ""} à jour disponible{updates.length > 1 ? "s" : ""}
            </h4>
            <p className="text-xs text-amber-300/70">
              Améliorations de performance, nouveaux styles et correctifs de sécurité.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUpdateAllClick}
          disabled={updatingAll}
          className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-black shadow-sm transition-transform active:scale-95 cursor-pointer"
        >
          {updatingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          <span>Tout mettre à jour ({updates.length})</span>
        </button>
      </div>

      {/* Updates List */}
      <div className="space-y-3">
        {updates.map(({ item, record }) => {
          const isUpdating = updatingId === item.id;

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-4 backdrop-blur-md space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--panel-border)]",
                      item.iconBg || "bg-[var(--panel-bg)] text-[var(--accent-primary)]"
                    )}
                  >
                    <Icon name={item.icon} className="h-6 w-6" />
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--text-muted)]">
                      <span>Installé : <code className="text-zinc-400">v{record.version}</code></span>
                      <span>→</span>
                      <span>Disponible : <code className="text-amber-300 font-semibold">v{item.version}</code></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {record.previousVersion && (
                    <button
                      type="button"
                      onClick={() => onRollback(item.id)}
                      className="flex items-center gap-1 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                      title="Restaurer la version précédente"
                    >
                      <History className="h-3.5 w-3.5" />
                      <span>Rollback</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleUpdateSingle(item.id)}
                    disabled={isUpdating}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 px-3.5 py-1.5 text-xs font-bold text-amber-200 transition-all cursor-pointer shadow-xs"
                  >
                    {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    <span>Mettre à jour</span>
                  </button>
                </div>
              </div>

              {/* Changelog Highlights */}
              {item.changelog && item.changelog.length > 0 && (
                <div className="rounded-xl border border-[var(--panel-border)]/50 bg-[var(--panel-bg)]/50 p-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Nouveautés dans la v{item.version} :
                  </span>
                  <ul className="space-y-1 text-xs text-[var(--text-primary)]">
                    {item.changelog.map((log, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="text-amber-400">•</span>
                        <span>{log}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
