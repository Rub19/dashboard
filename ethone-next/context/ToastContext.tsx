"use client";

import { createContext, useContext, useState, useCallback, useRef, useMemo } from "react";
import { useSound } from "@/lib/sound";
import {
  AnimatedToastStack,
  type AnimatedToastData,
  type ToastType,
} from "@/components/ui/animated-toast-stack";

export type { ToastType };

export type ToastInput = {
  type?: ToastType;
  title?: string;
  description?: string;
  message?: string; // legacy alias for title
  duration?: number;
};

interface ToastApi {
  show: (input: ToastInput) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  loading: (title: string, description?: string) => string;
  remove: (id: string) => void;
  dismiss: (id: string) => void;
  toast: ToastApi;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const DEFAULT_DURATION = 3500;

const SOUND_MAP: Record<ToastType, string | null> = {
  success: "success",
  error: "error",
  info: "notification",
  warning: "warning",
  loading: null,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<AnimatedToastData[]>([]);
  const { play } = useSound();
  const timers = useRef<Record<string, NodeJS.Timeout>>({});

  const remove = useCallback((id: string) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismiss = remove;

  const show = useCallback(
    (input: ToastInput) => {
      const id = Math.random().toString(36).slice(2);
      const type = input.type || "info";
      const title = input.title || input.message || "";
      const duration =
        type === "loading"
          ? 0
          : (input.duration ?? DEFAULT_DURATION);

      const toast: AnimatedToastData = {
        id,
        title,
        description: input.description,
        type,
        duration,
      };

      setToasts((prev) => [...prev, toast]);

      const sound = SOUND_MAP[type];
      if (sound) play(sound as Parameters<typeof play>[0]);

      if (duration > 0) {
        timers.current[id] = setTimeout(() => remove(id), duration);
      }

      return id;
    },
    [play, remove]
  );

  const success = useCallback(
    (title: string, description?: string) =>
      show({ title, description, type: "success" }),
    [show]
  );

  const error = useCallback(
    (title: string, description?: string) =>
      show({ title, description, type: "error" }),
    [show]
  );

  const info = useCallback(
    (title: string, description?: string) =>
      show({ title, description, type: "info" }),
    [show]
  );

  const warning = useCallback(
    (title: string, description?: string) =>
      show({ title, description, type: "warning" }),
    [show]
  );

  const loading = useCallback(
    (title: string, description?: string) =>
      show({ title, description, type: "loading" }),
    [show]
  );

  const api = useMemo<ToastApi>(() => {
    const self: ToastApi = {
      show,
      success,
      error,
      info,
      warning,
      loading,
      remove,
      dismiss,
      get toast(): ToastApi {
        return self;
      },
    };
    return self;
  }, [show, success, error, info, warning, loading, remove, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <AnimatedToastStack
        toasts={toasts}
        onRemove={remove}
        position="top-right"
        placement="fixed"
        maxVisible={4}
      />
    </ToastContext.Provider>
  );
}
