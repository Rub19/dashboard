/**
 * ETHONE Theme Engine 3.0
 *
 * Central engine for resolving themes, applying tokens dynamically to the root DOM,
 * handling zero-flash startup, and supporting Dark/Light/Auto modes and custom themes.
 */

import {
  PRESET_THEMES,
  PRESET_THEME_IDS,
  UNIVERSAL_ACCENTS,
  getContrastColor,
  isValidHexColor,
  validateThemePayload,
  type PremiumThemeId,
  type ThemeDefinition,
  type AccentId,
} from "./theme-tokens";

export {
  PRESET_THEMES,
  PRESET_THEME_IDS,
  UNIVERSAL_ACCENTS,
  getContrastColor,
  isValidHexColor,
  validateThemePayload,
  type PremiumThemeId,
  type ThemeDefinition,
  type AccentId,
};

// Aliases for backwards compatibility
export type PremiumTheme = PremiumThemeId;
export const PREMIUM_THEMES = PRESET_THEME_IDS;
export const THEME_DEFINITIONS = PRESET_THEMES;

/** Map of legacy / alias names to current Theme IDs */
const LEGACY_THEME_MAP: Record<string, PremiumThemeId> = {
  default: "obsidian",
  night: "obsidian",
  graphite: "carbon",
  obsidian: "obsidian",
  focus: "obsidian",
  oled: "midnight",
  midnight: "midnight",
  cyberpunk: "cyber-neon",
  "cyber-neon": "cyber-neon",
  aurora: "aurora",
  "northern-aurora": "aurora",
  boreal: "aurora",
  emerald: "aurora",
  eclipse: "carbon",
  "solar-eclipse": "carbon",
  day: "arctic",
  light: "arctic",
  arctic: "arctic",
  minimal: "minimal",
  "monochrome-studio": "minimal",
  glass: "glass",
  "purple-space": "purple-space",
  space: "purple-space",
  carbon: "carbon",
  forest: "forest",
  sunset: "sunset",
  rose: "rose",
};

export function resolveLegacyTheme(theme: string): PremiumThemeId {
  const id = String(theme || "").toLowerCase().trim();
  if (PRESET_THEME_IDS.includes(id as PremiumThemeId)) return id as PremiumThemeId;
  return LEGACY_THEME_MAP[id] ?? "obsidian";
}

/** Whether the OS currently requests a light color scheme */
export function resolveAutoDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: light)")?.matches === true;
}

/** Resolve 'auto' and legacy aliases to a Theme ID */
export function resolvePremiumTheme(theme: string): PremiumThemeId {
  const raw = String(theme || "").toLowerCase().trim();
  if (raw === "auto") return resolveAutoDark() ? "arctic" : "obsidian";
  return resolveLegacyTheme(raw);
}

export function resolveTheme(theme: string): { theme: PremiumThemeId; dark: boolean } {
  const resolved = resolvePremiumTheme(theme);
  const def = PRESET_THEMES[resolved];
  return { theme: resolved, dark: def?.colorScheme !== "light" };
}

/** Mix two CSS color strings in srgb */
export function colorMix(a: string, b: string, pct = 50): string {
  return "color-mix(in srgb, " + a + " " + pct + "%, " + b + ")";
}

/** Apply universal or custom accent to the DOM root */
export function applyAccent(root: HTMLElement, accent: string): void {
  const safeAccent = isValidHexColor(accent) ? accent : "#8b5cf6";
  const soft = safeAccent + "33";
  const glow = colorMix(safeAccent, "transparent", 25);
  const secondary = colorMix(safeAccent, "white", 70);
  const borderActive = colorMix(safeAccent, "transparent", 40);
  const contrast = getContrastColor(safeAccent);

  root.style.setProperty("--accent", safeAccent);
  root.style.setProperty("--accent-primary", safeAccent);
  root.style.setProperty("--accent-soft", soft);
  root.style.setProperty("--glow-color", glow);
  root.style.setProperty("--accent-contrast", contrast);
  root.style.setProperty("--accent-secondary", secondary);
  root.style.setProperty("--border-active", borderActive);
}

