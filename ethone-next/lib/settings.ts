export type Settings = {
  darkMode: boolean;
  theme: "default" | "boreal" | "cyberpunk" | "eclipse" | "emerald";
  fontSize: number;
  density: number;
  radius: number;
  glassEnabled: boolean;
  cardTilt: boolean;
  dockVisible: boolean;
  dockItems: string[];
  masterVolume: boolean;
  soundEffects: boolean;
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
  fontSize: 100,
  density: 50,
  radius: 50,
  glassEnabled: true,
  cardTilt: true,
  dockVisible: true,
  dockItems: ["home", "brain", "notes", "tasks", "calendar", "activity", "connections", "settings"],
  masterVolume: true,
  soundEffects: false,
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
