"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  Star,
  Send,
  FileEdit,
  Archive,
  Trash2,
  AlertTriangle,
  SquarePen,
  ChevronLeft,
  ChevronRight,
  Tag,
  HardDrive,
  Mail,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import Button from "@/components/ui/Button";
import MailProfileButton from "./MailProfileButton";
import type { MailAlias, MailLabel } from "@/lib/hooks/useMail";
import { cn } from "@/lib/utils";

export const FOLDERS = ["inbox", "starred", "sent", "drafts", "archive", "trash", "spam"] as const;
export type MailFolder = (typeof FOLDERS)[number];

type MailSidebarProps = {
  active: MailFolder;
  onChange: (folder: MailFolder) => void;
  counts: Record<string, number>;
  unread: number;
  onCompose: () => void;
  canCompose?: boolean;
  aliases?: MailAlias[];
  labels?: MailLabel[];
  activeLabel?: string;
  onSelectLabel?: (labelId: string | undefined) => void;
  createAlias?: (input: string | { alias?: string; display_name?: string; random?: boolean }) => Promise<MailAlias | null | undefined>;
  updateAlias?: (id: string, patch: { display_name?: string; is_primary?: boolean }) => Promise<MailAlias | null | undefined>;
};

const FOLDER_DEFS: { id: MailFolder; label: string; icon: typeof Inbox; color?: string }[] = [
  { id: "inbox", label: "Boîte de réception", icon: Inbox },
  { id: "starred", label: "Favoris / Suivis", icon: Star, color: "text-[var(--warning)]" },
  { id: "sent", label: "Messages envoyés", icon: Send },
  { id: "drafts", label: "Brouillons", icon: FileEdit },
  { id: "archive", label: "Archives", icon: Archive },
  { id: "trash", label: "Corbeille", icon: Trash2 },
  { id: "spam", label: "Courrier indésirable", icon: AlertTriangle },
];

export default function MailSidebar({
  active,
  onChange,
  counts,
  unread,
  onCompose,
  canCompose = true,
  aliases = [],
  labels = [],
  activeLabel,
  onSelectLabel,
  createAlias,
  updateAlias,
}: MailSidebarProps) {
  const i18n = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [storage, setStorage] = useState({ used: 1.2, total: 10 });

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) return;
    navigator.storage
      .estimate()
      .then((est) => {
        const total = (est.quota || 10 * 1024 ** 3) / 1024 ** 3;
        const used = (est.usage || 0) / 1024 ** 3;
        setStorage({ used: Math.max(0.1, used), total: Math.max(used, total) });
      })
      .catch(() => {});
  }, []);

  const percent = useMemo(
    () => Math.min(100, Math.max(1, Math.round((storage.used / storage.total) * 100))),
    [storage]
  );

  return (
    <motion.aside
      animate={{ width: collapsed ? "4.5rem" : "15rem" }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="relative flex h-full shrink-0 flex-col justify-between rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.45] p-3 shadow-sm backdrop-blur-[var(--panel-blur)] select-none overflow-hidden"
    >
      <div className="space-y-4">
        {/* Header with Collapse toggle */}
        <div className="flex items-center justify-between px-1">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shadow-sm">
                <Mail className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                ETHONE Mail
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--panel-border)]/[0.1] text-[var(--text-muted)] transition-all hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]",
              collapsed && "mx-auto"
            )}
            title={collapsed ? "Agrandir le menu" : "Réduire le menu"}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Compose Button */}
        <Button
          type="button"
          variant="primary"
          size={collapsed ? "sm" : "md"}
          onClick={onCompose}
          disabled={!canCompose}
          leftIcon={<SquarePen className="h-4 w-4" />}
          className={cn(
            "w-full shadow-md shadow-[var(--accent-primary)]/20 transition-all active:scale-95",
            collapsed ? "h-10 w-10 p-0 justify-center mx-auto" : "justify-center"
          )}
          title="Nouveau message (Ctrl+U)"
        >
          {!collapsed && (
            <div className="flex items-center justify-between w-full">
              <span>{i18n("newMessage", "Nouveau message")}</span>
              <kbd className="hidden sm:inline-block rounded bg-white/20 px-1.5 py-0.5 font-mono text-[9px] font-normal text-white">
                Ctrl+U
              </kbd>
            </div>
          )}
        </Button>

        {/* Navigation Folders */}
        <nav className="space-y-0.5" aria-label="Dossiers Mail">
          {FOLDER_DEFS.map((f) => {
            const isActive = active === f.id && !activeLabel;
            const count = counts[f.id] ?? 0;
            const IconComponent = f.icon;

            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onSelectLabel?.(undefined);
                  onChange(f.id);
                }}
                className={cn(
                  "group relative flex w-full items-center rounded-xl text-xs font-medium transition-all",
                  collapsed ? "h-10 justify-center px-0" : "justify-between px-3 py-2",
                  isActive
                    ? "text-[var(--text-primary)] font-semibold shadow-sm"
                    : "text-[var(--text-muted)] hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
                )}
                title={f.label}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeFolderPill"
                    className="absolute inset-0 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15 shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                <span className={cn("relative z-10 flex items-center gap-2.5 min-w-0", collapsed && "justify-center")}>
                  <span
                    className={cn(
                      "transition-colors",
                      isActive
                        ? "text-[var(--accent-primary)] scale-105"
                        : f.color || "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                    )}
                  >
                    <IconComponent className="h-4 w-4 shrink-0" />
                  </span>
                  {!collapsed && <span className="truncate">{i18n(f.id, f.label)}</span>}
                </span>

                {!collapsed && count > 0 && (
                  <span
                    className={cn(
                      "relative z-10 rounded-full px-2 py-0.5 text-[10px] font-mono font-medium",
                      f.id === "inbox" && unread > 0
                        ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-bold shadow-sm"
                        : "bg-[var(--panel-border)]/[0.2] text-[var(--text-muted)]"
                    )}
                  >
                    {f.id === "inbox" ? (unread > 0 ? unread : count) : count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Labels / Tags Section */}
        {labels.length > 0 && !collapsed && (
          <div className="pt-2 border-t border-[var(--panel-border)]/[0.1] space-y-1">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Étiquettes
            </p>
            {labels.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onSelectLabel?.(l.name)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs transition-colors",
                  activeLabel === l.name
                    ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-semibold"
                    : "text-[var(--text-muted)] hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
                )}
              >
                <Tag className="h-3 w-3" style={{ color: l.color || "var(--accent-primary)" }} />
                <span className="truncate">{l.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Area: Account profile & storage widget */}
      <div className="space-y-2.5 pt-3 border-t border-[var(--panel-border)]/[0.1]">
        {!collapsed && (
          <MailProfileButton
            aliases={aliases}
            primaryAlias={aliases.find((a) => a.is_primary)}
            createAlias={createAlias}
            updateAlias={updateAlias}
          />
        )}

        {/* Storage Widget */}
        {!collapsed ? (
          <div className="rounded-xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.3] p-2.5">
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
              <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                <HardDrive className="h-3 w-3 text-[var(--accent-primary)]" />
                {i18n("storage", "Stockage")}
              </span>
              <span className="font-mono">{percent}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-border)]/[0.2]">
              <div
                className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300 shadow-[0_0_8px_var(--glow-color)]"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] font-mono text-[var(--text-muted)]">
              {storage.used.toFixed(1)} Go / {storage.total.toFixed(0)} Go
            </p>
          </div>
        ) : (
          <div className="flex justify-center" title={`Stockage : ${percent}% utilisé`}>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--panel-bg)]/[0.4] text-[var(--text-muted)]">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