export interface ApplyThemeOptions {
  accent?: string;
  customAccent?: string;
  glassLevel?: "off" | "low" | "medium" | "high";
  performanceMode?: "normal" | "low" | "quality" | "balanced" | "performance";
  customThemes?: ThemeDefinition[];
}

/**
 * Apply a theme directly to document.documentElement without causing full React tree re-mounts.
 */
export function applyTheme(themeId: string, options?: ApplyThemeOptions): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const rawId = String(themeId || "").trim();

  // 1. Check custom themes first
  let def: ThemeDefinition | undefined;
  if (options?.customThemes && options.customThemes.length > 0) {
    def = options.customThemes.find((t) => t.id === rawId);
  }

  // 2. Fall back to preset themes
  if (!def) {
    const resolvedId = resolvePremiumTheme(rawId);
    def = PRESET_THEMES[resolvedId] || PRESET_THEMES.obsidian;
  }

  const isLight = def.colorScheme === "light";

  // Data attributes for Tailwind / CSS selectors
  root.setAttribute("data-theme", def.id);
  root.setAttribute("data-color-scheme", isLight ? "light" : "dark");
  root.style.colorScheme = isLight ? "light" : "dark";

  // Theme core background tokens
  root.style.setProperty("--bg-main", def.bgMain);
  root.style.setProperty("--bg-surface", def.bgSurface);
  root.style.setProperty("--bg-surface-elevated", def.bgSurfaceElevated);
  root.style.setProperty("--bg-surface-hover", def.bgSurfaceHover);
  root.style.setProperty("--bg-sidebar", def.bgSidebar);
  root.style.setProperty("--bg-card", def.bgCard);
  root.style.setProperty("--bg-input", def.bgInput);
  root.style.setProperty("--bg-overlay", isLight ? "rgba(0, 0, 0, 0.35)" : "rgba(0, 0, 0, 0.65)");
  root.style.setProperty("--bg-raised", def.bgSidebar);

  // Border tokens
  root.style.setProperty("--border-subtle", def.borderSubtle);
  root.style.setProperty("--border-active", def.borderActive);
  root.style.setProperty("--border-focus", def.borderFocus);

  // Typography tokens
  root.style.setProperty("--text-primary", def.textPrimary);
  root.style.setProperty("--text-secondary", def.textSecondary);
  root.style.setProperty("--text-muted", def.textMuted);
  root.style.setProperty("--text-disabled", def.textDisabled);
  root.style.setProperty("--text-inverse", def.textInverse);

  // Default accent from theme
  root.style.setProperty("--accent-primary", def.accentPrimary);
  root.style.setProperty("--accent-secondary", def.accentSecondary);
  root.style.setProperty("--accent-contrast", def.accentContrast);
  root.style.setProperty("--glow-color", def.glowColor);

  // Glass levels configuration
  const glassSetting = options?.glassLevel || def.glassDefault || "medium";
  let blurPx = "20px";
  let glassOpacity = "85%";

  if (glassSetting === "off" || options?.performanceMode === "low" || options?.performanceMode === "performance") {
    blurPx = "0px";
    glassOpacity = "100%";
  } else if (glassSetting === "low") {
    blurPx = "10px";
    glassOpacity = "92%";
  } else if (glassSetting === "high") {
    blurPx = "28px";
    glassOpacity = "70%";
  }

  root.style.setProperty("--panel-blur", blurPx);
  root.style.setProperty("--panel-bg", colorMix(def.bgSurface, "transparent", parseInt(glassOpacity, 10)));
  root.style.setProperty("--panel-border", def.borderSubtle);

  // Backward compatibility tokens for legacy views
  root.style.setProperty("--background", def.bgMain);
  root.style.setProperty("--foreground", def.textPrimary);
  root.style.setProperty("--surface", def.bgSurface);
  root.style.setProperty("--surface-raised", def.bgSidebar);
  root.style.setProperty("--border", def.borderSubtle);
  root.style.setProperty("--muted", def.textMuted);
  root.style.setProperty("--accent", def.accentPrimary);

  // Apply custom/override accent if provided
  if (options?.accent) {
    const activeAccent = options.accent === "custom" && options.customAccent ? options.customAccent : options.accent;
    applyAccent(root, activeAccent);
  }
}
