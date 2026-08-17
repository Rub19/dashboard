"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface DynamicIslandState {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  toggle: () => void;
}

export const useDynamicIslandStore = create<DynamicIslandState>()(
  persist(
    (set) => ({
      visible: true,
      setVisible: (visible) => set({ visible }),
      toggle: () => set((state) => ({ visible: !state.visible })),
    }),
    {
      name: "ethone_show_dynamic_island",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ visible: state.visible }),
    },
  ),
);
