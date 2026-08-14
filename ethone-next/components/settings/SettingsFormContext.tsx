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
  resetToDefault: (key: string, path?: string, defaultValue?: unknown) => void;
  clearExplicitKey: (key: string) => void;
  isDirty: (key: string, value: unknown, defaultValue: unknown) => boolean;
  hasExplicitChanges: boolean;
  isExplicitFieldDirty: (key: string) => boolean;
  instantSaved: (key: string) => boolean;
  microSaves: MicroSave[];
  triggerInstantSaved: (key: string) => void;
  currentValue: (key: string, path?: string) => unknown;
  updateInstant: (key: string, value: unknown, path?: string) => void;
  matchesSearch: (text: string, keywords?: string[]) => boolean;
  isKnownSetting: (key: string, path?: string) => boolean;
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

  const defaults = DEFAULTS as Record<string, unknown>;

  const isKnownSetting = useCallback(
    (key: string, path?: string) => {
      const topKey = path ? path.split(".")[0] : key;
      return topKey in defaults;
    },
    [defaults]
  );

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
      const at = Date.now();
      setMicroSaves((prev) => {
        const filtered = prev.filter((m) => m.key !== key);
        return [...filtered, { key, at }];
      });
      window.setTimeout(() => {
        setMicroSaves((prev) => prev.filter((m) => !(m.key === key && m.at === at)));
      }, 1500);
    },
    [settings, update]
  );

  const triggerInstantSaved = useCallback((key: string) => {
    const at = Date.now();
    setMicroSaves((prev) => {
      const filtered = prev.filter((m) => m.key !== key);
      return [...filtered, { key, at }];
    });
    window.setTimeout(() => {
      setMicroSaves((prev) => prev.filter((m) => !(m.key === key && m.at === at)));
    }, 1500);
  }, []);

  const setExplicit = useCallback((key: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearExplicitKey = useCallback((key: string) => {
    setDraft((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const saveExplicit = useCallback(() => {
    const known = Object.fromEntries(
      Object.entries(draft).filter(([key]) => key in defaults)
    );
    if (Object.keys(known).length > 0) {
      update(known as Partial<Settings>);
    }
    setDraft({});
  }, [draft, update, defaults]);

  const cancelExplicit = useCallback(() => {
    setDraft({});
  }, []);

  const resetToDefault = useCallback(
    (key: string, path?: string, defaultValue?: unknown) => {
      const topKey = path ? path.split(".")[0] : key;
      const isKnown = topKey in defaults;
      const defaultVal =
        defaultValue !== undefined
          ? defaultValue
          : path
            ? getValueByPath(defaults, path)
            : defaults[key];

      if (key in draft) {
        setDraft((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }

      if (!isKnown) return;

      if (path) {
        const next = setValueByPath(settings as Record<string, unknown>, path, defaultVal);
        update(next as Partial<Settings>);
      } else {
        update({ [key]: defaultVal } as Partial<Settings>);
      }
    },
    [settings, update, defaults]
  );

  const isDirty = useCallback((key: string, value: unknown, defaultValue: unknown) => {
    void key;
    return JSON.stringify(value) !== JSON.stringify(defaultValue);
  }, []);

  const hasExplicitChanges = useMemo(() => Object.keys(draft).length > 0, [draft]);

  const isExplicitFieldDirty = useCallback(
    (key: string) => key in draft,
    [draft]
  );

  const instantSaved = useCallback(
    (key: string) => microSaves.some((m) => m.key === key),
    [microSaves]
  );

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
      clearExplicitKey,
      isDirty,
      hasExplicitChanges,
      isExplicitFieldDirty,
      instantSaved,
      microSaves,
      triggerInstantSaved,
      currentValue,
      updateInstant,
      matchesSearch,
      isKnownSetting,
    }),
    [
      query,
      showAdvanced,
      draft,
      microSaves,
      setExplicit,
      saveExplicit,
      cancelExplicit,
      resetToDefault,
      clearExplicitKey,
      isDirty,
      currentValue,
      updateInstant,
      matchesSearch,
      isKnownSetting,
    ]
  );

  return <SettingsFormContext.Provider value={value}>{children}</SettingsFormContext.Provider>;
}
