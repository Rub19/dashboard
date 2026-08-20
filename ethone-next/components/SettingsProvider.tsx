"use client";

import { activityJournal } from "@/lib/activity-journal";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { deepEqual } from "@/lib/equal";
import { useProfiles, type Profile } from "@/lib/hooks/useProfiles";
import { loadSettings, saveSettings, saveSettingsAsync, loadSettingsAsync, migrateSettings, Settings, DEFAULTS, type ThemeMode } from "@/lib/settings";
import { applyPreset, type Preset } from "@/lib/preset-engine";
import { supabase } from "@/lib/supabase";
import { useSyncStore } from "@/lib/stores/sync";
import {
  PREMIUM_THEMES,
  THEME_DEFINITIONS,
  applyTheme,
  resolveLegacyTheme,
  resolveTheme,
} from "@/lib/theme-engine";

/** Backwards-compatible theme color reference used by a few consumers. */
export const THEMES: Record<ThemeMode, { background: string; foreground: string; accent: string }> = Object.fromEntries(
  [
    ...PREMIUM_THEMES.map((id) => [
      id,
      {
        background: THEME_DEFINITIONS[id].bgMain,
        foreground: THEME_DEFINITIONS[id].textPrimary,
        accent: THEME_DEFINITIONS[id].accentPrimary,
      },
    ]),
    ["auto" as ThemeMode, { background: "#08080a", foreground: "#ededed", accent: "#10b981" }],
  ]
) as Record<ThemeMode, { background: string; foreground: string; accent: string }>;

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

