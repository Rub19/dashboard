"use client";

import { memo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

/** Carte d'une section de réglages : en-tête avec icône, compteur de valeurs modifiées, repli animé. */
function SettingsSection({
  id,
  label,
  icon,
  children,
  modifiedCount,
  visible = true,
}: {
  id: string;
  label: string;
  icon: string;
  children: React.ReactNode;
  modifiedCount?: number;
  visible?: boolean;
}) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(true);
  if (!visible) return null;

  return (
    <motion.section
      id={`section-${id}`}
      data-section={id}
      data-section-label={label}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.45 }}
      className="group/section relative overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/70 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset] backdrop-blur-[var(--panel-blur)]"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-primary)]/35 to-transparent opacity-0 transition-opacity duration-300 group-hover/section:opacity-100" />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`section-body-${id}`}
        className="flex w-full items-center gap-3 px-5 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]/40"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-primary)]/5 text-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/15">
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">{label}</h2>
        <AnimatePresence initial={false}>
          {modifiedCount ? (
            <motion.span
              key="modified"
              initial={reduced ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="rounded-full bg-[var(--accent-primary)]/12 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--accent-primary)]"
            >
              {modifiedCount} modifié{modifiedCount > 1 ? "s" : ""}
            </motion.span>
          ) : null}
        </AnimatePresence>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-300 [transition-timing-function:var(--ease-snap)]", !open && "-rotate-90")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`section-body-${id}`}
            key="body"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-[var(--panel-border)]/70 border-t border-[var(--panel-border)]/70">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

export default memo(SettingsSection);
