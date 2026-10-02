"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "@/components/icons/ph";
import { EASE_SNAP } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";

/**
 * Bloc gauche de l'en-tête d'une page de module du bot : retour au hub, tuile d'icône qui arrive en ressort,
 * titre et sous-titre révélés. Partagé par les pages de modules pour une entrée cohérente.
 */
export default function ModulePageTitle({ icon, title, subtitle, badge }: { icon: ReactNode; title: string; subtitle?: string; badge?: ReactNode }) {
  const { reduced } = useMotionPref();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link
        href="/discord"
        title="Retour au hub Discord"
        aria-label="Retour au hub Discord"
        className="group grid h-9 w-9 shrink-0 place-items-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] text-[var(--text-muted)] outline-none transition-[border-color,color,background-color] duration-200 hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
      >
        <ArrowLeft className="h-4 w-4 transition-transform duration-300 [transition-timing-function:var(--ease-snap)] group-hover:-translate-x-0.5" />
      </Link>
      <motion.span
        initial={reduced ? false : { scale: 0.6, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 36 }}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] [&_svg]:h-5 [&_svg]:w-5"
      >
        {icon}
      </motion.span>
      <motion.div
        className="min-w-0"
        initial={reduced ? false : { opacity: 0, y: 6, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.45, ease: EASE_SNAP, delay: 0.05 }}
      >
        <h1 className="flex items-center gap-2 truncate text-base font-semibold tracking-tight text-[var(--text-primary)] sm:text-lg">
          {title}
          {badge}
        </h1>
        {subtitle && <p className="truncate text-xs text-[var(--text-muted)]">{subtitle}</p>}
      </motion.div>
    </div>
  );
}
