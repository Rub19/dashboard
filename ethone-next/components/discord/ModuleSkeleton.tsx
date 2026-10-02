import { cn } from "@/lib/utils";

/**
 * Aperçu d'une page de module du bot pendant son chargement : en-tête, chiffres clés, onglets et contenu, à la place
 * d'une roue + « Chargement de… ». Il n'apparaît qu'après 150 ms (classe skeleton-delay) : un chargement rapide ne
 * clignote pas. `label` est lu par les lecteurs d'écran.
 */
export default function ModuleSkeleton({ label, compact = false, className }: { label: string; compact?: boolean; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={cn("skeleton-delay mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6", className)}>
      {!compact && (
        <div className="flex items-center gap-4">
          <div className="skeleton-shimmer h-12 w-12 rounded-[var(--inset-radius)]" />
          <div className="flex-1 space-y-2">
            <div className="skeleton-shimmer h-6 w-56 max-w-[60%] rounded-lg" />
            <div className="skeleton-shimmer h-3.5 w-80 max-w-[80%] rounded" />
          </div>
        </div>
      )}
      {!compact && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton-shimmer h-24 rounded-[var(--panel-radius)]" />
          ))}
        </div>
      )}
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton-shimmer h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="skeleton-shimmer h-72 rounded-[var(--panel-radius)]" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
