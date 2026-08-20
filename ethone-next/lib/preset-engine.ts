import type { Settings } from "./settings";
import { PREMIUM_THEMES } from "./theme-engine";

export type Preset = {
  id: string;
  name: string;
  description: string;
  icon: string;
  theme: Settings["theme"];
  accent: "violet" | "mint" | "sky" | "amber" | "rose" | "teal" | "coral" | "custom";
  customAccentColor: string;
  aura: string;
  density: Settings["densityMode"];
  fontFamily: "inter" | "outfit" | "mono" | "serif" | "sans" | "jetbrains" | "editorial";
  radiusStyle: Settings["radiusStyle"];
  dockScale: Settings["dockScale"];
  dockAlign: Settings["dockAlign"];
  dockGlass: "default" | "ultra" | "opaque";
  dockAutoHide: boolean;
  dockMagnify: boolean;
  homeGrid: Settings["homeGrid"];
  homeHero: Settings["homeHero"];
  uiAnimations: Settings["uiAnimations"];
  uiGlow: boolean;
  uiSoundFeedback: boolean;
  spotlightEnabled: boolean;
  ambientEffectsEnabled: boolean;
  interfaceBlurEnabled: boolean;
};

const ALLOWED_DOCK_SCALE = new Set<string>(["normal", "compact", "large"]);
const ALLOWED_DOCK_ALIGN = new Set<string>(["center", "stretch"]);
const ALLOWED_DOCK_GLASS = new Set<string>(["default", "ultra", "opaque"]);
const ALLOWED_HOME_GRID = new Set<string>(["2", "3", "4"]);
const ALLOWED_HOME_HERO = new Set<string>(["full", "compact", "hidden"]);
const ALLOWED_UI_ANIMATIONS = new Set<string>(["smooth", "snappy", "reduced"]);
const ALLOWED_FONT_FAMILY = new Set<string>(["inter", "outfit", "mono", "serif"]);
const ALLOWED_RADIUS_STYLE = new Set<string>(["rounded", "soft", "sharp"]);
const ALLOWED_THEME: Settings["theme"][] = [...PREMIUM_THEMES, "auto"];
const ALLOWED_ACCENT: Preset["accent"][] = ["violet", "mint", "sky", "amber", "rose", "teal", "coral", "custom"];
const ALLOWED_DENSITY: Settings["densityMode"][] = [
  "spacious",
  "comfortable",
  "compact",
  "dense",
  "ultra-compact",
  "ultra",
  "normal",
  "airy",
  "automatic",
  "custom",
];

export const PRESET_FIELDS: (keyof Preset)[] = [
  "theme",
  "accent",
  "customAccentColor",
  "aura",
  "density",
  "fontFamily",
  "radiusStyle",
  "dockScale",
  "dockAlign",
  "dockGlass",
  "dockAutoHide",
  "dockMagnify",
  "homeGrid",
  "homeHero",
  "uiAnimations",
  "uiGlow",
  "uiSoundFeedback",
  "spotlightEnabled",
  "ambientEffectsEnabled",
  "interfaceBlurEnabled",
];

function preset(input: Preset): Preset {
  return Object.freeze({ ...input });
}

