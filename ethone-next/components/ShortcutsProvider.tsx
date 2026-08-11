"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";

export type Shortcut = {
  id: string;
  group: string;
  groupIcon?: string;
  icon?: string;
  keys: string[];
  label: string;
  handler?: (e: KeyboardEvent) => void;
};

export type ShortcutInput = Omit<Shortcut, "id">;

type ShortcutsContextType = {
  shortcuts: Shortcut[];
  register: (shortcut: ShortcutInput) => string;
  unregister: (id: string) => void;
};

const ShortcutsContext = createContext<ShortcutsContextType | null>(null);

let globalId = 0;

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);

  const register = useCallback((shortcut: ShortcutInput) => {
    globalId += 1;
    const id = `sc-${globalId}`;
    const entry = { ...shortcut, id };
    setShortcuts((prev) => [...prev, entry]);
    return id;
  }, []);

  const unregister = useCallback((id: string) => {
    setShortcuts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const value = useMemo(
    () => ({ shortcuts, register, unregister }),
    [shortcuts, register, unregister]
  );

  return (
    <ShortcutsContext.Provider value={value}>{children}</ShortcutsContext.Provider>
  );
}

export function useShortcuts() {
  const ctx = useContext(ShortcutsContext);
  if (!ctx) throw new Error("useShortcuts must be used within ShortcutsProvider");
  return ctx;
}

export function useShortcut(shortcut: ShortcutInput & { handler: (e: KeyboardEvent) => void }) {
  const { register, unregister } = useShortcuts();

  const handlerRef = useRef(shortcut.handler);
  useEffect(() => {
    handlerRef.current = shortcut.handler;
  }, [shortcut.handler]);

  const stable = useMemo(
    () => ({
      group: shortcut.group,
      groupIcon: shortcut.groupIcon,
      icon: shortcut.icon,
      keys: shortcut.keys,
      label: shortcut.label,
      handler: (e: KeyboardEvent) => handlerRef.current?.(e),
    }),
    [shortcut.group, shortcut.groupIcon, shortcut.icon, shortcut.keys, shortcut.label]
  );

  useEffect(() => {
    const id = register(stable);
    return () => unregister(id);
  }, [stable, register, unregister]);
}
