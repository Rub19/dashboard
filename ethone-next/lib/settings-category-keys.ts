import { type Settings } from "@/lib/settings";

/**
 * Mapping of active settings category to the top-level settings keys that are
 * exposed by the field definitions in `components/settings/SettingsContent.tsx`.
 *
 * Nested field paths (e.g. `brainPermissions.notes`) are collapsed to their
 * top-level `Settings` key so the whole object is restored to its default value.
 */
export const CATEGORY_KEYS: Record<string, (keyof Settings)[]> = {
  profile: ["status"],
  appearance: [
    "darkMode",
    "useMaterialYou",
    "theme",
    "iconPack",
    "accentColor",
    "customAccent",
    "wallpaper",
    "aura",
    "glassEnabled",
    "cardTilt",
    "shadow",
    "backgroundEffect",
    "backgroundSpeed",
    "fontSize",
    "fontFamily",
    "densityMode",
    "density",
    "radius",
    "radiusStyle",
    "iconRadius",
    "uiAnimations",
    "uiGlow",
    "spotlightEnabled",
    "uiSoundFeedback",
    "ambientEffectsEnabled",
    "interfaceBlurEnabled",
    "reducedMotion",
  ],
  audio: [
    "masterVolume",
    "soundEffects",
    "mediaDucking",
    "soundVolume",
    "soundSpatial",
    "soundVolumes",
    "soundPack",
    "ambientSound",
  ],
  workspace: [
    "brainEnabled",
    "brainPermissions",
    "brainMemoryCategories",
    "layoutPreset",
    "dockVisible",
    "dockAutoHide",
    "dockMagnify",
    "dockScale",
    "dockAlign",
    "dockGlass",
    "dockRadius",
    "dockItems",
  ],
  language: ["language"],
  notifications: [
    "notifications",
    "pushNotifications",
    "mailNotifications",
    "trackerNotifications",
    "liveOverlay",
  ],
  security: ["securityAlerts"],
  advanced: ["densityCustom", "haptics", "lowData", "performanceMode", "backgroundQuality"],
};
