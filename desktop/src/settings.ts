import { invoke } from "@tauri-apps/api/core";

export type Theme = "system" | "dark" | "light";

export const ACCENTS = [
  { id: "mono", color: "#e8e8ec", on: "#111", dim: "#d4d4d8", text: "#f2f2f5", textDim: "#3a3a40" },
  { id: "ocean", color: "#0a84ff", on: "#fff", dim: "#0071e3", text: "#2997ff", textDim: "#0066cc" },
  { id: "emerald", color: "#30d158", on: "#fff", dim: "#1f8a3c", text: "#30d158", textDim: "#1a7f37" },
  { id: "violet", color: "#bf5af2", on: "#fff", dim: "#8944ab", text: "#c77dff", textDim: "#8944ab" },
  { id: "rose", color: "#ff375f", on: "#fff", dim: "#d30f45", text: "#ff6482", textDim: "#d30f45" },
  { id: "amber", color: "#ff9f0a", on: "#fff", dim: "#b25000", text: "#ffb340", textDim: "#b25000" },
  { id: "cyan", color: "#64d2ff", on: "#fff", dim: "#0071a4", text: "#64d2ff", textDim: "#0071a4" },
  { id: "blue", color: "#5e5ce6", on: "#fff", dim: "#3634a3", text: "#7d7aff", textDim: "#3634a3" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

export const LOOKS = [
  { id: "ethone", theme: "dark", accent: "ocean", fr: "Ethone", en: "Ethone", textFr: "Bleu nuit lumineux", textEn: "Bright midnight blue", colors: ["#0b1020", "#2f6bff", "#7c4dff"] },
  { id: "obsidian", theme: "dark", accent: "violet", fr: "Obsidienne", en: "Obsidian", textFr: "Noir violet profond", textEn: "Deep violet black", colors: ["#0e0b16", "#7c4dff", "#ff4fd8"] },
  { id: "neon", theme: "dark", accent: "cyan", fr: "Cyber Neon", en: "Cyber Neon", textFr: "Cyan et magenta électriques", textEn: "Electric cyan and magenta", colors: ["#070b14", "#00e5ff", "#ff2bd6"] },
  { id: "aurora", theme: "dark", accent: "emerald", fr: "Aurore", en: "Aurora", textFr: "Vert et violet boréal", textEn: "Northern green and violet", colors: ["#07141a", "#17e6a1", "#7a5cff"] },
  { id: "sunset", theme: "dark", accent: "rose", fr: "Crépuscule", en: "Sunset", textFr: "Prune, rose et orange", textEn: "Plum, pink and orange", colors: ["#170c1a", "#ff5c7a", "#ff9f43"] },
  { id: "solar", theme: "dark", accent: "amber", fr: "Éclipse solaire", en: "Solar eclipse", textFr: "Noir chaud, couronne dorée", textEn: "Warm black, golden corona", colors: ["#120a06", "#ff7a18", "#ffd166"] },
  { id: "mono", theme: "dark", accent: "mono", fr: "Monochrome", en: "Monochrome", textFr: "Noir et blanc, sans couleur", textEn: "Black and white, no color", colors: ["#0e0e10", "#6b6b73", "#34343a"] },
  { id: "daylight", theme: "light", accent: "ocean", fr: "Jour", en: "Daylight", textFr: "Clair et lumineux", textEn: "Light and bright", colors: ["#eef2fb", "#6ea8ff", "#c8a6ff"] },
  { id: "windows", theme: "system", accent: "ocean", fr: "Windows", en: "Windows", textFr: "Suit Windows, avec transparence", textEn: "Follows Windows, with transparency", colors: ["#2a2a2e", "#55555c", "#3a3a40"] },
] as const;
export type LookId = (typeof LOOKS)[number]["id"];
export type Density = "comfortable" | "compact";
export type MotionPreference = "system" | "reduced";
export type TransparencyPreference = "system" | "reduced";
export type TextScale = 90 | 100 | 110 | 125;

export interface InterfacePreferences {
  density: Density;
  motion: MotionPreference;
  transparency: TransparencyPreference;
  textScale: TextScale;
}

export const DEFAULT_INTERFACE_PREFERENCES: InterfacePreferences = {
  density: "comfortable",
  motion: "system",
  transparency: "system",
  textScale: 100,
};

const INTERFACE_KEY = "ethone-interface-preferences";
export const INTERFACE_EVENT = "ethone-interface-preferences";
const DENSITIES: Density[] = ["comfortable", "compact"];
const MOTIONS: MotionPreference[] = ["system", "reduced"];
const TRANSPARENCIES: TransparencyPreference[] = ["system", "reduced"];
const TEXT_SCALES: TextScale[] = [90, 100, 110, 125];

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
}

export function readJson<T>(key: string): T | null {
  try {
    return JSON.parse(read(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}

const SETTINGS_KEYS = ["ethone-start-page", "ethone-contrast", "ethone-automations", "ethone-lol-lp", "ethone-ui-sound", "ethone-look", "ethone-theme", "ethone-accent-choice", "ethone-interface-preferences", "ethone-language", "ethone-home-hidden", "ethone-pinned-apps", "ethone-rss-feeds", "ethone-weather-city", "ethone-sidebar-compact", "ethone-focus-minutes", "ethone-desktop-prefs"];

export function exportSettings(): string {
  const values = Object.fromEntries(SETTINGS_KEYS.flatMap((key) => {
    const value = read(key);
    return value === null ? [] : [[key, value]];
  }));
  return JSON.stringify({ app: "ethone-desktop", values }, null, 2);
}

export function parseSettings(text: string): [string, string][] {
  const parsed = JSON.parse(text) as { app?: string; values?: Record<string, unknown> };
  if (parsed?.app !== "ethone-desktop" || !parsed.values) throw new Error("invalid");
  return Object.entries(parsed.values).filter((entry): entry is [string, string] => SETTINGS_KEYS.includes(entry[0]) && typeof entry[1] === "string");
}

export function currentLook(): LookId {
  return LOOKS.find((look) => look.id === read("ethone-look"))?.id ?? "ethone";
}

export function applyLook(id: LookId) {
  const look = LOOKS.find((item) => item.id === id) ?? LOOKS[0];
  write("ethone-look", look.id);
  applyAppearance(look.theme, look.accent);
}

export function currentTheme(): Theme {
  const value = read("ethone-theme");
  return value === "dark" || value === "light" ? value : "system";
}

export function currentAccent(): AccentId {
  return ACCENTS.find((accent) => accent.id === read("ethone-accent-choice"))?.id ?? "ocean";
}

export function normalizeInterfacePreferences(value: unknown): InterfacePreferences {
  const source = value && typeof value === "object" ? value as Partial<InterfacePreferences> : {};
  return {
    density: DENSITIES.includes(source.density as Density) ? source.density as Density : DEFAULT_INTERFACE_PREFERENCES.density,
    motion: MOTIONS.includes(source.motion as MotionPreference) ? source.motion as MotionPreference : DEFAULT_INTERFACE_PREFERENCES.motion,
    transparency: TRANSPARENCIES.includes(source.transparency as TransparencyPreference) ? source.transparency as TransparencyPreference : DEFAULT_INTERFACE_PREFERENCES.transparency,
    textScale: TEXT_SCALES.includes(source.textScale as TextScale) ? source.textScale as TextScale : DEFAULT_INTERFACE_PREFERENCES.textScale,
  };
}

export function currentInterfacePreferences(): InterfacePreferences {
  return normalizeInterfacePreferences(readJson<unknown>(INTERFACE_KEY));
}

export function applyInterfacePreferences(preferences = currentInterfacePreferences()): InterfacePreferences {
  const next = normalizeInterfacePreferences(preferences);
  const root = document.documentElement;
  root.dataset.density = next.density;
  root.dataset.motion = next.motion;
  root.dataset.transparency = next.transparency;
  root.style.setProperty("--text-scale", String(next.textScale / 100));
  const opaque = next.transparency === "reduced" || window.matchMedia("(prefers-reduced-transparency: reduce)").matches;
  if (opaque) root.classList.remove("mica");
  else void invoke<boolean>("window_setup").then((mica) => root.classList.toggle("mica", mica)).catch(() => undefined);
  write(INTERFACE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent<InterfacePreferences>(INTERFACE_EVENT, { detail: next }));
  return next;
}

export function applyAppearance(theme: Theme = LOOKS.find((look) => look.id === currentLook())?.theme ?? currentTheme(), accentId: AccentId = read("ethone-look") ? currentAccent() : LOOKS[0].accent) {
  const root = document.documentElement;
  root.dataset.look = currentLook();
  const accent = ACCENTS.find((item) => item.id === accentId) ?? ACCENTS[0];
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  root.style.setProperty("--accent-bright", accent.color);
  root.style.setProperty("--on-accent-bright", accent.on);
  root.style.setProperty("--accent-dim", accent.dim);
  root.style.setProperty("--accent-text-bright", accent.text);
  root.style.setProperty("--accent-text-dim", accent.textDim);
  write("ethone-theme", theme);
  write("ethone-accent-choice", accent.id);
  void invoke("window_theme", { theme }).catch(() => undefined);
}

export function storedLanguage(): "fr" | "en" | null {
  const value = read("ethone-language");
  return value === "fr" || value === "en" ? value : null;
}

export function setLanguage(language: "fr" | "en") {
  write("ethone-language", language);
  window.location.reload();
}
