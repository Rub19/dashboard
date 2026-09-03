"use client";

import { useState } from "react";
import {
  Star,
  Download,
  Check,
  MoreVertical,
  Brain,
  ShieldCheck,
  Flame,
  Award,
  Zap,
  Sparkles,
  Heart,
  Bookmark,
  Trash2,
  ExternalLink,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { MarketplaceItem, VerificationTier } from "@/lib/marketplace/marketplace-registry";
import type { BrainMatchResult } from "@/lib/marketplace/brain-recommendation-engine";
import {
  AnimatedDropdown,
  AnimatedDropdownTrigger,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
  AnimatedDropdownSeparator,
} from "@/components/ui/AnimatedDropdown";

interface MarketplaceCardProps {
  item: MarketplaceItem;
  brainMatch?: BrainMatchResult;
  isInstalled: boolean;
  isFavorite: boolean;
  isSaved: boolean;
  hasUpdate: boolean;
  onSelect: (item: MarketplaceItem) => void;
  onInstall: (item: MarketplaceItem) => Promise<void>;
  onUninstall: (item: MarketplaceItem) => Promise<void>;
  onToggleFavorite: (itemId: string) => void;
  onToggleSaved: (itemId: string) => void;
  onWhyBrain: (item: MarketplaceItem, match: BrainMatchResult) => void;
}

function renderVerificationBadge(tier: VerificationTier) {
  switch (tier) {
    case "verified":
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
          <ShieldCheck className="h-3 w-3" />
          <span>Vérifié ETHONE</span>
        </span>
      );
    case "audited":
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
          <Award className="h-3 w-3" />
          <span>Sécurité Auditée</span>
        </span>
      );
    case "optimized":
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-fuchsia-500/30 bg-fuchsia-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-300">
          <Zap className="h-3 w-3" />
          <span>Optimisé</span>
        </span>
      );
    case "trending":
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
          <Flame className="h-3 w-3" />
          <span>Tendance</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-zinc-700/50 bg-zinc-900/40 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
          <span>Communauté</span>
        </span>
      );
  }
}

export default function MarketplaceCard({
  item,
  brainMatch,
  isInstalled,
  isFavorite,
  isSaved,
  hasUpdate,
  onSelect,
  onInstall,
  onUninstall,
  onToggleFavorite,
  onToggleSaved,
  onWhyBrain,
}: MarketplaceCardProps) {
  const [installing, setInstalling] = useState(false);

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (installing) return;
    setInstalling(true);
    try {
      await onInstall(item);
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstallClick = async () => {
    await onUninstall(item);
  };

  return (
    <div
      onClick={() => onSelect(item)}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 hover:bg-[var(--surface-raised)]/90 p-4 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-[var(--panel-border)] hover:shadow-md cursor-pointer"
    >
      {/* Top Bar: Icon + Verified Badge + Brain Score */}
      <div>
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--panel-border)] shadow-xs",
                item.iconBg || "bg-[var(--panel-bg)] text-[var(--accent-primary)]"
              )}
            >
              <Icon name={item.icon} className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                {item.name}
              </h3>
              <p className="truncate text-[11px] text-[var(--text-muted)] font-medium">
                {item.author}
              </p>
            </div>
          </div>

          {/* Brain Match Pill */}
          {brainMatch && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onWhyBrain(item, brainMatch);
              }}
              title="Voir pourquoi cette recommandation a été choisie par Brain"
              className="shrink-0 flex items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-950/40 px-2 py-0.5 text-[11px] font-bold text-purple-300 hover:bg-purple-900/60 transition-colors shadow-xs"
            >
              <Brain className="h-3 w-3" />
              <span>{brainMatch.score}%</span>
            </button>
          )}
        </div>

        {/* Badges Bar */}
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
          {renderVerificationBadge(item.verification)}
          <span className="rounded-md border border-[var(--panel-border)]/50 bg-[var(--panel-bg)]/40 px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] capitalize">
            {item.type}
          </span>
        </div>

        {/* Description */}
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
          {item.description}
        </p>
      </div>

      {/* Meta + Action Footer */}
      <div className="mt-4 pt-3 border-t border-[var(--panel-border)]/40 flex items-center justify-between gap-2">
        {/* Rating & Installs */}
        <div className="flex items-center gap-2.5 text-[11px] font-medium text-[var(--text-muted)]">
          <div className="flex items-center gap-1 text-amber-400 font-semibold">
            <Star className="h-3 w-3 fill-amber-400" />
            <span>{item.rating.toFixed(1)}</span>
          </div>
          <span>•</span>
          <span>{item.installCount > 1000 ? `${(item.installCount / 1000).toFixed(1)}k` : item.installCount} installs</span>
        </div>

        {/* Buttons & Menu */}
        <div className="flex items-center gap-1.5">
          {isInstalled ? (
            hasUpdate ? (
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={installing}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1.5 text-xs font-semibold text-amber-300 shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                {installing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>Mettre à jour</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(item);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Installé</span>
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={installing}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] hover:opacity-90 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              {installing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Installer</span>
            </button>
          )}

          {/* AnimatedDropdown Contextual Menu */}
          <div onClick={(e) => e.stopPropagation()}>
            <AnimatedDropdown>
              <AnimatedDropdownTrigger className="h-7 w-7 p-0 rounded-lg text-[var(--text-muted)] hover:text-white bg-transparent shadow-none">
                <MoreVertical className="h-3.5 w-3.5" />
              </AnimatedDropdownTrigger>

              <AnimatedDropdownContent side="bottom" align="end" sideOffset={4} className="min-w-[170px]">
                <AnimatedDropdownItem
                  icon={<ExternalLink className="h-3.5 w-3.5" />}
                  onClick={() => onSelect(item)}
                >
                  Voir les détails
                </AnimatedDropdownItem>

                {brainMatch && (
                  <AnimatedDropdownItem
                    icon={<Brain className="h-3.5 w-3.5 text-purple-400" />}
                    onClick={() => onWhyBrain(item, brainMatch)}
                  >
                    Pourquoi ce choix ?
                  </AnimatedDropdownItem>
                )}

                <AnimatedDropdownSeparator />

                <AnimatedDropdownItem
                  icon={<Heart className={cn("h-3.5 w-3.5", isFavorite && "fill-rose-500 text-rose-500")} />}
                  onClick={() => onToggleFavorite(item.id)}
                >
                  {isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                </AnimatedDropdownItem>

                <AnimatedDropdownItem
                  icon={<Bookmark className={cn("h-3.5 w-3.5", isSaved && "fill-sky-500 text-sky-500")} />}
                  onClick={() => onToggleSaved(item.id)}
                >
                  {isSaved ? "Ne plus garder" : "Sauvegarder"}
                </AnimatedDropdownItem>

                {isInstalled && (
                  <>
                    <AnimatedDropdownSeparator />
                    <AnimatedDropdownItem
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      variant="danger"
                      onClick={handleUninstallClick}
                    >
                      Désinstaller
                    </AnimatedDropdownItem>
                  </>
                )}
              </AnimatedDropdownContent>
            </AnimatedDropdown>
          </div>
        </div>
      </div>
    </div>
  );
}
