export type Theme = "system" | "dark" | "light";

export const ACCENTS = [
  { id: "emerald", color: "#34d399", on: "#052e20" },
  { id: "violet", color: "#8b5cf6", on: "#ffffff" },
  { id: "rose", color: "#e03365", on: "#ffffff" },
  { id: "amber", color: "#f0a92b", on: "#2b1c02" },
  { id: "cyan", color: "#22b8cf", on: "#04262c" },
  { id: "blue", color: "#4c8df6", on: "#ffffff" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
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
  root.style.setProperty("--accent", accent.color);
  root.style.setProperty("--on-accent", accent.on);
  write("ethone-theme", theme);
  write("ethone-accent", accent.id);
}

export function storedLanguage(): "fr" | "en" | null {
  const value = read("ethone-language");
  return value === "fr" || value === "en" ? value : null;
}

export function setLanguage(language: "fr" | "en") {
  write("ethone-language", language);
  window.location.reload();
}
