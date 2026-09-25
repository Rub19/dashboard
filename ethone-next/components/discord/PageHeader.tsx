"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "@/components/icons/ph";
import { EthoneIcon, type EthoneIconName } from "@/components/EthoneIcon";
import { cn } from "@/lib/utils";

const TINTS = {
  emerald: { tile: "from-emerald-400/25 to-emerald-400/5 border-emerald-400/30", icon: "text-emerald-300" },
  sky: { tile: "from-sky-400/25 to-sky-400/5 border-sky-400/30", icon: "text-sky-300" },
  amber: { tile: "from-amber-400/25 to-amber-400/5 border-amber-400/30", icon: "text-amber-300" },
  teal: { tile: "from-teal-400/25 to-teal-400/5 border-teal-400/30", icon: "text-teal-300" },
  indigo: { tile: "from-indigo-400/25 to-indigo-400/5 border-indigo-400/30", icon: "text-indigo-300" },
  zinc: { tile: "from-zinc-400/20 to-zinc-400/5 border-zinc-400/25", icon: "text-zinc-200" },
} as const;

export type PageTint = keyof typeof TINTS;

/**
 * En-tête commun des pages de modules Discord : fil d'Ariane de retour, pastille d'icône colorée, titre, sous-titre et
 * actions à droite. Volontairement une <div> (et non un <header>) pour rester à l'écart des styles de la barre du haut.
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
  const t = TINTS[tint];
  return (
    <div className={cn("space-y-4", className)}>
      {!hideBack && (
        <Link href={`/discord${guildId ? `?guildId=${guildId}` : ""}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour au hub Discord
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-2xl border bg-gradient-to-br shadow-lg shadow-black/20", t.tile)}>
            <EthoneIcon name={icon} className={cn("h-7 w-7", t.icon)} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 max-w-3xl text-sm text-zinc-400">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
