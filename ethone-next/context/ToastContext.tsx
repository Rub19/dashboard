"use client";

import { createContext, useContext, useCallback, useMemo, useRef } from "react";
import { toast as sonnerToast, Toaster } from "sonner";
import { Icon } from "@/lib/icons";
import { useSound } from "@/lib/sound";
import { useI18n } from "@/lib/hooks/useI18n";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { useNotifications } from "@/lib/hooks/useNotifications";
import RichToast, { type RichToastVariant } from "@/components/RichToast";
import FlagIcon, { LANGUAGE_LABELS, type Language } from "@/components/FlagIcon";
import DiscordIcon from "@/components/DiscordIcon";
import ClientImage from "@/components/ClientImage";
import { Sparkles, Brain, Palette, Layers, RefreshCw, ShieldAlert, CheckCircle2 } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning" | "loading";

export type { ToastType };

export type ToastInput = {
  type?: ToastType;
  variant?: RichToastVariant;
  title?: string;
  description?: string;
  message?: string;
  duration?: number;
  dedupKey?: string;
  badge?: string;
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
  modelSwitched: (modelName: string) => string;
  themeSwitched: (themeName: string) => string;
  workspaceSwitched: (space: string) => string;
  versionInfo: (version: string, commit?: string) => string;
};

