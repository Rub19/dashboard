import { create } from "zustand";

export type SyncState = "idle" | "syncing" | "offline" | "error";

const SYNC_TIMEOUT_MS = 10000;
const pending = new Map<string, ReturnType<typeof setTimeout>>();

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
      if (state.sources[source] === status) return state;
      const next: Record<string, SyncState> = { ...state.sources, [source]: status };

      // Cancel any pending timeout for this source
      const existing = pending.get(source);
      if (existing) {
        clearTimeout(existing);
        pending.delete(source);
      }

      // If a source stays "syncing" for too long, mark it as an error.
      // This prevents the UI from spinning forever when a request hangs or is
      // never resolved (guest, offline, schema missing, etc.).
      if (status === "syncing") {
        const timeout = setTimeout(() => {
          set((s) => {
            if (s.sources[source] !== "syncing") return s;
            const updated: Record<string, SyncState> = { ...s.sources, [source]: "error" };
            return { sources: updated, status: deriveStatus(updated) };
          });
        }, SYNC_TIMEOUT_MS);
        pending.set(source, timeout);
      }

      return { sources: next, status: deriveStatus(next) };
    }),
}));
