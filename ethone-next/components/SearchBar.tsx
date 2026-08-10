"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useCommandPalette } from "@/components/CommandPaletteProvider";

export default function SearchBar() {
  const [focused, setFocused] = useState(false);
  const i18n = useI18n();
  const { setOpen } = useCommandPalette();

  return (
    <motion.button
      type="button"
      onClick={() => setOpen(true)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      animate={{
        width: focused ? 320 : 160,
        borderRadius: 9999,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex h-10 items-center gap-2 border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)] focus:border-[var(--accent)] focus:text-[var(--foreground)]"
    >
      <Icon name="search" className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1 truncate text-left">{i18n("search")}</span>
      <kbd className="hidden rounded bg-[var(--surface-raised)] px-1.5 py-0.5 text-[10px] text-[var(--muted)] sm:block">
        <Icon name="command" className="inline h-3 w-3" />
        K
      </kbd>
    </motion.button>
  );
}
