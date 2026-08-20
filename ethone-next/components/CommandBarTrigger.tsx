"use client";

import { Search } from "lucide-react";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useI18n } from "@/lib/hooks/useI18n";

export default function CommandBarTrigger() {
  const i18n = useI18n();
  const { setOpen } = useCommandPalette();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex h-9 items-center gap-2 rounded-full border border-[var(--text-primary)]/[0.08] bg-[var(--surface)]/80 px-3.5 text-sm text-[var(--muted)] transition-all hover:border-[var(--text-primary)]/20 hover:text-[var(--text-primary)] active:scale-95 cursor-pointer select-none"
      aria-label={i18n("commands")}
    >
      <Search className="pointer-events-none h-5 w-5" />
      <span className="pointer-events-none hidden sm:inline">{i18n("commands")}</span>
      <kbd className="pointer-events-none select-none rounded border border-white/10 bg-white/[0.08] px-1.5 py-0.5 text-[11px] font-mono text-zinc-300">
        <span className="pointer-events-none select-none mr-0.5">⌘</span>
        <span className="pointer-events-none select-none">K</span>
      </kbd>
    </button>
  );
}
