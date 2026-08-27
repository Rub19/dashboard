"use client";

import { useCallback, useEffect, useRef } from "react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/hooks/useI18n";

export type CategoryDef = {
  id: string;
  label: string;
  description: string;
  descriptionKey?: string;
  icon: string;
};

export const CATEGORY_ORDER: CategoryDef[] = [
  { id: "general", label: "Général", description: "Vue d'ensemble et contrôle central", descriptionKey: "settingsNavGeneral", icon: "layout-dashboard" },
  { id: "profile", label: "Profil & Compte", description: "Identité, avatar et présence", descriptionKey: "settingsNavProfile", icon: "user" },
  { id: "appearance", label: "Apparence", description: "Style visuel, densité et rayon", descriptionKey: "settingsNavAppearance", icon: "palette" },
  { id: "themes", label: "Thèmes & Couleurs", description: "Obsidian, Cyber Neon, Aurora, Accents", descriptionKey: "settingsNavThemes", icon: "sparkles" },
  { id: "animations", label: "Animations", description: "Vitesse, fluidité et transitions", descriptionKey: "settingsNavAnimations", icon: "zap" },
  { id: "audio", label: "Audio & Sons", description: "Packs de sons et retours haptiques", descriptionKey: "settingsNavAudio", icon: "volume-2" },
  { id: "soundscapes", label: "Ambiances & Mixeur", description: "14 ambiances continues et mixeur multi-pistes", descriptionKey: "settingsNavSoundscapes", icon: "cloud-rain" },
  { id: "notifications", label: "Notifications", description: "Alertes, Ne pas déranger et canaux", descriptionKey: "settingsNavNotifications", icon: "bell" },
  { id: "dynamic-island", label: "Dynamic Island", description: "Comportement, vitesse et prévisualisation", descriptionKey: "settingsNavIsland", icon: "disc" },
  { id: "dock", label: "Dock", description: "Position, échelle, transparence et preview", descriptionKey: "settingsNavDock", icon: "credit-card" },
  { id: "workspace", label: "Espace de travail", description: "Dispositions, widgets et démarrage", descriptionKey: "settingsNavWorkspace", icon: "layout-grid" },
  { id: "language", label: "Langue & Région", description: "Langue, formats d'heure et date", descriptionKey: "settingsNavLanguage", icon: "globe" },
  { id: "connections", label: "Connexions", description: "Spotify, Drive, Discord, GitHub, APIs", descriptionKey: "settingsNavConnections", icon: "plug" },
  { id: "privacy", label: "Confidentialité", description: "Télémétrie, IA locale et données", descriptionKey: "settingsNavPrivacy", icon: "eye-off" },
  { id: "security", label: "Sécurité & Sessions", description: "Mot de passe, 2FA, passkeys et sessions", descriptionKey: "settingsNavSecurity", icon: "shield" },
  { id: "sync", label: "Synchronisation", description: "Supabase, état cloud et synchronisation", descriptionKey: "settingsNavSync", icon: "arrows-clockwise" },
  { id: "storage", label: "Stockage & Cache", description: "Données locales, cache et nettoyage", descriptionKey: "settingsNavStorage", icon: "hard-drive" },
  { id: "performance", label: "Performance", description: "Diagnostic, mémoire et mode économique", descriptionKey: "settingsNavPerformance", icon: "cpu" },
  { id: "accessibility", label: "Accessibilité", description: "Contraste, taille du texte et focus", descriptionKey: "settingsNavA11y", icon: "accessibility" },
  { id: "shortcuts", label: "Raccourcis clavier", description: "Commandes et combinaisons rapides", descriptionKey: "settingsNavShortcuts", icon: "keyboard" },
  { id: "advanced", label: "Avancé & Maintenance", description: "Diagnostics avancés, exports bruts et reset", descriptionKey: "settingsNavAdvanced", icon: "sliders-horizontal" },
  { id: "about", label: "À propos", description: "Version ETHONE, crédits et système", descriptionKey: "settingsNavAbout", icon: "info" },
];

export const CATEGORY_SECTIONS: Record<string, string[]> = {
  general: ["overview"],
  profile: ["account"],
  appearance: ["appearance", "typography", "density"],
  themes: ["themes", "accents"],
  animations: ["animations"],
  audio: ["sound"],
  soundscapes: ["soundscapes", "sound-mixer"],
  notifications: ["notifications", "dnd"],
  "dynamic-island": ["dynamic-island"],
  dock: ["dock"],
  workspace: ["workspace"],
  language: ["language"],
  connections: ["integrations"],
  privacy: ["privacy"],
  security: ["security", "sessions"],
  sync: ["sync"],
  storage: ["storage"],
  performance: ["performance"],
  accessibility: ["accessibility"],
  shortcuts: ["shortcuts"],
  advanced: ["presets", "ai", "live", "sound-preview", "raw-export", "density-custom", "maintenance"],
  about: ["about"],
};

