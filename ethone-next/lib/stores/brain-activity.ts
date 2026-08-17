"use client";

import { create } from "zustand";

export interface BrainActivityState {
  isThinking: boolean;
  setIsThinking: (thinking: boolean) => void;
}

export const useBrainActivityStore = create<BrainActivityState>((set) => ({
  isThinking: false,
  setIsThinking: (thinking) => set({ isThinking: thinking }),
}));
