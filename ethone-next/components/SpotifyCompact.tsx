"use client";

import { useEffect, useRef } from "react";
import SafeImage from "@/components/SafeImage";
import AudioWave from "@/components/AudioWave";
import { cn } from "@/lib/utils";
import type { NowPlaying } from "@/lib/hooks/useLiveData";

function formatMs(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function SpotifyCompact({
  track,
  playing,
  className,
}: {
  track: NowPlaying;
  playing: boolean;
  className?: string;
}) {
  const remainingRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<{ progress: number; at: number } | null>(null);

  useEffect(() => {
    const duration = track.durationMs ?? 0;
    if (!playing || duration <= 0) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (remainingRef.current) {
        const remaining = Math.max(0, duration - (track.progressMs ?? 0));
        remainingRef.current.textContent = `-${formatMs(remaining)}`;
      }
      return;
    }

    startRef.current = { progress: track.progressMs ?? 0, at: performance.now() };

    const tick = () => {
      if (!startRef.current) return;
      const durationMs = track.durationMs ?? 0;
      const elapsed = performance.now() - startRef.current.at;
      const progress = Math.min(durationMs, startRef.current.progress + elapsed);
      const remaining = Math.max(0, durationMs - progress);
      if (remainingRef.current) remainingRef.current.textContent = `-${formatMs(remaining)}`;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing, track.progressMs, track.durationMs, track.id]);

  const title = track.title || "Spotify";
  const remaining = Math.max(0, (track.durationMs ?? 0) - (track.progressMs ?? 0));

  return (
    <div className={cn("flex h-[38px] w-full min-w-[180px] items-center gap-2.5 px-3 py-1.5", className)}>
      <SafeImage
        candidates={[track.cover, track.artworkUrl, ...(track.covers || [])]}
        alt={track.title || "Spotify"}
        size={20}
        className="h-5 w-5 shrink-0 rounded-md object-cover"
        iconClassName={cn("h-3 w-3", playing ? "text-emerald-400" : "text-zinc-400")}
        loading="eager"
        priority
        timeoutMs={3000}
      />

      <AudioWave playing={playing} className="shrink-0" />

      <span className="min-w-0 flex-1 truncate text-xs font-medium text-white" title={title}>
        {title}
      </span>

      <span
        ref={remainingRef}
        className={cn("shrink-0 text-[10px] font-medium tabular-nums", playing ? "text-emerald-300" : "text-zinc-400")}
      >
        -{formatMs(remaining)}
      </span>
    </div>
  );
}
