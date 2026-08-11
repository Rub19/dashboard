"use client";

import { Icon as IconifyIcon, type IconProps, type IconifyJSON } from "@iconify/react";
import { addCollection } from "@iconify/react";
import { icons as lucide } from "@iconify-json/lucide";
import { icons as phosphor } from "@iconify-json/ph";
import { icons as tabler } from "@iconify-json/tabler";
import { icons as heroicons } from "@iconify-json/heroicons";
import { icons as radix } from "@iconify-json/radix-icons";
import { useSettings } from "@/components/SettingsProvider";

addCollection(lucide as unknown as IconifyJSON);
addCollection(phosphor as unknown as IconifyJSON);
addCollection(tabler as unknown as IconifyJSON);
addCollection(heroicons as unknown as IconifyJSON);
addCollection(radix as unknown as IconifyJSON);

export type IconPack = "lucide" | "phosphor" | "tabler" | "heroicons" | "radix";

const PREFIXES: Record<IconPack, string> = {
  lucide: "lucide",
  phosphor: "ph",
  tabler: "tabler",
  heroicons: "heroicons",
  radix: "radix-icons",
};

const LIBRARIES: Record<IconPack, IconifyJSON> = {
  lucide,
  phosphor,
  tabler,
  heroicons,
  radix,
};

const EXISTS = Object.fromEntries(
  (Object.keys(LIBRARIES) as IconPack[]).map((pack) => {
    const lib = LIBRARIES[pack];
    const set = new Set([...Object.keys(lib.icons || {}), ...Object.keys(lib.aliases || {})]);
    return [pack, set];
  })
) as Record<IconPack, Set<string>>;

function iconExists(pack: IconPack, name: string) {
  return EXISTS[pack].has(name);
}

