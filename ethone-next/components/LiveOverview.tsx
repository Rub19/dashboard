"use client";

import LiveTopBento from "@/components/LiveTopBento";

export default function LiveOverview() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4">
      <div className="mb-5 flex flex-col gap-0.5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Live
        </h1>
        <p className="text-xs text-zinc-400">
          Vue unifiée de votre activité gaming, sociale et météo en temps réel.
        </p>
      </div>

      <LiveTopBento />
    </div>
  );
}
