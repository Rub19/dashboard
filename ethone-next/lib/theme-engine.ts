/**
 * ETHONE Premium Theme Engine
 *
 * Provides a single source of truth for the 5 premium themes, legacy theme
 * aliases, and a zero-JSX `applyTheme` helper that mutates the root element
 * directly for instant, zero-lag switching.
 *
 * Note on Worker KV sync: persisting the active theme across devices through
 * a Worker KV store requires a `kv_namespaces` binding in `worker/wrangler.jsonc`
 * and a dedicated Worker route. Until that binding is configured, the app uses
 * `localStorage` (via `saveSettings`) and Supabase (via `saveSettingsAsync`) as
 * the sync sources.
 */

export type PremiumTheme =
  | "obsidian"
  | "cyber-neon"
  | "solar-eclipse"
  | "northern-aurora"
  | "monochrome-studio";

export const PREMIUM_THEMES: PremiumTheme[] = [
  "obsidian",
  "cyber-neon",
  "solar-eclipse",
  "northern-aurora",
  "monochrome-studio",
];

export type ThemeDefinition = {
  label: string;
  description: string;
  bgMain: string;
  bgSurface: string;
  bgSidebar: string;
  borderSubtle: string;
  borderActive: string;
  accentPrimary: string;
  accentSecondary: string;
  accentContrast: string;
  glowColor: string;
  textPrimary: string;
  textMuted: string;
};

export const THEME_DEFINITIONS: Record<PremiumTheme, ThemeDefinition> = {
  obsidian: {
    label: "Obsidienne",
    description: "Fond profond, accents émeraude — calme et concentré.",
    bgMain: "#08080A",
    bgSurface: "#0F0F13",
    bgSidebar: "#0C0C10",
    borderSubtle: "rgba(255,255,255,0.06)",
    borderActive: "rgba(16,185,129,0.35)",
    accentPrimary: "#10B981",
    accentSecondary: "#06B6D4",
    accentContrast: "#0C0C10",
    glowColor: "rgba(16,185,129,0.25)",
    textPrimary: "#EDEDED",
    textMuted: "#9CA3AF",
  },
  "cyber-neon": {
    label: "Cyber Néon",
    description: "Rose néon et cyan électrique, ambiance futuriste.",
    bgMain: "#0A0814",
    bgSurface: "rgba(255,255,255,0.04)",
    bgSidebar: "#080612",
    borderSubtle: "rgba(255,255,255,0.08)",
    borderActive: "rgba(0,240,255,0.4)",
    accentPrimary: "#F43F5E",
    accentSecondary: "#00F0FF",
    accentContrast: "#FFFFFF",
    glowColor: "rgba(244,63,94,0.3)",
    textPrimary: "#F0E9FF",
    textMuted: "#A78BFA",
  },
  "solar-eclipse": {
    label: "Éclipse Solaire",
    description: "Ambre brûlant, contrastes chauds et intenses.",
    bgMain: "#0C0B0A",
    bgSurface: "#141311",
    bgSidebar: "#100F0E",
    borderSubtle: "rgba(255,255,255,0.05)",
    borderActive: "rgba(217,119,6,0.4)",
    accentPrimary: "#F59E0B",
    accentSecondary: "#D97706",
    accentContrast: "#0C0B0A",
    glowColor: "rgba(245,158,11,0.25)",
    textPrimary: "#F5F0E8",
    textMuted: "#A89F91",
  },
  "northern-aurora": {
    label: "Aurore Boréale",
    description: "Teal et ciel polaire, fluide et apaisant.",
    bgMain: "#060B11",
    bgSurface: "#0D151B",
    bgSidebar: "#090F14",
    borderSubtle: "rgba(255,255,255,0.06)",
    borderActive: "rgba(56,189,248,0.35)",
    accentPrimary: "#2DD4BF",
    accentSecondary: "#38BDF8",
    accentContrast: "#060B11",
    glowColor: "rgba(45,212,191,0.25)",
    textPrimary: "#E0F2FE",
    textMuted: "#94A3B8",
  },
  "monochrome-studio": {
    label: "Monochrome Studio",
    description: "Noir absolu, blanc pur, contraste maximal.",
    bgMain: "#000000",
    bgSurface: "#18181B",
    bgSidebar: "#101012",
    borderSubtle: "rgba(255,255,255,0.08)",
    borderActive: "rgba(255,255,255,0.25)",
    accentPrimary: "#FFFFFF",
    accentSecondary: "#71717A",
    accentContrast: "#000000",
    glowColor: "rgba(255,255,255,0.15)",
    textPrimary: "#FFFFFF",
    textMuted: "#A1A1AA",
  },
};

/** Legacy/old theme names mapped to the 5 premium IDs. */
const LEGACY_THEME_MAP: Record<string, PremiumTheme> = {
  default: "obsidian",
  night: "obsidian",
  graphite: "obsidian",
  obsidian: "obsidian",
  focus: "obsidian",
  glass: "obsidian",
  oled: "obsidian",
  midnight: "obsidian",
  cyberpunk: "cyber-neon",
  aurora: "northern-aurora",
  boreal: "northern-aurora",
  emerald: "northern-aurora",
  eclipse: "solar-eclipse",
  day: "monochrome-studio",
  minimal: "monochrome-studio",
};

