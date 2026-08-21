"use client";

import { forwardRef, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Timer,
  Sparkles,
  Image,
  LayoutGrid,
  Maximize2,
  RefreshCw,
  Settings,
  Pin,
  Copy,
  Link as LinkIcon,
  Trash2,
} from "lucide-react";
import { useContextMenuActions } from "@/lib/hooks/useContextMenuActions";
import { useToast } from "@/components/ToastProvider";

type IconComponent = React.ComponentType<{ className?: string }>;

type BentoContextMenuItemDef =
  | {
      kind: "item";
      id: string;
      label: string;
      icon: IconComponent;
      shortcut?: string;
      danger?: boolean;
      action: () => void;
    }
  | { kind: "separator"; id?: string };

type BentoContextMenuProps = {
  onClose: () => void;
  x: number;
  y: number;
  context: string | null;
  contextId: string | null;
};

function BentoContextMenuItem({
  item,
  onClose,
}: {
  item: BentoContextMenuItemDef & { kind: "item" };
  onClose: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => {
        onClose();
        item.action();
      }}
      className="group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)] active:bg-[var(--text-primary)]/[0.12]"
    >
      <div className="flex items-center">
        <Icon
          className={`mr-2.5 h-4 w-4 shrink-0 transition-colors ${
            item.danger
              ? "text-zinc-400 group-hover:text-rose-400"
              : "text-zinc-400 group-hover:text-emerald-400"
          }`}
        />
        <span
          className={`flex-1 text-left font-medium ${
            item.danger ? "group-hover:text-rose-400" : ""
          }`}
        >
          {item.label}
        </span>
      </div>
      {item.shortcut && (
        <kbd className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 transition-colors group-hover:text-zinc-300">
          {item.shortcut}
        </kbd>
      )}
    </button>
  );
}

const BentoContextMenu = forwardRef<HTMLDivElement, BentoContextMenuProps>(
  function BentoContextMenu({ onClose, x, y, context, contextId }, ref) {
    const actions = useContextMenuActions();
    const { success } = useToast();

    const contextItems: BentoContextMenuItemDef[] = useMemo(() => {
      if (!context) return [];

      const label = contextId ? `${context} #${contextId.slice(0, 6)}` : context;

      function buildLink() {
        if (typeof window === "undefined") return "";
        if (context === "note" && contextId) {
          return `${window.location.origin}/notes/?note=${encodeURIComponent(contextId)}`;
        }
        if (context === "task" && contextId) {
          return `${window.location.origin}/tasks/?task=${encodeURIComponent(contextId)}`;
        }
        return window.location.href;
      }

      return [
        { kind: "separator", id: "ctx-sep" },
        {
          kind: "item",
          id: "ctx-fullscreen",
          label: "Ouvrir en plein écran",
          icon: Maximize2,
          action: () => success(`Ouvrir en plein écran — ${label}`),
        },
        {
          kind: "item",
          id: "ctx-pin",
          label: "Épingler au sommet",
          icon: Pin,
          action: () => success(`Épinglé au sommet — ${label}`),
        },
        {
          kind: "item",
          id: "ctx-duplicate",
          label: "Dupliquer",
          icon: Copy,
          action: () => success(`Dupliqué — ${label}`),
        },
        {
          kind: "item",
          id: "ctx-copy-link",
          label: "Copier le lien interne",
          icon: LinkIcon,
          action: () => {
            const link = buildLink();
            if (typeof window === "undefined") return;
            navigator.clipboard
              .writeText(link)
              .then(() => success("Lien interne copié"))
              .catch(() => success("Impossible de copier le lien"));
          },
        },
        {
          kind: "item",
          id: "ctx-delete",
          label: "Supprimer",
          icon: Trash2,
          danger: true,
          action: () => success(`Supprimé — ${label}`),
        },
      ];
    }, [context, contextId, success]);

    const items: BentoContextMenuItemDef[] = useMemo(() => {
      const generic: BentoContextMenuItemDef[] = [
        {
          kind: "item",
          id: "new-task",
          label: "Nouvelle tâche",
          icon: Plus,
          shortcut: "N",
          action: actions.newTask,
        },
        {
          kind: "item",
          id: "pomodoro",
          label: "Lancer un Pomodoro",
          icon: Timer,
          shortcut: "P",
          action: actions.startPomodoro,
        },
        {
          kind: "item",
          id: "brain",
          label: "Poser une question à Brain IA",
          icon: Sparkles,
          shortcut: "B",
          action: actions.openBrain,
        },
        { kind: "separator", id: "sep-1" },
        {
          kind: "item",
          id: "wallpaper",
          label: "Changer le fond d'écran",
          icon: Image,
          action: actions.cycleWallpaper,
        },
        {
          kind: "item",
          id: "reorganize",
          label: "Réorganiser les widgets",
          icon: LayoutGrid,
          action: actions.reorganizeWidgets,
        },
        {
          kind: "item",
          id: "fullscreen",
          label: "Mode Plein Écran",
          icon: Maximize2,
          action: actions.toggleFullscreen,
        },
        { kind: "separator", id: "sep-2" },
        {
          kind: "item",
          id: "reload",
          label: "Recharger l'OS",
          icon: RefreshCw,
          shortcut: "R",
          action: actions.reload,
        },
        {
          kind: "item",
          id: "settings",
          label: "Paramètres système",
          icon: Settings,
          shortcut: ",",
          action: actions.openSettings,
        },
      ];

      if (context) {
        const withoutFullscreen = generic.filter((i) =>
          i.kind === "item" ? i.id !== "fullscreen" : true
        );
        return [...withoutFullscreen, ...contextItems];
      }

      return generic;
    }, [actions, context, contextItems]);

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.92, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
        style={{ left: x, top: y }}
        className="fixed z-[9999] min-w-[220px] select-none rounded-2xl border border-white/[0.1] bg-zinc-950/85 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
      >
        {items.map((item, index) =>
          item.kind === "separator" ? (
            <div
              key={item.id ?? `sep-${index}`}
              className="my-1 h-px bg-white/[0.06]"
            />
          ) : (
            <BentoContextMenuItem key={item.id} item={item} onClose={onClose} />
          )
        )}
      </motion.div>
    );
  }
);

export default BentoContextMenu;
