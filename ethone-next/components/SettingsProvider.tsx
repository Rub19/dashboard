"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { loadSettings, saveSettings, Settings, DEFAULTS } from "@/lib/settings";

const THEMES: Record<string, { background: string; foreground: string; accent: string }> = {
  default: { background: "#0a0a0a", foreground: "#ededed", accent: "#8b5cf6" },
  boreal: { background: "#081016", foreground: "#e0f2fe", accent: "#06b6d4" },
  cyberpunk: { background: "#0f0514", foreground: "#ffe4e6", accent: "#f43f5e" },
  eclipse: { background: "#050505", foreground: "#f0e68c", accent: "#d4af37" },
  emerald: { background: "#05140f", foreground: "#d1fae5", accent: "#10b981" },
};

const SettingsContext = createContext<{
  settings: Settings;
  update: (s: Partial<Settings>) => void;
}>({ settings: DEFAULTS, update: () => {} });

export const useSettings = () => useContext(SettingsContext);

export default function SettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const theme = THEMES[settings.theme] || THEMES.default;
    root.style.setProperty("--background", settings.darkMode ? theme.background : "#f4f4f5");
    root.style.setProperty("--foreground", settings.darkMode ? theme.foreground : "#18181b");
    root.style.setProperty("--surface", settings.darkMode ? "#121214" : "#ffffff");
    root.style.setProperty("--surface-raised", settings.darkMode ? "#1a1a1e" : "#f4f4f5");
    root.style.setProperty("--border", settings.darkMode ? "#27272a" : "#e4e4e7");
    root.style.setProperty("--muted", settings.darkMode ? "#a1a1aa" : "#71717a");

    const ACCENTS: Record<string, string> = {
      violet: "#8b5cf6",
      mint: "#34d399",
      sky: "#38bdf8",
      amber: "#f59e0b",
      rose: "#f43f5e",
      teal: "#14b8a6",
      coral: "#f97316",
    };
    const accent = settings.accentColor === "custom" ? settings.customAccent : (ACCENTS[settings.accentColor] || theme.accent);
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-soft", accent + "33");

    root.style.setProperty("--font-size", `${settings.fontSize}%`);
    root.style.setProperty("--card-radius", `${settings.radius / 16}rem`);
    root.style.setProperty("--dock-radius", `${settings.dockRadius / 16}rem`);
    root.style.setProperty("--glass", settings.glassEnabled ? "0.85" : "1");
    root.dataset.cardTilt = settings.cardTilt ? "on" : "off";
    root.dataset.density = settings.densityMode;
    root.dataset.shadow = settings.shadow;
    root.dataset.background = settings.backgroundEffect;
    root.dataset.wallpaper = settings.wallpaper;
    root.dataset.font = settings.fontFamily;
    root.dataset.accent = settings.accentColor;
    root.dataset.layout = settings.layoutPreset;
    root.style.fontSize = `${settings.fontSize}%`;
    root.style.setProperty("--aurora-speed", `${60 - settings.backgroundSpeed}s`);
    if (settings.reducedMotion) {
      root.setAttribute("data-reduced-motion", "true");
    } else {
      root.removeAttribute("data-reduced-motion");
    }
  }, [settings]);

  function update(partial: Partial<Settings>) {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveSettings(next);
  }

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      {children}
    </SettingsContext.Provider>
  );
}
