import type { ModuleStatus } from "./api.ts";

const UPDATE_ACTIONS = new Set<ModuleStatus["action"]>(["update", "closeToUpdate", "openToUpdate"]);

export function hasModuleUpdate(status: ModuleStatus): boolean {
  return UPDATE_ACTIONS.has(status.action) || (status.action === "releasePage" && status.installed !== null);
}

export function summarizeModules(modules: ModuleStatus[]) {
  return {
    total: modules.length,
    installed: modules.filter(({ installed }) => installed !== null).length,
    updates: modules.filter(hasModuleUpdate).length,
    running: modules.filter(({ running }) => running).length,
  };
}

export function dayProgress(now: Date): number {
  return (now.getHours() * 60 + now.getMinutes()) / (24 * 60);
}

export function openTasks<T extends { done: boolean }>(tasks: T[]): T[] {
  return tasks.filter(({ done }) => !done);
}

export function todayEvents<T extends { startAt: string | null }>(events: T[], now: Date): T[] {
  return events
    .filter(({ startAt }) => {
      if (!startAt) return false;
      const start = new Date(startAt);
      return start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth() && start.getDate() === now.getDate();
    })
    .sort((left, right) => Date.parse(left.startAt as string) - Date.parse(right.startAt as string));
}

export function groupMail<T extends { from_address: string; from_name?: string; subject: string }>(mail: T[], limit = 5): (T & { count: number })[] {
  const groups = new Map<string, T & { count: number }>();
  for (const item of mail) {
    const subject = (item.subject ?? "").replace(/[\s|–-]*\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?\s*$/, "");
    const key = `${item.from_address}\n${subject}`;
    const found = groups.get(key);
    if (found) found.count++;
    else groups.set(key, { ...item, subject, count: 1 });
  }
  return [...groups.values()].slice(0, limit);
}

export function connectionStatus(offline: boolean, error: string | null): "online" | "offline" | "degraded" {
  if (error) return "degraded";
  return offline ? "offline" : "online";
}

const EVENT_LEAD = 10 * 60 * 1000;

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

export function firstNote(notes: string | null | undefined): string {
  return notes?.split("\n").filter((line) => !/^\s*#/.test(line)).map((line) => line.replace(/^[*\->\s]+/, "").trim()).find(Boolean) ?? "";
}

export interface GoogleEvent { id?: string; title?: string; start?: string; allDay?: boolean; location?: string }

export function googleItems<T extends { id: string; title: string; startAt: string | null }>(events: GoogleEvent[], fill: Omit<T, "id" | "title" | "startAt">): T[] {
  return events.filter((event) => event.start && !event.allDay).map((event) => ({ ...fill, id: `google-${event.id}`, title: event.title ?? "", startAt: event.start ?? null }) as T);
}