const MAP: Record<string, Partial<Record<IconPack, string>>> = {
  home: { lucide: "home", phosphor: "house", tabler: "home", heroicons: "home-outline", radix: "home" },
  notes: { lucide: "notebook-pen", phosphor: "notebook", tabler: "notebook", heroicons: "book-open", radix: "file-text" },
  tasks: { lucide: "circle-check", phosphor: "check-circle", tabler: "circle-check", heroicons: "check-circle", radix: "check" },
  calendar: { lucide: "calendar-days", phosphor: "calendar", tabler: "calendar", heroicons: "calendar-days", radix: "calendar" },
  files: { lucide: "folder", phosphor: "folder", tabler: "folder", heroicons: "folder", radix: "file" },
  bills: { lucide: "receipt", phosphor: "receipt", tabler: "receipt", heroicons: "receipt-percent", radix: "file-text" },
  activity: { lucide: "activity", phosphor: "activity", tabler: "activity", heroicons: "chart-bar", radix: "dashboard" },
  "scan-search": { lucide: "scan-search", phosphor: "magnifying-glass", tabler: "scan-search", heroicons: "magnifying-glass", radix: "magnifying-glass" },
  "shield-check": { lucide: "shield-check", phosphor: "shield-check", tabler: "shield-check", heroicons: "shield-check", radix: "shield" },
  history: { lucide: "history", phosphor: "clock-counter-clockwise", tabler: "history", heroicons: "clock", radix: "counter-clockwise" },
  sunset: { lucide: "sunset", phosphor: "sun-horizon", tabler: "sunset", heroicons: "sun", radix: "sun" },
  interactions: { lucide: "flame", phosphor: "fire", tabler: "flame", heroicons: "fire", radix: "lightning-bolt" },
  connections: { lucide: "plug", phosphor: "plugs", tabler: "plug", heroicons: "link", radix: "link-2" },
  plugins: { lucide: "plug", phosphor: "plugs-connected", tabler: "puzzle", heroicons: "puzzle-piece", radix: "magic-wand" },
  spaces: { lucide: "layout-grid", phosphor: "squares-four", tabler: "layout-grid", heroicons: "squares-2x2", radix: "grid" },
  flows: { lucide: "workflow", phosphor: "tree-structure", tabler: "arrow-fork", heroicons: "arrow-path", radix: "mixer-horizontal" },
  brain: { lucide: "brain", phosphor: "brain", tabler: "brain", heroicons: "bolt", radix: "rocket" },
  focus: { lucide: "timer", phosphor: "timer", tabler: "clock", heroicons: "clock", radix: "stopwatch" },
  team: { lucide: "users", phosphor: "users", tabler: "users", heroicons: "users", radix: "person" },
  mail: { lucide: "mail", phosphor: "envelope", tabler: "mail", heroicons: "envelope", radix: "envelope-closed" },
  settings: { lucide: "settings", phosphor: "gear", tabler: "settings", heroicons: "cog-6-tooth", radix: "gear" },
  system: { lucide: "monitor", phosphor: "monitor", tabler: "device-analytics", heroicons: "computer-desktop", radix: "dashboard" },
  menu: { lucide: "menu", phosphor: "list", tabler: "menu-2", heroicons: "bars-3", radix: "hamburger-menu" },
  user: { lucide: "user", phosphor: "user", tabler: "user", heroicons: "user", radix: "person" },
  search: { lucide: "search", phosphor: "magnifying-glass", tabler: "search", heroicons: "magnifying-glass", radix: "magnifying-glass" },
  command: { lucide: "command", phosphor: "command", tabler: "command", heroicons: "command-line", radix: "magic-wand" },
  logout: { lucide: "log-out", phosphor: "sign-out", tabler: "logout", heroicons: "arrow-right-on-rectangle", radix: "exit" },
  sparkles: { lucide: "sparkles", phosphor: "sparkle", tabler: "sparkles", heroicons: "sparkles", radix: "magic-wand" },
  chevronDown: { lucide: "chevron-down", phosphor: "caret-down", tabler: "chevron-down", heroicons: "chevron-down", radix: "chevron-down" },
  chevronUp: { lucide: "chevron-up", phosphor: "caret-up", tabler: "chevron-up", heroicons: "chevron-up", radix: "chevron-up" },
  close: { lucide: "x", phosphor: "x", tabler: "x", heroicons: "x-mark", radix: "cross-1" },
  maximize: { lucide: "maximize-2", phosphor: "arrows-out", tabler: "maximize", heroicons: "arrows-pointing-out", radix: "zoom-in" },
  minimize: { lucide: "minimize-2", phosphor: "arrows-in", tabler: "minimize", heroicons: "arrows-pointing-in", radix: "zoom-out" },
  music: { lucide: "music", phosphor: "music-notes", tabler: "music", heroicons: "musical-note", radix: "track-next" },
  discord: { lucide: "message-square", phosphor: "chat-teardrop-text", tabler: "message", heroicons: "chat-bubble-left", radix: "chat-bubble" },
  code: { lucide: "code-2", phosphor: "code", tabler: "code", heroicons: "code-bracket", radix: "code" },
  play: { lucide: "play", phosphor: "play", tabler: "player-play", heroicons: "play", radix: "play" },
  pause: { lucide: "pause", phosphor: "pause", tabler: "player-pause", heroicons: "pause", radix: "pause" },
  skipBack: { lucide: "skip-back", phosphor: "skip-back", tabler: "player-skip-back", heroicons: "backward", radix: "track-previous" },
  skipForward: { lucide: "skip-forward", phosphor: "skip-forward", tabler: "player-skip-forward", heroicons: "forward", radix: "track-next" },
  heart: { lucide: "heart", phosphor: "heart", tabler: "heart", heroicons: "heart", radix: "heart" },
  grip: { lucide: "grip-horizontal", phosphor: "dots-nine", tabler: "grip-horizontal", heroicons: "bars-4", radix: "drag-handle-dots-2" },
  radio: { lucide: "radio", phosphor: "radio", tabler: "radio", heroicons: "signal", radix: "dot" },
  monitor: { lucide: "monitor", phosphor: "monitor", tabler: "device-desktop", heroicons: "computer-desktop", radix: "desktop" },
  disc: { lucide: "disc-3", phosphor: "disc", tabler: "disc", heroicons: "circle-stack", radix: "disc" },
  cloudSun: { lucide: "cloud-sun", phosphor: "cloud-sun", tabler: "cloud-sun", heroicons: "cloud", radix: "sun" },
  loader: { lucide: "loader-2", phosphor: "spinner", tabler: "loader-2", heroicons: "arrow-path", radix: "reload" },
  palette: { lucide: "palette", phosphor: "palette", tabler: "palette", heroicons: "swatch", radix: "mixer-vertical" },
  type: { lucide: "type", phosphor: "text-t", tabler: "typography", heroicons: "pencil-square", radix: "text" },
  gauge: { lucide: "gauge", phosphor: "gauge", tabler: "dashboard", heroicons: "chart-pie", radix: "dashboard" },
  volume: { lucide: "volume-2", phosphor: "speaker-high", tabler: "volume", heroicons: "speaker-wave", radix: "speaker-loud" },
  bell: { lucide: "bell", phosphor: "bell", tabler: "bell", heroicons: "bell", radix: "bell" },
  shield: { lucide: "shield", phosphor: "shield", tabler: "shield", heroicons: "shield-check", radix: "shield" },
  globe: { lucide: "globe", phosphor: "globe", tabler: "world", heroicons: "globe-alt", radix: "globe" },
  dock: { lucide: "dock", phosphor: "dock", tabler: "dock", heroicons: "squares-plus", radix: "drag-handle-horizontal" },
  timer: { lucide: "timer", phosphor: "timer", tabler: "clock", heroicons: "clock", radix: "stopwatch" },
  arrowRight: { lucide: "arrow-right", phosphor: "arrow-right", tabler: "arrow-right", heroicons: "arrow-right", radix: "arrow-right" },
  minus: { lucide: "minus", phosphor: "minus", tabler: "minus", heroicons: "minus", radix: "minus" },
  sun: { lucide: "sun", phosphor: "sun", tabler: "sun", heroicons: "sun", radix: "sun" },
  moon: { lucide: "moon", phosphor: "moon", tabler: "moon", heroicons: "moon", radix: "moon" },
  plus: { lucide: "circle-plus", phosphor: "plus-circle", tabler: "circle-plus", heroicons: "plus-circle", radix: "plus-circled" },
  stickyNote: { lucide: "sticky-note", phosphor: "note", tabler: "note", heroicons: "document", radix: "file-text" },
  appWindow: { lucide: "app-window", phosphor: "app-window", tabler: "app-window", heroicons: "window", radix: "window" },
  layoutGrid: { lucide: "layout-grid", phosphor: "squares-four", tabler: "layout-grid", heroicons: "squares-2x2", radix: "grid" },
  workflow: { lucide: "workflow", phosphor: "tree-structure", tabler: "git-branch", heroicons: "arrow-path", radix: "mixer-horizontal" },
  // Common raw names that appear in components
  "chevron-left": { lucide: "chevron-left", phosphor: "caret-left", tabler: "chevron-left", heroicons: "chevron-left", radix: "chevron-left" },
  "chevron-right": { lucide: "chevron-right", phosphor: "caret-right", tabler: "chevron-right", heroicons: "chevron-right", radix: "chevron-right" },
  "trash-2": { lucide: "trash-2", phosphor: "trash", tabler: "trash", heroicons: "trash", radix: "trash" },
  "file-edit": { lucide: "file-edit", phosphor: "pencil-simple", tabler: "pencil", heroicons: "pencil", radix: "pencil-2" },
  "loader-2": { lucide: "loader-2", phosphor: "spinner", tabler: "loader-2", heroicons: "arrow-path", radix: "reload" },
  "key-round": { lucide: "key-round", phosphor: "key", tabler: "key", heroicons: "key", radix: "key" },
  "lock": { lucide: "lock", phosphor: "lock-key", tabler: "lock", heroicons: "lock-closed", radix: "lock-closed" },
  "rotate-ccw": { lucide: "rotate-ccw", phosphor: "arrow-counter-clockwise", tabler: "rotate-2", heroicons: "arrow-uturn-left", radix: "rotate-counter-clockwise" },
  "refresh-cw": { lucide: "refresh-cw", phosphor: "arrows-clockwise", tabler: "refresh", heroicons: "arrow-path", radix: "reload" },
  "share-2": { lucide: "share-2", phosphor: "share-network", tabler: "share-3", heroicons: "share", radix: "share-2" },
  "gamepad-2": { lucide: "gamepad-2", phosphor: "gamepad", tabler: "device-gamepad", heroicons: "device-phone-mobile", radix: "magic-wand" },
  swords: { lucide: "swords", phosphor: "sword", tabler: "swords", heroicons: "bolt", radix: "lightning-bolt" },
  layers: { lucide: "layers", phosphor: "stack", tabler: "stack-2", heroicons: "squares-2x2", radix: "layers" },
  smartphone: { lucide: "smartphone", phosphor: "device-mobile", tabler: "device-mobile", heroicons: "device-phone-mobile", radix: "mobile" },
  "wifi-off": { lucide: "wifi-off", phosphor: "wifi-slash", tabler: "wifi-off", heroicons: "wifi", radix: "cross-1" },
  "circle-check": { lucide: "circle-check", phosphor: "check-circle", tabler: "circle-check", heroicons: "check-circle", radix: "check" },
  "notebook-pen": { lucide: "notebook-pen", phosphor: "notebook", tabler: "notebook", heroicons: "book-open", radix: "file-text" },
  "maximize-2": { lucide: "maximize-2", phosphor: "arrows-out", tabler: "maximize", heroicons: "arrows-pointing-out", radix: "zoom-in" },
  expand: { lucide: "expand", phosphor: "arrows-out", tabler: "arrows-maximize", heroicons: "arrows-pointing-out", radix: "zoom-in" },
  shrink: { lucide: "shrink", phosphor: "arrows-in", tabler: "arrows-minimize", heroicons: "arrows-pointing-in", radix: "zoom-out" },
  zap: { lucide: "zap", phosphor: "lightning", tabler: "bolt", heroicons: "bolt", radix: "lightning-bolt" },
  users: { lucide: "users", phosphor: "users", tabler: "users", heroicons: "users", radix: "people" },
  alert: { lucide: "alert-circle", phosphor: "warning-circle", tabler: "alert-circle", heroicons: "exclamation-circle", radix: "info-circled" },
  x: { lucide: "x", phosphor: "x", tabler: "x", heroicons: "x-mark", radix: "cross-1" },
  send: { lucide: "send", phosphor: "paper-plane", tabler: "send", heroicons: "paper-airplane", radix: "paper-plane" },
  inbox: { lucide: "inbox", phosphor: "tray", tabler: "inbox", heroicons: "inbox", radix: "inbox" },
  archive: { lucide: "archive", phosphor: "archive", tabler: "archive", heroicons: "archive-box", radix: "archive" },
  "alert-triangle": { lucide: "alert-triangle", phosphor: "warning", tabler: "alert-triangle", heroicons: "exclamation-triangle", radix: "triangle-alert" },
  "alert-circle": { lucide: "alert-circle", phosphor: "warning-circle", tabler: "alert-circle", heroicons: "exclamation-circle", radix: "info-circled" },
  receipt: { lucide: "receipt", phosphor: "receipt", tabler: "receipt", heroicons: "receipt-percent", radix: "file-text" },
  ghost: { lucide: "ghost", phosphor: "ghost", tabler: "ghost", heroicons: "sparkles", radix: "ghost" },
  coffee: { lucide: "coffee", phosphor: "coffee", tabler: "coffee", heroicons: "mug", radix: "mug" },
  armchair: { lucide: "armchair", phosphor: "armchair", tabler: "armchair", heroicons: "cube", radix: "armchair" },
  trophy: { lucide: "trophy", phosphor: "trophy", tabler: "trophy", heroicons: "trophy", radix: "trophy" },
  "heading-2": { lucide: "heading-2", phosphor: "text-h-two", tabler: "h-2", heroicons: "bars-2", radix: "text" },
  "heading-3": { lucide: "heading-3", phosphor: "text-h-three", tabler: "h-3", heroicons: "bars-3", radix: "text" },
  quote: { lucide: "quote", phosphor: "quotes", tabler: "quote", heroicons: "chat-bubble-left-ellipsis", radix: "quote" },
  unlink: { lucide: "unlink", phosphor: "link-break", tabler: "link-off", heroicons: "link-slash", radix: "link-break" },
  "remove-formatting": { lucide: "remove-formatting", phosphor: "eraser", tabler: "clear-formatting", heroicons: "no-symbol", radix: "cross-1" },
  strikethrough: { lucide: "strikethrough", phosphor: "strikethrough", tabler: "strikethrough", heroicons: "minus", radix: "strikethrough" },
  text: { lucide: "text", phosphor: "text-t", tabler: "typography", heroicons: "pencil-square", radix: "text" },
  "hard-drive": { lucide: "hard-drive", phosphor: "hard-drives", tabler: "device-floppy", heroicons: "server", radix: "stack" },
  "external-link": { lucide: "external-link", phosphor: "arrow-up-right", tabler: "external-link", heroicons: "arrow-top-right-on-square", radix: "external-link" },
};

export function useIconName(name: string, pack: IconPack = "lucide") {
  const entry = MAP[name];
  // Try the pack-specific mapping, then the lucide fallback, then the raw name if it exists in the pack.
  const candidates: (string | undefined)[] = [entry?.[pack], entry?.lucide, iconExists(pack, name) ? name : undefined, entry?.lucide, name];
  for (const candidate of candidates) {
    if (candidate && (pack === "lucide" || iconExists(pack, candidate))) {
      return `${PREFIXES[pack]}:${candidate}`;
    }
  }
  // Last resort: always valid in lucide.
  return `${PREFIXES.lucide}:${entry?.lucide || name}`;
}

export function Icon({ name, ...props }: { name: string } & Omit<IconProps, "icon">) {
  const { settings } = useSettings();
  const iconId = useIconName(name, settings.iconPack);
  return <IconifyIcon icon={iconId} aria-hidden="true" focusable="false" {...props} />;
}
