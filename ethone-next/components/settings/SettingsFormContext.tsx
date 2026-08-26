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

type HistoryItem = {
  key: string;
  path?: string;
  previous: unknown;
  value: unknown;
};

type HistoryEntry = {
  id: string;
  at: number;
  items: HistoryItem[];
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
  /** Global form history / undo. */
  history: HistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  /** Save UI state. */
  isSaving: boolean;
};

const SettingsFormContext = createContext<SettingsFormState | null>(null);

export function useSettingsForm() {
  const ctx = useContext(SettingsFormContext);
  if (!ctx) throw new Error("useSettingsForm must be used within a SettingsFormProvider");
  return ctx;
}

const HISTORY_LIMIT = 20;

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

export function SettingsFormProvider({ children }: { children: React.ReactNode }) {
  const { settings, update } = useSettings();
  const [query, setQuery] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
  const [isSaving, setIsSaving] = useState(false);
  const [microSaves, setMicroSaves] = useState<MicroSave[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);

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

  const pushHistory = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => [...prev, entry].slice(-HISTORY_LIMIT));
    setFuture([]);
  }, []);

  const snapshot = useCallback(
    (items: HistoryItem[]) => {
      pushHistory({ id: makeId(), at: Date.now(), items });
    },
    [pushHistory]
  );

  const applyEntry = useCallback(
    (entry: HistoryEntry) => {
      const source = settings as Record<string, unknown>;
      let next = { ...source } as Record<string, unknown>;
      const keysToClear: string[] = [];

      for (const item of entry.items) {
        if (item.path) {
          next = setValueByPath(next, item.path, item.value);
        } else {
          next[item.key] = item.value;
        }
        if (item.key in draft) {
          keysToClear.push(item.key);
        }
      }

      if (keysToClear.length) {
        setDraft((prev) => {
          const copy = { ...prev };
          for (const k of keysToClear) delete copy[k];
          return copy;
        });
      }

      update(next as Partial<Settings>);
    },
    [settings, update, draft]
  );

  const updateInstant = useCallback(
    (key: string, value: unknown, path?: string) => {
      const source = settings as Record<string, unknown>;
      const previous = path ? getValueByPath(source, path) : source[key];

      if (path) {
        const next = setValueByPath(source, path, value);
        update(next as Partial<Settings>);
      } else {
        update({ [key]: value } as Partial<Settings>);
      }

      snapshot([{ key, path, previous, value }]);

      const at = Date.now();
      setMicroSaves((prev) => {
        const filtered = prev.filter((m) => m.key !== key);
        return [...filtered, { key, at }];
      });
      window.setTimeout(() => {
        setMicroSaves((prev) => prev.filter((m) => !(m.key === key && m.at === at)));
      }, 1500);
    },
    [settings, update, snapshot]
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

  const setExplicit = useCallback(
    (key: string, value: unknown) => {
      const previous = currentValue(key);
      setDraft((prev) => ({ ...prev, [key]: value }));
      snapshot([{ key, previous, value }]);
    },
    [currentValue, snapshot]
  );

  const clearExplicitKey = useCallback((key: string) => {
    setDraft((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const saveExplicit = useCallback(() => {
    setIsSaving(true);
    const known = Object.fromEntries(
      Object.entries(draft).filter(([key]) => key !== "accountPassword")
    );
    if (Object.keys(known).length > 0) {
      update(known as Partial<Settings>);
    }
    setDraft({});
    window.setTimeout(() => setIsSaving(false), 600);
  }, [draft, update]);

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

      const source = settings as Record<string, unknown>;
      const previous = path ? getValueByPath(source, path) : source[key];
      snapshot([{ key, path, previous, value: defaultVal }]);

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
    [settings, update, defaults, draft, snapshot]
  );

  const undo = useCallback(() => {
    const entry = history[history.length - 1];
    if (!entry) return;

    const source = settings as Record<string, unknown>;
    let next = { ...source } as Record<string, unknown>;
    const keysToClear: string[] = [];

    for (const item of entry.items) {
      const previous = item.previous;
      if (item.path) {
        next = setValueByPath(next, item.path, previous);
      } else {
        next[item.key] = previous;
      }
      if (item.key in draft) {
        keysToClear.push(item.key);
      }
    }

    if (keysToClear.length) {
      setDraft((prev) => {
        const copy = { ...prev };
        for (const k of keysToClear) delete copy[k];
        return copy;
      });
    }

    update(next as Partial<Settings>);
    setHistory((prev) => prev.slice(0, -1));
    setFuture((prev) => [entry, ...prev].slice(0, HISTORY_LIMIT));
  }, [history, settings, update, draft]);

  const redo = useCallback(() => {
    const entry = future[0];
    if (!entry) return;
    applyEntry(entry);
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, entry].slice(-HISTORY_LIMIT));
  }, [future, applyEntry]);

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

  const canUndo = history.length > 0;
  const canRedo = future.length > 0;

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
      history,
      canUndo,
      canRedo,
      undo,
      redo,
      isSaving,
    }),
    [
      query,
      isSaving,
      showAdvanced,
      draft,
      microSaves,
      setExplicit,
      saveExplicit,
      cancelExplicit,
      resetToDefault,
      clearExplicitKey,
      isDirty,
      hasExplicitChanges,
      isExplicitFieldDirty,
      instantSaved,
      currentValue,
      updateInstant,
      matchesSearch,
      triggerInstantSaved,
      isKnownSetting,
      history,
      canUndo,
      canRedo,
      undo,
      redo,
    ]
  );

  return <SettingsFormContext.Provider value={value}>{children}</SettingsFormContext.Provider>;
}