export function sectionCategory(id: string): string {
  for (const [category, sections] of Object.entries(CATEGORY_SECTIONS)) {
    if (category === id || sections.includes(id)) return category;
  }
  return CATEGORY_ORDER[0]?.id ?? "general";
}

type SettingsNavigationProps = {
  active: string;
  onSelect: (id: string) => void;
  direction?: "vertical" | "horizontal";
  className?: string;
};

export default function SettingsNavigation({
  active,
  onSelect,
  direction = "vertical",
  className,
}: SettingsNavigationProps) {
  const i18n = useI18n();
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = CATEGORY_ORDER.findIndex((c) => c.id === active);

  const focusIndex = useCallback((index: number) => {
    const el = buttonsRef.current[index];
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      const isHorizontal = direction === "horizontal";
      const prevKey = isHorizontal ? "ArrowLeft" : "ArrowUp";
      const nextKey = isHorizontal ? "ArrowRight" : "ArrowDown";

      if (e.key === nextKey) {
        e.preventDefault();
        const next = Math.min(CATEGORY_ORDER.length - 1, Math.max(0, activeIndex) + 1);
        onSelect(CATEGORY_ORDER[next].id);
        focusIndex(next);
      } else if (e.key === prevKey) {
        e.preventDefault();
        const prev = Math.max(0, Math.min(CATEGORY_ORDER.length - 1, activeIndex) - 1);
        onSelect(CATEGORY_ORDER[prev].id);
        focusIndex(prev);
      } else if (e.key === "Home") {
        e.preventDefault();
        onSelect(CATEGORY_ORDER[0].id);
        focusIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        const last = CATEGORY_ORDER.length - 1;
        onSelect(CATEGORY_ORDER[last].id);
        focusIndex(last);
      } else if (e.key === "Enter" || e.key === " ") {
        // Let the button click handle activation while keeping focus.
      }
    },
    [activeIndex, direction, focusIndex, onSelect]
  );

  useEffect(() => {
    // Restore focus on the active button when the active category changes externally.
    if (activeIndex >= 0) focusIndex(activeIndex);
  }, [activeIndex, focusIndex]);

  const commonItem = (cat: CategoryDef, index: number) => {
    const isActive = active === cat.id;
    return (
      <button
        key={cat.id}
        ref={(el) => { buttonsRef.current[index] = el; }}
        type="button"
        data-testid={`settings-nav-${cat.id}`}
        tabIndex={isActive ? 0 : -1}
        aria-current={isActive ? "page" : undefined}
        onClick={() => onSelect(cat.id)}
        onKeyDown={handleKeyDown}
        className={cn(
          "group flex min-h-[44px] w-full items-start gap-3 rounded-[var(--panel-radius)] px-3 py-2 text-left text-sm font-medium transition-[color,background-color,border-color] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          isActive
            ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
            : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)]/30 hover:text-[var(--text-primary)]"
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--panel-radius)] transition-colors",
            isActive
              ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
              : "bg-[var(--surface-raised)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
          )}
        >
          <Icon name={cat.icon} className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-col items-start text-left">
          <span className="truncate">{cat.label}</span>
          <span className="truncate text-[11px] font-normal text-[var(--text-muted)]">
            {i18n(cat.descriptionKey || "", cat.description)}
          </span>
        </span>
        {isActive && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]" aria-hidden="true" />
        )}
      </button>
    );
  };

  if (direction === "horizontal") {
    return (
      <nav
        aria-label="Catégories de paramètres"
        className={cn(
          "flex items-center gap-1 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory",
          className
        )}
        onKeyDown={handleKeyDown}
        style={{
          paddingLeft: "max(0.5rem, env(safe-area-inset-left))",
          paddingRight: "max(0.5rem, env(safe-area-inset-right))",
        }}
      >
        {CATEGORY_ORDER.map((cat, index) => {
          const isActive = active === cat.id;
          return (
            <button
              key={cat.id}
              ref={(el) => { buttonsRef.current[index] = el; }}
              type="button"
              data-testid={`settings-nav-${cat.id}`}
              tabIndex={isActive ? 0 : -1}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onSelect(cat.id)}
              onKeyDown={handleKeyDown}
              className={cn(
                "flex shrink-0 snap-start items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-[color,background-color,border-color] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] min-h-[44px] min-w-[44px] touch-manipulation",
                isActive
                  ? "border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:bg-[var(--surface-hover)]/30 hover:text-[var(--text-primary)]"
              )}
            >
              <Icon name={cat.icon} className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="whitespace-nowrap">{cat.label}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Catégories de paramètres"
      className={cn("flex h-full w-full flex-col", className)}
      onKeyDown={handleKeyDown}
    >
      <div className="flex flex-col gap-0.5">
        {CATEGORY_ORDER.map((cat, index) => commonItem(cat, index))}
      </div>
    </nav>
  );
}
