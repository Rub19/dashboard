"use client";

import { cn } from "@/lib/utils";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Carte de chaleur jour de semaine × heure (UTC). Intensité relative au créneau le plus actif. */
export default function StatsHeatmap({ matrix, unit = "messages", tz = "UTC" }: { matrix: number[][]; unit?: string; tz?: string }) {
  const max = Math.max(1, ...matrix.flat());
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="ml-10 grid gap-[3px] text-[10px] text-zinc-500" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-center">
              {h % 3 === 0 ? h : ""}
            </span>
          ))}
        </div>
        <div className="mt-1 space-y-[3px]">
          {matrix.map((row, d) => (
            <div key={d} className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-right text-[11px] text-zinc-500">{DAYS[d]}</span>
              <div className="grid flex-1 gap-[3px]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                {row.map((v, h) => {
                  const level = v === 0 ? 0 : Math.max(0.12, v / max);
                  return (
                    <span
                      key={h}
                      title={`${DAYS[d]} ${String(h).padStart(2, "0")}h ${tz} : ${v.toLocaleString("fr-FR")} ${unit}`}
                      className={cn("aspect-square rounded-[3px]", v === 0 && "bg-white/[0.04]")}
                      style={v === 0 ? undefined : { background: `rgba(90, 169, 246, ${level})` }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="ml-10 mt-3 flex items-center gap-2 text-[10px] text-zinc-500">
          <span>Moins</span>
          {[0.15, 0.35, 0.6, 0.85, 1].map((l) => (
            <span key={l} className="h-3 w-3 rounded-[3px]" style={{ background: `rgba(90, 169, 246, ${l})` }} />
          ))}
          <span>Plus</span>
        </div>
      </div>
    </div>
  );
}
