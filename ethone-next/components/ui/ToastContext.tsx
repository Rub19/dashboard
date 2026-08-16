"use client";

import { createContext, useContext, useState, useCallback, useRef, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { useSound } from "@/lib/sound";
import Toast, { type ToastData, type ToastType } from "@/components/ui/Toast";

type ToastOptions = {
  duration?: number;
};

interface ToastApi {
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  loading: (message: string) => string;
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

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
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

  const add = useCallback(
    (message: string, type: ToastType, options?: ToastOptions) => {
      const id = Math.random().toString(36).slice(2);
      const duration = type === "loading" ? 0 : (options?.duration ?? 3500);
      const toast: ToastData = { id, message, type, duration };

      setToasts((prev) => [...prev, toast]);

      const soundMap: Record<ToastType, string | null> = {
        success: "success",
        error: "error",
        info: "notification",
        warning: "warning",
        loading: null,
      };

      const sound = soundMap[type];
      if (sound) play(sound as Parameters<typeof play>[0]);

      if (duration > 0) {
        timers.current[id] = setTimeout(() => remove(id), duration);
      }

      return id;
    },
    [play, remove]
  );

  const success = useCallback(
    (message: string, duration?: number) => add(message, "success", duration ? { duration } : undefined),
    [add]
  );
  const error = useCallback(
    (message: string, duration?: number) => add(message, "error", duration ? { duration } : undefined),
    [add]
  );
  const info = useCallback(
    (message: string, duration?: number) => add(message, "info", duration ? { duration } : undefined),
    [add]
  );
  const warning = useCallback(
    (message: string, duration?: number) => add(message, "warning", duration ? { duration } : undefined),
    [add]
  );
  const loading = useCallback((message: string) => add(message, "loading"), [add]);

  const api = useMemo<ToastApi>(() => {
    const self: ToastApi = {
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
  }, [success, error, info, warning, loading, remove, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[100] flex w-[min(28rem,calc(100vw-2.5rem))] flex-col gap-3 items-end max-md:bottom-auto max-md:right-4 max-md:left-4 max-md:top-4 max-md:w-auto max-md:items-stretch"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast, index) => {
            const depth = toasts.length - 1 - index;
            return <Toast key={toast.id} toast={toast} depth={depth} onRemove={() => remove(toast.id)} />;
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
