"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LiveWidgetState = {
  isOpen: boolean;
  isMinimized: boolean;
  expanded: boolean;
  liveSource: string;
};

type LiveWidgetActions = {
  setOpen: (open: boolean) => void;
  setMinimized: (minimized: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  setLiveSource: (source: string) => void;
  toggleOpen: () => void;
  openLive: () => void;
  closeLive: () => void;
  toggleMinimize: () => void;
  toggleExpand: () => void;
};

export type LiveWidgetStore = LiveWidgetState & LiveWidgetActions;

const STORAGE_KEY = "ethone-live-widget";

export const useLiveWidgetStore = create<LiveWidgetStore>()(
  persist(
    (set) => ({
      isOpen: false,
      isMinimized: false,
      expanded: false,
      liveSource: "",

      setOpen: (open) => set({ isOpen: open }),
      setMinimized: (minimized) => set({ isMinimized: minimized }),
      setExpanded: (expanded) => set({ expanded }),
      setLiveSource: (liveSource) => set({ liveSource }),

      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      openLive: () => set({ isOpen: true, isMinimized: false }),
      closeLive: () => set({ isOpen: false, isMinimized: false, expanded: false }),
      toggleMinimize: () => set((state) => ({ isMinimized: !state.isMinimized })),
      toggleExpand: () => set((state) => ({ expanded: !state.expanded })),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        isOpen: state.isOpen,
        isMinimized: state.isMinimized,
        expanded: state.expanded,
        liveSource: state.liveSource,
      }),
    }
  )
);
