"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Palette, Plus, Trash2 } from "@/components/icons/ph";
import { useSettings } from "@/components/SettingsProvider";
import { confirmDialog } from "@/lib/confirmDialog";
import { PREMIUM_THEMES, THEME_DEFINITIONS } from "@/lib/theme-engine";
import type { ThemeDefinition } from "@/lib/theme-tokens";
import { sendThemeIntent, THEME_STUDIO_PATH, type ThemeIntent } from "@/lib/theme-intent";
import { EASE_SNAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

type Menu = { x: number; y: number; theme: ThemeDefinition; custom: boolean };

/**
 * Grille de thèmes du menu « palette » de la barre du haut : chaque carte montre un mini-aperçu (fond, barre latérale,
 * pastille d'accent) du vrai thème. Clic droit sur un thème : l'appliquer, changer sa police, créer un thème à partir
 * de lui ou (thème perso) le supprimer.
 */
export default function ThemePicker({
  activeId,
  activeLabel,
  onPick,
  onClose,
}: {
  activeId: string;
  activeLabel: string;
  onPick: (id: string) => void;
  onClose?: () => void;
}) {
  const router = useRouter();
  const { settings, update } = useSettings();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<Menu | null>(null);

  const custom = settings.customThemes ?? [];
  const themes: Array<{ def: ThemeDefinition; custom: boolean }> = [
    ...PREMIUM_THEMES.map((id) => ({ def: THEME_DEFINITIONS[id], custom: false })),
    ...custom.map((def) => ({ def, custom: true })),
  ].filter((t) => Boolean(t.def));
  // Thème perso actif : seul lui est coché (le thème prédéfini calculé par la barre du haut n'est qu'un repli).
  const currentIsCustom = custom.some((t) => t.id === settings.theme);

  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e instanceof KeyboardEvent) e.stopPropagation();
      setMenu(null);
    };
    window.addEventListener("keydown", close, true);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("keydown", close, true);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  const openMenu = (e: ReactMouseEvent, def: ThemeDefinition, isCustom: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Reste dans le panneau même près des bords.
    const x = Math.min(e.clientX - rect.left, rect.width - 236);
    const y = Math.min(e.clientY - rect.top, rect.height - 170);
    setMenu({ x: Math.max(8, x), y: Math.max(8, y), theme: def, custom: isCustom });
  };

  const goStudio = (intent: ThemeIntent) => {
    setMenu(null);
    sendThemeIntent(intent);
    onClose?.();
    router.push(THEME_STUDIO_PATH);
  };

  const removeCustom = async (def: ThemeDefinition) => {
    setMenu(null);
    if (!(await confirmDialog(`Supprimer le thème « ${def.label} » ?`))) return;
    update({ customThemes: custom.filter((t) => t.id !== def.id), ...(settings.theme === def.id ? { theme: "dyno-rose" } : {}) });
  };

  return (
    <div
      ref={rootRef}
      role="menu"
      aria-label="Choisir un thème"
      data-no-context-menu
      onClick={() => menu && setMenu(null)}
      className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 shadow-2xl backdrop-blur-[var(--panel-blur)]"
    >
      <div className="mb-2.5 flex items-center justify-between px-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Thèmes</span>
        <span className="text-[11px] text-[var(--text-muted)]">{activeLabel}</span>
      </div>
      <div className="grid max-h-[65vh] grid-cols-2 gap-2 overflow-y-auto os-scroll pr-0.5">
        {themes.map(({ def, custom: isCustom }) => {
          const active = currentIsCustom ? def.id === settings.theme : def.id === activeId;
          const accent = def.accentPrimary ?? "#888";
          return (
            <button
              key={def.id}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => onPick(def.id)}
              onContextMenu={(e) => openMenu(e, def, isCustom)}
              title="Clic droit pour plus d'options"
              className={cn(
                "overflow-hidden rounded-xl border p-1.5 text-left transition-all cursor-pointer active:scale-[0.98]",
                active
                  ? "border-[var(--accent-primary)] bg-[var(--accent-muted)]"
                  : "border-[var(--panel-border)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--surface-hover)]",
                menu?.theme.id === def.id && "ring-2 ring-[var(--accent-primary)]/50",
              )}
            >
              <span aria-hidden className="relative block h-12 w-full overflow-hidden rounded-lg border border-white/5" style={{ background: def.bgMain ?? "#111" }}>
                <span className="absolute bottom-1.5 left-1.5 top-1.5 w-7 rounded-md" style={{ background: def.bgSurface ?? "#222", border: `1px solid ${def.borderSubtle ?? "transparent"}` }} />
                <span className="absolute left-10 right-1.5 top-1.5 h-2.5 rounded-full" style={{ background: def.textMuted ?? "#888", opacity: 0.45 }} />
                <span className="absolute left-10 top-6 h-3 w-10 rounded-full" style={{ background: `linear-gradient(90deg, ${accent}, ${def.accentSecondary ?? accent})` }} />
                <span className="absolute bottom-1.5 left-10 right-1.5 h-2 rounded-full" style={{ background: def.bgSurfaceElevated ?? "#333" }} />
              </span>
              <span className="mt-1.5 flex items-center gap-1.5 px-0.5">
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--text-primary)]">{def.label ?? def.id}</span>
                {isCustom && <span className="rounded bg-[var(--accent-primary)]/15 px-1 text-[9px] font-bold uppercase text-[var(--accent-primary)]">Perso</span>}
                {active && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent-primary)]" />}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => goStudio({ action: "new" })}
          className="flex min-h-[86px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--panel-border)] text-xs font-semibold text-[var(--text-muted)] transition-[border-color,color,transform] duration-150 hover:border-[var(--accent-primary)]/60 hover:text-[var(--text-primary)] active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" />
          Nouveau thème
        </button>
      </div>

      <AnimatePresence>
        {menu && (
          <motion.div
            key={menu.theme.id}
            role="menu"
            aria-label={`Options du thème ${menu.theme.label}`}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.92, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1 } }}
            transition={{ duration: 0.16, ease: EASE_SNAP }}
            style={{ left: menu.x, top: menu.y, transformOrigin: "top left" }}
            className="ethone-menu absolute z-10 w-56 rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface)] p-1.5 shadow-2xl"
          >
            <p className="truncate px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{menu.theme.label}</p>
            <MenuItem icon={<Check className="h-4 w-4" />} label="Appliquer" onClick={() => (setMenu(null), onPick(menu.theme.id))} />
            <MenuItem icon={<Palette className="h-4 w-4" />} label="Modifier la police…" onClick={() => goStudio({ action: "font", themeId: menu.theme.id })} />
            <MenuItem icon={<Copy className="h-4 w-4" />} label="Créer un thème à partir de celui-ci" onClick={() => goStudio({ action: "duplicate", themeId: menu.theme.id })} />
            {menu.custom && <MenuItem icon={<Trash2 className="h-4 w-4" />} label="Supprimer ce thème" danger onClick={() => void removeCustom(menu.theme)} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-[background-color,transform] duration-100 active:scale-[0.98]",
        danger ? "text-[var(--danger)] hover:bg-[var(--danger)]/10" : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)]",
      )}
    >
      <span className={danger ? "" : "text-[var(--text-muted)]"}>{icon}</span>
      {label}
    </button>
  );
}
