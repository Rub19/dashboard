"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { useDesktopLayout, type WidgetLayout } from "@/lib/hooks/useDesktopLayout";
import { useSettings } from "@/components/SettingsProvider";
import { transitionTheme } from "@/lib/theme-transition";
import { activityJournal } from "@/lib/activity-journal";
import { useToast } from "@/components/ToastProvider";
import {
  MARKETPLACE_ITEMS,
  getMarketplaceItem,
  type MarketplaceItem,
} from "./marketplace-registry";

export interface InstalledExtensionRecord {
  id: string;
  version: string;
  previousVersion?: string;
  installedAt: string;
  updatedAt?: string;
  enabled: boolean;
  workspaceBinding?: string; // "all" | "personal" | "focus" | "studio" | "gaming"
}

const STORAGE_INSTALLED = "ethone-installed-extensions-v1";
const STORAGE_FAVORITES = "ethone-marketplace-favorites-v1";
const STORAGE_SAVED = "ethone-marketplace-saved-v1";

// Initial default pre-installed extensions for immediate out-of-the-box experience
const DEFAULT_INSTALLED: Record<string, InstalledExtensionRecord> = {
  "widget-weather-live": {
    id: "widget-weather-live",
    version: "2.2.0",
    installedAt: "2026-08-20T10:00:00.000Z",
    enabled: true,
    workspaceBinding: "all",
  },
  "theme-minimal-monochrome": {
    id: "theme-minimal-monochrome",
    version: "3.0.0",
    installedAt: "2026-08-15T12:00:00.000Z",
    enabled: true,
    workspaceBinding: "all",
  },
};

