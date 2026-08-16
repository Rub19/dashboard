"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type IntegrationValues = Record<string, string>;

export interface IntegrationStore {
  values: Record<string, IntegrationValues>;
  setField: (provider: string, key: string, value: string) => void;
  setFields: (provider: string, fields: Partial<IntegrationValues>) => void;
  getField: (provider: string, key: string) => string;
  resetProvider: (provider: string) => void;
  resetAll: () => void;
}

const STORAGE_KEY = "ethone_integrations_v1";

export const useIntegrationStore = create<IntegrationStore>()(
  persist(
    (set, get) => ({
      values: {},
      setField: (provider, key, value) =>
        set((state) => ({
          values: {
            ...state.values,
            [provider]: { ...state.values[provider], [key]: value },
          },
        })),
      setFields: (provider, fields) =>
        set((state) => ({
          values: {
            ...state.values,
            [provider]: { ...state.values[provider], ...(fields as IntegrationValues) },
          },
        })),
      getField: (provider, key) => get().values[provider]?.[key] || "",
      resetProvider: (provider) =>
        set((state) => ({
          values: {
            ...state.values,
            [provider]: {},
          },
        })),
      resetAll: () => set({ values: {} }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
