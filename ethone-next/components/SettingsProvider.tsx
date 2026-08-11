"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useProfiles, type Profile } from "@/lib/hooks/useProfiles";
import { loadSettings, saveSettings, saveSettingsAsync, loadSettingsAsync, Settings, DEFAULTS, type ThemeMode } from "@/lib/settings";

const THEMES: Record<ThemeMode, { background: string; foreground: string; accent: string }> = {
  default: { background: "#0a0a0a", foreground: "#ededed", accent: "#8b5cf6" },
  boreal: { background: "#081016", foreground: "#e0f2fe", accent: "#06b6d4" },
  cyberpunk: { background: "#0f0514", foreground: "#ffe4e6", accent: "#f43f5e" },
  eclipse: { background: "#050505", foreground: "#f0e68c", accent: "#d4af37" },
  emerald: { background: "#05140f", foreground: "#d1fae5", accent: "#10b981" },
  night: { background: "#0c0c0e", foreground: "#f1f1f3", accent: "#7c7c9c" },
  graphite: { background: "#17171a", foreground: "#e4e4e7", accent: "#a1a1aa" },
  day: { background: "#f4f4f5", foreground: "#18181b", accent: "#8b5cf6" },
  auto: { background: "#0a0a0a", foreground: "#ededed", accent: "#8b5cf6" },
  midnight: { background: "#05050a", foreground: "#e2e2e6", accent: "#6d6d8a" },
  obsidian: { background: "#020203", foreground: "#e8e8ec", accent: "#4a4a5e" },
  aurora: { background: "#0b1220", foreground: "#e0f2fe", accent: "#38bdf8" },
  minimal: { background: "#fafafa", foreground: "#18181b", accent: "#27272a" },
  focus: { background: "#111113", foreground: "#d4d4d8", accent: "#71717a" },
  glass: { background: "#000000", foreground: "#f0f0f3", accent: "#c4c4cc" },
  oled: { background: "#000000", foreground: "#ffffff", accent: "#5b5b5b" },
};

function resolveAutoDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: light)")?.matches === true;
}

const DENSITY_PRESETS = {
  spacious: { fontScale: 1.05, lineHeight: 1.65, cardPadding: 28, sectionGap: 30, controlHeight: 44, panelWidth: 400, iconSize: 21, rowHeight: 58, tableRowHeight: 52, widgetScale: 1.06, toolbarHeight: 58 },
  comfortable: { fontScale: 1, lineHeight: 1.55, cardPadding: 22, sectionGap: 24, controlHeight: 38, panelWidth: 360, iconSize: 20, rowHeight: 50, tableRowHeight: 46, widgetScale: 1, toolbarHeight: 52 },
  compact: { fontScale: 0.96, lineHeight: 1.48, cardPadding: 17, sectionGap: 18, controlHeight: 36, panelWidth: 340, iconSize: 18, rowHeight: 44, tableRowHeight: 40, widgetScale: 0.96, toolbarHeight: 48 },
  dense: { fontScale: 0.92, lineHeight: 1.4, cardPadding: 12, sectionGap: 12, controlHeight: 32, panelWidth: 300, iconSize: 16, rowHeight: 38, tableRowHeight: 34, widgetScale: 0.9, toolbarHeight: 42 },
  "ultra-compact": { fontScale: 0.92, lineHeight: 1.42, cardPadding: 13, sectionGap: 14, controlHeight: 34, panelWidth: 320, iconSize: 17, rowHeight: 40, tableRowHeight: 36, widgetScale: 0.92, toolbarHeight: 44 },
  ultra: { fontScale: 0.92, lineHeight: 1.42, cardPadding: 13, sectionGap: 14, controlHeight: 34, panelWidth: 320, iconSize: 17, rowHeight: 40, tableRowHeight: 36, widgetScale: 0.92, toolbarHeight: 44 },
  normal: { fontScale: 1, lineHeight: 1.55, cardPadding: 22, sectionGap: 24, controlHeight: 38, panelWidth: 360, iconSize: 20, rowHeight: 50, tableRowHeight: 46, widgetScale: 1, toolbarHeight: 52 },
  airy: { fontScale: 1.05, lineHeight: 1.65, cardPadding: 28, sectionGap: 30, controlHeight: 44, panelWidth: 400, iconSize: 21, rowHeight: 58, tableRowHeight: 52, widgetScale: 1.06, toolbarHeight: 58 },
  automatic: { fontScale: 1, lineHeight: 1.55, cardPadding: 22, sectionGap: 24, controlHeight: 38, panelWidth: 360, iconSize: 20, rowHeight: 50, tableRowHeight: 46, widgetScale: 1, toolbarHeight: 52 },
  custom: { fontScale: 1, lineHeight: 1.55, cardPadding: 22, sectionGap: 24, controlHeight: 38, panelWidth: 360, iconSize: 20, rowHeight: 50, tableRowHeight: 46, widgetScale: 1, toolbarHeight: 52 },
};

const UNIT: Record<string, string> = {
  fontScale: "",
  lineHeight: "",
  cardPadding: "px",
  sectionGap: "px",
  controlHeight: "px",
  panelWidth: "px",
  iconSize: "px",
  rowHeight: "px",
  tableRowHeight: "px",
  widgetScale: "",
  toolbarHeight: "px",
};

