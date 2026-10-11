"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import { type SoundAmbient } from "@/lib/settings";
import {
  CloudRain,
  CloudLightning,
  Waves,
  Flame,
  TreePine,
  Wind,
  MoonStar,
  Radio,
  Sparkles,
  Coffee,
  Sliders,
  Volume2,
  VolumeX,
} from "@/components/icons/ph";
import { cn } from "@/lib/utils";

export interface SoundTrackDef {
  id: SoundAmbient;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SOUND_TRACKS: SoundTrackDef[] = [
  { id: "rain", title: "Pluie", subtitle: "Averse continue", icon: CloudRain },
  { id: "storm", title: "Orage", subtitle: "Tonnerre lointain", icon: CloudLightning },
  { id: "ocean", title: "Océan", subtitle: "Ressac et vagues", icon: Waves },
  { id: "fireplace", title: "Feu de bois", subtitle: "Crépitements doux", icon: Flame },
  { id: "forest", title: "Forêt", subtitle: "Bruissement et feuilles", icon: TreePine },
  { id: "wind", title: "Vent", subtitle: "Souffle régulier", icon: Wind },
  { id: "night", title: "Nuit", subtitle: "Grillons d'été", icon: MoonStar },
  { id: "brown", title: "Bruit brun", subtitle: "Spectre grave feutré", icon: Radio },
  { id: "space", title: "Espace", subtitle: "Nappe d'harmoniques", icon: Sparkles },
  { id: "cafe", title: "Café", subtitle: "Ambiance feutrée", icon: Coffee },
];

interface MixerDeckProps {
  layers: Partial<Record<SoundAmbient, number>>;
  onToggleLayer: (id: SoundAmbient) => void;
  onVolumeChange: (id: SoundAmbient, volume: number) => void;
  onClearAll: () => void;
}

export const MixerDeck = memo(function MixerDeck({
  layers,
  onToggleLayer,
  onVolumeChange,
  onClearAll,
}: MixerDeckProps) {
  const activeCount = Object.keys(layers).filter(
    (k) => (layers[k as SoundAmbient] ?? 0) > 0
  ).length;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-emerald-400">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Mixeur multi-pistes
              </h3>
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                {activeCount} active{activeCount > 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Ajustez l'intensité de chaque couche sonore en temps réel
            </p>
          </div>
        </div>

        {activeCount > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onClearAll}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
          >
            <VolumeX className="h-3.5 w-3.5" />
            <span>Couper tout</span>
          </motion.button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {SOUND_TRACKS.map((track) => {
          const currentVol = layers[track.id] ?? 0;
          const isPlaying = currentVol > 0;
          const Icon = track.icon;

          return (
            <div
              key={track.id}
              className={cn(
                "group relative flex flex-col justify-between gap-3 rounded-xl border p-3.5 transition-all duration-200",
                isPlaying
                  ? "border-emerald-500/40 bg-emerald-500/[0.07] shadow-lg shadow-black/30"
                  : "border-white/10 bg-black/25 hover:border-white/20 hover:bg-white/[0.02]"
              )}
            >
              <div className="flex items-start justify-between gap-2.5">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={() => onToggleLayer(track.id)}
                  aria-label={`${isPlaying ? "Arrêter" : "Lancer"} ${track.title}`}
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer",
                    isPlaying
                      ? "border-emerald-500/60 bg-emerald-500/25 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                      : "border-white/10 bg-white/5 text-zinc-400 group-hover:border-white/20 group-hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </motion.button>

                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white truncate">
                      {track.title}
                    </span>
                    <div className="flex items-end gap-0.5 h-3 shrink-0">
                      {[0.3, 0.7, 0.5, 0.9].map((multiplier, idx) => (
                        <motion.span
                          key={idx}
                          className={cn(
                            "w-0.5 rounded-sm transition-colors",
                            isPlaying ? "bg-emerald-400" : "bg-zinc-700"
                          )}
                          animate={
                            isPlaying
                              ? {
                                  height: [
                                    "20%",
                                    `${Math.min(100, Math.max(25, currentVol * multiplier))}%`,
                                    "25%",
                                  ],
                                }
                              : { height: "20%" }
                          }
                          transition={
                            isPlaying
                              ? {
                                  repeat: Infinity,
                                  repeatType: "reverse",
                                  duration: 0.45 + idx * 0.12,
                                  ease: "easeInOut",
                                }
                              : { duration: 0.2 }
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                    {track.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 pt-1 border-t border-white/5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => onVolumeChange(track.id, isPlaying ? 0 : 65)}
                    className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {isPlaying ? (
                      <Volume2 className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <VolumeX className="h-3 w-3" />
                    )}
                    <span>{isPlaying ? `${currentVol}%` : "Coupé"}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onVolumeChange(track.id, 50)}
                      className="rounded-md border border-white/10 bg-white/5 px-1 py-0.5 text-[9px] text-zinc-400 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => onVolumeChange(track.id, 100)}
                      className="rounded-md border border-white/10 bg-white/5 px-1 py-0.5 text-[9px] text-zinc-400 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
                    >
                      Max
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={currentVol}
                  onChange={(e) => onVolumeChange(track.id, parseInt(e.target.value, 10))}
                  aria-label={`Volume de ${track.title}`}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-sm bg-white/10 accent-emerald-500 hover:accent-emerald-400 transition-all"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