/** Returns the matching premium ID for an old or new theme string. */
export function resolveLegacyTheme(theme: string): PremiumTheme {
  const id = String(theme || "").toLowerCase();
  if (PREMIUM_THEMES.includes(id as PremiumTheme)) return id as PremiumTheme;
  return LEGACY_THEME_MAP[id] ?? "obsidian";
}

/** Whether the OS reports a light color scheme preference. */
export function resolveAutoDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: light)")?.matches === true;
}

/** Resolve `auto` and legacy theme names to a premium theme ID. */
export function resolvePremiumTheme(theme: string): PremiumTheme {
  const raw = String(theme || "").toLowerCase();
  if (raw === "auto") return resolveAutoDark() ? "monochrome-studio" : "obsidian";
  return resolveLegacyTheme(raw);
}

export function resolveTheme(theme: string): { theme: PremiumTheme; dark: boolean } {
  const resolved = resolvePremiumTheme(theme);
  return { theme: resolved, dark: true };
}

/** Mix two CSS color strings in the srgb color space. */
function colorMix(a: string, b: string, pct = 50): string {
  return `color-mix(in srgb, ${a} ${pct}%, ${b})`;
}

/** Compute a black-or-white contrast color for an arbitrary accent hex. */
export function getContrastColor(hex: string): "#000000" | "#FFFFFF" {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.substring(0, 2), 16) || 0;
  const g = parseInt(normalized.substring(2, 4), 16) || 0;
  const b = parseInt(normalized.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#FFFFFF";
}

/** Apply a user-selected accent on top of a theme. */
export function applyAccent(root: HTMLElement, accent: string): void {
  const soft = accent + "33";
  const glow = `color-mix(in srgb, ${accent} 25%, transparent)`;
  const secondary = `color-mix(in srgb, ${accent} 70%, white)`;
  const borderActive = `color-mix(in srgb, ${accent} 35%, transparent)`;
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-primary", accent);
  root.style.setProperty("--accent-soft", soft);
  root.style.setProperty("--glow-color", glow);
  root.style.setProperty("--accent-contrast", getContrastColor(accent));
  root.style.setProperty("--accent-secondary", secondary);
  root.style.setProperty("--border-active", borderActive);
}

/**
 * Apply a premium theme directly to `document.documentElement`.
 * Unknown IDs fall back to `obsidian`. No React re-render required.
 */
export function applyTheme(themeId: PremiumTheme | string): void {
  if (typeof document === "undefined") return;

  const resolved = resolvePremiumTheme(String(themeId || ""));
  const def = THEME_DEFINITIONS[resolved];
  if (!def) return;

  const root = document.documentElement;

  root.setAttribute("data-theme", resolved);
  root.style.setProperty("--bg-main", def.bgMain);
  root.style.setProperty("--bg-surface", def.bgSurface);
  root.style.setProperty("--bg-sidebar", def.bgSidebar);
  root.style.setProperty("--bg-card", colorMix(def.bgSurface, def.bgSidebar, 35));
  root.style.setProperty("--bg-input", "rgba(255, 255, 255, 0.05)");
  root.style.setProperty("--bg-overlay", "rgba(0, 0, 0, 0.55)");
  root.style.setProperty("--bg-raised", def.bgSidebar);
  root.style.setProperty("--border-subtle", def.borderSubtle);
  root.style.setProperty("--border-active", def.borderActive);
  root.style.setProperty("--text-primary", def.textPrimary);
  root.style.setProperty("--text-secondary", colorMix(def.textPrimary, def.textMuted, 30));
  root.style.setProperty("--text-muted", def.textMuted);
  root.style.setProperty("--text-disabled", colorMix(def.textMuted, def.bgMain, 42));
  root.style.setProperty("--text-inverse", def.bgMain);
  root.style.setProperty("--accent-primary", def.accentPrimary);
  root.style.setProperty("--accent-secondary", def.accentSecondary);
  root.style.setProperty("--accent-contrast", def.accentContrast);
  root.style.setProperty("--glow-color", def.glowColor);

  // Keep the legacy token surface readable by the rest of the app.
  root.style.setProperty("--background", def.bgMain);
  root.style.setProperty("--foreground", def.textPrimary);
  root.style.setProperty("--surface", def.bgSurface);
  root.style.setProperty("--surface-raised", def.bgSidebar);
  root.style.setProperty("--border", def.borderSubtle);
  root.style.setProperty("--muted", def.textMuted);
  root.style.setProperty("--accent", def.accentPrimary);

  // v8 ambient canvas/text so the legacy v8 surfaces stay on-palette.
  root.style.setProperty("--v8-canvas", def.bgMain);
  root.style.setProperty("--v8-canvas-raised", def.bgSidebar);
  root.style.setProperty("--v8-text", def.textPrimary);
  root.style.setProperty("--v8-muted", def.textMuted);

  // All current premium themes are dark; color-scheme follows the resolved theme.
  root.style.colorScheme = "dark";
}
