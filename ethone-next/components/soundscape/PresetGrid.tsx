"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import { type SoundAmbient } from "@/lib/settings";
import { type BrainwaveBand } from "@/lib/audio/binaural-engine";
import { Sparkles, Play, Check } from "@/components/icons/ph";
import { cn } from "@/lib/utils";

export interface SoundscapePreset {
  id: string;
  title: string;
  badge: string;
  description: string;
  binaural: {
    band: BrainwaveBand;
    carrier: number;
    beat: number;
    volume: number;
  };
  layers: Partial<Record<SoundAmbient, number>>;
  visualizerMode: "nebula" | "spectrum" | "horizon" | "ripples";
  borderColor: string;
}

export const SOUNDSCAPE_PRESETS: SoundscapePreset[] = [
  {
    id: "rain-fire",
    title: "Averse & Cheminée",
    badge: "Repos & lecture",
    description: "Pluie battante et crépitements de braises sous un toit protecteur.",
    binaural: { band: "alpha", carrier: 432, beat: 10.0, volume: 0.4 },
    layers: { rain: 75, fireplace: 45, night: 30 },
    visualizerMode: "nebula",
    borderColor: "border-sky-500/30 hover:border-sky-500/50",
  },
  {
    id: "ocean-breeze",
    title: "Rivage océanique",
    badge: "Air marin",
    description: "Ressac continu et brise côtière sur une plage sauvage.",
    binaural: { band: "alpha", carrier: 432, beat: 9.0, volume: 0.45 },
    layers: { ocean: 70, wind: 35, space: 25 },
    visualizerMode: "horizon",
    borderColor: "border-cyan-500/30 hover:border-cyan-500/50",
  },
  {
    id: "deep-focus",
    title: "Focus profond",
    badge: "Concentration",
    description: "Spectre grave de bruit brun et pluie fine pour masquer toute distraction.",
    binaural: { band: "beta", carrier: 216, beat: 18.0, volume: 0.5 },
    layers: { brown: 75, space: 45, rain: 30 },
    visualizerMode: "spectrum",
    borderColor: "border-amber-500/30 hover:border-amber-500/50",
  },
  {
    id: "pine-forest",
    title: "Forêt boréale",
    badge: "Nature",
    description: "Bruissement des conifères et vent doux entre les branches.",
    binaural: { band: "alpha", carrier: 432, beat: 10.0, volume: 0.45 },
    layers: { forest: 75, wind: 40, night: 25 },
    visualizerMode: "nebula",
    borderColor: "border-emerald-500/30 hover:border-emerald-500/50",
  },
  {
    id: "mountain-storm",
    title: "Orage en montagne",
    badge: "Intensité",
    description: "Gronderies de tonnerre lointaines, rafales et pluie dense.",
    binaural: { band: "theta", carrier: 216, beat: 6.0, volume: 0.4 },
    layers: { storm: 75, rain: 60, wind: 40 },
    visualizerMode: "spectrum",
    borderColor: "border-violet-500/30 hover:border-violet-500/50",
  },
  {
    id: "cozy-night",
    title: "Nuit étoilée",
    badge: "Nocturne",
    description: "Grillons d'été, braises apaisantes et nappe spatiale feutrée.",
    binaural: { band: "theta", carrier: 432, beat: 6.5, volume: 0.45 },
    layers: { fireplace: 65, night: 55, space: 35 },
    visualizerMode: "ripples",
    borderColor: "border-indigo-500/30 hover:border-indigo-500/50",
  },
  {
    id: "solfeggio-432",
    title: "Harmonie 432 Hz",
    badge: "Solfeggio",
    description: "Harmonique universelle 432 Hz mêlée au ressac marin et aux bois.",
    binaural: { band: "alpha", carrier: 432, beat: 8.0, volume: 0.6 },
    layers: { ocean: 50, forest: 45, wind: 25 },
    visualizerMode: "ripples",
    borderColor: "border-teal-500/30 hover:border-teal-500/50",
  },
  {
    id: "delta-sleep",
    title: "Sommeil Delta",
    badge: "Nuit & repos",
    description: "Pulsation 2.5 Hz Delta et pluie continue pour l'endormissement.",
    binaural: { band: "delta", carrier: 432, beat: 2.5, volume: 0.6 },
    layers: { rain: 65, space: 35, night: 30 },
    visualizerMode: "ripples",
    borderColor: "border-purple-500/30 hover:border-purple-500/50",
  },
];

interface PresetGridProps {
  activePresetId?: string | null;
  onApplyPreset: (preset: SoundscapePreset) => void;
}

export const PresetGrid = memo(function PresetGrid({
  activePresetId,
  onApplyPreset,
}: PresetGridProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-amber-400">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">
            Atmosphères préréglées
          </h3>
          <p className="text-xs text-zinc-400">
            Combinaisons sonores équilibrées prêtes à écouter en un clic
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SOUNDSCAPE_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;

          return (
            <motion.button
              key={preset.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => onApplyPreset(preset)}
              className={cn(
                "group relative flex flex-col justify-between gap-3 rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer bg-black/30",
                preset.borderColor,
                isActive
                  ? "border-emerald-400 bg-emerald-500/[0.08] shadow-lg shadow-black/40 ring-1 ring-emerald-400"
                  : "bg-white/[0.02] hover:bg-white/[0.04]"
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                    {preset.badge}
                  </span>

                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border transition-all",
                      isActive
                        ? "border-emerald-400 bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/30"
                        : "border-white/10 bg-white/5 text-zinc-400 group-hover:border-white/20 group-hover:text-white"
                    )}
                  >
                    {isActive ? (
                      <Check className="h-4 w-4 stroke-[3]" />
                    ) : (
                      <Play className="h-3.5 w-3.5 translate-x-0.5" />
                    )}
                  </div>
                </div>

                <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {preset.title}
                </h4>
                <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                {Object.entries(preset.layers).map(([layerName, vol]) => (
                  <span
                    key={layerName}
                    className="rounded-md border border-white/5 bg-black/40 px-2 py-0.5 text-[9px] font-mono text-zinc-300"
                  >
                    {layerName} {vol}%
                  </span>
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});