export const BUILT_IN_PRESETS: Preset[] = [
  preset({
    id: "productivity",
    name: "Productivité",
    description: "Clair, structuré, calme.",
    icon: "circle-check",
    theme: "obsidian",
    accent: "mint",
    customAccentColor: "#7be5c3",
    aura: "classic",
    density: "comfortable",
    fontFamily: "inter",
    radiusStyle: "rounded",
    dockScale: "normal",
    dockAlign: "center",
    dockGlass: "default",
    dockAutoHide: false,
    dockMagnify: true,
    homeGrid: "4",
    homeHero: "full",
    uiAnimations: "smooth",
    uiGlow: true,
    uiSoundFeedback: true,
    spotlightEnabled: true,
    ambientEffectsEnabled: true,
    interfaceBlurEnabled: true,
  }),
  preset({
    id: "focus",
    name: "Focus",
    description: "Minimum, calme, sans distraction.",
    icon: "focus",
    theme: "obsidian",
    accent: "sky",
    customAccentColor: "#7dd3fc",
    aura: "eclipse",
    density: "compact",
    fontFamily: "outfit",
    radiusStyle: "soft",
    dockScale: "compact",
    dockAlign: "center",
    dockGlass: "ultra",
    dockAutoHide: true,
    dockMagnify: false,
    homeGrid: "2",
    homeHero: "compact",
    uiAnimations: "snappy",
    uiGlow: false,
    uiSoundFeedback: false,
    spotlightEnabled: false,
    ambientEffectsEnabled: false,
    interfaceBlurEnabled: true,
  }),
  preset({
    id: "gaming",
    name: "Gaming",
    description: "Néon, énergie, contraste.",
    icon: "gamepad-2",
    theme: "cyber-neon",
    accent: "rose",
    customAccentColor: "#fb7185",
    aura: "cyberpunk",
    density: "compact",
    fontFamily: "mono",
    radiusStyle: "sharp",
    dockScale: "large",
    dockAlign: "stretch",
    dockGlass: "default",
    dockAutoHide: false,
    dockMagnify: true,
    homeGrid: "4",
    homeHero: "full",
    uiAnimations: "smooth",
    uiGlow: true,
    uiSoundFeedback: true,
    spotlightEnabled: true,
    ambientEffectsEnabled: true,
    interfaceBlurEnabled: true,
  }),
  preset({
    id: "creative",
    name: "Créatif",
    description: "Chaleur, espace, inspiration.",
    icon: "sparkles",
    theme: "solar-eclipse",
    accent: "violet",
    customAccentColor: "#a78bfa",
    aura: "emerald",
    density: "spacious",
    fontFamily: "serif",
    radiusStyle: "soft",
    dockScale: "normal",
    dockAlign: "center",
    dockGlass: "default",
    dockAutoHide: false,
    dockMagnify: true,
    homeGrid: "3",
    homeHero: "full",
    uiAnimations: "smooth",
    uiGlow: true,
    uiSoundFeedback: true,
    spotlightEnabled: true,
    ambientEffectsEnabled: true,
    interfaceBlurEnabled: true,
  }),
  preset({
    id: "minimal",
    name: "Minimal",
    description: "Léger, épuré, silencieux.",
    icon: "minimize-2",
    theme: "monochrome-studio",
    accent: "mint",
    customAccentColor: "#7be5c3",
    aura: "mineral",
    density: "spacious",
    fontFamily: "inter",
    radiusStyle: "rounded",
    dockScale: "compact",
    dockAlign: "center",
    dockGlass: "opaque",
    dockAutoHide: true,
    dockMagnify: false,
    homeGrid: "2",
    homeHero: "hidden",
    uiAnimations: "reduced",
    uiGlow: false,
    uiSoundFeedback: false,
    spotlightEnabled: false,
    ambientEffectsEnabled: false,
    interfaceBlurEnabled: false,
  }),
  preset({
    id: "developer",
    name: "Développement",
    description: "Compact, lisible, technique.",
    icon: "code",
    theme: "obsidian",
    accent: "amber",
    customAccentColor: "#fbbf24",
    aura: "boreal",
    density: "compact",
    fontFamily: "mono",
    radiusStyle: "sharp",
    dockScale: "normal",
    dockAlign: "stretch",
    dockGlass: "default",
    dockAutoHide: false,
    dockMagnify: true,
    homeGrid: "4",
    homeHero: "compact",
    uiAnimations: "snappy",
    uiGlow: true,
    uiSoundFeedback: true,
    spotlightEnabled: true,
    ambientEffectsEnabled: true,
    interfaceBlurEnabled: true,
  }),
];

export const PRESET_IDS: string[] = BUILT_IN_PRESETS.map((p) => p.id);

export function builtInPresetById(id: string): Preset | null {
  return BUILT_IN_PRESETS.find((p) => p.id === id) || null;
}

