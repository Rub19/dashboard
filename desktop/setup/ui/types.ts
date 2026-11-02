export interface SetupState {
  version: string;
  installed: string | null;
  running: boolean;
  defaultDir: string;
  freeBytes: number | null;
  payloadBytes: number;
}

export interface Row {
  id: string;
  name: string;
  summary: Record<string, string>;
  installed: string | null;
  latest: string | null;
  size: number | null;
  status: "available" | "update" | "installed" | "running" | "manual" | "web" | "unavailable";
}

export interface Item {
  id: string;
  name: string;
  stage: "waiting" | "downloading" | "verifying" | "installing" | "checking" | "ok" | "failed";
  value: number | null;
  detail?: string;
}

export type SetupEvent =
  | { kind: "start"; id: string }
  | { kind: "progress"; id: string; progress: { stage: "downloading"; received: number; total: number | null } | { stage: "verifying" | "installing" | "checking" } }
  | { kind: "done"; id: string; ok: boolean; detail: string };
