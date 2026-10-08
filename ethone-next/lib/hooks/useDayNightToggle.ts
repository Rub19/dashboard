"use client";

import { useCallback, useRef } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { resolveTheme } from "@/lib/theme-engine";
import { transitionTheme } from "@/lib/theme-transition";

/** Durée pendant laquelle un nouveau clic est ignoré : le temps que le thème précédent soit peint. */
const LOCK_MS = 350;

/**
 * Bouton jour / nuit des écrans Discord (Obsidian ↔ Arctic). Le thème est appliqué d'un coup, transitions CSS
 * coupées, et les clics répétés pendant le changement sont ignorés : avant, chaque clic relançait les fondus
 * de couleur de toute la page en sens inverse, d'où le clignotement.
 */
export function useDayNightToggle() {
  const { settings, update } = useSettings();
  const isDark = settings.darkMode && resolveTheme(settings.theme).dark !== false;
  const lockedUntil = useRef(0);

  const toggle = useCallback(() => {
    const now = Date.now();
    if (now < lockedUntil.current) return;
    lockedUntil.current = now + LOCK_MS;
    const nextDark = !isDark;
    const themeId = nextDark ? "obsidian" : "arctic";
    transitionTheme(
      themeId,
      () => update({ darkMode: nextDark, theme: themeId, colorScheme: nextDark ? "dark" : "light" }),
      {
        accentColor: settings.accentColor,
        customAccent: settings.customAccent,
        glassLevel: settings.glassLevel,
        performanceMode: settings.performanceMode,
        customThemes: settings.customThemes,
        reducedMotion: settings.reducedMotion,
      }
    );
  }, [isDark, settings, update]);

  return { isDark, toggle };
}
