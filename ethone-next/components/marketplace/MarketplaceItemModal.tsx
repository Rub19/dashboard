"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Star,
  Download,
  Check,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Layers,
  Lock,
  Plug,
  Calendar,
  Sparkles,
  Trash2,
  Loader2,
  Layout,
  RefreshCw,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { MarketplaceItem } from "@/lib/marketplace/marketplace-registry";
import type { BrainMatchResult } from "@/lib/marketplace/brain-recommendation-engine";

interface MarketplaceItemModalProps {
  item: MarketplaceItem | null;
  isOpen: boolean;
  onClose: () => void;
  brainMatch?: BrainMatchResult;
  isInstalled: boolean;
  hasUpdate: boolean;
  onInstall: (item: MarketplaceItem, workspace: string) => Promise<void>;
  onUninstall: (item: MarketplaceItem) => Promise<void>;
  onUpdate: (itemId: string) => Promise<void>;
}

export default function MarketplaceItemModal({
  item,
  isOpen,
  onClose,
  brainMatch,
  isInstalled,
  hasUpdate,
  onInstall,
  onUninstall,
  onUpdate,
}: MarketplaceItemModalProps) {
  const router = useRouter();
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("all");
  const [installPhase, setInstallPhase] = useState<string | null>(null);

  if (!item) return null;

  const handleInstallClick = async () => {
    setInstallPhase("Vérification des dépendances...");
    await new Promise((r) => setTimeout(r, 400));
    setInstallPhase("Attribution des permissions...");
    await new Promise((r) => setTimeout(r, 400));
    setInstallPhase("Intégration au système...");
    await onInstall(item, selectedWorkspace);
    setInstallPhase(null);
  };

  const handleUpdateClick = async () => {
    setInstallPhase("Mise à jour...");
    await onUpdate(item.id);
    setInstallPhase(null);
  };

  const handleUninstallClick = async () => {
    await onUninstall(item);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="lg"
      hideFooter
    >
      <div className="space-y-6 p-1 sm:p-2">
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--panel-border)]/60 pb-5">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[var(--panel-border)] shadow-md",
                item.iconBg || "bg-[var(--panel-bg)] text-[var(--accent-primary)]"
              )}
            >
              <Icon name={item.icon} className="h-8 w-8" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{item.name}</h2>
                <span className="rounded-md border border-[var(--panel-border)]/60 bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
                  v{item.version}
                </span>
              </div>

              <div className="mt-1 flex items-center gap-3 text-xs text-[var(--text-muted)] flex-wrap">
                <span>Par <strong className="text-[var(--text-primary)]">{item.author}</strong></span>
                <span>•</span>
                <div className="flex items-center gap-1 text-amber-400 font-semibold">
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                  <span>{item.rating.toFixed(1)}</span>
                  <span className="text-[var(--text-muted)] font-normal">({item.reviewCount} avis)</span>
                </div>
                <span>•</span>
                <span>{item.installCount.toLocaleString()} installations</span>
              </div>
            </div>
          </div>

          {brainMatch && (
            <div className="shrink-0 flex flex-col items-end">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-950/40 px-2.5 py-1 text-xs font-bold text-purple-300 shadow-xs">
                <span>🧠 {brainMatch.score}% Match Brain</span>
              </span>
              <span className="text-[10px] text-purple-300/80 mt-1">
                {brainMatch.compatibilityText}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            À propos
          </h3>
          <p className="text-sm leading-relaxed text-[var(--text-primary)]">
            {item.longDescription || item.description}
          </p>
        </div>

        {/* Layout Simulation & Interactive Preview */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
            <Layout className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
            <span>Aperçu de simulation dans votre Home</span>
          </h3>

          <div className="relative overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/80 p-4 shadow-inner">
            <div className="text-[11px] text-[var(--text-muted)] mb-2 flex items-center justify-between">
              <span>Grille Home 12 colonnes (Preview)</span>
              <span className="text-emerald-400 font-medium">Impact performance : {item.compatibility.performanceImpact}</span>
            </div>

            {/* Simulated 12-col layout */}
            <div className="grid grid-cols-12 gap-2 h-24">
              <div className="col-span-4 rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--surface-raised)]/30 flex items-center justify-center text-[10px] text-[var(--text-muted)]">
                Widget existant
              </div>
              <div className="col-span-4 rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--surface-raised)]/30 flex items-center justify-center text-[10px] text-[var(--text-muted)]">
                Widget existant
              </div>

              {/* Placed Target Widget */}
              <div
                className={cn(
                  "col-span-4 rounded-xl border-2 border-dashed border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 flex flex-col items-center justify-center gap-1 text-[11px] font-bold text-[var(--accent-primary)] animate-pulse p-1 text-center"
                )}
              >
                <Icon name={item.icon} className="h-4 w-4" />
                <span className="truncate max-w-full">{item.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features Checklist */}
        {item.features && item.features.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Fonctionnalités incluses</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {item.features.map((feat, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-xl border border-[var(--panel-border)]/50 bg-[var(--surface-raised)]/40 p-2 text-xs text-[var(--text-primary)]"
                >
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Permissions & Security (Least Privilege) */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-sky-400" />
            <span>Permissions requises (Moindre privilège)</span>
          </h3>

          {item.permissions.length === 0 ? (
            <p className="text-xs text-emerald-400/90 font-medium">
              ✓ Aucune permission spéciale requise. Ce module fonctionne en bac à sable isolé.
            </p>
          ) : (
            <div className="space-y-1.5">
              {item.permissions.map((perm) => (
                <div
                  key={perm.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--panel-border)]/50 bg-[var(--surface-raised)]/40 px-3 py-2 text-xs"
                >
                  <div>
                    <strong className="text-[var(--text-primary)]">{perm.name}</strong>
                    <p className="text-[11px] text-[var(--text-muted)]">{perm.description}</p>
                  </div>
                  <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 uppercase">
                    {perm.level}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dependencies Check */}
        {item.dependencies.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
              <Plug className="h-3.5 w-3.5 text-amber-400" />
              <span>Dépendances & Intégrations requises</span>
            </h3>

            <div className="space-y-2">
              {item.dependencies.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-950/15 p-3 text-xs"
                >
                  <div>
                    <strong className="text-amber-200">{dep.name}</strong>
                    <p className="text-[11px] text-amber-300/70">{dep.description}</p>
                  </div>

                  {dep.connectRoute && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        router.push(dep.connectRoute!);
                      }}
                      className="shrink-0 flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-200 transition-colors cursor-pointer"
                    >
                      <span>Connecter</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workspace Selector */}
        {!isInstalled && (
          <div className="rounded-2xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/30 p-3">
            <label className="text-xs font-bold text-[var(--text-primary)] block mb-1.5">
              Destination d'installation
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { id: "all", label: "Tous les Espaces (Global)" },
                { id: "personal", label: "Espace Personnel" },
                { id: "studio", label: "Espace Studio (Dev)" },
                { id: "gaming", label: "Espace Gaming" },
              ].map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => setSelectedWorkspace(ws.id)}
                  className={cn(
                    "rounded-xl p-2 text-center border font-medium transition-all cursor-pointer",
                    selectedWorkspace === ws.id
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-semibold shadow-xs"
                      : "border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-white"
                  )}
                >
                  {ws.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[var(--panel-border)]/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
          >
            Fermer
          </button>

          <div className="flex items-center gap-2">
            {isInstalled ? (
              <>
                {hasUpdate && (
                  <button
                    type="button"
                    onClick={handleUpdateClick}
                    disabled={Boolean(installPhase)}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 px-4 py-2 text-xs font-bold text-amber-200 transition-all cursor-pointer shadow-xs"
                  >
                    {installPhase ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span>Mettre à jour v{item.version}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleUninstallClick}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-950/40 px-4 py-2 text-xs font-bold text-rose-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Désinstaller</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={Boolean(installPhase)}
                className="flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] hover:opacity-90 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                {installPhase ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{installPhase}</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Installer l'extension</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
