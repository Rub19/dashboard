"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from "react";

type Layer = { id: string; onClose: () => void };

type LayerContext = {
  layers: Layer[];
  register: (id: string, onClose: () => void) => void;
  unregister: (id: string) => void;
  closeTop: () => void;
  isTop: (id: string) => boolean;
};

const LayerCtx = createContext<LayerContext | null>(null);

export function LayerProvider({ children }: { children: React.ReactNode }) {
  const [layers, setLayers] = useState<Layer[]>([]);

  const register = useCallback((id: string, onClose: () => void) => {
    setLayers((prev) => {
      const next = prev.filter((l) => l.id !== id);
      return [...next, { id, onClose }];
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const closeTop = useCallback(() => {
    setLayers((prev) => {
      if (prev.length === 0) return prev;
      const top = prev[prev.length - 1];
      top.onClose();
      return prev;
    });
  }, []);

  const isTop = useCallback((id: string) => layers.length > 0 && layers[layers.length - 1].id === id, [layers]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeTop();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeTop]);

  const value = useMemo(
    () => ({ layers, register, unregister, closeTop, isTop }),
    [layers, register, unregister, closeTop, isTop]
  );

  return <LayerCtx.Provider value={value}>{children}</LayerCtx.Provider>;
}

export function useLayer(open: boolean, onClose: () => void) {
  const ctx = useContext(LayerCtx);
  const id = useId();

  useEffect(() => {
    if (!ctx) return;
    if (open) {
      ctx.register(id, onClose);
      return () => ctx.unregister(id);
    }
  }, [open, onClose, ctx, id]);

  if (!ctx) {
    return { isTop: true, closeTop: () => {} };
  }

  return { isTop: ctx.isTop(id), closeTop: ctx.closeTop };
}
