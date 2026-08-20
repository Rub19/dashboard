"use client";

import { useRouter } from "next/navigation";
import SafeImage from "@/components/SafeImage";
import { useNowPlaying } from "@/lib/hooks/useNowPlaying";
import { cn } from "@/lib/utils";

function formatMs(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function TopBarMediaPill() {
  const router = useRouter();
  const { nowPlaying } = useNowPlaying(15000);

  if (!nowPlaying?.title) return null;

  const remaining = Math.max(0, (nowPlaying.durationMs ?? 0) - (nowPlaying.progressMs ?? 0));

  return (
    <button
      type="button"
      onClick={() => router.push("/activity")}
      className={cn(
        "hidden h-8 max-w-[10rem] items-center gap-2 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5",
        "text-left transition-colors hover:bg-white/[0.06]",
        "xl:flex"
      )}
      title={nowPlaying.title}
    >
      <SafeImage
        candidates={[nowPlaying.cover, nowPlaying.artworkUrl, ...(nowPlaying.covers || [])]}
        alt={nowPlaying.title}
        size={20}
        className="h-4 w-4 shrink-0 rounded-md object-cover"
        iconClassName="h-3 w-3 text-emerald-400"
        loading="eager"
        priority
      />
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-zinc-200">
        {nowPlaying.title}
      </span>
      {nowPlaying.durationMs !== undefined && nowPlaying.durationMs > 0 && (
        <span className="shrink-0 text-[10px] font-medium tabular-nums text-zinc-500">
          -{formatMs(remaining)}
        </span>
      )}
    </button>
  );
}
