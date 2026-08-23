"use client";

import { create } from "zustand";

const STORAGE_KEY = "ethone_show_dynamic_island";

function readVisible(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.visible === true;
  } catch {
    return false;
  }
}

function writeVisible(visible: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ visible }));
  } catch {
    // ignore storage errors
  }
}

export interface DynamicIslandState {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  toggle: () => void;
}

export const useDynamicIslandStore = create<DynamicIslandState>((set) => ({
  visible: readVisible(),
  setVisible: (visible) => {
    writeVisible(visible);
    set({ visible });
  },
  toggle: () =>
    set((state) => {
      const next = !state.visible;
      writeVisible(next);
      return { visible: next };
    }),
}));
