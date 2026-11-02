import { Channel, invoke } from "@tauri-apps/api/core";

export type Action =
  | "open"
  | "openWeb"
  | "install"
  | "update"
  | "closeToUpdate"
  | "openToUpdate"
  | "releasePage"
  | "needsEthoneUpdate"
  | "unavailable";

export type Policy = "delegated" | "autonomous" | "manual" | "web";

export interface ModuleStatus {
  module: {
    id: string;
    name: string;
    summary: Record<string, string>;
    repo: string;
    updatePolicy: Policy;
    platforms: Record<string, "full" | "partial" | "none">;
  };
  installed: string | null;
  latest: { version: string; notes: string | null } | null;
  feedError: string | null;
  running: boolean;
  action: Action;
}

export type Progress =
  | { stage: "downloading"; received: number; total: number | null }
  | { stage: "verifying" | "installing" | "checking" };

export interface JournalEntry {
  time: number;
  module: string;
  operation: string;
  ok: boolean;
  detail: string;
}

export const modulesLocal = () => invoke<ModuleStatus[]>("modules_local");
export const modulesRemote = () => invoke<ModuleStatus[]>("modules_remote");
export const openModule = (id: string) => invoke<void>("open_module", { id });
export const openReleases = (id: string) => invoke<void>("open_releases", { id });
export const readJournal = () => invoke<JournalEntry[]>("read_journal");
export const about = () => invoke<{ version: string; catalogSchema: number }>("about");

export function installModule(id: string, onProgress: (progress: Progress) => void) {
  const on = new Channel<Progress>();
  on.onmessage = onProgress;
  return invoke<{ from: string | null; to: string }>("install_module", { id, on });
}