interface ToastApi {
  show: (input: ToastInput) => string;
  success: (title: string, description?: string, action?: { label: string; onClick: () => void }) => string;
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

function DiscordAvatar({ avatarUrl }: { avatarUrl?: string }) {
  if (!avatarUrl) return <DiscordIcon className="h-5 w-5" />;
  return (
    <ClientImage
      src={avatarUrl}
      alt=""
      width={36}
      height={36}
      className="h-9 w-9 rounded-lg object-cover"
      fallback={
        <span className="flex h-full w-full items-center justify-center text-[var(--text-primary)]">
          <DiscordIcon className="h-5 w-5" />
        </span>
      }
    />
  );
}

function defaultIconFor(type: ToastType) {
  switch (type) {
    case "success":
      return <Icon name="check" pack="phosphor" className="h-5 w-5 text-emerald-400" />;
    case "error":
      return <Icon name="x" pack="phosphor" className="h-5 w-5 text-rose-400" />;
    case "warning":
      return <Icon name="warning" pack="phosphor" className="h-5 w-5 text-amber-400" />;
    case "loading":
      return <Icon name="loader-2" pack="phosphor" className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />;
    case "info":
    default:
      return <Icon name="info" pack="phosphor" className="h-5 w-5 text-cyan-400" />;
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { play } = useSound();
  const i18n = useI18n();
  const isMobile = useIsMobile();
  const { add: addNotification } = useNotifications();
  const activeDedups = useRef<Map<string, string>>(new Map());
  const lastNotified = useRef<Map<string, number>>(new Map());

  const show = useCallback(
    (input: ToastInput) => {
      const type = input.type || "info";
      const title = input.title || input.message || "";
      const description = input.description;
      const duration =
        type === "loading"
          ? Infinity
          : (input.duration ?? DEFAULT_DURATION);

      // Auto-deduplication: if dedupKey matches, remove existing instance
      if (input.dedupKey) {
        const existing = activeDedups.current.get(input.dedupKey);
        if (existing) sonnerToast.dismiss(existing);
      }

      // Record critical toasts in notification center history
      if (title && (type === "error" || type === "warning")) {
        const key = `${title}:${description ?? ""}:${type}`;
        const now = Date.now();
        const last = lastNotified.current.get(key);
        if (!last || now - last > 2000) {
          lastNotified.current.set(key, now);
          addNotification({
            title,
            message: description ?? "",
            category: type === "error" ? "security" : "system",
            type,
            priority: type === "error" ? "critical" : "important",
            source: "ETHONE",
          });
        }
      }

      const sound = SOUND_MAP[type];
      if (sound) play(sound as Parameters<typeof play>[0]);

      // Render ultra-sleek RichToast for all notifications
      const toastId = sonnerToast.custom(
        () => (
          <RichToast
            icon={input.icon || defaultIconFor(type)}
            title={title}
            description={description}
            variant={input.variant || (type as RichToastVariant)}
            action={input.action}
            duration={duration}
            badge={input.badge}
          />
        ),
        { duration, className: "w-full max-w-[23rem] bg-transparent border-0 shadow-none p-0" }
      );

      const id = String(toastId);

      if (input.dedupKey) {
        activeDedups.current.set(input.dedupKey, id);
        const clearAfter =
          typeof duration === "number" && duration !== Infinity ? duration : DEFAULT_DURATION;
        setTimeout(() => {
          if (activeDedups.current.get(input.dedupKey as string) === id) {
            activeDedups.current.delete(input.dedupKey as string);
          }
        }, clearAfter);
      }

      return id;
    },
    [play, addNotification]
  );

  const success = useCallback(
    (title: string, description?: string, action?: { label: string; onClick: () => void }) =>
      show({
        title,
        description,
        type: "success",
        action,
        icon: <Icon name="check" pack="phosphor" className="h-5 w-5 text-emerald-400" />,
      }),
    [show]
  );

  const error = useCallback(
    (title: string, description?: string) =>
      show({
        title,
        description,
        type: "error",
        icon: <Icon name="x" pack="phosphor" className="h-5 w-5 text-rose-400" />,
      }),
    [show]
  );

  const info = useCallback(
    (title: string, description?: string) =>
      show({
        title,
        description,
        type: "info",
        icon: <Icon name="info" pack="phosphor" className="h-5 w-5 text-cyan-400" />,
      }),
    [show]
  );

  const warning = useCallback(
    (title: string, description?: string) =>
      show({
        title,
        description,
        type: "warning",
        icon: <Icon name="warning" pack="phosphor" className="h-5 w-5 text-amber-400" />,
      }),
    [show]
  );

  const loading = useCallback(
    (title: string, description?: string) =>
      show({
        title,
        description,
        type: "loading",
        icon: <Icon name="loader-2" pack="phosphor" className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />,
      }),
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
          variant: "info",
          title: `${i18n("language", "Langue")} : ${LANGUAGE_LABELS[lang] || lang}`,
          icon: <FlagIcon code={lang} className="h-full w-full" />,
          duration: 3000,
          dedupKey: "language-toast",
          badge: "LANGUE",
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
          variant: "success",
          title,
          description,
          icon: <DiscordAvatar avatarUrl={user?.avatarUrl} />,
          duration: 4000,
          dedupKey: "discord-toast",
          badge: "DISCORD",
        });
      },

      discordDisconnect: () =>
        show({
          type: "info",
          variant: "warning",
          title: i18n("disconnectSuccess", "Déconnecté de Discord"),
          icon: <Icon name="unlink" pack="phosphor" className="h-5 w-5 text-amber-400" />,
          duration: 3000,
          dedupKey: "discord-toast",
          badge: "DISCORD",
        }),

      sync: (title?: string, description?: string) =>
        show({
          type: "success",
          variant: "success",
          title: title || i18n("settingsSaved", "Préférences sauvegardées"),
          description: description || i18n("syncedViaWorker", "Synchronisées via le Worker"),
          icon: <Icon name="cloud" pack="phosphor" className="h-5 w-5 text-emerald-400" />,
          duration: 3000,
          dedupKey: "sync-toast",
          badge: "CLOUD",
        }),

      reset: () =>
        show({
          type: "info",
          variant: "warning",
          title: i18n("settingsReset", "Paramètres rétablis"),
          description: i18n("defaultPreferencesRestored", "Valeurs par défaut restaurées"),
          icon: <Icon name="check" pack="phosphor" className="h-5 w-5 text-amber-400" />,
          duration: 3000,
          dedupKey: "reset-toast",
          badge: "RESET",
        }),

