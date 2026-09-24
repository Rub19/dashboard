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
          className="inline-flex h-9 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 px-3 text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--accent-primary)]/10 hover:text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          <Icon name="heart" className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
          <span className="hidden xl:inline">Soutenir</span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="ethone-menu w-[300px] max-w-[calc(100vw-2rem)] overflow-hidden p-4">
        <div className="flex select-none flex-col gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Soutenir ETHONE</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
              Projet indépendant et sans publicité. Votre soutien finance les serveurs et le développement.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <a
              href={STRIPE_DONATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--accent-contrast)] transition-opacity hover:opacity-90"
            >
              <Icon name="coffee" className="h-4 w-4" />
              <span>Faire un don</span>
            </a>
            <button type="button" onClick={handleCopyLink} className="ethone-menu-item justify-center text-xs">
              <Icon name="share-network" className="h-3.5 w-3.5" />
              <span>Copier le lien du projet</span>
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
