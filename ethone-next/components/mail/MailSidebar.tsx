"use client";

import { motion } from "framer-motion";
import { Inbox, Star, Send, FileEdit, Archive, Trash2, AlertTriangle, SquarePen } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";

export const FOLDERS = ["inbox", "starred", "sent", "drafts", "archive", "trash", "spam"] as const;

export type MailFolder = (typeof FOLDERS)[number];

type FolderMeta = {
  icon: React.ReactNode;
  label: string;
};

type MailSidebarProps = {
  active: MailFolder;
  onChange: (folder: MailFolder) => void;
  counts: Record<string, number>;
  unread: number;
  onCompose: () => void;
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

export default function MailSidebar({ active, onChange, counts, unread, onCompose }: MailSidebarProps) {
  const i18n = useI18n();

  return (
    <div className="flex h-full w-56 shrink-0 flex-col justify-between rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-3 backdrop-blur-xl">
      <div className="space-y-3">
        <button
          type="button"
          onClick={onCompose}
          style={{
            background: "var(--accent-color, #a855f7)",
            color: "#ffffff",
            boxShadow: "0 0 16px var(--accent-glow, rgba(168,85,247,0.25))",
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-semibold transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <SquarePen className="h-4 w-4" />
          {i18n("newMessage") || "Nouveau message"}
        </button>

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
                  isActive ? "text-white" : "text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeFolderPill"
                    className="absolute inset-0 rounded-xl bg-white/[0.06]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2.5">
                  <span className={isActive ? "text-[var(--accent-color,#a855f7)]" : "text-zinc-500 group-hover:text-zinc-300"}>
                    {FOLDER_ICONS[id]}
                  </span>
                  {i18n(id) || id}
                </span>
                {count > 0 && (
                  <span className="relative z-10 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                    {id === "inbox" ? unread || count : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{i18n("storage") || "Stockage"}</p>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
          <div className="h-full w-[12%] rounded-full bg-[var(--accent-color,#a855f7)]" />
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-500">{i18n("usedOf") || "12% utilisé"}</p>
      </div>
    </div>
  );
}
