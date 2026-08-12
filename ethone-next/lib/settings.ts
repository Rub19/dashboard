export type BrainPermissions = {
  notes: boolean;
  tasks: boolean;
  calendar: boolean;
  connections: boolean;
  gaming: boolean;
  activity: boolean;
  files: boolean;
  profile: boolean;
  settings: boolean;
  mail: boolean;
};

export type BrainMemoryCategories = {
  interface: boolean;
  habits: boolean;
  widgets: boolean;
  schedules: boolean;
  taskTypes: boolean;
  spaces: boolean;
  flows: boolean;
  goals: boolean;
};

export type ThemeMode =
  | "default"
  | "boreal"
  | "cyberpunk"
  | "eclipse"
  | "emerald"
  | "night"
  | "graphite"
  | "day"
  | "auto"
  | "midnight"
  | "obsidian"
  | "aurora"
  | "minimal"
  | "focus"
  | "glass"
  | "oled";

export type DensityMode =
  | "spacious"
  | "comfortable"
  | "compact"
  | "dense"
  | "ultra-compact"
  | "ultra"
  | "normal"
  | "airy"
  | "automatic"
  | "custom";

export type RadiusStyle = "rounded" | "soft" | "sharp";

export type DockScale = "compact" | "normal" | "large";
export type DockAlign = "center" | "stretch" | "left" | "right";
export type DockGlass = "default" | "ultra" | "opaque";

export type UiAnimationStyle = "smooth" | "snappy" | "reduced";

export type Settings = {
  darkMode: boolean;
  theme: ThemeMode;
  iconPack: "lucide" | "phosphor" | "tabler" | "heroicons" | "radix";
  densityMode: DensityMode;
  fontSize: number;
  fontFamily: "sans" | "outfit" | "mono" | "serif" | "inter" | "jetbrains" | "editorial";
  density: number;
  radius: number;
  radiusStyle: RadiusStyle;
  aura: string;
  homeGrid: "2" | "3" | "4";
  homeHero: "hidden" | "compact" | "full";
  glassEnabled: boolean;
  cardTilt: boolean;
  dockVisible: boolean;
  dockItems: string[];
  dockRadius: number;
  dockScale: DockScale;
  dockAlign: DockAlign;
  dockGlass: DockGlass;
  dockAutoHide: boolean;
  dockMagnify: boolean;
  shadow: "none" | "sm" | "md" | "glow";
  backgroundEffect: "solid" | "gradient" | "mesh" | "aurora" | "nebula" | "noise";
  backgroundSpeed: number;
  wallpaper: "none" | "aurora" | "nebula" | "mesh" | "noise";
  layoutPreset: "default" | "minimal" | "dock-only" | "sidebar-only";
  sidebarVisible: boolean;
  masterVolume: boolean;
  soundEffects: boolean;
  soundPack: "none" | "minimal" | "mechanical" | "liquid";
  soundVolume: number;
  soundVolumes: {
    master: number;
    notifications: number;
    interface: number;
    brain: number;
    system: number;
  };
  notifications: boolean;
  mailNotifications: boolean;
  trackerNotifications: boolean;
  securityAlerts: boolean;
  pushNotifications: boolean;
  brainEnabled: boolean;
  brainPermissions: BrainPermissions;
  brainMemoryCategories: BrainMemoryCategories;
  liveOverlay: boolean;
  language: string;
  accentColor: "violet" | "mint" | "sky" | "amber" | "rose" | "teal" | "coral" | "custom";
  customAccent: string;
  reducedMotion: boolean;
  haptics: boolean;
  lowData: boolean;
  performanceMode: "normal" | "low";
  status: "online" | "busy" | "focus" | "away" | "invisible";
  uiAnimations: UiAnimationStyle;
  uiGlow: boolean;
  uiSoundFeedback: boolean;
  spotlightEnabled: boolean;
  ambientEffectsEnabled: boolean;
  interfaceBlurEnabled: boolean;
  liveNowPlayingSource: "lanyard" | "lastfm";
  liveNowPlayingIdentity: string;
  liveLanyardUserId: string;
  liveSpotifyClientId: string;
  liveYoutubeClientId: string;
  liveRedditClientId: string;
  liveTrackerRiotName: string;
  liveTrackerRiotTag: string;
  liveTrackerApexPlatform: "origin" | "xbl" | "psn";
  liveTrackerApexIdentifier: string;
  calendarClientId: string;
  driveClientId: string;
  liveWeatherCity: string;
  homeHiddenLiveCards: string[];
  liveSteamId: string;
  liveRssUrl: string;
  liveBlueskyHandle: string;
  liveJellyfinUrl: string;
  liveEmbyUrl: string;
  liveLmStudioUrl: string;
  liveOllamaUrl: string;
  liveObsidianUrl: string;
  liveVscodeUrl: string;
  liveLastfmUsername: string;
  liveTwitchLogin: string;
  liveMinecraftUsername: string;
  commandHistory: string[];
  pinnedCommands: string[];
};