export function findPreset(id: string, customPresets: Preset[] = []): Preset | null {
  const custom = Array.isArray(customPresets) ? customPresets.find((p) => p?.id === id) : null;
  return custom || builtInPresetById(id) || null;
}

export function presetToSettings(preset: Preset): Partial<Settings> {
  const dockGlassMap: Record<Preset["dockGlass"], Settings["dockGlass"]> = {
    default: "vitrified",
    ultra: "ultra-blur",
    opaque: "sober",
  };
  return {
    theme: preset.theme,
    accentColor: preset.accent,
    customAccent: preset.customAccentColor,
    aura: preset.aura,
    densityMode: preset.density,
    fontFamily: preset.fontFamily === "inter" ? "inter" : preset.fontFamily,
    radiusStyle: preset.radiusStyle,
    dockScale: preset.dockScale,
    dockAlign: preset.dockAlign,
    dockGlass: dockGlassMap[preset.dockGlass],
    dockAutoHide: preset.dockAutoHide,
    dockMagnify: preset.dockMagnify,
    homeGrid: preset.homeGrid,
    homeHero: preset.homeHero,
    uiAnimations: preset.uiAnimations,
    uiGlow: preset.uiGlow,
    uiSoundFeedback: preset.uiSoundFeedback,
    spotlightEnabled: preset.spotlightEnabled,
    ambientEffectsEnabled: preset.ambientEffectsEnabled,
    interfaceBlurEnabled: preset.interfaceBlurEnabled,
  };
}

const DOCK_GLASS_REVERSE: Record<Settings["dockGlass"], Preset["dockGlass"]> = {
  vitrified: "default",
  "ultra-blur": "ultra",
  sober: "opaque",
};

