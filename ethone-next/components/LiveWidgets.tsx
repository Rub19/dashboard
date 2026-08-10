"use client";

import Card3D from "./Card3D";
import { useLiveData } from "@/lib/hooks/useLiveData";
import {
  Music,
  MessageSquare,
  Code,
  CircleCheck,
  NotebookTabs,
  MessageCircle,
  Play,
  History,
  CloudSun,
  Loader2,
  AlertCircle,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  nowplaying: Music,
  lanyard: MessageSquare,
  github: Code,
  todoist: CircleCheck,
  notion: NotebookTabs,
  reddit: MessageCircle,
  youtube: Play,
  lastfm: History,
  weather: CloudSun,
};

const STATUS = {
  connected: "text-emerald-400",
  loading: "text-[var(--muted)]",
  empty: "text-[var(--muted)]",
  error: "text-red-400",
};

export default function LiveWidgets() {
  const { records, loading } = useLiveData();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Live Now</h2>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--muted)]" />}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {records.map((record) => {
          const Icon = ICONS[record.source] || AlertCircle;
          return (
            <Card3D key={record.id}>
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-raised)] ${STATUS[record.status]}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{record.label}</p>
                  <p className="truncate text-sm text-[var(--foreground)]">{record.title}</p>
                  {record.subtitle && (
                    <p className="truncate text-xs text-[var(--muted)]">{record.subtitle}</p>
                  )}
                  {record.meta && (
                    <p className="truncate text-[10px] text-[var(--muted)]">{record.meta}</p>
                  )}
                </div>
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    record.status === "connected"
                      ? "bg-emerald-500"
                      : record.status === "error"
                      ? "bg-red-500"
                      : "bg-zinc-500"
                  }`}
                />
              </div>
            </Card3D>
          );
        })}
      </div>
    </div>
  );
}
