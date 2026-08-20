"use client";

import { create } from "zustand";

export interface DynamicIslandState {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  toggle: () => void;
}

export const useDynamicIslandStore = create<DynamicIslandState>((set) => ({
  visible: false,
  setVisible: (visible) => set({ visible }),
  toggle: () => set((state) => ({ visible: !state.visible })),
}));
