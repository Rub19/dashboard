"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { STRIPE_DONATION_URL } from "@/lib/env";
import { useToast } from "@/components/ToastProvider";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/motion/Popover";

export default function SupportModal() {
  const [open, setOpen] = useState(false);
  const { success } = useToast();

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText("https://github.com/Rub19/dashboard");
      success("Lien copié dans le presse-papier !");
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      side="bottom"
      align="end"
      sideOffset={10}
      panelRadius={20}
      gooStrength={0}
    >
      <PopoverTrigger>
        <button
          type="button"
          aria-label="Soutenir ETHONE"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 px-3 text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--accent-primary)]/10 hover:text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          <Icon name="heart" className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
          <span className="hidden xl:inline">Soutenir</span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 p-4 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col gap-4 select-none">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-[var(--panel-border)]/50 pb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold">
              <Icon name="heart" className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Soutenir ETHONE OS
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Projet indépendant & open-source
              </p>
            </div>
          </div>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            ETHONE est conçu pour offrir une expérience numérique fluide, sombre, respectueuse de votre vie privée et sans publicité. Votre soutien permet de financer les serveurs et le développement continu.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <a
              href={STRIPE_DONATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] py-2.5 px-3 text-xs font-bold text-[var(--accent-contrast)] shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Icon name="coffee" className="h-4 w-4" />
              <span>Faire un don Stripe</span>
            </a>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] py-2 px-3 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all active:scale-[0.98]"
            >
              <Icon name="share-network" className="h-3.5 w-3.5" />
              <span>Partager le projet</span>
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
