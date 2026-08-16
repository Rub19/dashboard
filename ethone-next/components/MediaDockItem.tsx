"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/lib/icons";

type SpotifyNow = {
  playing: boolean;
  title: string;
  artist: string;
  artwork?: string;
};

export default function MediaDockItem({
  nowPlaying,
  onClick,
}: {
  nowPlaying: SpotifyNow | null;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  if (!nowPlaying) return null;

  const playing = nowPlaying.playing;
  const label = `${nowPlaying.title} - ${nowPlaying.artist}`;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={label}
      data-tooltip={label}
      className="group relative flex h-11 w-11 flex-col items-center justify-center rounded-xl text-[#1DB954] transition-all hover:bg-white/[0.08] hover:text-[#1DB954] active:scale-95"
    >
      {nowPlaying.artwork ? (
        <span
          className="h-5 w-5 rounded bg-cover bg-center"
          style={{ backgroundImage: `url(${nowPlaying.artwork})` }}
          aria-hidden="true"
        />
      ) : (
        <Icon name="music" className="h-5 w-5" />
      )}

      {playing && (
        <span className="mt-0.5 flex h-2.5 items-end gap-0.5" aria-hidden="true">
          <span className="h-1 w-0.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="h-2 w-0.5 animate-pulse rounded-full bg-emerald-400" style={{ animationDelay: "75ms" }} />
          <span className="h-1.5 w-0.5 animate-pulse rounded-full bg-emerald-400" style={{ animationDelay: "150ms" }} />
        </span>
      )}

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute -top-8 left-1/2 z-50 -translate-x-1/2 rounded-md border border-white/10 bg-zinc-900/90 px-2 py-0.5 text-[10px] font-medium text-zinc-200 shadow-lg backdrop-blur-md whitespace-nowrap pointer-events-none"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
