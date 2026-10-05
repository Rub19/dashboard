"use client";

import React, { memo } from "react";
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
  gradient: string;
}

export const SOUNDSCAPE_PRESETS: SoundscapePreset[] = [
  {
    id: "deep-sleep",
    title: "Deep Sleep Delta",
    badge: "2.5 Hz Delta · Sommeil",
    description: "Sommeil réparateur sans rêve, régénération cellulaire et lâcher-prise total.",
    binaural: { band: "delta", carrier: 432, beat: 2.5, volume: 0.6 },
    layers: { rain: 70, fireplace: 35, ocean: 30 },
    visualizerMode: "ripples",
    gradient: "from-indigo-900/40 to-slate-900/40 border-indigo-500/30",
  },
  {
    id: "theta-flow",
    title: "Theta Flow State",
    badge: "6.0 Hz Theta · Flow",
    description: "Immersion profonde dans le travail complexe, créativité décuplée et concentration fluide.",
    binaural: { band: "theta", carrier: 528, beat: 6.0, volume: 0.55 },
    layers: { ocean: 65, space: 50, brown: 40 },
    visualizerMode: "horizon",
    gradient: "from-violet-900/40 to-cyan-900/40 border-violet-500/30",
  },
  {
    id: "alpha-zen",
    title: "Alpha Zen Meditation",
    badge: "10.0 Hz Alpha · Sérénité",
    description: "Réduction du stress, apaisement mental et vigilance sereine en fin de journée.",
    binaural: { band: "alpha", carrier: 432, beat: 10.0, volume: 0.5 },
    layers: { forest: 75, wind: 40, night: 30 },
    visualizerMode: "nebula",
    gradient: "from-emerald-900/40 to-teal-900/40 border-emerald-500/30",
  },
  {
    id: "gamma-focus",
    title: "Gamma Hyper-Focus",
    badge: "40.0 Hz Gamma · Cognition",
    description: "Performances cognitives maximales, résolution de bugs ardus et codage haute intensité.",
    binaural: { band: "gamma", carrier: 216, beat: 40.0, volume: 0.65 },
    layers: { brown: 75, space: 60, rain: 40 },
    visualizerMode: "spectrum",
    gradient: "from-rose-900/40 to-amber-900/40 border-rose-500/30",
  },
  {
    id: "solfeggio-harmony",
    title: "Solfeggio 432 Hz Harmony",
    badge: "432 Hz Pure · Harmonie",
    description: "Accordage sacré universel, clarté vibratoire et harmonie acoustique continue.",
    binaural: { band: "alpha", carrier: 432, beat: 8.0, volume: 0.7 },
    layers: { forest: 45, wind: 35, ocean: 40 },
    visualizerMode: "ripples",
    gradient: "from-amber-900/40 to-emerald-900/40 border-amber-500/30",
  },
  {
    id: "midnight-rain",
    title: "Midnight Rain & Fire",
    badge: "Ambiance Nocturne Feutrée",
    description: "Averse battante et feu crépitant pour lire, réfléchir ou contempler dans le calme.",
    binaural: { band: "alpha", carrier: 528, beat: 10.0, volume: 0.4 },
    layers: { rain: 80, fireplace: 55, night: 40 },
    visualizerMode: "nebula",
    gradient: "from-sky-900/40 to-indigo-950/40 border-sky-500/30",
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
    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl backdrop-blur-2xl transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Scènes & Préréglages d'Immersion
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Combinaisons harmoniques prêtes à l'emploi en 1 clic
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {SOUNDSCAPE_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset)}
              className={cn(
                "group relative flex flex-col justify-between gap-3 rounded-2xl border p-4 text-left transition-all duration-300 active:scale-[0.98]",
                "bg-gradient-to-br",
                preset.gradient,
                isActive
                  ? "ring-2 ring-emerald-400 shadow-xl shadow-black/50"
                  : "hover:border-white/20 hover:shadow-lg"
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-mono font-medium text-white/90">
                    {preset.badge}
                  </span>
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full transition-all",
                      isActive
                        ? "bg-emerald-400 text-black shadow-md shadow-emerald-400/30"
                        : "bg-white/10 text-white/60 group-hover:bg-white/20 group-hover:text-white"
                    )}
                  >
                    {isActive ? <Check className="h-3 w-3 stroke-[3]" /> : <Play className="h-3 w-3 translate-x-0.5" />}
                  </div>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {preset.title}
                </h4>
                <p className="mt-1 text-xs text-white/70 line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>
              </div>

              {/* Badges des pistes incluses */}
              <div className="flex flex-wrap gap-1 pt-1 border-t border-white/10">
                {Object.entries(preset.layers).map(([layerName, vol]) => (
                  <span
                    key={layerName}
                    className="rounded-md bg-black/40 px-2 py-0.5 text-[9px] font-mono text-white/80"
                  >
                    {layerName} {vol}%
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
