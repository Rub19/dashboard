import { invoke } from "@tauri-apps/api/core";
import { readJson, write } from "./settings";

export interface DesktopPrefs { closeToTray: boolean; notifyMail: boolean; notifyEvents: boolean; hdvBackground: boolean }
const PREFS_KEY = "ethone-desktop-prefs";
const EVENTS_KEY = "ethone-notified-events";

export const readDesktopPrefs = (): DesktopPrefs => ({ closeToTray: false, notifyMail: true, notifyEvents: true, hdvBackground: true, ...readJson<Partial<DesktopPrefs>>(PREFS_KEY) });

export function saveDesktopPrefs(prefs: DesktopPrefs) {
  write(PREFS_KEY, JSON.stringify(prefs));
  void invoke("close_to_tray_set", { enabled: prefs.closeToTray }).catch(() => undefined);
}

export const hdvBackground = (enabled: boolean) => invoke<"absent" | "needsUpdate" | "running" | "off">("hdv_background", { enabled });

export const notifyWindows = (title: string, body: string) => invoke<void>("notify_windows", { title, body });

export const notifiedEvents = () => readJson<string[]>(EVENTS_KEY) ?? [];
export const rememberEvents = (ids: string[]) => write(EVENTS_KEY, JSON.stringify(ids.slice(-200)));
