"use client";

import { useLiveData } from "@/lib/hooks/useLiveData";
import LiveBentoGrid from "@/components/LiveBentoGrid";

export default function LiveTopBento({ className = "" }: { className?: string }) {
  const { nowPlaying, lanyard, weather, minecraft, valorant, lol, liveTrackerRiotName, liveTrackerRiotTag, records, loading, updatedAt } = useLiveData(60000);

  return (
    <LiveBentoGrid
      nowPlaying={nowPlaying}
      lanyard={lanyard}
      weather={weather}
      minecraft={minecraft}
      valorant={valorant}
      lol={lol}
      liveTrackerRiotName={liveTrackerRiotName}
      liveTrackerRiotTag={liveTrackerRiotTag}
      records={records}
      updatedAt={updatedAt}
      loading={loading}
      className={className}
    />
  );
}
