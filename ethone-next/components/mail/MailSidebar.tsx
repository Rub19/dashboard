"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Inbox, Star, Send, FileEdit, Archive, Trash2, AlertTriangle, SquarePen } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import Button from "@/components/ui/Button";
import MailProfileButton from "./MailProfileButton";
import type { MailAlias } from "@/lib/hooks/useMail";

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
  createAlias?: (input: string | { alias?: string; display_name?: string; random?: boolean }) => Promise<MailAlias | null | undefined>;
  updateAlias?: (id: string, patch: { display_name?: string; is_primary?: boolean }) => Promise<MailAlias | null | undefined>;
};

const FOLDER_ICONS: Record<MailFolder, React.ReactNode> = {
  inbox: <Inbox className="h-4 w-4" />,
  starred: <Star className="h-4 w-4" />,
  sent: <Send className="h-4 w-4" />,
  drafts: <FileEdit className="h-4 w-4" />,
  archive: <Archive className="h-4 w-4" />,
  trash: <Trash2 className="h-4 w-4" />,
  spam: <AlertTriangle className="h-4 w-4" />,
};

export default function MailSidebar({ active, onChange, counts, unread, onCompose, canCompose = true, aliases = [], createAlias, updateAlias }: MailSidebarProps) {
  const i18n = useI18n();
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
    <div className="flex h-full w-56 shrink-0 flex-col justify-between rounded-2xl v8-panel p-3 backdrop-blur-xl">
      <div className="space-y-3">
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onCompose}
          disabled={!canCompose}
          leftIcon={<SquarePen className="h-4 w-4" />}
          className="w-full"
        >
          {i18n("newMessage") || "Nouveau message"}
        </Button>

        <div className="space-y-0.5">
          {FOLDERS.map((id) => {
            const isActive = active === id;
            const count = counts[id] ?? 0;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange(id)}
                className={`group relative flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                  isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.03] hover:text-[var(--text-primary)]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeFolderPill"
                    className="absolute inset-0 rounded-xl bg-[var(--text-primary)]/[0.06]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2.5">
                  <span className={isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"}>
                    {FOLDER_ICONS[id]}
                  </span>
                  {i18n(id) || id}
                </span>
                {count > 0 && (
                  <span className="relative z-10 rounded-md bg-[var(--text-primary)]/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)]">
                    {id === "inbox" ? unread || count : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <MailProfileButton
          aliases={aliases}
          primaryAlias={aliases.find((a) => a.is_primary)}
          createAlias={createAlias}
          updateAlias={updateAlias}
        />

        <div className="rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] p-2.5">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">{i18n("storage") || "Stockage"}</p>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-xl bg-[var(--text-primary)]/[0.05]">
            <div
              className="h-full rounded-xl bg-[var(--accent-primary)] transition-all duration-300 motion-reduce:transition-none"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-[var(--text-muted)]">
            {storage.used.toFixed(1)} / {storage.total.toFixed(0)} Go · {percent}%
          </p>
        </div>
      </div>
    </div>
  );
}
