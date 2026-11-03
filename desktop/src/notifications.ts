import { invoke } from "@tauri-apps/api/core";
import { readJson, write } from "./settings.ts";

export interface DesktopPrefs { closeToTray: boolean; notifyMail: boolean; notifyEvents: boolean }
const PREFS_KEY = "ethone-desktop-prefs";
const EVENTS_KEY = "ethone-notified-events";
const EVENT_LEAD = 10 * 60 * 1000;

export const readDesktopPrefs = (): DesktopPrefs => ({ closeToTray: false, notifyMail: true, notifyEvents: true, ...readJson<Partial<DesktopPrefs>>(PREFS_KEY) });

export function saveDesktopPrefs(prefs: DesktopPrefs) {
  write(PREFS_KEY, JSON.stringify(prefs));
  void invoke("close_to_tray_set", { enabled: prefs.closeToTray }).catch(() => undefined);
}

export const notifyWindows = (title: string, body: string) => invoke<void>("notify_windows", { title, body });

export function unseenMail<T extends { id: string }>(seen: Set<string> | null, mail: T[]): T[] {
  return seen ? mail.filter((item) => !seen.has(item.id)) : [];
}

export function dueEvents<T extends { id: string; startAt: string | null }>(events: T[], notified: string[], now: number): T[] {
  return events.filter((event) => {
    if (!event.startAt || notified.includes(event.id)) return false;
    const left = Date.parse(event.startAt) - now;
    return left > 0 && left <= EVENT_LEAD;
  });
}

export const notifiedEvents = () => readJson<string[]>(EVENTS_KEY) ?? [];
export const rememberEvents = (ids: string[]) => write(EVENTS_KEY, JSON.stringify(ids.slice(-200)));
