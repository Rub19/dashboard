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
      className="flex h-11 min-w-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-zinc-400 shadow-sm transition-all hover:bg-white/[0.08] hover:text-zinc-200 active:scale-95 cursor-pointer select-none"
      aria-label={i18n("commands")}
    >
      <Search className="h-5 w-5 pointer-events-none" />
      <span className="hidden sm:inline">{i18n("commands")}</span>
      <kbd className="pointer-events-none rounded border border-white/10 bg-white/[0.08] px-1.5 py-0.5 text-[11px] font-mono text-zinc-300">
        <span className="mr-0.5">⌘</span>K
      </kbd>
    </button>
  );
}
