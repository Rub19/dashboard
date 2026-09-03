import { startTransition } from "react";
import {
  applyTheme,
  applyAccent,
  resolvePremiumTheme,
  PRESET_THEMES,
  UNIVERSAL_ACCENTS,
  type ThemeDefinition,
} from "./theme-engine";

export function getEffectiveAccent(
  themeId: string,
  accentColor?: string,
  customAccent?: string
): string {
  if (accentColor === "custom" && customAccent) return customAccent;
  const match = UNIVERSAL_ACCENTS.find((a) => a.id === accentColor);
  if (match) return match.hex;

  const resolved = resolvePremiumTheme(String(themeId || ""));
  const def = PRESET_THEMES[resolved];
  return def?.accentPrimary || "#8b5cf6";
}

function setNoTransitions(html: HTMLElement) {
  html.setAttribute("data-no-transitions", "true");
}

function restoreTransitions(html: HTMLElement) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      html.removeAttribute("data-no-transitions");
    });
  });
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

export interface TransitionThemeOptions {
  accentColor?: string;
  customAccent?: string;
  glassLevel?: "off" | "low" | "medium" | "high";
  performanceMode?: "normal" | "low" | "quality" | "balanced" | "performance";
  customThemes?: ThemeDefinition[];
  reducedMotion?: boolean;
}

/**
 * Apply a new theme and accent synchronously with transitions temporarily disabled
 * to avoid jank across the whole application tree.
 */
export function transitionTheme(
  themeId: string,
  onChange: (themeId: string) => void,
  options?: TransitionThemeOptions
): void {
  if (typeof document === "undefined") {
    onChange(String(themeId));
    return;
  }

  const html = document.documentElement;
  const reduced = options?.reducedMotion || prefersReducedMotion();

  if (reduced) {
    html.setAttribute("data-no-transitions", "true");
    applyTheme(themeId, {
      accent: options?.accentColor,
      customAccent: options?.customAccent,
      glassLevel: options?.glassLevel,
      performanceMode: options?.performanceMode,
      customThemes: options?.customThemes,
    });
    startTransition(() => onChange(String(themeId)));
    requestAnimationFrame(() => html.removeAttribute("data-no-transitions"));
    return;
  }

  setNoTransitions(html);
  applyTheme(themeId, {
    accent: options?.accentColor,
    customAccent: options?.customAccent,
    glassLevel: options?.glassLevel,
    performanceMode: options?.performanceMode,
    customThemes: options?.customThemes,
  });
  startTransition(() => onChange(String(themeId)));
  restoreTransitions(html);
}

