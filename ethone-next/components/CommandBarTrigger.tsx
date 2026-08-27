"use client";

import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export default function CommandBarTrigger({ className }: { className?: string }) {
  const { setOpen } = useCommandPalette();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Recherche et Commandes (⌘K)"
      className={cn(
        "flex h-9 items-center gap-2 rounded-xl border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 px-3 text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer select-none shadow-sm",
        className
      )}
    >
      <Icon name="magnifying-glass" className="h-3.5 w-3.5 pointer-events-none" />
      <span className="hidden xl:inline text-xs font-medium">Rechercher</span>
      <kbd className="hidden sm:inline-flex items-center rounded-md border border-[var(--panel-border)]/80 bg-[var(--surface-raised)] px-1.5 py-0.2 font-mono text-[10px] text-[var(--text-muted)]">
        ⌘K
      </kbd>
    </button>
  );
}
