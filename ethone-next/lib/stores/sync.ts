import { create } from "zustand";

export type SyncState = "idle" | "syncing" | "offline" | "error";

type SyncStore = {
  sources: Record<string, SyncState>;
  status: SyncState;
  setStatus: (source: string, status: SyncState) => void;
};

function deriveStatus(sources: Record<string, SyncState>): SyncState {
  const values = Object.values(sources);
  if (values.includes("error")) return "error";
  if (values.includes("offline")) return "offline";
  if (values.includes("syncing")) return "syncing";
  return "idle";
}

export const useSyncStore = create<SyncStore>((set) => ({
  status: "idle",
  sources: {},
  setStatus: (source, status) =>
    set((state) => {
      const next = { ...state.sources, [source]: status };
      return { sources: next, status: deriveStatus(next) };
    }),
}));
