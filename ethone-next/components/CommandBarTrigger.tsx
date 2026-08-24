"use client";

import { Search } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useI18n } from "@/lib/hooks/useI18n";

export default function CommandBarTrigger(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const i18n = useI18n();
  const { setOpen } = useCommandPalette();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--text-primary)]/[0.08] bg-[var(--surface)]/80 text-[var(--text-muted)] transition-all hover:border-[var(--text-primary)]/20 hover:text-[var(--text-primary)] active:scale-95 cursor-pointer select-none md:h-9 md:w-auto md:rounded-full md:px-3.5"
      aria-label={i18n("commands")}
      {...props}
    >
      <Search className="pointer-events-none h-5 w-5" />
      <span className="pointer-events-none hidden md:inline md:ml-2 text-sm">{i18n("commands")}</span>
      <kbd className="pointer-events-none hidden md:inline-flex items-center gap-0.5 rounded border border-white/10 bg-[var(--text-primary)]/[0.08] px-1.5 py-0.5 text-[11px] font-mono text-[var(--text-primary)] md:ml-2">
        <span className="pointer-events-none select-none mr-0.5">⌘</span>
        <span className="pointer-events-none select-none">K</span>
      </kbd>
    </button>
  );
}
