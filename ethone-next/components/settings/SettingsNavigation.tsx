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
  { id: "profile", label: "Général & Profil", description: "Compte et préférences générales", descriptionKey: "settingsNavProfile", icon: "user" },
  { id: "appearance", label: "Apparence & Thèmes", description: "Thèmes, couleurs et animations", descriptionKey: "settingsNavAppearance", icon: "palette" },
  { id: "audio", label: "Audio & Sons", description: "Sons et volume", descriptionKey: "settingsNavAudio", icon: "volume-2" },
  { id: "workspace", label: "Espace de travail & Dock", description: "Dock, densité et layout", descriptionKey: "settingsNavWorkspace", icon: "layout-grid" },
  { id: "language", label: "Langue & Région", description: "Langue, date et fuseau horaire", descriptionKey: "settingsNavLanguage", icon: "globe" },
  { id: "notifications", label: "Notifications & Alertes", description: "Notifications Brain, Mail, sécurité", descriptionKey: "settingsNavNotifications", icon: "bell" },
  { id: "security", label: "Sécurité, Sessions & Cloud", description: "Sessions, passkeys et accès", descriptionKey: "settingsNavSecurity", icon: "shield" },
  { id: "advanced", label: "Avancé & Maintenance", description: "Cache, sync, diagnostics et logs", descriptionKey: "settingsNavAdvanced", icon: "sliders-horizontal" },
];

export const CATEGORY_SECTIONS: Record<string, string[]> = {
  profile: ["account"],
  appearance: ["appearance", "typography", "density"],
  audio: ["sound"],
  workspace: ["workspace", "integrations"],
  language: ["language"],
  notifications: ["notifications"],
  security: ["security"],
  advanced: ["presets", "ai", "live", "sound-preview", "raw-export", "density-custom", "maintenance"],
};

export function sectionCategory(id: string): string {
  for (const [category, sections] of Object.entries(CATEGORY_SECTIONS)) {
    if (sections.includes(id)) return category;
  }
  return CATEGORY_ORDER[0]?.id ?? "profile";
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
          "group flex min-h-[44px] w-full items-start gap-3 rounded-[var(--panel-radius)] px-3 py-2 text-left text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
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
                "flex shrink-0 snap-start items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] min-h-[44px] min-w-[44px] touch-manipulation",
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
