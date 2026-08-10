"use client";

import { useLiveData } from "@/lib/hooks/useLiveData";
import { fetchWorker } from "@/lib/api";
import { Loader2, Play, Pause, SkipBack, SkipForward, Heart } from "lucide-react";

const STATUS = {
  connected: "text-emerald-400",
  loading: "text-[var(--muted)]",
  empty: "text-[var(--muted)]",
  error: "text-red-400",
};

const STATUS_DOT = {
  connected: "bg-emerald-500",
  loading: "bg-zinc-500",
  empty: "bg-zinc-500",
  error: "bg-red-500",
};

const GRADIENTS: Record<string, string> = {
  nowplaying: "from-violet-900/30 via-fuchsia-900/10 to-black/20 border-violet-500/20",
  lanyard: "from-indigo-900/30 via-emerald-900/10 to-black/20 border-indigo-500/20",
  github: "from-zinc-800/40 to-black/20 border-zinc-500/20",
  todoist: "from-rose-900/30 to-black/20 border-rose-500/20",
  reddit: "from-orange-900/30 to-black/20 border-orange-500/20",
  youtube: "from-red-900/30 to-black/20 border-red-500/20",
  weather: "from-sky-900/30 via-amber-900/10 to-black/20 border-sky-500/20",
};

function formatTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function LiveWidgets() {
  const { records, nowPlaying, lanyard, loading } = useLiveData();

  async function controlSpotify(action: "play" | "pause" | "next" | "previous") {
    try {
      await fetchWorker("/api/spotify/control", {
        method: "POST",
        body: JSON.stringify({ action }),
      });
    } catch {}
  }

  async function likeSpotify() {
    if (!nowPlaying?.title) return;
    try {
      await fetchWorker("/api/spotify/track-saved?check=0", { method: "GET" });
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Live Now</h2>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--muted)]" />}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {records.map((record) => {
          const gradient = GRADIENTS[record.source] || "from-[var(--surface-raised)]/20 to-transparent border-[var(--border)]";
          const isSpotify = record.source === "nowplaying";
          const isDiscord = record.source === "lanyard";
          const isYoutube = record.source === "youtube";

          return (
            <div
              key={record.id}
              className={`group relative min-w-0 overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${gradient}`}
            >
              <div className={`absolute right-3 top-3 h-2.5 w-2.5 rounded-full ${STATUS_DOT[record.status]}`} />

              {isSpotify && record.image && (
                <div className="mb-3 flex items-end gap-4">
                  <img
                    src={record.image}
                    alt=""
                    className="h-24 w-24 rounded-xl object-cover shadow-lg"
                  />
                  <div className="flex flex-col gap-1 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">LIVE</span>
                    <div className="flex gap-0.5">
                      {[...Array(4)].map((_, i) => (
                        <span
                          key={i}
                          className="h-4 w-1 animate-pulse rounded-full bg-emerald-400"
                          style={{ animationDelay: `${i * 100}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {(isDiscord || isYoutube) && record.image && (
                <div className="mb-3 flex items-center gap-3">
                  <img
                    src={record.image}
                    alt=""
                    className="h-14 w-14 rounded-full border-2 border-[var(--border)] object-cover shadow-md"
                  />
                  <div>
                    <p className="font-semibold">{record.title}</p>
                    <p className={`text-xs ${STATUS[record.status]}`}>{record.label}</p>
                  </div>
                </div>
              )}

              {!isSpotify && !isDiscord && !isYoutube && (
                <div className="mb-2 flex items-center gap-2">
                  <span className={`text-sm font-semibold uppercase tracking-wider ${STATUS[record.status]}`}>{record.label}</span>
                </div>
              )}

              <div className="space-y-1">
                {!isSpotify && !isDiscord && !isYoutube && <p className="truncate font-medium">{record.title}</p>}
                {isSpotify && <p className="truncate text-lg font-bold">{record.title}</p>}
                {isDiscord && record.subtitle && <p className="truncate text-sm text-[var(--muted)]">{record.subtitle}</p>}
                {isSpotify && record.subtitle && <p className="truncate text-sm text-[var(--muted)]">{record.subtitle}</p>}
                {record.meta && <p className="truncate text-xs text-[var(--muted)]">{record.meta}</p>}
              </div>

              {isSpotify && nowPlaying?.isPlaying && (
                <div className="mt-3 space-y-2">
                  {(nowPlaying.progressMs !== undefined && nowPlaying.durationMs) && (
                    <div className="space-y-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className="h-full rounded-full bg-emerald-400"
                          style={{ width: `${Math.min(100, (nowPlaying.progressMs / nowPlaying.durationMs) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-[var(--muted)]">
                        <span>{formatTime(nowPlaying.progressMs)}</span>
                        <span>{formatTime(nowPlaying.durationMs)}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button onClick={() => controlSpotify("previous")} className="rounded-full p-1.5 text-[var(--foreground)] hover:bg-white/10"><SkipBack className="h-4 w-4" /></button>
                    <button onClick={() => controlSpotify(nowPlaying.isPlaying ? "pause" : "play")} className="rounded-full bg-emerald-500 p-2 text-white hover:bg-emerald-400">
                      {nowPlaying.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button onClick={() => controlSpotify("next")} className="rounded-full p-1.5 text-[var(--foreground)] hover:bg-white/10"><SkipForward className="h-4 w-4" /></button>
                    <button onClick={likeSpotify} className="ml-auto rounded-full p-1.5 text-rose-400 hover:bg-rose-500/10"><Heart className="h-4 w-4" /></button>
                  </div>
                </div>
              )}

              {isYoutube && record.image && (
                <img
                  src={record.image}
                  alt=""
                  className="mt-3 h-32 w-full rounded-xl object-cover"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
