"use client";

import { useLiveData } from "@/lib/hooks/useLiveData";
import WeatherWidget, { type WeatherData } from "@/components/WeatherWidget";
import GamingCard from "@/components/GamingCard";
import SocialDiscordCard from "@/components/SocialDiscordCard";

function LiveWeatherCard({ weather, loading }: { weather: Record<string, unknown> | null; loading: boolean }) {
  return (
    <div className="col-span-12 lg:col-span-5 h-auto rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-4 shadow-xl shadow-black/50 backdrop-blur-2xl transition-all hover:border-white/15 relative overflow-hidden">
      <WeatherWidget data={(weather as unknown as WeatherData) || null} loading={loading} compact />
    </div>
  );
}

export default function LiveTopBento() {
  const { nowPlaying, lanyard, weather, minecraft, loading } = useLiveData(60000);

  return (
    <div className="grid w-full max-w-7xl grid-cols-12 gap-4 mx-auto mb-6">
      <GamingCard minecraft={minecraft} className="col-span-12 md:col-span-6 lg:col-span-3" />
      <SocialDiscordCard
        lanyard={lanyard}
        nowPlaying={nowPlaying || null}
        className="col-span-12 md:col-span-6 lg:col-span-4"
      />
      <LiveWeatherCard weather={weather} loading={loading} />
    </div>
  );
}
