"use client";

import LiquidSidebar from "@/components/LiquidSidebar";
import { Inbox, Send, FileEdit, Archive, Trash2, AlertTriangle, XCircle } from "lucide-react";
import Card3D from "@/components/Card3D";

const folders = [
  { id: "inbox", label: "Boîte de réception", icon: <Inbox className="h-4 w-4" /> },
  { id: "sent", label: "Envoyés", icon: <Send className="h-4 w-4" /> },
  { id: "drafts", label: "Brouillons", icon: <FileEdit className="h-4 w-4" /> },
  { id: "archive", label: "Archive", icon: <Archive className="h-4 w-4" /> },
  { id: "trash", label: "Corbeille", icon: <Trash2 className="h-4 w-4" /> },
  { id: "spam", label: "Spam", icon: <AlertTriangle className="h-4 w-4" /> },
];

export default function MailPage() {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[14rem_1fr]">
      <LiquidSidebar items={folders} defaultActive="inbox" />
      <div className="min-w-0 space-y-4">
        <Card3D>
          <div className="flex items-center justify-between gap-4">
            <h2 className="min-w-0 truncate text-lg font-semibold">Boîte de réception</h2>
            <span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-400">
              12 non lus
            </span>
          </div>
        </Card3D>
        <Card3D>
          <div className="space-y-3">
            <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--border)]" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--border)]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--border)]" />
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <XCircle className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">Aucun message pour le moment.</span>
          </div>
        </Card3D>
      </div>
    </div>
  );
}
