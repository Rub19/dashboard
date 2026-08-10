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

export type Settings = {
  darkMode: boolean;
  theme: "default" | "boreal" | "cyberpunk" | "eclipse" | "emerald";
  iconPack: "lucide" | "phosphor" | "tabler" | "heroicons" | "radix";
  densityMode: "compact" | "normal" | "airy";
  fontSize: number;
  fontFamily: "sans" | "outfit" | "mono" | "serif";
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
  wallpaper: "none" | "aurora" | "nebula" | "mesh" | "noise";
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
};

export const DEFAULTS: Settings = {
  darkMode: true,
  theme: "default",
  iconPack: "lucide",
  densityMode: "normal",
  fontSize: 100,
  fontFamily: "sans",
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
  wallpaper: "none",
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
  status: "online",
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
