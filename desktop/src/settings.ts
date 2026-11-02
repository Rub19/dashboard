import { invoke } from "@tauri-apps/api/core";

export type Theme = "system" | "dark" | "light";

export const ACCENTS = [
  { id: "emerald", color: "#34d399", on: "#052e20", dim: "#0b7a55" },
  { id: "violet", color: "#a78bfa", on: "#1d1147", dim: "#6d3fd6" },
  { id: "rose", color: "#f4638b", on: "#3b0519", dim: "#c1234f" },
  { id: "amber", color: "#f0a92b", on: "#2b1c02", dim: "#94600a" },
  { id: "cyan", color: "#3cc6dc", on: "#04262c", dim: "#0d7385" },
  { id: "blue", color: "#6ea8fa", on: "#06204a", dim: "#2563c9" },
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
  return ACCENTS.find((accent) => accent.id === read("ethone-accent"))?.id ?? "emerald";
}

export function applyAppearance(theme = currentTheme(), accentId = currentAccent()) {
  const root = document.documentElement;
  const accent = ACCENTS.find((item) => item.id === accentId) ?? ACCENTS[0];
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  root.style.setProperty("--accent-bright", accent.color);
  root.style.setProperty("--on-accent-bright", accent.on);
  root.style.setProperty("--accent-dim", accent.dim);
  write("ethone-theme", theme);
  write("ethone-accent", accent.id);
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
