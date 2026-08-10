export type Settings = {
  darkMode: boolean;
  theme: "default" | "boreal" | "cyberpunk" | "eclipse" | "emerald";
  iconPack: "lucide" | "phosphor" | "tabler" | "heroicons" | "radix";
  densityMode: "compact" | "normal" | "airy";
  fontSize: number;
  density: number;
  radius: number;
  glassEnabled: boolean;
  cardTilt: boolean;
  dockVisible: boolean;
  dockItems: string[];
  dockRadius: number;
  shadow: "none" | "sm" | "md" | "glow";
  backgroundEffect: "solid" | "gradient" | "mesh" | "aurora";
  backgroundSpeed: number;
  layoutPreset: "default" | "minimal" | "dock-only" | "sidebar-only";
  sidebarVisible: boolean;
  masterVolume: boolean;
  soundEffects: boolean;
  soundPack: "none" | "minimal" | "mechanical" | "liquid";
  soundVolume: number;
  notifications: boolean;
  mailNotifications: boolean;
  trackerNotifications: boolean;
  securityAlerts: boolean;
  pushNotifications: boolean;
  brainEnabled: boolean;
  liveOverlay: boolean;
  language: string;
};

export const DEFAULTS: Settings = {
  darkMode: true,
  theme: "default",
  iconPack: "lucide",
  densityMode: "normal",
  fontSize: 100,
  density: 50,
  radius: 50,
  glassEnabled: true,
  cardTilt: true,
  dockVisible: true,
  dockItems: ["home", "brain", "notes", "tasks", "calendar", "activity", "connections", "settings"],
  dockRadius: 50,
  shadow: "glow",
  backgroundEffect: "gradient",
  backgroundSpeed: 50,
  layoutPreset: "default",
  sidebarVisible: true,
  masterVolume: true,
  soundEffects: true,
  soundPack: "minimal",
  soundVolume: 50,
  notifications: true,
  mailNotifications: true,
  trackerNotifications: false,
  securityAlerts: true,
  pushNotifications: false,
  brainEnabled: true,
  liveOverlay: true,
  language: "fr",
};

const KEY = "ethone-settings-v1";

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(settings: Settings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(settings));
}
