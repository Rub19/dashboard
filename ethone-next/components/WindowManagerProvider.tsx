"use client";

import { createContext, useContext, useMemo, useState, useCallback, useRef, type ReactNode } from "react";
import { LayerProvider } from "./LayerProvider";
import { WindowRenderer } from "./WindowRenderer";

type WindowGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  maximized?: boolean;
  prev?: { x: number; y: number; width: number; height: number };
};

export type OpenWindowOptions = Partial<Pick<WindowGeometry, "x" | "y" | "width" | "height" | "maximized">> & {
  modal?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  closeOnResize?: boolean;
  closeOnScroll?: boolean;
  focusOnOpen?: boolean;
};

export type WindowState = WindowGeometry & {
  id: string;
  title: string;
  route: string;
  z: number;
  options?: OpenWindowOptions;
};

type WindowManagerContext = {
  windows: WindowState[];
  missionControl: boolean;
  openWindow: (title: string, route: string, options?: OpenWindowOptions) => void;
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

  const openWindow = useCallback(
    (title: string, route: string, options: OpenWindowOptions = {}) => {
      const id = `${route.replace(/\//g, "-")}-${Date.now()}`;
      const count = Array.from(used.current).filter((k) => k.startsWith(route)).length + 1;
      used.current.add(id);
      zSeed += 1;
      const offset = count * 24;
      const {
        x,
        y,
        width,
        height,
        maximized,
        ...layerOptions
      } = options;
      setWindows((prev) => [
        ...prev,
        {
          id,
          title: count > 1 ? `${title} #${count}` : title,
          route,
          x: x !== undefined ? x : 80 + offset,
          y: y !== undefined ? y : 80 + offset,
          width: width !== undefined ? width : 560,
          height: height !== undefined ? height : 360,
          z: zSeed,
          maximized: maximized ?? false,
          options: layerOptions,
        },
      ]);
    },
    []
  );

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const updateWindow = useCallback((id: string, patch: Partial<WindowState>) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              ...patch,
              options: patch.options ? { ...w.options, ...patch.options } : w.options,
            }
          : w
      )
    );
  }, []);

  const toggleMissionControl = useCallback(() => {
    setMissionControl((v) => !v);
  }, []);

  const value = useMemo(
    () => ({
      windows,
      missionControl,
      openWindow,
      closeWindow,
      focusWindow,
      updateWindow,
      toggleMissionControl,
      setMissionControl,
    }),
    [windows, missionControl, openWindow, closeWindow, focusWindow, updateWindow, toggleMissionControl]
  );

  return (
    <Context.Provider value={value}>
      <LayerProvider>
        {children}
        <WindowRenderer />
      </LayerProvider>
    </Context.Provider>
  );
}

export function useWindowManager() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useWindowManager requires WindowManagerProvider");
  return ctx;
}