export const DEFAULTS: Settings = {
  darkMode: true,
  theme: "default",
  iconPack: "lucide",
  densityMode: "comfortable",
  fontSize: 100,
  fontFamily: "sans",
  density: 50,
  radius: 50,
  radiusStyle: "rounded",
  aura: "classic",
  homeGrid: "4",
  homeHero: "full",
  glassEnabled: true,
  cardTilt: true,
  dockVisible: true,
  dockItems: ["home", "brain", "notes", "tasks", "calendar", "weather", "activity", "connections", "settings"],
  dockRadius: 50,
  dockScale: "normal",
  dockAlign: "center",
  dockGlass: "default",
  dockAutoHide: false,
  dockMagnify: true,
  shadow: "glow",
  backgroundEffect: "gradient",
  backgroundSpeed: 50,
  wallpaper: "none",
  layoutPreset: "default",
  sidebarVisible: true,
  masterVolume: true,
  soundEffects: true,
  soundPack: "minimal",
  soundVolume: 50,
  soundVolumes: {
    master: 100,
    notifications: 100,
    interface: 100,
    brain: 100,
    system: 100,
  },
  notifications: true,
  mailNotifications: true,
  trackerNotifications: false,
  securityAlerts: true,
  pushNotifications: false,
  brainEnabled: true,
  brainPermissions: {
    notes: true,
    tasks: true,
    calendar: true,
    connections: true,
    gaming: true,
    activity: true,
    files: true,
    profile: true,
    settings: true,
    mail: true,
  },
  brainMemoryCategories: {
    interface: true,
    habits: true,
    widgets: true,
    schedules: true,
    taskTypes: true,
    spaces: true,
    flows: true,
    goals: true,
  },
  liveOverlay: true,
  language: "fr",
  accentColor: "violet",
  customAccent: "#8b5cf6",
  reducedMotion: false,
  haptics: true,
  lowData: false,
  performanceMode: "normal",
  uiAnimations: "smooth",
  uiGlow: true,
  uiSoundFeedback: true,
  spotlightEnabled: true,
  ambientEffectsEnabled: true,
  interfaceBlurEnabled: true,
  status: "online",
  liveNowPlayingSource: "lanyard",
  liveNowPlayingIdentity: "",
  liveLanyardUserId: "",
  liveSpotifyClientId: "",
  liveYoutubeClientId: "",
  liveRedditClientId: "",
  liveTrackerRiotName: "",
  liveTrackerRiotTag: "",
  liveTrackerApexPlatform: "origin",
  liveTrackerApexIdentifier: "",
  calendarClientId: "",
  driveClientId: "",
  liveWeatherCity: "Paris",
  homeHiddenLiveCards: [],
  liveSteamId: "",
  liveRssUrl: "",
  liveLastfmUsername: "",
  liveTwitchLogin: "",
  liveMinecraftUsername: "",
  liveBlueskyHandle: "",
  liveJellyfinUrl: "",
  liveEmbyUrl: "",
  liveLmStudioUrl: "",
  liveOllamaUrl: "",
  liveObsidianUrl: "",
  liveVscodeUrl: "",
  commandHistory: [],
  pinnedCommands: [],
};

import { getUserState, setUserState } from "@/lib/user-state";

const KEY = "ethone-settings-v1";
const STATE_KEY = "settings";

function localSettingsKey(profileId?: string): string {
  return profileId ? `${KEY}:${profileId}` : KEY;
}

function remoteSettingsKey(profileId?: string): string {
  return profileId ? `${STATE_KEY}:${profileId}` : STATE_KEY;
}

export function loadSettings(profileId?: string): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(localSettingsKey(profileId));
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(settings: Settings, profileId?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(localSettingsKey(profileId), JSON.stringify(settings));
}

export async function loadSettingsAsync(profileId?: string): Promise<Settings> {
  try {
    const scopedKey = remoteSettingsKey(profileId);
    let remote = await getUserState<Partial<Settings> | null>(scopedKey, null);
    if (profileId && !remote) {
      remote = await getUserState<Partial<Settings> | null>(STATE_KEY, null);
    }
    return { ...DEFAULTS, ...(remote || {}) };
  } catch {
    return loadSettings(profileId);
  }
}

export async function saveSettingsAsync(settings: Settings, profileId?: string): Promise<void> {
  saveSettings(settings, profileId);
  try {
    await setUserState(remoteSettingsKey(profileId), settings);
  } catch {
    // localStorage already holds the fallback
  }
}
