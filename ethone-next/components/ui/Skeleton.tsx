"use client";

import { cn } from "@/lib/utils";

/** Bloc de chargement générique (shimmer) — remplace le flash de contenu vide le temps d'un premier fetch. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded-[var(--inset-radius)]", className)} />;
}

/** Carte de largeur pleine, hauteur fixe — pour une ligne de stat ou une carte de contenu en cours de chargement. */
export function CardSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-16", className)} />;
}

/** Ligne de tableau/liste en cours de chargement. */
export function RowSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-11", className)} />;
}

/** `count` cartes empilées, pour geler la mise en page pendant le premier chargement d'une page. */
export function CardSkeletonList({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
