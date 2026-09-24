"use client";

import { Check } from "@/components/icons/ph";
import { PREMIUM_THEMES, THEME_DEFINITIONS } from "@/lib/theme-engine";
import { cn } from "@/lib/utils";

/**
 * Grille de thèmes du menu « palette » de la barre du haut : chaque carte montre
 * un mini-aperçu (fond, barre latérale, pastille d'accent) du vrai thème.
 */
export default function ThemePicker({
  activeId,
  activeLabel,
  onPick,
}: {
  activeId: string;
  activeLabel: string;
  onPick: (id: string) => void;
}) {
  return (
    <div
      role="menu"
      aria-label="Choisir un thème"
      className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 shadow-2xl backdrop-blur-[var(--panel-blur)]"
    >
      <div className="mb-2.5 flex items-center justify-between px-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Thèmes</span>
        <span className="text-[11px] text-[var(--text-muted)]">{activeLabel}</span>
      </div>
      <div className="grid max-h-[65vh] grid-cols-2 gap-2 overflow-y-auto os-scroll pr-0.5">
        {PREMIUM_THEMES.map((id) => {
          const def = THEME_DEFINITIONS[id];
          const active = id === activeId;
          const accent = def?.accentPrimary ?? "#888";
          return (
            <button
              key={id}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => onPick(id)}
              className={cn(
                "overflow-hidden rounded-xl border p-1.5 text-left transition-all cursor-pointer active:scale-[0.98]",
                active
                  ? "border-[var(--accent-primary)] bg-[var(--accent-muted)]"
                  : "border-[var(--panel-border)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--surface-hover)]"
              )}
            >
              <span
                aria-hidden
                className="relative block h-12 w-full overflow-hidden rounded-lg border border-white/5"
                style={{ background: def?.bgMain ?? "#111" }}
              >
                <span
                  className="absolute bottom-1.5 left-1.5 top-1.5 w-7 rounded-md"
                  style={{ background: def?.bgSurface ?? "#222", border: `1px solid ${def?.borderSubtle ?? "transparent"}` }}
                />
                <span className="absolute left-10 right-1.5 top-1.5 h-2.5 rounded-full" style={{ background: def?.textMuted ?? "#888", opacity: 0.45 }} />
                <span
                  className="absolute left-10 top-6 h-3 w-10 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${accent}, ${def?.accentSecondary ?? accent})` }}
                />
                <span className="absolute bottom-1.5 left-10 right-1.5 h-2 rounded-full" style={{ background: def?.bgSurfaceElevated ?? "#333" }} />
              </span>
              <span className="mt-1.5 flex items-center gap-1.5 px-0.5">
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--text-primary)]">{def?.label ?? id}</span>
                {active && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent-primary)]" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
