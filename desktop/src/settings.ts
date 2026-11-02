import { invoke } from "@tauri-apps/api/core";

export type Theme = "system" | "dark" | "light";

export const ACCENTS = [
  { id: "ocean", color: "#0a84ff", on: "#fff", dim: "#0071e3", text: "#2997ff", textDim: "#0066cc" },
  { id: "emerald", color: "#30d158", on: "#fff", dim: "#1f8a3c", text: "#30d158", textDim: "#1a7f37" },
  { id: "violet", color: "#bf5af2", on: "#fff", dim: "#8944ab", text: "#c77dff", textDim: "#8944ab" },
  { id: "rose", color: "#ff375f", on: "#fff", dim: "#d30f45", text: "#ff6482", textDim: "#d30f45" },
  { id: "amber", color: "#ff9f0a", on: "#fff", dim: "#b25000", text: "#ffb340", textDim: "#b25000" },
  { id: "cyan", color: "#64d2ff", on: "#fff", dim: "#0071a4", text: "#64d2ff", textDim: "#0071a4" },
  { id: "blue", color: "#5e5ce6", on: "#fff", dim: "#3634a3", text: "#7d7aff", textDim: "#3634a3" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

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

export function currentTheme(): Theme {
  const value = read("ethone-theme");
  return value === "dark" || value === "light" ? value : "system";
}

export function currentAccent(): AccentId {
  return ACCENTS.find((accent) => accent.id === read("ethone-accent-choice"))?.id ?? "ocean";
}

export function applyAppearance(theme = currentTheme(), accentId = currentAccent()) {
  const root = document.documentElement;
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
