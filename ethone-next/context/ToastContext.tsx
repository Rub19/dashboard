"use client";

import { createContext, useContext, useCallback, useMemo } from "react";
import { toast as sonnerToast, Toaster } from "sonner";
import {
  Check,
  CheckSquare,
  ClipboardCheck,
  Cloud,
  FileText,
  Trash2,
  Unlink,
  X,
} from "lucide-react";
import { useSound } from "@/lib/sound";
import { useI18n } from "@/lib/hooks/useI18n";
import RichToast, { type RichToastVariant } from "@/components/RichToast";
import FlagIcon, { LANGUAGE_LABELS, type Language } from "@/components/FlagIcon";
import DiscordIcon from "@/components/DiscordIcon";
import ClientImage from "@/components/ClientImage";

type ToastType = "success" | "error" | "info" | "warning" | "loading";

export type { ToastType };

export type ToastInput = {
  type?: ToastType;
  title?: string;
  description?: string;
  message?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
};

export type DiscordNotifyUser = {
  username?: string;
  displayName?: string;
  avatarUrl?: string;
};

export type NotifyApi = {
  language: (lang: Language) => string;
  discord: (user?: DiscordNotifyUser) => string;
  discordDisconnect: () => string;
  sync: (title?: string, description?: string) => string;
  reset: () => string;
  noteCreated: (title?: string) => string;
  noteDeleted: (count?: number) => string;
  taskAdded: (title?: string) => string;
  taskDeleted: () => string;
  clipboard: () => string;
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
  notify: NotifyApi;
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

const VARIANT_BORDER: Record<Exclude<ToastType, "loading">, string> = {
  success: "border-[--accent-primary]",
  error: "border-rose-500/20",
  warning: "border-amber-500/20",
  info: "border-[--info]",
};

function DiscordAvatar({ avatarUrl }: { avatarUrl?: string }) {
  if (!avatarUrl) return <DiscordIcon className="h-5 w-5" />;
  return (
    <ClientImage
      src={avatarUrl}
      alt=""
      width={36}
      height={36}
      className="h-9 w-9 rounded-lg"
      fallback={
        <span className="flex h-full w-full items-center justify-center text-zinc-200">
          <DiscordIcon className="h-5 w-5" />
        </span>
      }
    />
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { play } = useSound();
  const i18n = useI18n();

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

      const action = input.action
        ? {
            label: input.action.label,
            onClick: input.action.onClick,
          }
        : undefined;

      if (input.icon && type !== "loading") {
        const border =
          VARIANT_BORDER[type as keyof typeof VARIANT_BORDER] || "border-white/10";

        const id = sonnerToast.custom(
          () => (
            <RichToast
              icon={input.icon}
              title={title}
              description={description}
              variant={type as RichToastVariant}
            />
          ),
          { duration, action, className: border }
        );
        return String(id);
      }

      const common = {
        description,
        duration,
        ...(action ? { action } : {}),
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

  const notify = useMemo<NotifyApi>(
    () => ({
      language: (lang: Language) =>
        show({
          type: "info",
          title: `${i18n("language", "Langue")} : ${LANGUAGE_LABELS[lang] || lang}`,
          icon: <FlagIcon code={lang} className="h-full w-full" />,
          duration: 3000,
        }),

      discord: (user?: DiscordNotifyUser) => {
        const name = user?.displayName || user?.username;
        const title = name
          ? `${i18n("connected", "Connecté")} — ${name}`
          : i18n("connected", "Connecté");
        const description = name
          ? `@${user?.username || user?.displayName}`
          : i18n("discordConnected", "Compte Discord connecté");
        return show({
          type: "success",
          title,
          description,
          icon: <DiscordAvatar avatarUrl={user?.avatarUrl} />,
          duration: 4000,
        });
      },

      discordDisconnect: () =>
        show({
          type: "info",
          title: i18n("disconnectSuccess", "Déconnecté de Discord"),
          icon: <Unlink className="h-5 w-5" />,
          duration: 3000,
        }),

      sync: (title?: string, description?: string) =>
        show({
          type: "success",
          title: title || i18n("settingsSaved", "Préférences sauvegardées"),
          description: description || i18n("syncedViaWorker", "Synchronisées via le Worker"),
          icon: <Cloud className="h-5 w-5" />,
          duration: 3000,
        }),

      reset: () =>
        show({
          type: "info",
          title: i18n("settingsReset", "Paramètres rétablis"),
          description: i18n("defaultPreferencesRestored", "Valeurs par défaut restaurées"),
          icon: <Check className="h-5 w-5" />,
          duration: 3000,
        }),

      noteCreated: (noteTitle?: string) =>
        show({
          type: "success",
          title: i18n("noteCreated", "Note créée"),
          description: noteTitle,
          icon: <FileText className="h-5 w-5" />,
          duration: 3000,
        }),

      noteDeleted: (count = 1) =>
        show({
          type: "info",
          title: `${i18n("deleted", "Supprimée")}${count > 1 ? ` (${count})` : ""}`,
          icon: <Trash2 className="h-5 w-5" />,
          duration: 3000,
        }),

      taskAdded: (taskTitle?: string) =>
        show({
          type: "success",
          title: i18n("added", "Tâche ajoutée"),
          description: taskTitle,
          icon: <CheckSquare className="h-5 w-5" />,
          duration: 3000,
        }),

      taskDeleted: () =>
        show({
          type: "info",
          title: i18n("deleted", "Tâche supprimée"),
          icon: <Trash2 className="h-5 w-5" />,
          duration: 3000,
        }),

      clipboard: () =>
        show({
          type: "success",
          title: i18n("copied", "Copié dans le presse-papiers"),
          icon: <ClipboardCheck className="h-5 w-5" />,
          duration: 2000,
        }),
    }),
    [i18n, show]
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
      notify,
      get toast(): ToastApi {
        return self;
      },
    };
    return self;
  }, [show, success, error, info, warning, loading, remove, dismiss, notify]);

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
              "group relative flex w-[22rem] max-w-[calc(100vw-1.5rem)] items-start gap-3 rounded-xl border border-white/10 bg-[#0C0C0E]/95 p-3.5 text-sm text-white shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-md",
            title: "font-medium text-white",
            description: "mt-0.5 text-xs text-zinc-300",
            actionButton:
              "ml-auto rounded-lg border border-white/[0.08] bg-white/[0.1] px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/[0.2]",
            cancelButton: "hidden",
            closeButton:
              "absolute right-2 top-2 rounded-md p-1 text-zinc-400 opacity-0 transition-all hover:bg-white/[0.1] hover:text-white group-hover:opacity-100",
            error: "border-rose-500/20",
            success: "border-[--accent-primary]",
            warning: "border-amber-500/20",
            info: "border-[--info]",
          },
        }}
        icons={{
          close: <X className="h-3.5 w-3.5" />,
        }}
      />
    </ToastContext.Provider>
  );
}
