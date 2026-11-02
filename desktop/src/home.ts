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

export function connectionStatus(offline: boolean, error: string | null): "online" | "offline" | "degraded" {
  if (error) return "degraded";
  return offline ? "offline" : "online";
}
