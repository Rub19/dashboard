"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useSound } from "@/lib/sound";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  remove: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { play } = useSound();

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    (message: string, type: ToastType) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type }]);
      if (type === "success") play("success");
      if (type === "error") play("error");
      if (type === "info") play("notification");
      setTimeout(() => remove(id), 3500);
    },
    [play, remove]
  );

  const success = useCallback((message: string) => add(message, "success"), [add]);
  const error = useCallback((message: string) => add(message, "error"), [add]);
  const info = useCallback((message: string) => add(message, "info"), [add]);

  return (
    <ToastContext.Provider value={{ success, error, info, remove }}>
      {children}
      <div className="fixed right-4 top-20 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              layout
              className={`flex items-center gap-3 rounded-[var(--panel-radius)] border bg-[var(--panel-bg)]/95 px-4 py-3 shadow-lg backdrop-blur-md ${
                toast.type === "success"
                  ? "border-emerald-500/30 text-emerald-400"
                  : toast.type === "error"
                    ? "border-red-500/30 text-red-400"
                    : "border-[var(--accent)]/30 text-[var(--accent)]"
              }`}
            >
              <Icon
                name={toast.type === "success" ? "check" : toast.type === "error" ? "alert-circle" : "bell"}
                className="h-5 w-5 shrink-0"
              />
              <p className="flex-1 text-sm">{toast.message}</p>
              <button
                type="button"
                onClick={() => remove(toast.id)}
                className="shrink-0 text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
