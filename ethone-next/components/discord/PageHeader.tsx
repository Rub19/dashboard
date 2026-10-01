"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "@/components/icons/ph";
import { EthoneIcon, type EthoneIconName } from "@/components/EthoneIcon";
import { EASE_SNAP } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { cn } from "@/lib/utils";

const TINTS = {
  emerald: { tile: "from-emerald-400/25 to-emerald-400/5 border-emerald-400/30", icon: "text-emerald-300" },
  sky: { tile: "from-sky-400/25 to-sky-400/5 border-sky-400/30", icon: "text-sky-300" },
  amber: { tile: "from-amber-400/25 to-amber-400/5 border-amber-400/30", icon: "text-amber-300" },
  teal: { tile: "from-teal-400/25 to-teal-400/5 border-teal-400/30", icon: "text-teal-300" },
  indigo: { tile: "from-indigo-400/25 to-indigo-400/5 border-indigo-400/30", icon: "text-indigo-300" },
  zinc: { tile: "from-zinc-400/20 to-zinc-400/5 border-zinc-400/25", icon: "text-[var(--text-primary)]" },
} as const;

export type PageTint = keyof typeof TINTS;

/**
 * En-tête commun des pages de modules Discord : retour au hub, pastille d'icône colorée (arrivée en ressort), titre et
 * sous-titre révélés, actions à droite. Volontairement une <div> (et non un <header>) pour rester à l'écart des styles
 * de la barre du haut.
 */
export default function PageHeader({
  guildId,
  icon,
  hideBack,
  tint = "indigo",
  title,
  subtitle,
  actions,
  className,
}: {
  guildId?: string;
  icon: EthoneIconName;
  /** Masque le lien de retour (la page a déjà sa propre barre d'actions). */
  hideBack?: boolean;
  tint?: PageTint;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  const { reduced } = useMotionPref();
  const t = TINTS[tint];
  return (
    <div className={cn("space-y-4", className)}>
      {!hideBack && (
        <Link
          href={`/discord${guildId ? `?guildId=${guildId}` : ""}`}
          className="group inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-[var(--text-muted)] outline-none transition-colors hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 [transition-timing-function:var(--ease-snap)] group-hover:-translate-x-0.5" />
          Retour au hub Discord
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <motion.span
            initial={reduced ? false : { scale: 0.6, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
            className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-[var(--panel-radius)] border bg-gradient-to-br", t.tile)}
          >
            <EthoneIcon name={icon} className={cn("h-7 w-7", t.icon)} />
          </motion.span>
          <motion.div
            className="min-w-0"
            initial={reduced ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: EASE_SNAP, delay: 0.06 }}
          >
            <h1 className="truncate text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">{subtitle}</p>}
          </motion.div>
        </div>
        {actions && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_SNAP, delay: 0.12 }}
            className="flex flex-wrap items-center gap-2"
          >
            {actions}
          </motion.div>
        )}
      </div>
    </div>
  );
}
