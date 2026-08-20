"use client";

import { useMemo } from "react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export type CategoryDef = {
  id: string;
  label: string;
  icon: string;
};

export const CATEGORY_ORDER: CategoryDef[] = [
  { id: "profile", label: "Général & Profil", icon: "user" },
  { id: "appearance", label: "Apparence & Thèmes", icon: "palette" },
  { id: "audio", label: "Audio & Sons", icon: "volume-2" },
  { id: "workspace", label: "Espace de travail & Dock", icon: "layout-grid" },
  { id: "language", label: "Langue & Région", icon: "globe" },
  { id: "notifications", label: "Notifications & Alertes", icon: "bell" },
  { id: "security", label: "Sécurité, Sessions & Cloud", icon: "shield" },
  { id: "advanced", label: "Avancé & Maintenance", icon: "sliders-horizontal" },
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
  const categories = useMemo(() => CATEGORY_ORDER, []);

  if (direction === "horizontal") {
    return (
      <nav
        aria-label="Catégories de paramètres"
        className={cn(
          "flex items-center gap-1 overflow-x-auto pb-1 os-scroll",
          className
        )}
      >
        {categories.map((cat) => {
          const isActive = active === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                isActive
                  ? "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-transparent text-[var(--muted)] hover:bg-white/[0.03] hover:text-[var(--foreground)]"
              )}
            >
              <Icon name={cat.icon} className="h-3.5 w-3.5" />
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
    >
      <div className="flex flex-col gap-0.5">
        {categories.map((cat) => {
          const isActive = active === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-[var(--panel-radius)] px-3 py-2 text-left text-sm font-medium transition-all",
                isActive
                  ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-white/[0.03] hover:text-[var(--foreground)]"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--panel-radius)] transition-colors",
                  isActive
                    ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                    : "bg-white/[0.03] text-[var(--muted)] group-hover:text-[var(--foreground)]"
                )}
              >
                <Icon name={cat.icon} className="h-4 w-4" />
              </span>
              <span className="truncate">{cat.label}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
