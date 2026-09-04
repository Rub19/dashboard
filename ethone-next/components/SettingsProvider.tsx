"use client";

import { activityJournal } from "@/lib/activity-journal";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { deepEqual } from "@/lib/equal";
import { useProfiles, type Profile } from "@/lib/hooks/useProfiles";
import { loadSettings, saveSettings, saveSettingsAsync, loadSettingsAsync, migrateSettings, getWriteAt, setWriteAt, Settings, DEFAULTS, type ThemeMode } from "@/lib/settings";
import { applyPreset, type Preset } from "@/lib/preset-engine";
import { supabase } from "@/lib/supabase";
import { useSyncStore } from "@/lib/stores/sync";
import {
  PREMIUM_THEMES,
  THEME_DEFINITIONS,
  applyTheme,
  applyAccent,
  resolveLegacyTheme,
  resolveTheme,
} from "@/lib/theme-engine";
import { forceDisconnectDiscordAll } from "@/lib/discord-migration";

/** Backwards-compatible theme color reference used by consumers. */
export const THEMES: Record<string, { background: string; foreground: string; accent: string }> = Object.fromEntries([
  ...Object.values(THEME_DEFINITIONS).map((def) => [
    def.id,
    {
      background: def.bgMain,
      foreground: def.textPrimary,
      accent: def.accentPrimary,
    },
  ]),
  ["auto", { background: "#08080a", foreground: "#ededed", accent: "#8b5cf6" }],
]);

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
  blue: "#3b82f6",
  cyan: "#06b6d4",
  pink: "#ec4899",
  red: "#ef4444",
  orange: "#f97316",
  green: "#10b981",
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
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [settings, setSettings] = useState<Settings>(() => loadSettings(undefined, undefined));
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Track authenticated user ID for multi-account isolation
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data?.session?.user?.id);
    });
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUserId = session?.user?.id;
      setCurrentUserId(newUserId);
    });
    return () => {
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  const CLOCK_SKEW_BUFFER_MS = 5000;

  const activeContext = useMemo<ActiveProfileValue>(
    () => ({ active, activeProfile, loaded, reload }),
    [active, activeProfile, loaded, reload]
  );

  useEffect(() => {
    if (!loaded) return;

    const profileId = active || undefined;
    const defaultLocal = loadSettings(undefined, currentUserId);
    const profileLocal = loadSettings(profileId, currentUserId);
    const defaultWriteAt = getWriteAt(undefined, currentUserId);
    const profileWriteAt = getWriteAt(profileId, currentUserId);

    let local = profileLocal;
    let localWriteAt = profileWriteAt;

    const profileKeyEmpty = profileWriteAt === 0;
    const defaultHasData = defaultWriteAt > 0 || !deepEqual(defaultLocal, DEFAULTS);

    if (profileId) {
      if (profileKeyEmpty && defaultHasData) {
        // Migrate legacy/default-key settings into the active profile key.
        local = defaultLocal;
        localWriteAt = defaultWriteAt > 0 ? defaultWriteAt : Date.now();
        try {
          saveSettings(defaultLocal, profileId, currentUserId);
          setWriteAt(localWriteAt, profileId, currentUserId);
        } catch {}
      } else if (defaultWriteAt > profileWriteAt && !deepEqual(defaultLocal, DEFAULTS)) {
        // Default key has a more recent write, use it as the source of truth.
        local = defaultLocal;
        localWriteAt = defaultWriteAt;
      }
    } else {
      local = defaultLocal;
      localWriteAt = defaultWriteAt;
    }

    // If local settings exist but have no write timestamp (legacy/test contexts),
    // stamp them as "now" so they are not silently overwritten by an older remote state.
    if (localWriteAt === 0 && !deepEqual(local, DEFAULTS)) {
      localWriteAt = Date.now();
      try {
        setWriteAt(localWriteAt, profileId, currentUserId);
      } catch {}
    }

    setSettings(local);
    useSyncStore.getState().setStatus("user_settings", "syncing");
    loadSettingsAsync(currentUserId)
      .then(({ settings: remote, updatedAt }) => {
        setSettings((prev) => {
          const remoteTs = updatedAt ? new Date(updatedAt).getTime() : 0;
          const remoteIsNewer = remoteTs > localWriteAt + CLOCK_SKEW_BUFFER_MS;
          const next =
            remoteIsNewer
              ? { ...DEFAULTS, ...local, ...remote }
              : { ...DEFAULTS, ...local };
          return deepEqual(next, prev) ? prev : next;
        });
        useSyncStore.getState().setStatus("user_settings", "idle");
      })
      .catch(() => {
        useSyncStore.getState().setStatus("user_settings", "error");
      });
  }, [loaded, active, currentUserId]);

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
    const prev = previousEffectSettingsRef.current;
    const changed = prev && (prev.theme !== settings.theme || prev.accentColor !== settings.accentColor || prev.customAccent !== settings.customAccent || prev.densityMode !== settings.densityMode || prev.fontSize !== settings.fontSize || prev.radius !== settings.radius || prev.radiusStyle !== settings.radiusStyle || prev.iconRadius !== settings.iconRadius || prev.glassEnabled !== settings.glassEnabled || prev.fontFamily !== settings.fontFamily || prev.dockScale !== settings.dockScale || prev.dockAlign !== settings.dockAlign || prev.dockGlass !== settings.dockGlass || prev.layoutPreset !== settings.layoutPreset || prev.wallpaper !== settings.wallpaper || prev.aura !== settings.aura || prev.backgroundEffect !== settings.backgroundEffect || prev.backgroundSpeed !== settings.backgroundSpeed || prev.shadow !== settings.shadow);

    if (changed) {
      root.setAttribute("data-no-transitions", "true");
    }

    // Apply the premium theme engine directly to the root for zero-lag switching.
    applyTheme(settings.theme, {
      accent: settings.accentColor,
      customAccent: settings.customAccent,
      glassLevel: settings.glassLevel,
      performanceMode: settings.performanceMode,
      customThemes: settings.customThemes,
    });

    const resolved = resolveTheme(settings.theme);
    const def = THEME_DEFINITIONS[resolved.theme] || THEME_DEFINITIONS.obsidian;
    const isDark = def.colorScheme !== "light";

    // Derive the legacy app tokens from the resolved premium theme.
    root.style.setProperty("--background", def.bgMain);
    root.style.setProperty("--foreground", def.textPrimary);
    root.style.setProperty("--surface", def.bgSurface);
    root.style.setProperty("--surface-raised", def.bgSurface);
    root.style.setProperty("--border", def.borderSubtle);
    root.style.setProperty("--muted", def.textMuted);

    const accent = settings.accentColor === "custom" ? settings.customAccent : (ACCENTS[settings.accentColor] || def.accentPrimary);
    applyAccent(root, accent);

    const glowColor = settings.uiGlow ? `color-mix(in srgb, ${accent} 35%, transparent)` : "transparent";
    root.style.setProperty("--glow-color", glowColor);

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

    if (changed) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => root.removeAttribute("data-no-transitions"));
      });
    }

    previousEffectSettingsRef.current = settings;
  }, [settings, active]);

  const update = useCallback(
    (partial: Partial<Settings>) => {
      const patch: Partial<Settings> = { ...partial };
      if (typeof partial.theme === "string" && partial.theme !== "auto") {
        patch.theme = resolveLegacyTheme(partial.theme) as ThemeMode;
      }
      const prev = settingsRef.current;
      const next = { ...prev, ...patch };
      if (deepEqual(next, prev)) {
        return;
      }

      // Snapshot the previous state so we can roll back if persistence fails.
      settingsRef.current = next;
      setSettings(next);

      try {
        saveSettings(next, active || undefined, currentUserId);
      } catch {
        // Local persistence failed; revert to the previous state immediately.
        settingsRef.current = prev;
        setSettings(prev);
        useSyncStore.getState().setStatus("user_settings", "error");
        return;
      }

      useSyncStore.getState().setStatus("user_settings", "syncing");

      // Debounce the Supabase round-trip so rapid changes (sliders, theme clicks)
      // don't hammer the API and keep the UI responsive. Always save the latest
      // ref in case multiple updates fire before the timeout.
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = window.setTimeout(() => {
        saveSettingsAsync(settingsRef.current, active || undefined, currentUserId)
          .then(() => useSyncStore.getState().setStatus("user_settings", "idle"))
          .catch(() => {
            useSyncStore.getState().setStatus("user_settings", "error");
          });
      }, 400);
    },
    [active, currentUserId]
  );

  // Forcibly revoke legacy Discord connections across all client instances
  useEffect(() => {
    void forceDisconnectDiscordAll(update);
  }, [update]);

  const handleApplyPreset = useCallback(
    (preset: Preset | unknown) => applyPreset(preset, settings, update),
    [settings, update]
  );

  const settingsValue = useMemo(
    () => ({ settings, update, applyPreset: handleApplyPreset }),
    [settings, update, handleApplyPreset]
  );

  const saveTimeoutRef = useRef<number | null>(null);
  const previousSettingsRef = useRef<Settings | null>(null);
  const previousEffectSettingsRef = useRef<Settings | null>(null);
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

  useEffect(() => () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  }, []);

  return (
    <ActiveProfileContext.Provider value={activeContext}>
      <SettingsContext.Provider value={settingsValue}>
        {children}
      </SettingsContext.Provider>
    </ActiveProfileContext.Provider>
  );
}
