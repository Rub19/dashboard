"use client";

import { Brain, CheckCircle2, ThumbsUp, ThumbsDown, ShieldCheck, Sparkles } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ToastProvider";
import type { MarketplaceItem } from "@/lib/marketplace/marketplace-registry";
import type { BrainMatchResult } from "@/lib/marketplace/brain-recommendation-engine";

interface MarketplaceWhyBrainDrawerProps {
  item: MarketplaceItem | null;
  match: BrainMatchResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MarketplaceWhyBrainDrawer({
  item,
  match,
  isOpen,
  onClose,
}: MarketplaceWhyBrainDrawerProps) {
  const { success } = useToast();

  if (!item || !match) return null;

  const handleFeedback = (type: "useful" | "not-interested") => {
    if (type === "useful") {
      success("Merci ! Brain adaptera vos futures recommandations.");
    } else {
      success("Recommandation notée. Moins d'éléments similaires seront proposés.");
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="md"
      hideFooter
    >
      <div className="space-y-5 p-1">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--panel-border)]/60 pb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-purple-500/40 bg-purple-950/40 text-purple-300 shadow-md">
            <Brain className="h-6 w-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Pourquoi ETHONE vous recommande ceci ?</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Analyse cognitive en temps réel pour <strong className="text-white">{item.name}</strong>
            </p>
          </div>
        </div>

        {/* Brain Score Pill */}
        <div className="flex items-center justify-between rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4">
          <div>
            <span className="text-xs font-semibold text-purple-300">Score de Compatibilité Brain</span>
            <p className="text-[11px] text-purple-200/70 mt-0.5">{match.compatibilityText}</p>
          </div>
          <div className="text-2xl font-black text-purple-300">
            {match.score}%
          </div>
        </div>

        {/* Reasons Checklist */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
            Critères retenus par le modèle
          </h4>

          <div className="space-y-2">
            {match.reasons.map((reason, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-3 text-xs text-[var(--text-primary)]"
              >
                <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{reason.replace(/^✓\s*/, "")}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Note */}
        <div className="rounded-xl border border-sky-500/20 bg-sky-950/10 p-3 text-[11px] text-sky-200/80 leading-relaxed flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-sky-400 shrink-0" />
          <span>
            Le Brain calcule ces critères localement à partir de vos réglages et activités, sans transmettre vos données privées à des tiers.
          </span>
        </div>

        {/* Feedback Bar */}
        <div className="pt-3 border-t border-[var(--panel-border)]/60 flex items-center justify-between gap-3 text-xs">
          <span className="text-[var(--text-muted)] font-medium">Cette recommandation est-elle utile ?</span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleFeedback("useful")}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-900/40 px-3 py-1.5 font-semibold text-emerald-300 transition-colors cursor-pointer"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              <span>Pertinente</span>
            </button>

            <button
              type="button"
              onClick={() => handleFeedback("not-interested")}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] px-3 py-1.5 font-semibold text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              <span>Pas utile</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
