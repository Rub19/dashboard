"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
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
  createAlias?: (
    input: string | { alias?: string; display_name?: string; random?: boolean }
  ) => Promise<MailAlias | null | undefined>;
  updateAlias?: (
    id: string,
    patch: { display_name?: string; is_primary?: boolean }
  ) => Promise<MailAlias | null | undefined>;
};

const FOLDER_DEFS: { id: MailFolder; label: string; icon: typeof Inbox }[] = [
  { id: "inbox", label: "Boîte de réception", icon: Inbox },
  { id: "starred", label: "Suivis", icon: Star },
  { id: "sent", label: "Envoyés", icon: Send },
  { id: "drafts", label: "Brouillons", icon: FileEdit },
  { id: "archive", label: "Archives", icon: Archive },
  { id: "trash", label: "Corbeille", icon: Trash2 },
  { id: "spam", label: "Indésirables", icon: AlertTriangle },
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

  return (
    <motion.aside
      animate={{ width: collapsed ? "4rem" : "15rem" }}
      transition={{ type: "spring", stiffness: 350, damping: 32 }}
      className="v8-panel relative flex h-full shrink-0 flex-col justify-between overflow-hidden p-2.5 select-none"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className={cn("flex items-center px-1", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Mail</span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            title={collapsed ? "Agrandir" : "Réduire"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Compose */}
        <button
          type="button"
          onClick={onCompose}
          disabled={!canCompose}
          className={cn(
            "flex items-center rounded-xl bg-[var(--accent-primary)] font-medium text-[var(--accent-contrast)] transition-[filter,transform] duration-150 hover:brightness-[1.08] active:scale-[0.98] disabled:opacity-50",
            collapsed ? "mx-auto h-10 w-10 justify-center" : "w-full gap-2 px-3 py-2.5"
          )}
          title="Nouveau message (Ctrl+U)"
        >
          <SquarePen className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-[13px]">{i18n("newMessage", "Nouveau message")}</span>}
        </button>

        {/* Folders */}
        <nav className="space-y-0.5" aria-label="Dossiers Mail">
          {FOLDER_DEFS.map((f) => {
            const isActive = active === f.id && !activeLabel;
            const count = counts[f.id] ?? 0;
            const Icon = f.icon;
            const badge = f.id === "inbox" ? (unread > 0 ? unread : 0) : count;

            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onSelectLabel?.(undefined);
                  onChange(f.id);
                }}
                className={cn(
                  "group flex w-full items-center rounded-lg text-[13px] transition-colors",
                  collapsed ? "h-9 justify-center" : "justify-between px-2.5 py-1.5",
                  isActive
                    ? "bg-[var(--accent-primary)]/[0.12] font-medium text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]/60 hover:text-[var(--text-primary)]"
                )}
                title={f.label}
              >
                <span className={cn("flex min-w-0 items-center gap-2.5", collapsed && "justify-center")}>
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                    )}
                  />
                  {!collapsed && <span className="truncate">{i18n(f.id, f.label)}</span>}
                </span>
                {!collapsed && badge > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[11px] tabular-nums",
                      f.id === "inbox" && unread > 0
                        ? "bg-[var(--accent-primary)] font-medium text-[var(--accent-contrast)]"
                        : "text-[var(--text-muted)]"
                    )}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Labels */}
        {labels.length > 0 && !collapsed && (
          <div className="space-y-0.5 border-t border-[var(--panel-border)] pt-2.5">
            <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Étiquettes
            </p>
            {labels.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onSelectLabel?.(l.name)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                  activeLabel === l.name
                    ? "bg-[var(--accent-primary)]/[0.12] font-medium text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]/60 hover:text-[var(--text-primary)]"
                )}
              >
                <Tag className="h-3.5 w-3.5 shrink-0" style={{ color: l.color || "var(--accent-primary)" }} />
                <span className="truncate">{l.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer: account */}
      {!collapsed && (
        <div className="border-t border-[var(--panel-border)] pt-2.5">
          <MailProfileButton
            aliases={aliases}
            primaryAlias={aliases.find((a) => a.is_primary)}
            createAlias={createAlias}
            updateAlias={updateAlias}
          />
        </div>
      )}
    </motion.aside>
  );
}
