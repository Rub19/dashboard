"use client";

import { Music, Gamepad2, Circle } from "lucide-react";
import Image from "next/image";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useSettings } from "@/components/SettingsProvider";
import WeatherWidget, { type WeatherData } from "@/components/WeatherWidget";
import type { MinecraftProfile } from "@/lib/hooks/useMinecraftLive";
import type { LanyardPresence } from "@/lib/hooks/useLiveData";

function truncateId(id?: string) {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 6)}...${id.slice(-4)}` : id;
}

function LiveGamingCard({ minecraft }: { minecraft?: Record<string, unknown> | null }) {
  const { settings } = useSettings();
  const profile = (minecraft ?? {}) as unknown as MinecraftProfile;
  const username = profile?.username || profile?.name || settings.liveMinecraftUsername || "Rub19";
  const uuid = profile?.uuid || settings.liveMinecraftUsername;

  return (
    <div className="col-span-12 md:col-span-6 lg:col-span-3 min-h-[170px] rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-4 shadow-xl shadow-black/50 backdrop-blur-2xl transition-all hover:border-white/15 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Gaming</span>
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
      </div>

      <div className="my-2 flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] text-xs font-bold text-white">
          {profile?.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt={username}
              width={48}
              height={48}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            <Gamepad2 className="h-5 w-5 text-zinc-400" />
          )}
        </div>
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold text-white">{username}</h4>
          <p className="text-[10px] font-mono text-zinc-500">ID: {truncateId(uuid)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {profile?.model && (
          <span className="rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-300">
            {profile.model === "slim" ? "Slim" : "Classic"}
          </span>
        )}
        {profile?.capeUrl && (
          <span className="rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-300">
            Cape
          </span>
        )}
        <span className="rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-300">
          Serveur actif
        </span>
      </div>
    </div>
  );
}

function LiveSocialCard({
  lanyard,
  nowPlaying,
}: {
  lanyard?: LanyardPresence | null;
  nowPlaying?: { title?: string; artist?: string; cover?: string; isPlaying?: boolean } | null;
}) {
  const status = lanyard?.discord_status || "offline";
  const statusColor =
    status === "online"
      ? "bg-emerald-400"
      : status === "idle"
      ? "bg-amber-400"
      : status === "dnd"
      ? "bg-rose-400"
      : "bg-zinc-500";

  const statusLabel =
    status === "online"
      ? "En ligne"
      : status === "idle"
      ? "Absent"
      : status === "dnd"
      ? "Occupé"
      : "Hors ligne";

  const displayName = lanyard?.displayName || "Discord";

  return (
    <div className="col-span-12 md:col-span-6 lg:col-span-4 min-h-[170px] rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-4 shadow-xl shadow-black/50 backdrop-blur-2xl transition-all hover:border-white/15 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Social & Media</span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            status === "dnd"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
              : status === "online"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
          {statusLabel}
        </span>
      </div>

      <div className="my-1 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
          {nowPlaying?.cover ? (
            <Image
              src={nowPlaying.cover}
              alt=""
              width={40}
              height={40}
              unoptimized
              className="h-full w-full rounded-lg object-cover"
            />
          ) : (
            <Music className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {nowPlaying?.isPlaying ? (
            <>
              <p className="truncate text-xs font-semibold text-white">{nowPlaying.title || "—"}</p>
              <p className="truncate text-[11px] text-zinc-400">{nowPlaying.artist || "—"}</p>
            </>
          ) : (
            <>
              <p className="truncate text-xs font-semibold text-white">Aucune lecture</p>
              <p className="truncate text-[11px] text-zinc-400">Connectez Spotify</p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Circle className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
          {displayName}
        </span>
        {nowPlaying?.isPlaying && (
          <span className="flex items-center gap-1 font-mono text-emerald-400">
            <span className="flex h-3 items-end gap-0.5">
              <span className="w-0.5 animate-[bounce_0.8s_infinite] rounded-full bg-emerald-400" style={{ height: 8 }} />
              <span className="w-0.5 animate-[bounce_0.9s_infinite] rounded-full bg-emerald-400" style={{ height: 12 }} />
              <span className="w-0.5 animate-[bounce_1.1s_infinite] rounded-full bg-emerald-400" style={{ height: 6 }} />
            </span>
            Live
          </span>
        )}
      </div>
    </div>
  );
}

function LiveWeatherCard({ weather, loading }: { weather: Record<string, unknown> | null; loading: boolean }) {
  return (
    <div className="col-span-12 lg:col-span-5 min-h-[170px] rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-4 shadow-xl shadow-black/50 backdrop-blur-2xl transition-all hover:border-white/15 relative overflow-hidden">
      <WeatherWidget data={(weather as unknown as WeatherData) || null} loading={loading} compact className="h-full" />
    </div>
  );
}

export default function LiveTopBento() {
  const { nowPlaying, lanyard, weather, minecraft, loading } = useLiveData(60000);

  return (
    <div className="grid w-full max-w-7xl grid-cols-12 gap-4 mx-auto mb-6">
      <LiveGamingCard minecraft={minecraft} />
      <LiveSocialCard lanyard={lanyard} nowPlaying={nowPlaying} />
      <LiveWeatherCard weather={weather} loading={loading} />
    </div>
  );
}
