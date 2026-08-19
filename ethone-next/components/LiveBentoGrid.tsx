"use client";

import LiveStats from "@/components/LiveStats";
import GamingCard from "@/components/GamingCard";
import SocialDiscordCard from "@/components/SocialDiscordCard";
import WeatherWidget, { type WeatherData } from "@/components/WeatherWidget";
import { cn } from "@/lib/utils";
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
  scrollable?: boolean;
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
  scrollable = true,
}: LiveBentoGridProps) {
  const childHeight = scrollable ? "h-full" : "h-auto min-h-0";
  return (
    <div className={cn(
      "flex min-h-0 w-full flex-col gap-2",
      scrollable ? "h-full overflow-hidden" : "h-auto overflow-visible",
      className
    )}>
      <LiveStats records={records} updatedAt={updatedAt} loading={loading} />
      <div className={cn(
        "grid w-full items-stretch gap-2",
        scrollable
          ? "min-h-0 flex-1 auto-rows-fr grid-cols-12 overflow-y-auto overflow-x-hidden os-scroll"
          : "h-auto min-h-0 auto-rows-min grid-cols-12 overflow-visible"
      )}>
        <GamingCard
          minecraft={minecraft}
          loading={loading}
          error={error}
          className={cn("col-span-12 lg:col-span-4", childHeight)}
        />
        <WeatherWidget
          data={(weather as unknown as WeatherData) || null}
          loading={loading}
          compact
          className={cn("col-span-12 lg:col-span-4", childHeight)}
        />
        <SocialDiscordCard
          lanyard={lanyard}
          nowPlaying={nowPlaying}
          loading={loading}
          error={error}
          className={cn("col-span-12 lg:col-span-4", childHeight)}
        />
      </div>
    </div>
  );
}
