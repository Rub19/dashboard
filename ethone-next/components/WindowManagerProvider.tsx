"use client";

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

export type WindowState = {
  id: string;
  title: string;
  route: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
};

type WindowManagerContext = {
  windows: WindowState[];
  missionControl: boolean;
  openWindow: (route: string, title: string) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindow: (id: string, patch: Partial<WindowState>) => void;
  toggleMissionControl: () => void;
  setMissionControl: (v: boolean) => void;
};

const Context = createContext<WindowManagerContext | null>(null);

let zSeed = 10;

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [missionControl, setMissionControl] = useState(false);
  const used = useRef(new Set<string>());

  const focusWindow = useCallback((id: string) => {
    zSeed += 1;
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, z: zSeed } : w)));
  }, []);

  const openWindow = useCallback((route: string, title: string) => {
    const id = `${route.replace(/\//g, "-")}-${Date.now()}`;
    const count = Array.from(used.current).filter((k) => k.startsWith(route)).length + 1;
    used.current.add(id);
    zSeed += 1;
    const offset = count * 24;
    setWindows((prev) => [
      ...prev,
      {
        id,
        title: count > 1 ? `${title} #${count}` : title,
        route,
        x: 80 + offset,
        y: 80 + offset,
        width: 560,
        height: 360,
        z: zSeed,
      },
    ]);
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const updateWindow = useCallback((id: string, patch: Partial<WindowState>) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }, []);

  const toggleMissionControl = useCallback(() => {
    setMissionControl((v) => !v);
  }, []);

  return (
    <Context.Provider
      value={{ windows, missionControl, openWindow, closeWindow, focusWindow, updateWindow, toggleMissionControl, setMissionControl }}
    >
      {children}
    </Context.Provider>
  );
}

export function useWindowManager() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useWindowManager requires WindowManagerProvider");
  return ctx;
}