function resolveTheme(theme: ThemeMode): { dark: boolean; theme: ThemeMode } {
  if (theme === "day" || theme === "minimal") return { dark: false, theme };
  if (theme === "auto") return { dark: !resolveAutoDark(), theme: resolveAutoDark() ? "day" : "midnight" };
  return { dark: true, theme };
}

const ACCENTS: Record<string, string> = {
  violet: "#8b5cf6",
  mint: "#34d399",
  sky: "#38bdf8",
  amber: "#f59e0b",
  rose: "#f43f5e",
  teal: "#14b8a6",
  coral: "#f97316",
};

const SettingsContext = createContext<{
  settings: Settings;
  update: (s: Partial<Settings>) => void;
}>({ settings: DEFAULTS, update: () => {} });

export const useSettings = () => useContext(SettingsContext);

type ActiveProfileValue = {
  active: string;
  activeProfile: Profile | null;
  loaded: boolean;
  reload: () => Promise<void>;
};

const ActiveProfileContext = createContext<ActiveProfileValue>({
  active: "",
  activeProfile: null,
  loaded: false,
  reload: async () => {},
});

export const useActiveProfile = () => useContext(ActiveProfileContext);

export default function SettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { active, activeProfile, loaded, reload } = useProfiles();
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  const activeContext = useMemo<ActiveProfileValue>(
    () => ({ active, activeProfile, loaded, reload }),
    [active, activeProfile, loaded, reload]
  );

  useEffect(() => {
    if (!loaded) return;
    const local = loadSettings(active || undefined);
    setSettings(local);
    loadSettingsAsync(active || undefined).then((remote) => {
      setSettings({ ...local, ...remote });
    });
  }, [loaded, active]);

  useEffect(() => {
    const root = document.documentElement;
    const resolved = resolveTheme(settings.theme);
    const theme = THEMES[resolved.theme] || THEMES.default;
    const isDark = settings.theme === "auto" ? resolved.dark : settings.theme === "day" || settings.theme === "minimal" ? false : settings.darkMode;
    root.style.setProperty("--background", isDark ? theme.background : "#f4f4f5");
    root.style.setProperty("--foreground", isDark ? theme.foreground : "#18181b");
    root.style.setProperty("--surface", isDark ? "#121214" : "#ffffff");
    root.style.setProperty("--surface-raised", isDark ? "#1a1a1e" : "#f4f4f5");
    root.style.setProperty("--border", isDark ? "#27272a" : "#e4e4e7");
    root.style.setProperty("--muted", isDark ? "#a1a1aa" : "#71717a");

    const accent = settings.accentColor === "custom" ? settings.customAccent : (ACCENTS[settings.accentColor] || theme.accent);
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-soft", accent + "33");

    root.style.setProperty("--font-size", `${settings.fontSize}%`);
    root.style.setProperty("--card-radius", `${settings.radius / 16}rem`);
    root.style.setProperty("--dock-radius", `${settings.dockRadius / 16}rem`);
    root.style.setProperty("--glass", settings.glassEnabled ? "0.85" : "1");
    root.dataset.cardTilt = settings.cardTilt ? "on" : "off";
    root.dataset.theme = settings.theme;
    root.dataset.density = settings.densityMode;
    root.dataset.shadow = settings.shadow;
    root.dataset.background = settings.backgroundEffect;
    root.dataset.wallpaper = settings.wallpaper;
    root.dataset.font = settings.fontFamily;
    root.dataset.accent = settings.accentColor;
    root.dataset.layout = settings.layoutPreset;
    root.dataset.radiusStyle = settings.radiusStyle;
    root.dataset.dockScale = settings.dockScale;
    root.dataset.dockAlign = settings.dockAlign;
    root.dataset.dockGlass = settings.dockGlass;
    root.dataset.dockAutoHide = settings.dockAutoHide ? "true" : "false";
    root.dataset.dockMagnify = settings.dockMagnify ? "true" : "false";
    root.dataset.uiAnimations = settings.uiAnimations;
    root.dataset.uiGlow = settings.uiGlow ? "true" : "false";
    root.dataset.uiSoundFeedback = settings.uiSoundFeedback ? "true" : "false";
    root.dataset.spotlight = settings.spotlightEnabled ? "true" : "false";
    root.dataset.ambientEffects = settings.ambientEffectsEnabled ? "true" : "false";
    root.dataset.interfaceBlur = settings.interfaceBlurEnabled ? "true" : "false";
    root.style.fontSize = `${settings.fontSize}%`;
    root.style.setProperty("--aurora-speed", `${60 - settings.backgroundSpeed}s`);
    if (settings.reducedMotion) {
      root.setAttribute("data-reduced-motion", "true");
    } else {
      root.removeAttribute("data-reduced-motion");
    }

    const densityValues = DENSITY_PRESETS[settings.densityMode as keyof typeof DENSITY_PRESETS] || DENSITY_PRESETS.comfortable;
    Object.entries(densityValues).forEach(([key, value]) => {
      root.style.setProperty(`--density-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`, `${value}${UNIT[key] || ""}`);
    });
  }, [settings]);

  function update(partial: Partial<Settings>) {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveSettings(next, active || undefined);
    saveSettingsAsync(next, active || undefined);
  }

  return (
    <ActiveProfileContext.Provider value={activeContext}>
      <SettingsContext.Provider value={{ settings, update }}>
        {children}
      </SettingsContext.Provider>
    </ActiveProfileContext.Provider>
  );
}
