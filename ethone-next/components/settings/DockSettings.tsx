"use client";

import { useMemo } from "react";
import { Icon } from "@/lib/icons";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { DockScale, DockGlass } from "@/lib/settings";

const DOCK_PREVIEW_ICONS = [
  { id: "home", label: "Accueil", icon: "house" },
  { id: "brain", label: "Brain", icon: "brain" },
  { id: "mail", label: "Mail", icon: "envelope-simple" },
  { id: "files", label: "Fichiers", icon: "folder-simple" },
  { id: "notes", label: "Notes", icon: "note" },
  { id: "tasks", label: "Tâches", icon: "check-circle" },
  { id: "settings", label: "Réglages", icon: "gear-six" },
];

export default function DockSettings() {
  const i18n = useI18n();
  const { settings, update } = useSettings();

  const scaleClass = useMemo(() => {
    switch (settings.dockScale) {
      case "compact":
        return "h-11 p-1 gap-1";
      case "large":
        return "h-16 p-2 gap-2.5";
      case "normal":
      default:
        return "h-14 p-1.5 gap-2";
    }
  }, [settings.dockScale]);

  const itemSizeClass = useMemo(() => {
    switch (settings.dockScale) {
      case "compact":
        return "h-9 w-9";
      case "large":
        return "h-12 w-12";
      case "normal":
      default:
        return "h-10 w-10";
    }
  }, [settings.dockScale]);

  const glassClass = useMemo(() => {
    switch (settings.dockGlass) {
      case "ultra-blur":
        return "backdrop-blur-3xl bg-[var(--panel-bg)]/60 border-[var(--panel-border)]/40";
      case "sober":
        return "backdrop-blur-none bg-[var(--surface-raised)] border-[var(--panel-border)]";
      case "vitrified":
      default:
        return "backdrop-blur-2xl bg-[var(--panel-bg)]/80 border-[var(--panel-border)]/60";
    }
  }, [settings.dockGlass]);

  return (
    <div className="flex flex-col gap-6">
      {/* Live Dock Simulator */}
      <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-gradient-to-b from-[var(--surface-raised)]/60 to-[var(--bg-main)] p-10 shadow-inner">
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Aperçu en direct du Dock
          </span>
        </div>

        <div className="my-8 flex items-center justify-center">
          <div
            className={cn(
              "flex items-center rounded-2xl border shadow-2xl transition-all duration-300",
              scaleClass,
              glassClass
            )}
          >
            {DOCK_PREVIEW_ICONS.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-center rounded-xl bg-[var(--surface-raised)]/80 text-[var(--text-primary)] transition-transform hover:scale-110 cursor-pointer shadow-sm",
                  itemSizeClass,
                  item.id === "settings" && "ring-1 ring-[var(--accent-primary)]/50 text-[var(--accent-primary)]"
                )}
                title={item.label}
              >
                <Icon name={item.icon} className="h-5 w-5" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dock Controls Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Scale Selector */}
        <div className="flex flex-col gap-2 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <label className="text-sm font-semibold text-[var(--text-primary)]">
            Taille du Dock
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "compact", label: "Compact" },
                { id: "normal", label: "Normal" },
                { id: "large", label: "Grand" },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => update({ dockScale: s.id as DockScale })}
                className={cn(
                  "rounded-xl py-2 text-xs font-semibold transition-all",
                  settings.dockScale === s.id
                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-md"
                    : "bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Glass Style Selector */}
        <div className="flex flex-col gap-2 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <label className="text-sm font-semibold text-[var(--text-primary)]">
            Translucidité & Verre
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "vitrified", label: "Vitrifié" },
                { id: "ultra-blur", label: "Ultra Flou" },
                { id: "sober", label: "Sobre" },
              ] as const
            ).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => update({ dockGlass: g.id as DockGlass })}
                className={cn(
                  "rounded-xl py-2 text-xs font-semibold transition-all",
                  settings.dockGlass === g.id
                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-md"
                    : "bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visibility Toggles */}
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Afficher le Dock
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Conserver la barre d&apos;accès rapide en bas d&apos;écran
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.dockVisible}
            onChange={(e) => update({ dockVisible: e.target.checked })}
            className="h-5 w-5 rounded accent-[var(--accent-primary)]"
          />
        </label>

        <label className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Masquage automatique
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Révèle le Dock uniquement au survol du bord inférieur
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.dockAutoHide}
            onChange={(e) => update({ dockAutoHide: e.target.checked })}
            className="h-5 w-5 rounded accent-[var(--accent-primary)]"
          />
        </label>

        <label className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Effet de grossissement (Magnify)
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Agrandit les icônes de manière fluide lors du survol
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.dockMagnify}
            onChange={(e) => update({ dockMagnify: e.target.checked })}
            className="h-5 w-5 rounded accent-[var(--accent-primary)]"
          />
        </label>

        <label className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Bouton flottant d&apos;enregistrement
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Affiche une barre flottante lors de modifications
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.dockFloatingSave}
            onChange={(e) => update({ dockFloatingSave: e.target.checked })}
            className="h-5 w-5 rounded accent-[var(--accent-primary)]"
          />
        </label>
      </div>
    </div>
  );
}
