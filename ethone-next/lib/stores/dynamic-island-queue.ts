"use client";

import { create } from "zustand";

export type IslandView =
  | "spotify"
  | "pomodoro"
  | "brain"
  | "sync"
  | "upload"
  | "notification"
  | "timer"
  | "call"
  | "system";

export const ISLAND_VIEW_PRIORITY: Record<IslandView, number> = {
  system: 8,
  call: 7,
  notification: 6,
  timer: 5,
  brain: 5,
  pomodoro: 4,
  upload: 3,
  sync: 2,
  spotify: 1,
};

export type IslandEvent = {
  id: string;
  type: IslandView;
  priority?: number;
  duration?: number;
  content?: unknown;
  action?(): void;
};

interface QueueState {
  queue: IslandEvent[];
  top: IslandEvent | null;
  register: (event: IslandEvent) => void;
  unregister: (idOrType: string) => void;
  clear: () => void;
}

function computeTop(queue: IslandEvent[]): IslandEvent | null {
  if (queue.length === 0) return null;
  const sorted = [...queue].sort(
    (a, b) =>
      (b.priority ?? ISLAND_VIEW_PRIORITY[b.type] ?? 0) -
      (a.priority ?? ISLAND_VIEW_PRIORITY[a.type] ?? 0),
  );
  return sorted[0];
}

export const useIslandQueueStore = create<QueueState>((set) => ({
  queue: [],
  top: null,
  register: (event) =>
    set((state) => {
      const filtered = state.queue.filter((e) => e.id !== event.id && e.type !== event.type);
      const queue = [...filtered, event];
      return { queue, top: computeTop(queue) };
    }),
  unregister: (idOrType) =>
    set((state) => {
      const queue = state.queue.filter((e) => e.id !== idOrType && e.type !== idOrType);
      return { queue, top: computeTop(queue) };
    }),
  clear: () => set({ queue: [], top: null }),
}));