export function settingsToPresetFields(settings: Settings): Partial<Preset> {
  return {
    theme: settings.theme,
    accent: settings.accentColor,
    customAccentColor: settings.customAccent,
    aura: settings.aura,
    density: settings.densityMode,
    fontFamily: settings.fontFamily,
    radiusStyle: settings.radiusStyle,
    dockScale: settings.dockScale,
    dockAlign: settings.dockAlign,
    dockGlass: DOCK_GLASS_REVERSE[settings.dockGlass],
    dockAutoHide: settings.dockAutoHide,
    dockMagnify: settings.dockMagnify,
    homeGrid: settings.homeGrid,
    homeHero: settings.homeHero,
    uiAnimations: settings.uiAnimations,
    uiGlow: settings.uiGlow,
    uiSoundFeedback: settings.uiSoundFeedback,
    spotlightEnabled: settings.spotlightEnabled,
    ambientEffectsEnabled: settings.ambientEffectsEnabled,
    interfaceBlurEnabled: settings.interfaceBlurEnabled,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function sanitizePreset(preset: unknown): Preset | null {
  if (!isObject(preset)) return null;

  const base = builtInPresetById(String(preset.id || "")) || BUILT_IN_PRESETS[0];

  const pickString = (key: keyof Preset, fallback: string, maxLength = 32): string =>
    String(preset[key] ?? fallback).slice(0, maxLength);

  const pickTheme = (value: unknown): Settings["theme"] =>
    typeof value === "string" && (ALLOWED_THEME as readonly string[]).includes(value) ? (value as Settings["theme"]) : base.theme;

  const pickAccent = (value: unknown): Preset["accent"] =>
    typeof value === "string" && (ALLOWED_ACCENT as readonly string[]).includes(value) ? (value as Preset["accent"]) : base.accent;

  const pickColor = (value: unknown, fallback: string): string => {
    const str = String(value || "").toLowerCase();
    return /^#[0-9a-f]{6}$/.test(str) ? str : fallback;
  };

  const pickEnum = <T extends string>(value: unknown, allowed: Set<string>, fallback: T): T =>
    typeof value === "string" && allowed.has(value) ? (value as T) : fallback;

  const pickDensity = (value: unknown): Settings["densityMode"] =>
    typeof value === "string" && (ALLOWED_DENSITY as readonly string[]).includes(value) ? (value as Settings["densityMode"]) : base.density;

  const pickBoolean = (value: unknown, fallback: boolean): boolean => (typeof value === "boolean" ? value : fallback);

  return Object.freeze({
    id: String(preset.id || `custom-${Date.now()}`).slice(0, 32),
    name: pickString("name", "Sans nom"),
    description: pickString("description", "", 80),
    icon: pickString("icon", "sparkles"),
    theme: pickTheme(preset.theme),
    accent: pickAccent(preset.accent),
    customAccentColor: pickColor(preset.customAccentColor, base.customAccentColor),
    aura: typeof preset.aura === "string" ? preset.aura : base.aura,
    density: pickDensity(preset.density),
    fontFamily: pickEnum(preset.fontFamily, ALLOWED_FONT_FAMILY, base.fontFamily),
    radiusStyle: pickEnum(preset.radiusStyle, ALLOWED_RADIUS_STYLE, base.radiusStyle),
    dockScale: pickEnum(preset.dockScale, ALLOWED_DOCK_SCALE, base.dockScale),
    dockAlign: pickEnum(preset.dockAlign, ALLOWED_DOCK_ALIGN, base.dockAlign),
    dockGlass: pickEnum(preset.dockGlass, ALLOWED_DOCK_GLASS, base.dockGlass),
    dockAutoHide: pickBoolean(preset.dockAutoHide, base.dockAutoHide),
    dockMagnify: pickBoolean(preset.dockMagnify, base.dockMagnify),
    homeGrid: pickEnum(preset.homeGrid, ALLOWED_HOME_GRID, base.homeGrid),
    homeHero: pickEnum(preset.homeHero, ALLOWED_HOME_HERO, base.homeHero),
    uiAnimations: pickEnum(preset.uiAnimations, ALLOWED_UI_ANIMATIONS, base.uiAnimations),
    uiGlow: pickBoolean(preset.uiGlow, base.uiGlow),
    uiSoundFeedback: pickBoolean(preset.uiSoundFeedback, base.uiSoundFeedback),
    spotlightEnabled: pickBoolean(preset.spotlightEnabled, base.spotlightEnabled),
    ambientEffectsEnabled: pickBoolean(preset.ambientEffectsEnabled, base.ambientEffectsEnabled),
    interfaceBlurEnabled: pickBoolean(preset.interfaceBlurEnabled, base.interfaceBlurEnabled),
  });
}

export type ApplyPresetResult = { ok: true; preset: Preset } | { ok: false; error: string };

export function applyPreset(
  preset: unknown,
  settings: Settings,
  updateSettings: (patch: Partial<Settings>) => void
): ApplyPresetResult {
  void settings;
  const valid = sanitizePreset(preset);
  if (!valid) return { ok: false, error: "Preset invalide" };

  const patch = presetToSettings(valid);
  updateSettings(patch);
  return { ok: true, preset: valid };
}

export function extractPresetFromState(
  settings: Settings,
  name?: string,
  description?: string,
  icon?: string
): Preset {
  const base = builtInPresetById("productivity") || BUILT_IN_PRESETS[0];
  const fields = settingsToPresetFields(settings);
  return sanitizePreset({
    ...base,
    id: `custom-${Date.now()}`,
    name: String(name || "Mon preset").slice(0, 32),
    description: String(description || "").slice(0, 80),
    icon: String(icon || "sparkles").slice(0, 32),
    ...fields,
  }) as Preset;
}

const CUSTOM_PRESETS_KEY = "ethone-presets";

export function loadCustomPresets(): Preset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p) => sanitizePreset(p)).filter((p): p is Preset => p !== null);
  } catch {
    return [];
  }
}

export function saveCustomPresets(presets: Preset[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets));
  } catch {
    /* silent */
  }
}

export function addCustomPreset(presets: Preset[], preset: Preset): Preset[] {
  const next = [...presets, preset];
  saveCustomPresets(next);
  return next;
}

export function removeCustomPreset(presets: Preset[], id: string): Preset[] {
  const next = presets.filter((p) => p.id !== id);
  saveCustomPresets(next);
  return next;
}
