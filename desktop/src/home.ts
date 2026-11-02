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

export function connectionStatus(offline: boolean, error: string | null): "online" | "offline" | "degraded" {
  if (error) return "degraded";
  return offline ? "offline" : "online";
}
