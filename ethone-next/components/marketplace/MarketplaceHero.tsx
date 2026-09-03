"use client";

import { useMemo } from "react";
import { Sparkles, Brain, ArrowRight, ShieldCheck, Download, Star } from "lucide-react";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
import { cn } from "@/lib/utils";
import type { MarketplaceItem } from "@/lib/marketplace/marketplace-registry";
import type { BrainMatchResult } from "@/lib/marketplace/brain-recommendation-engine";

interface MarketplaceHeroProps {
  workspace: string;
  recommendations: Array<{ item: MarketplaceItem; match: BrainMatchResult }>;
  installedCount: number;
  updatesCount: number;
  onSelectItem: (item: MarketplaceItem) => void;
  onViewBrainDrawer: (item: MarketplaceItem, match: BrainMatchResult) => void;
}

export default function MarketplaceHero({
  workspace,
  recommendations,
  installedCount,
  updatesCount,
  onSelectItem,
  onViewBrainDrawer,
}: MarketplaceHeroProps) {
  const identity = useUserIdentity();
  const userName = identity?.displayName || "Compte";

  const topPick = recommendations[0];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--panel-border)]/80 bg-gradient-to-br from-[var(--surface-raised)]/90 via-[var(--panel-bg)]/80 to-[var(--surface-raised)]/40 p-5 sm:p-7 shadow-lg backdrop-blur-xl">
      {/* Background Subtle Glow */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--accent-primary)]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left: Dynamic Greetings */}
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1 text-xs font-semibold text-[var(--accent-primary)] shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>ETHONE App Store & Ecosystem</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--panel-border)]" />
            <span className="text-[var(--text-muted)] capitalize">Espace {workspace}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Explorez ce qui fera progresser votre ETHONE.
          </h2>

          <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
            Widgets 3D, thèmes sur-mesure, automatisations et modules d'IA recommandés intelligemment selon vos habitudes de travail.
          </p>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 pt-2 text-xs font-medium text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                <strong className="text-[var(--text-primary)]">{installedCount}</strong> installés
              </span>
            </div>
            {updatesCount > 0 && (
              <div className="flex items-center gap-1.5 text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span>
                  <strong>{updatesCount}</strong> mise{updatesCount > 1 ? "s" : ""} à jour disponible{updatesCount > 1 ? "s" : ""}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
              <span>100% Sécurisé & Audité</span>
            </div>
          </div>
        </div>

        {/* Right: Brain Highlight Banner */}
        {topPick && (
          <div className="shrink-0 w-full lg:w-80 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 backdrop-blur-md shadow-md">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-900/40 px-2 py-0.5 text-[11px] font-bold text-purple-200">
                <Brain className="h-3.5 w-3.5 text-purple-300" />
                <span>🧠 {topPick.match.score}% Match Brain</span>
              </span>

              <button
                type="button"
                onClick={() => onViewBrainDrawer(topPick.item, topPick.match)}
                className="text-[11px] font-medium text-purple-300 hover:text-white underline cursor-pointer"
              >
                Pourquoi ?
              </button>
            </div>

            <h4 className="text-sm font-bold text-white truncate">{topPick.item.name}</h4>
            <p className="mt-1 line-clamp-2 text-xs text-purple-200/80 leading-relaxed">
              {topPick.match.highlightedBenefit}
            </p>

            <button
              type="button"
              onClick={() => onSelectItem(topPick.item)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-3 py-2 text-xs font-semibold text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <span>Découvrir l'extension</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
