"use client";

import { createContext, useContext, useCallback, useMemo } from "react";
import { toast as sonnerToast, Toaster } from "sonner";
import { useSound } from "@/lib/sound";
import { X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning" | "loading";

export type { ToastType };

export type ToastInput = {
  type?: ToastType;
  title?: string;
  description?: string;
  message?: string; // legacy alias for title
  duration?: number;
  action?: { label: string; onClick: () => void };
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
  const { play } = useSound();

  const show = useCallback(
    (input: ToastInput) => {
      const type = input.type || "info";
      const title = input.title || input.message || "";
      const description = input.description;
      const duration =
        type === "loading"
          ? Infinity
          : (input.duration ?? DEFAULT_DURATION);

      const sound = SOUND_MAP[type];
      if (sound) play(sound as Parameters<typeof play>[0]);

      const common = {
        description,
        duration,
        ...(input.action
          ? {
              action: {
                label: input.action.label,
                onClick: input.action.onClick,
              },
            }
          : {}),
      };

      let id: string | number;
      switch (type) {
        case "success":
          id = sonnerToast.success(title, common);
          break;
        case "error":
          id = sonnerToast.error(title, common);
          break;
        case "warning":
          id = sonnerToast.warning(title, common);
          break;
        case "loading":
          id = sonnerToast.loading(title, common);
          break;
        default:
          id = sonnerToast(title, common);
          break;
      }

      return String(id);
    },
    [play]
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

  const remove = useCallback((id: string) => {
    sonnerToast.dismiss(id);
  }, []);

  const dismiss = remove;

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
      <Toaster
        position="bottom-right"
        closeButton
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              "group relative flex w-[22rem] max-w-[calc(100vw-1.5rem)] items-start gap-3 rounded-2xl border border-white/[0.08] bg-black/90 p-4 text-sm text-white shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl",
            title: "font-medium text-white",
            description: "mt-0.5 text-xs text-zinc-300",
            actionButton:
              "ml-auto rounded-lg border border-white/[0.08] bg-white/[0.1] px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/[0.2]",
            cancelButton: "hidden",
            closeButton:
              "absolute right-2 top-2 rounded-md p-1 text-zinc-400 opacity-0 transition-all hover:bg-white/[0.1] hover:text-white group-hover:opacity-100",
            error: "border-white/10 bg-black/90 text-white",
            success: "border-white/10 bg-black/90 text-white",
            warning: "border-white/10 bg-black/90 text-white",
            info: "border-white/10 bg-black/90 text-white",
          },
        }}
        icons={{
          close: <X className="h-3.5 w-3.5" />,
        }}
      />
    </ToastContext.Provider>
  );
}
