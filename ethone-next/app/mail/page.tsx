"use client";

import { useState } from "react";
import LiquidSidebar from "@/components/LiquidSidebar";
import { Inbox, Send, FileEdit, Archive, Trash2, AlertTriangle, Mail } from "lucide-react";
import Card3D from "@/components/Card3D";
import { useI18n } from "@/lib/hooks/useI18n";
import { useMail } from "@/lib/hooks/useMail";

const folders = [
  { id: "inbox", label: "Boîte de réception", icon: <Inbox className="h-4 w-4" /> },
  { id: "sent", label: "Envoyés", icon: <Send className="h-4 w-4" /> },
  { id: "drafts", label: "Brouillons", icon: <FileEdit className="h-4 w-4" /> },
  { id: "archive", label: "Archive", icon: <Archive className="h-4 w-4" /> },
  { id: "trash", label: "Corbeille", icon: <Trash2 className="h-4 w-4" /> },
  { id: "spam", label: "Spam", icon: <AlertTriangle className="h-4 w-4" /> },
];

export default function MailPage() {
  const [folder, setFolder] = useState("inbox");
  const i18n = useI18n();
  const { messages, unread, loading, error } = useMail(folder);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[14rem_1fr]">
      <LiquidSidebar
        items={folders}
        active={folder}
        onChange={(id) => setFolder(id)}
      />
      <div className="min-w-0 space-y-4">
        <Card3D>
          <div className="flex items-center justify-between gap-4">
            <h2 className="min-w-0 truncate text-lg font-semibold">{folders.find((f) => f.id === folder)?.label}</h2>
            <span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-400">
              {unread} non lus
            </span>
          </div>
        </Card3D>

        {loading ? (
          <Card3D>
            <div className="space-y-3">
              <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--border)]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--border)]" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--border)]" />
            </div>
          </Card3D>
        ) : error ? (
          <Card3D>
            <p className="text-sm text-red-400">{error}</p>
          </Card3D>
        ) : messages.length === 0 ? (
          <Card3D>
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{i18n("noResults")}</span>
            </div>
          </Card3D>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <Card3D key={msg.id}>
                <div className={`space-y-1 ${msg.read ? "opacity-70" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold">{msg.from_name || msg.from_email}</span>
                    <span className="shrink-0 text-[10px] text-[var(--muted)]">
                      {new Date(msg.received_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="min-w-0 truncate text-sm text-[var(--foreground)]">{msg.subject || i18n("noResults")}</p>
                  {msg.snippet && (
                    <p className="min-w-0 truncate text-xs text-[var(--muted)]">{msg.snippet}</p>
                  )}
                </div>
              </Card3D>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
