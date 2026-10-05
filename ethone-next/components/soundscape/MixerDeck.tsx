"use client";

import React, { memo } from "react";
import { type SoundAmbient } from "@/lib/settings";
import {
  CloudRain,
  Waves,
  Flame,
  TreePine,
  Wind,
  Sparkles,
  MoonStar,
  Radio,
  Sliders,
  VolumeX,
} from "@/components/icons/ph";
import { cn } from "@/lib/utils";

export interface SoundTrackDef {
  id: SoundAmbient;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const SOUND_TRACKS: SoundTrackDef[] = [
  { id: "rain", title: "Pluie & Averse", subtitle: "Gouttes ASMR & averse continue", icon: CloudRain, color: "#38bdf8" },
  { id: "ocean", title: "Ressac Océanique", subtitle: "Houle profonde & écume douce", icon: Waves, color: "#06b6d4" },
  { id: "fireplace", title: "Feu de Cheminée", subtitle: "Crépitements de braises & chaleur", icon: Flame, color: "#f97316" },
  { id: "forest", title: "Forêt Zen", subtitle: "Bruissement de feuilles & oiseaux", icon: TreePine, color: "#10b981" },
  { id: "wind", title: "Brise & Rafales", subtitle: "Souffle doux d'altitude", icon: Wind, color: "#a855f7" },
  { id: "space", title: "Cosmos & Drone", subtitle: "Harmoniques spatiales planantes", icon: Sparkles, color: "#818cf8" },
  { id: "night", title: "Nuit d'Été", subtitle: "Grillons nocturnes & brise d'air", icon: MoonStar, color: "#6366f1" },
  { id: "brown", title: "Bruit Brun", subtitle: "Spectre grave apaisant & anti-distraction", icon: Radio, color: "#d97706" },
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
    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl backdrop-blur-2xl transition-all">
      {/* En-tête du Mixeur */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[var(--accent-primary)]">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Mixeur d'Ambiances Multi-Pistes
              </h3>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-mono font-medium text-[var(--text-muted)]">
                {activeCount} active{activeCount > 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Combinez librement la pluie, l'océan, le feu et les textures de fond
            </p>
          </div>
        </div>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)] transition-all active:scale-95"
          >
            <VolumeX className="h-3.5 w-3.5" /> Tout couper
          </button>
        )}
      </div>

      {/* Grille des pistes audio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SOUND_TRACKS.map((track) => {
          const currentVol = layers[track.id] ?? 0;
          const isPlaying = currentVol > 0;
          const Icon = track.icon;

          return (
            <div
              key={track.id}
              className={cn(
                "group relative flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-all duration-300",
                isPlaying
                  ? "border-white/20 bg-white/[0.06] shadow-lg shadow-black/40"
                  : "border-white/5 bg-black/20 hover:border-white/10 hover:bg-white/[0.02]"
              )}
            >
              {/* Ligne du haut : Icône, Titre et Bouton On/Off */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-300",
                      isPlaying
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                        : "border-white/5 bg-white/5 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {track.title}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">
                      {track.subtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleLayer(track.id)}
                  aria-label={`${isPlaying ? "Arrêter" : "Démarrer"} ${track.title}`}
                  className={cn(
                    "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-300 active:scale-95",
                    isPlaying ? "bg-emerald-500" : "bg-white/15 hover:bg-white/25"
                  )}
                >
                  <span
                    className={cn(
                      "h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300",
                      isPlaying ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Curseur de volume avec jauge visuelle tactile */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[var(--text-muted)]">Niveau</span>
                  <span
                    className={cn(
                      "font-semibold transition-colors",
                      isPlaying ? "text-emerald-400" : "text-[var(--text-muted)]"
                    )}
                  >
                    {isPlaying ? `${currentVol}%` : "Muet"}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={isPlaying ? currentVol : 0}
                  disabled={!isPlaying}
                  onChange={(e) => onVolumeChange(track.id, parseInt(e.target.value, 10))}
                  className={cn(
                    "h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-emerald-500 transition-all",
                    !isPlaying && "opacity-30 cursor-not-allowed"
                  )}
                  aria-label={`Volume de ${track.title}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
