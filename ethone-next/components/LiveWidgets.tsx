"use client";

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

const GRADIENTS: Record<string, string> = {
  nowplaying: "from-violet-500/10 to-fuchsia-500/5 border-violet-500/20",
  lanyard: "from-emerald-500/10 to-sky-500/5 border-emerald-500/20",
  github: "from-zinc-500/10 to-zinc-700/5 border-zinc-500/20",
  todoist: "from-rose-500/10 to-orange-500/5 border-rose-500/20",
  notion: "from-zinc-100/10 to-zinc-200/5 border-zinc-300/20",
  reddit: "from-orange-500/10 to-red-500/5 border-orange-500/20",
  youtube: "from-red-500/10 to-rose-500/5 border-red-500/20",
  lastfm: "from-red-600/10 to-rose-500/5 border-red-600/20",
  weather: "from-sky-500/10 to-amber-500/5 border-sky-500/20",
};

const STATUS = {
  connected: "text-emerald-400",
  loading: "text-[var(--muted)]",
  empty: "text-[var(--muted)]",
  error: "text-red-400",
};

function formatTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function LiveWidgets() {
  const { records, nowPlaying, lanyard, loading } = useLiveData();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Live Now</h2>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--muted)]" />}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {records.map((record) => {
          const Icon = ICONS[record.source] || AlertCircle;
          const gradient = GRADIENTS[record.source] || "from-[var(--surface-raised)]/20 to-transparent border-[var(--border)]";
          const isSpotify = record.source === "nowplaying";
          const isDiscord = record.source === "lanyard";

          return (
            <div
              key={record.id}
              className={`group relative min-w-0 overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${gradient}`}
            >
              <div className="mb-3 flex items-center gap-2.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-raised)]/80 ${STATUS[record.status]}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{record.label}</p>
                  <p className={`truncate text-xs capitalize ${STATUS[record.status]}`}>{record.title}</p>
                </div>
              </div>

              {isSpotify && nowPlaying?.isPlaying && (
                <div className="space-y-3">
                  {nowPlaying.artworkUrl && (
                    <img
                      src={nowPlaying.artworkUrl}
                      alt=""
                      className="h-24 w-24 rounded-xl object-cover shadow-md"
                    />
                  )}
                  <div className="space-y-1">
                    <p className="truncate font-medium">{nowPlaying.title}</p>
                    <p className="truncate text-xs text-[var(--muted)]">{nowPlaying.artist}</p>
                  </div>
                  {(nowPlaying.progressMs !== undefined && nowPlaying.durationMs) && (
                    <div className="space-y-1">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)]"
                          style={{ width: `${Math.min(100, (nowPlaying.progressMs / nowPlaying.durationMs) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-[var(--muted)]">
                        <span>{formatTime(nowPlaying.progressMs)}</span>
                        <span>{formatTime(nowPlaying.durationMs)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isDiscord && lanyard?.activities?.[0] && (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{lanyard.activities[0].name}</p>
                  {lanyard.activities[0].details && (
                    <p className="text-xs text-[var(--muted)]">{lanyard.activities[0].details}</p>
                  )}
                  {lanyard.activities[0].state && (
                    <p className="text-[10px] text-[var(--muted)]">{lanyard.activities[0].state}</p>
                  )}
                </div>
              )}

              {!isSpotify && !isDiscord && (
                <div className="space-y-1">
                  {record.subtitle && <p className="truncate text-sm text-[var(--foreground)]">{record.subtitle}</p>}
                  {record.meta && <p className="truncate text-xs text-[var(--muted)]">{record.meta}</p>}
                </div>
              )}

              <span
                className={`absolute right-4 top-4 h-2 w-2 rounded-full ${
                  record.status === "connected" ? "bg-emerald-500" : record.status === "error" ? "bg-red-500" : "bg-zinc-500"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