export function useMarketplaceStore() {
  const { toast, success, error: toastError } = useToast();
  const { settings, update: updateSettings } = useSettings();
  const { layout, update: updateLayout } = useDesktopLayout();

  const [installed, setInstalled] = useLocalStorage<Record<string, InstalledExtensionRecord>>(
    STORAGE_INSTALLED,
    DEFAULT_INSTALLED
  );

  const [favorites, setFavorites] = useLocalStorage<string[]>(STORAGE_FAVORITES, [
    "widget-github-activity",
    "widget-spotify-player",
  ]);

  const [saved, setSaved] = useLocalStorage<string[]>(STORAGE_SAVED, []);

  // Compute items that have an available update
  const updatesAvailable = useMemo(() => {
    return Object.values(installed)
      .filter((inst) => {
        const item = getMarketplaceItem(inst.id);
        if (!item) return false;
        return item.version !== inst.version;
      })
      .map((inst) => inst.id);
  }, [installed]);

  // Install workflow
  const install = useCallback(
    async (
      item: MarketplaceItem,
      workspaceBinding: string = "all"
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        // Record in installed registry
        setInstalled((prev) => ({
          ...prev,
          [item.id]: {
            id: item.id,
            version: item.version,
            installedAt: new Date().toISOString(),
            enabled: true,
            workspaceBinding,
          },
        }));

        // 1. If it's a widget, link to Home desktop layout
        if (item.type === "widget") {
          const widgetKey = item.preview?.widgetId || item.id.replace("widget-", "");
          const currentWidgets = layout?.widgets || [];
          const exists = currentWidgets.some((w) => w.id === widgetKey);

          if (!exists) {
            const newWidget: WidgetLayout = {
              id: widgetKey,
              x: 0,
              y: currentWidgets.length * 2,
              w: 6,
              h: 2,
              visible: true,
            };
            updateLayout([...currentWidgets, newWidget]);
          }
        }

        // 2. If it's a theme, activate it seamlessly
        if (item.type === "theme" && item.preview?.themeId) {
          transitionTheme(item.preview.themeId, (id) => updateSettings({ theme: id as any }));
        }

        // 3. Log to Activity Journal
        try {
          activityJournal.record({
            title: `Installation : ${item.name}`,
            description: `${item.type.toUpperCase()} ajouté à votre écosystème ETHONE.`,
            category: "system",
            icon: "sparkles",
          });
        } catch {
          // ignore
        }

        // Dispatch window event for live subscribers
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("v8:marketplace-installed", { detail: { item } })
          );
        }

        success(`"${item.name}" installé avec succès !`);
        return { success: true };
      } catch (err: any) {
        toastError(`Échec d'installation : ${err?.message || "Erreur inconnue"}`);
        return { success: false, error: err?.message };
      }
    },
    [layout, updateLayout, updateSettings, setInstalled, success, toastError]
  );

  // Uninstall workflow
  const uninstall = useCallback(
    async (item: MarketplaceItem): Promise<boolean> => {
      try {
        setInstalled((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });

        // If widget, remove from layout
        if (item.type === "widget") {
          const widgetKey = item.preview?.widgetId || item.id.replace("widget-", "");
          const currentWidgets = layout?.widgets || [];
          updateLayout(currentWidgets.filter((w) => w.id !== widgetKey));
        }

        try {
          activityJournal.record({
            title: `Suppression : ${item.name}`,
            description: `${item.type.toUpperCase()} retiré de votre environnement. Vos connexions restent actives.`,
            category: "system",
            icon: "trash-2",
          });
        } catch {
          // ignore
        }

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("v8:marketplace-uninstalled", { detail: { item } })
          );
        }

        success(`"${item.name}" a été désinstallé.`);
        return true;
      } catch {
        toastError("Impossible de désinstaller le module.");
        return false;
      }
    },
    [layout, updateLayout, setInstalled, success, toastError]
  );

  // Toggle Favorite
  const toggleFavorite = useCallback(
    (itemId: string) => {
      setFavorites((prev) => {
        const next = prev.includes(itemId)
          ? prev.filter((id) => id !== itemId)
          : [...prev, itemId];
        return next;
      });
    },
    [setFavorites]
  );

  // Toggle Wishlist / Saved
  const toggleSaved = useCallback(
    (itemId: string) => {
      setSaved((prev) => {
        const next = prev.includes(itemId)
          ? prev.filter((id) => id !== itemId)
          : [...prev, itemId];
        return next;
      });
    },
    [setSaved]
  );

  // Toggle Enabled
  const toggleEnabled = useCallback(
    (itemId: string) => {
      setInstalled((prev) => {
        const target = prev[itemId];
        if (!target) return prev;
        return {
          ...prev,
          [itemId]: { ...target, enabled: !target.enabled },
        };
      });
    },
    [setInstalled]
  );

  // Update single extension
  const updateExtension = useCallback(
    async (itemId: string): Promise<boolean> => {
      const item = getMarketplaceItem(itemId);
      if (!item) return false;

      setInstalled((prev) => {
        const target = prev[itemId];
        if (!target) return prev;
        return {
          ...prev,
          [itemId]: {
            ...target,
            previousVersion: target.version,
            version: item.version,
            updatedAt: new Date().toISOString(),
          },
        };
      });

      success(`"${item.name}" mis à jour vers la version ${item.version} !`);
      return true;
    },
    [setInstalled, success]
  );

  // Update all
  const updateAll = useCallback(async () => {
    for (const id of updatesAvailable) {
      await updateExtension(id);
    }
    success("Toutes les extensions ont été mises à jour !");
  }, [updatesAvailable, updateExtension, success]);

  // Rollback to previous version
  const rollback = useCallback(
    async (itemId: string): Promise<boolean> => {
      const target = installed[itemId];
      if (!target || !target.previousVersion) return false;

      setInstalled((prev) => ({
        ...prev,
        [itemId]: {
          ...target,
          version: target.previousVersion!,
          previousVersion: undefined,
        },
      }));

      success(`Restauré à la version ${target.previousVersion}`);
      return true;
    },
    [installed, setInstalled, success]
  );

  return {
    installed,
    favorites,
    saved,
    updatesAvailable,
    isInstalled: (id: string) => Boolean(installed[id]),
    isFavorite: (id: string) => favorites.includes(id),
    isSaved: (id: string) => saved.includes(id),
    install,
    uninstall,
    toggleFavorite,
    toggleSaved,
    toggleEnabled,
    updateExtension,
    updateAll,
    rollback,
  };
}