export const ACCENTS: Record<string, string> = {
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
  applyPreset: (preset: Preset | unknown) => { ok: true; preset: Preset } | { ok: false; error: string };
}>({ settings: DEFAULTS, update: () => {}, applyPreset: () => ({ ok: false, error: "Provider non initialisé" }) });

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
    useSyncStore.getState().setStatus("user_settings", "syncing");
    loadSettingsAsync()
      .then((remote) => {
        setSettings((prev) => {
          const next = { ...DEFAULTS, ...local, ...remote };
          return deepEqual(next, prev) ? prev : next;
        });
        useSyncStore.getState().setStatus("user_settings", "idle");
      })
      .catch(() => {
        useSyncStore.getState().setStatus("user_settings", "error");
      });
  }, [loaded, active]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribe() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (!userId) return;

        channel = supabase
          .channel(`user_settings_changes_${userId.slice(0, 8)}_${Date.now()}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "user_settings",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              if (payload.new && typeof payload.new === "object") {
                const partial = (payload.new as Record<string, unknown>).settings as Partial<Settings>;
                if (partial) {
                  setSettings((prev) => {
                    const next = { ...DEFAULTS, ...prev, ...migrateSettings(partial) };
                    return deepEqual(next, prev) ? prev : next;
                  });
                }
              }
            }
          );
        await channel.subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            useSyncStore.getState().setStatus("user_settings", "offline");
          }
        });
      } catch {
        // Table or realtime unavailable; local storage is the fallback.
        useSyncStore.getState().setStatus("user_settings", "offline");
      }
    }

    subscribe().catch(() => {});
    return () => {
      try {
        channel?.unsubscribe();
      } catch {
        // Ignore cleanup errors for optional realtime channel.
      }
    };
  }, [loaded]);

  useEffect(() => {
    const root = document.documentElement;

    // Apply the premium theme engine directly to the root for zero-lag switching.
    applyTheme(settings.theme);

    const resolved = resolveTheme(settings.theme);
    const def = THEME_DEFINITIONS[resolved.theme];

    // All premium themes are dark; the resolved theme is the source of truth.
    const isDark = true;

    // Derive the legacy app tokens from the resolved premium theme.
    root.style.setProperty("--background", def.bgMain);
    root.style.setProperty("--foreground", def.textPrimary);
    root.style.setProperty("--surface", def.bgSurface);
    root.style.setProperty("--surface-raised", def.bgSurface);
    root.style.setProperty("--border", def.borderSubtle);
    root.style.setProperty("--muted", def.textMuted);

    const accent = settings.accentColor === "custom" ? settings.customAccent : (ACCENTS[settings.accentColor] || def.accentPrimary);
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-soft", accent + "33");

    const densityValues = DENSITY_PRESETS[settings.densityMode as keyof typeof DENSITY_PRESETS] || DENSITY_PRESETS.comfortable;

    root.style.setProperty("--font-size", `${settings.fontSize}%`);
    root.style.setProperty("--card-radius", `${Math.min(settings.radius / 16, 1)}rem`);
    root.style.setProperty("--dock-radius", `${Math.min(settings.dockRadius / 16, 1)}rem`);

    const radiusStyleMultiplier =
      settings.radiusStyle === "sharp" ? 0.25 :
      settings.radiusStyle === "soft" ? 0.5 : 1;
    // Cap the panel radius at 12px (rounded-xl) so panels stay geometric and
    // controls (buttons, inputs) do not become pill-shaped. Large Bento cards
    // can still use the dedicated 16px card radius.
    const panelRadiusRem = Math.min((settings.radius / 16) * radiusStyleMultiplier, 0.75);
    root.style.setProperty("--panel-radius", `${panelRadiusRem}rem`);
    root.style.setProperty("--control-radius", `${panelRadiusRem}rem`);

    const panelBase = settings.glassEnabled ? "var(--surface-raised)" : "var(--surface-raised)";
    const panelOpacity = settings.glassEnabled ? "88%" : "100%";
    const panelBlur = settings.interfaceBlurEnabled ? "14px" : "0px";
    const panelBorderOpacity = settings.glassEnabled ? "65%" : "100%";
    root.style.setProperty("--panel-bg", `color-mix(in srgb, ${panelBase} ${panelOpacity}, transparent)`);
    root.style.setProperty("--panel-blur", panelBlur);
    root.style.setProperty("--panel-border", `color-mix(in srgb, var(--border) ${panelBorderOpacity}, transparent)`);
    root.style.setProperty("--panel-padding", `${densityValues.cardPadding || 16}px`);
    root.style.setProperty("--item-gap", `${densityValues.sectionGap || 16}px`);

    root.style.setProperty("--icon-radius", {
      square: "0px",
      rounded: "0.5rem",
      circle: "9999px",
      pill: "9999px",
    }[settings.iconRadius] || "0.5rem");
    root.style.setProperty("--glass", settings.glassEnabled ? "0.85" : "1");
    root.style.colorScheme = isDark ? "dark" : "light";
    root.dataset.glassEnabled = settings.glassEnabled ? "true" : "false";
    root.dataset.cardTilt = settings.cardTilt ? "on" : "off";
    root.dataset.theme = resolved.theme;
    root.dataset.darkMode = settings.darkMode ? "true" : "false";
    root.dataset.density = settings.densityMode;
    root.dataset.densityMode = settings.densityMode;
    root.dataset.dataSpace = active || "personal";
    root.dataset.shadow = settings.shadow;
    root.dataset.background = settings.backgroundEffect;
    root.dataset.backgroundQuality = settings.backgroundQuality;
    root.dataset.wallpaper = settings.wallpaper;
    root.dataset.font = settings.fontFamily;
    root.dataset.accent = settings.accentColor;
    root.dataset.layout = settings.layoutPreset;
    root.dataset.radiusStyle = settings.radiusStyle;
    root.dataset.iconRadius = settings.iconRadius;
    root.dataset.dockScale = settings.dockScale;
    root.dataset.dockAlign = settings.dockAlign;
    root.dataset.dockGlass = settings.dockGlass;
    root.dataset.dockAutoHide = settings.dockAutoHide ? "true" : "false";
    root.dataset.dockMagnify = settings.dockMagnify ? "true" : "false";
    root.dataset.aura = settings.aura;
    root.dataset.homeGrid = settings.homeGrid;
    root.dataset.homeHero = settings.homeHero;
    root.dataset.uiAnimations = settings.uiAnimations;
    root.dataset.uiGlow = settings.uiGlow ? "true" : "false";
    root.dataset.uiSoundFeedback = settings.uiSoundFeedback ? "true" : "false";
    root.dataset.spotlight = settings.spotlightEnabled ? "true" : "false";
    root.dataset.ambientEffects = settings.ambientEffectsEnabled ? "true" : "false";
    root.dataset.interfaceBlur = settings.interfaceBlurEnabled ? "true" : "false";
    root.dataset.zenMode = settings.zenMode ? "true" : "false";
    root.dataset.sessionMode = settings.sessionMode;
    root.style.fontSize = `${settings.fontSize}%`;
    root.style.setProperty("--aurora-speed", `${60 - settings.backgroundSpeed}s`);
    root.style.setProperty("--v8-breathe-duration", "0s");
    root.style.setProperty("--v8-ambient-transition", settings.uiAnimations === "snappy" ? "100ms" : settings.uiAnimations === "reduced" ? "1ms" : "150ms");
    root.style.setProperty("--v8-accent", accent);
    if (settings.reducedMotion) {
      root.setAttribute("data-reduced-motion", "true");
    } else {
      root.removeAttribute("data-reduced-motion");
    }

    Object.entries(densityValues).forEach(([key, value]) => {
      root.style.setProperty(`--density-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`, `${value}${UNIT[key] || ""}`);
    });
  }, [settings, active]);

  const update = useCallback(
    (partial: Partial<Settings>) => {
      const patch: Partial<Settings> = { ...partial };
      if (typeof partial.theme === "string" && partial.theme !== "auto") {
        patch.theme = resolveLegacyTheme(partial.theme) as ThemeMode;
      }
      const next = { ...settings, ...patch };
      if (deepEqual(next, settings)) {
        return;
      }
      setSettings(next);
      saveSettings(next, active || undefined);
      useSyncStore.getState().setStatus("user_settings", "syncing");
      saveSettingsAsync(next)
        .then(() => useSyncStore.getState().setStatus("user_settings", "idle"))
        .catch(() => useSyncStore.getState().setStatus("user_settings", "error"));
    },
    [settings, active]
  );

  const handleApplyPreset = useCallback(
    (preset: Preset | unknown) => applyPreset(preset, settings, update),
    [settings, update]
  );

  const settingsValue = useMemo(
    () => ({ settings, update, applyPreset: handleApplyPreset }),
    [settings, update, handleApplyPreset]
  );

  const previousSettingsRef = useRef<Settings | null>(null);
  useEffect(() => {
    const prev = previousSettingsRef.current;
    previousSettingsRef.current = settings;
    if (!prev) return;
    if (settings.theme !== prev.theme || settings.darkMode !== prev.darkMode) {
      activityJournal.capture("v8.theme.toggle", { ok: true, theme: settings.theme, darkMode: settings.darkMode });
    }
    if (settings.accentColor !== prev.accentColor) {
      activityJournal.capture("v8.appearance.cycle", { ok: true, accentColor: settings.accentColor });
    }
  }, [settings]);

  return (
    <ActiveProfileContext.Provider value={activeContext}>
      <SettingsContext.Provider value={settingsValue}>
        {children}
      </SettingsContext.Provider>
    </ActiveProfileContext.Provider>
  );
}
