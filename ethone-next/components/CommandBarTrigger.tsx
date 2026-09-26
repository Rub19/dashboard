"use client";

import { Search } from "@/components/icons/ph";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useModKey } from "@/lib/hooks/useModKey";
import { cn } from "@/lib/utils";

export default function CommandBarTrigger({ className, variant = "button" }: { className?: string; variant?: "button" | "field" }) {
  const { setOpen } = useCommandPalette();
  const mod = useModKey();
  const shortcut = mod === "⌘" ? "⌘K" : "Ctrl K";

  if (variant === "field") {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Recherche et commandes (${shortcut})`}
        className={cn("ethone-search-field select-none", className)}
      >
        <Search className="h-4 w-4 shrink-0 pointer-events-none" />
        <span className="min-w-0 flex-1 truncate text-left">Rechercher une page, une action, un serveur…</span>
        <kbd className="hidden shrink-0 items-center rounded-md bg-[var(--menu-kbd-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)] sm:inline-flex">
          {shortcut}
        </kbd>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`Recherche et commandes (${shortcut})`}
      className={cn(
        "flex h-9 items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 px-3 text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer select-none shadow-sm",
        className
      )}
    >
      <Search className="h-3.5 w-3.5 pointer-events-none" />
      <span className="hidden xl:inline text-xs font-medium">Rechercher</span>
      <kbd className="hidden sm:inline-flex items-center rounded-md border border-[var(--panel-border)]/80 bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
        {shortcut}
      </kbd>
    </button>
  );
}