      noteCreated: (noteTitle?: string) =>
        show({
          type: "success",
          variant: "success",
          title: i18n("noteCreated", "Note créée"),
          description: noteTitle || "Note enregistrée dans votre espace.",
          icon: <Icon name="file-text" pack="phosphor" className="h-5 w-5 text-emerald-400" />,
          duration: 3000,
          dedupKey: "note-created-toast",
          badge: "NOTE",
        }),

      noteDeleted: (count = 1) =>
        show({
          type: "info",
          variant: "warning",
          title: `${i18n("deleted", "Supprimée")}${count > 1 ? ` (${count})` : ""}`,
          description: `${count} note(s) supprimée(s).`,
          icon: <Icon name="trash-2" pack="phosphor" className="h-5 w-5 text-rose-400" />,
          duration: 3000,
          dedupKey: "note-deleted-toast",
          badge: "SUPPRESSION",
        }),

      taskAdded: (taskTitle?: string) =>
        show({
          type: "success",
          variant: "success",
          title: i18n("added", "Tâche ajoutée"),
          description: taskTitle || "Tâche planifiée avec succès.",
          icon: <Icon name="check-square" pack="phosphor" className="h-5 w-5 text-emerald-400" />,
          duration: 3000,
          dedupKey: "task-added-toast",
          badge: "TÂCHE",
        }),

      taskDeleted: () =>
        show({
          type: "info",
          variant: "warning",
          title: i18n("deleted", "Tâche supprimée"),
          icon: <Icon name="trash-2" pack="phosphor" className="h-5 w-5 text-amber-400" />,
          duration: 3000,
          dedupKey: "task-deleted-toast",
          badge: "TÂCHE",
        }),

      clipboard: () =>
        show({
          type: "success",
          variant: "success",
          title: i18n("copied", "Copié dans le presse-papiers"),
          icon: <Icon name="clipboard-check" pack="phosphor" className="h-5 w-5 text-emerald-400" />,
          duration: 2200,
          dedupKey: "clipboard-toast",
          badge: "COPIE",
        }),

      modelSwitched: (modelName: string) =>
        show({
          type: "info",
          variant: "ai",
          title: "Modèle IA sélectionné",
          description: modelName,
          icon: <Brain className="h-5 w-5 text-purple-400" />,
          duration: 3000,
          dedupKey: "model-switch-toast",
          badge: "BRAIN AI",
        }),

      themeSwitched: (themeName: string) =>
        show({
          type: "info",
          variant: "info",
          title: "Thème d'affichage",
          description: `Thème activé : ${themeName}`,
          icon: <Palette className="h-5 w-5 text-cyan-400" />,
          duration: 2500,
          dedupKey: "theme-switch-toast",
          badge: "DESIGN",
        }),

      workspaceSwitched: (space: string) =>
        show({
          type: "info",
          variant: "version",
          title: "Espace de travail",
          description: `Espace actif : ${space}`,
          icon: <Layers className="h-5 w-5 text-emerald-400" />,
          duration: 2500,
          dedupKey: "workspace-switch-toast",
          badge: "ESPACE",
        }),

      versionInfo: (version: string, commit?: string) =>
        show({
          type: "info",
          variant: "version",
          title: "Version actuelle",
          description: `${version} ${commit ? `· #${commit}` : ""}`,
          icon: <Icon name="tag" pack="phosphor" className="h-5 w-5 text-emerald-400" />,
          duration: 3500,
          dedupKey: "current-version-toast",
          badge: "SYSTÈME",
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
        position={isMobile ? "bottom-center" : "bottom-right"}
        closeButton={false}
        expand
        visibleToasts={4}
        offset="1.25rem"
        gap={10}
        toastOptions={{
          unstyled: true,
          className: "pointer-events-auto",
        }}
      />
    </ToastContext.Provider>
  );
}
