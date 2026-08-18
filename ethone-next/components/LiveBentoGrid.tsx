"use client";

import LiveStats from "@/components/LiveStats";
import GamingCard from "@/components/GamingCard";
import SocialDiscordCard from "@/components/SocialDiscordCard";
import WeatherWidget, { type WeatherData } from "@/components/WeatherWidget";
import type { NowPlaying, LanyardPresence, LiveRecord } from "@/lib/hooks/useLiveData";

export type LiveBentoGridProps = {
  nowPlaying?: NowPlaying | null;
  lanyard?: LanyardPresence | null;
  weather?: Record<string, unknown> | null;
  minecraft?: Record<string, unknown> | null;
  records?: LiveRecord[];
  updatedAt?: Date | null;
  loading?: boolean;
  error?: Error | null;
  className?: string;
};

export default function LiveBentoGrid({
  nowPlaying,
  lanyard,
  weather,
  minecraft,
  records,
  updatedAt,
  loading,
  error,
  className = "",
}: LiveBentoGridProps) {
  return (
    <div className={`flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden ${className}`}>
      <LiveStats records={records} updatedAt={updatedAt} loading={loading} />
      <div className="grid min-h-0 w-full flex-1 auto-rows-[minmax(0,1fr)] grid-cols-12 items-stretch gap-4 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:hidden">
        <GamingCard
          minecraft={minecraft}
          loading={loading}
          error={error}
          className="col-span-12 lg:col-span-4 h-full"
        />
        <WeatherWidget
          data={(weather as unknown as WeatherData) || null}
          loading={loading}
          compact
          className="col-span-12 lg:col-span-4 h-full"
        />
        <SocialDiscordCard
          lanyard={lanyard}
          nowPlaying={nowPlaying}
          loading={loading}
          error={error}
          className="col-span-12 lg:col-span-4 h-full"
        />
      </div>
    </div>
  );
}
