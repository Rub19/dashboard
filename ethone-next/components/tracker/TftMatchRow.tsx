"use client";

import { useState } from "react";
import { ChevronDown, Swords, Coins, Skull, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type TftMatch,
  type TftTrait,
  type TftUnit,
  tftPlacementColor,
  tftTraitStyleColor,
  tftUnitCostColor,
  getTftUnitIcon,
  formatTftTimeAgo,
  formatTftDuration,
} from "@/lib/tft-tracker";

function TraitChip({ trait }: { trait: TftTrait }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold", tftTraitStyleColor(trait.style))}>
      {trait.numUnits} {trait.name}
    </span>
  );
}

function UnitIcon({ unit, size = "h-7 w-7" }: { unit: TftUnit; size?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-md border bg-black/50", size, tftUnitCostColor(unit.rarity))}
      title={`${unit.name} ★${unit.tier}`}
    >
      {!broken ? (
        <img src={getTftUnitIcon(unit.characterId)} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[8px] font-bold text-zinc-300">
          {unit.name.slice(0, 3)}
        </span>
      )}
      {unit.tier >= 2 && (
        <span
          className={cn(
            "absolute left-0 right-0 top-0 text-center text-[7px] font-black leading-none",
            unit.tier === 3 ? "text-amber-300" : "text-zinc-200"
          )}
        >
          {"★".repeat(unit.tier)}
        </span>
      )}
    </div>
  );
}

export default function TftMatchRow({ match }: { match: TftMatch }) {
  const [open, setOpen] = useState(false);
  const me = match.me;
  const placement = me?.placement ?? 8;
  const pc = tftPlacementColor(placement);
  const ordinal = placement === 1 ? "1ère" : `${placement}e`;

  return (
    <div className={cn("rounded-2xl border bg-white/[0.02] backdrop-blur-xl transition-colors", pc.border)}>
      {/* Collapsed header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left sm:gap-4 sm:p-4"
      >
        <div className={cn("flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border", pc.bg, pc.border)}>
          <span className={cn("text-lg font-black leading-none", pc.text)}>{placement}</span>
          <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-500">{ordinal}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-bold text-white">{match.mode}</span>
            {match.setNumber > 0 && <span className="text-[10px] font-semibold text-zinc-500">Set {match.setNumber}</span>}
            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
              <Clock className="h-3 w-3" /> {formatTftTimeAgo(match.playedAt)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400">
            <span>Niv. <span className="font-semibold text-zinc-200">{me?.level ?? "—"}</span></span>
            <span className="flex items-center gap-1"><Skull className="h-3 w-3" /> {me?.playersEliminated ?? 0}</span>
            <span className="flex items-center gap-1"><Swords className="h-3 w-3" /> {me?.damage ?? 0}</span>
            <span className="flex items-center gap-1"><Coins className="h-3 w-3" /> {me?.goldLeft ?? 0}</span>
            <span>{formatTftDuration(match.durationSeconds)}</span>
          </div>
          {me && me.traits.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {me.traits.slice(0, 5).map((t, i) => (
                <TraitChip key={i} trait={t} />
              ))}
            </div>
          )}
        </div>

        <div className="hidden shrink-0 items-center gap-0.5 md:flex">
          {(me?.units ?? []).slice(0, 8).map((u, i) => (
            <UnitIcon key={i} unit={u} size="h-6 w-6" />
          ))}
        </div>

        <ChevronDown className={cn("h-4 w-4 shrink-0 text-zinc-500 transition-transform", open && "rotate-180")} />
      </button>

      {/* Expanded lobby */}
      {open && (
        <div className="border-t border-white/5 p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {match.players.map((p) => {
              const ppc = tftPlacementColor(p.placement);
              return (
                <div
                  key={p.puuid || p.placement}
                  className={cn(
                    "rounded-xl border p-2.5",
                    p.isMe ? "border-amber-400/40 bg-amber-400/[0.06]" : "border-white/10 bg-white/[0.02]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-black", ppc.bg, ppc.border, ppc.text)}>
                      {p.placement}
                    </span>
                    <span className={cn("text-xs font-bold", p.isMe ? "text-amber-300" : "text-zinc-200")}>
                      {p.isMe ? "Vous" : p.companionSpecies || `Joueur ${p.placement}`}
                    </span>
                    <span className="ml-auto text-[10px] text-zinc-500">
                      Niv. {p.level} · {p.playersEliminated} elim · {p.damage} dmg
                    </span>
                  </div>
                  {p.traits.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {p.traits.slice(0, 6).map((t, i) => (
                        <TraitChip key={i} trait={t} />
                      ))}
                    </div>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-0.5">
                    {p.units.map((u, i) => (
                      <UnitIcon key={i} unit={u} size="h-7 w-7" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
