"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { DEFAULTS, type Settings } from "@/lib/settings";
import { getValueByPath, setValueByPath } from "@/lib/object-path";

type Draft = Record<string, unknown>;

type MicroSave = {
  key: string;
  at: number;
};

type SettingsFormState = {
  query: string;
  setQuery: (q: string) => void;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  draft: Draft;
  setExplicit: (key: string, value: unknown) => void;
  saveExplicit: () => void;
  cancelExplicit: () => void;
  resetToDefault: (key: string, path: string) => void;
  isDirty: (key: string, value: unknown, defaultValue: unknown) => boolean;
  hasExplicitChanges: boolean;
  isExplicitFieldDirty: (key: string) => boolean;
  instantSaved: (key: string) => boolean;
  microSaves: MicroSave[];
  triggerInstantSaved: (key: string) => void;
  currentValue: (key: string, path?: string) => unknown;
  updateInstant: (key: string, value: unknown, path?: string) => void;
  matchesSearch: (text: string, keywords?: string[]) => boolean;
};

const SettingsFormContext = createContext<SettingsFormState | null>(null);

export function useSettingsForm() {
  const ctx = useContext(SettingsFormContext);
  if (!ctx) throw new Error("useSettingsForm must be used within a SettingsFormProvider");
  return ctx;
}

export function SettingsFormProvider({ children }: { children: React.ReactNode }) {
  const { settings, update } = useSettings();
  const [query, setQuery] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
  const [microSaves, setMicroSaves] = useState<MicroSave[]>([]);

  const currentValue = useCallback(
    (key: string, path?: string) => {
      if (key in draft) return draft[key];
      const source = settings as Record<string, unknown>;
      return path ? getValueByPath(source, path) : source[key];
    },
    [draft, settings]
  );

  const updateInstant = useCallback(
    (key: string, value: unknown, path?: string) => {
      if (path) {
        const next = setValueByPath(settings as Record<string, unknown>, path, value);
        update(next as Partial<Settings>);
      } else {
        update({ [key]: value } as Partial<Settings>);
      }
      setMicroSaves((prev) => {
        const filtered = prev.filter((m) => m.key !== key);
        return [...filtered, { key, at: Date.now() }];
      });
      window.setTimeout(() => {
        setMicroSaves((prev) => prev.filter((m) => !(m.key === key && m.at === Date.now())));
      }, 1500);
    },
    [settings, update]
  );

  const setExplicit = useCallback((key: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveExplicit = useCallback(() => {
    update(draft as Partial<Settings>);
    setDraft({});
  }, [draft, update]);

  const cancelExplicit = useCallback(() => {
    setDraft({});
  }, []);

  const resetToDefault = useCallback(
    (key: string, path?: string) => {
      const source = DEFAULTS as Record<string, unknown>;
      const defaultValue = path ? getValueByPath(source, path) : source[key];
      if (key in draft) {
        setDraft((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
      if (path) {
        const next = setValueByPath(settings as Record<string, unknown>, path, defaultValue);
        update(next as Partial<Settings>);
      } else {
        update({ [key]: defaultValue } as Partial<Settings>);
      }
    },
    [settings, update]
  );

  const isDirty = useCallback(
    (key: string, value: unknown, defaultValue: unknown) => {
      return JSON.stringify(value) !== JSON.stringify(defaultValue);
    },
    []
  );

  const hasExplicitChanges = useMemo(() => Object.keys(draft).length > 0, [draft]);

  const isExplicitFieldDirty = useCallback(
    (key: string) => key in draft,
    [draft]
  );

  const instantSaved = useCallback(
    (key: string) => microSaves.some((m) => m.key === key && Date.now() - m.at < 1500),
    [microSaves]
  );

  const triggerInstantSaved = useCallback((key: string) => {
    setMicroSaves((prev) => [...prev.filter((m) => m.key !== key), { key, at: Date.now() }]);
  }, []);

  const matchesSearch = useCallback(
    (text: string, keywords?: string[]) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      const haystack = [text, ...(keywords || [])].join(" ").toLowerCase();
      return haystack.includes(q);
    },
    [query]
  );

  const value = useMemo(
    () => ({
      query,
      setQuery,
      showAdvanced,
      setShowAdvanced,
      draft,
      setExplicit,
      saveExplicit,
      cancelExplicit,
      resetToDefault,
      isDirty,
      hasExplicitChanges,
      isExplicitFieldDirty,
      instantSaved,
      microSaves,
      triggerInstantSaved,
      currentValue,
      updateInstant,
      matchesSearch,
    }),
    [query, showAdvanced, draft, microSaves, setExplicit, saveExplicit, cancelExplicit, resetToDefault, isDirty, currentValue, updateInstant, matchesSearch]
  );

  return <SettingsFormContext.Provider value={value}>{children}</SettingsFormContext.Provider>;
}
