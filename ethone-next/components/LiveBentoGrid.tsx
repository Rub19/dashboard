"use client";

import LiveStats from "@/components/LiveStats";
import GamingCard from "@/components/GamingCard";
import SocialDiscordCard from "@/components/SocialDiscordCard";
import RiotGamingCard from "@/components/RiotGamingCard";
import WeatherWidget, { type WeatherData } from "@/components/WeatherWidget";
import { cn } from "@/lib/utils";
import type { NowPlaying, LanyardPresence, LiveRecord } from "@/lib/hooks/useLiveData";

export type LiveBentoGridProps = {
  nowPlaying?: NowPlaying | null;
  lanyard?: LanyardPresence | null;
  weather?: Record<string, unknown> | null;
  minecraft?: Record<string, unknown> | null;
  valorant?: Record<string, unknown>[] | null;
  lol?: Record<string, unknown>[] | null;
  liveTrackerRiotName?: string | null;
  liveTrackerRiotTag?: string | null;
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
  valorant,
  lol,
  liveTrackerRiotName,
  liveTrackerRiotTag,
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
        <RiotGamingCard
          game="valorant"
          matches={valorant}
          playerName={liveTrackerRiotName}
          playerTag={liveTrackerRiotTag}
          loading={loading}
          error={error}
          className={cn("col-span-12 md:col-span-6", childHeight)}
        />
        <RiotGamingCard
          game="lol"
          matches={lol}
          playerName={liveTrackerRiotName}
          playerTag={liveTrackerRiotTag}
          loading={loading}
          error={error}
          className={cn("col-span-12 md:col-span-6", childHeight)}
        />
      </div>
    </div>
  );
}
