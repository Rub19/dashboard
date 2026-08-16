"use client";

import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import type { MinecraftProfile } from "@/lib/hooks/useMinecraftLive";

function truncateId(id?: string) {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

type GamingCardProps = {
  minecraft?: Record<string, unknown> | null;
  className?: string;
};

export default function GamingCard({ minecraft, className = "" }: GamingCardProps) {
  const { settings } = useSettings();
  const profile = (minecraft ?? {}) as unknown as MinecraftProfile;
  const username = profile?.username || profile?.name || settings.liveMinecraftUsername || "Rub19";
  const uuid = profile?.uuid || settings.liveMinecraftUsername || "";

  const [avatarSrc, setAvatarSrc] = useState(
    `https://mc-heads.net/avatar/${encodeURIComponent(username || "Rub19")}/64`
  );
  const [errored, setErrored] = useState(false);

  function handleError() {
    if (!errored) {
      setErrored(true);
      setAvatarSrc(`https://minotar.net/avatar/${encodeURIComponent(username || "char")}/64`);
    }
  }

  return (
    <div
      className={`h-auto min-h-0 rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-4 shadow-xl shadow-black/50 backdrop-blur-2xl transition-all hover:border-white/15 flex flex-col justify-between gap-3 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Gaming</span>
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
          {errored && !avatarSrc ? (
            <Gamepad2 className="h-5 w-5 text-zinc-400" />
          ) : (
            <img
              src={avatarSrc}
              alt={username}
              onError={handleError}
              className="h-full w-full object-cover [image-rendering:pixelated]"
            />
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
