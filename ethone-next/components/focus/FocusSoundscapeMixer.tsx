"use client";

import { useRef, useState } from "react";
import { Icon } from "@/lib/icons";
import { useSound, type SoundAmbient } from "@/lib/sound";
import { cn } from "@/lib/utils";

const SOUNDSCAPES: { id: SoundAmbient; label: string; icon: string }[] = [
  { id: "rain", label: "Pluie", icon: "cloud-rain" },
  { id: "storm", label: "Orage", icon: "cloud-lightning" },
  { id: "forest", label: "Forêt", icon: "tree" },
  { id: "ocean", label: "Océan", icon: "waves" },
  { id: "fireplace", label: "Cheminée", icon: "flame" },
  { id: "cafe", label: "Café", icon: "coffee" },
  { id: "night", label: "Nuit", icon: "moon" },
  { id: "wind", label: "Vent", icon: "wind" },
  { id: "train", label: "Train", icon: "train" },
  { id: "space", label: "Espace", icon: "sparkles" },
  { id: "nature", label: "Nature", icon: "leaf" },
];

export default function FocusSoundscapeMixer() {
  const { ambientLayers, playAmbientLayer, stopAmbientLayer, stopAmbient, setAmbientLayerVolume } = useSound();
  // The engine's live layer map is the single source of truth, so a sound only ever
  // shows as active here when it's genuinely part of the audio mix.
  const activeSounds = ambientLayers;
  const [masterMuted, setMasterMuted] = useState(false);
  const mutedSnapshotRef = useRef<Partial<Record<SoundAmbient, number>>>({});

  const toggleSound = (id: SoundAmbient) => {
    if (activeSounds[id] !== undefined) {
      stopAmbientLayer(id);
    } else {
      playAmbientLayer(id, 70);
    }
  };

  const handleVolumeChange = (id: SoundAmbient, vol: number) => {
    setAmbientLayerVolume(id, vol);
  };

  const toggleMasterMute = () => {
    if (masterMuted) {
      setMasterMuted(false);
      (Object.entries(mutedSnapshotRef.current) as [SoundAmbient, number][]).forEach(([id, vol]) =>
        playAmbientLayer(id, vol)
      );
      mutedSnapshotRef.current = {};
    } else {
      mutedSnapshotRef.current = activeSounds;
      setMasterMuted(true);
      stopAmbient();
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-4 shadow-lg backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-[var(--panel-border)]/50 pb-2.5">
        <div className="flex items-center gap-2">
          <Icon name="waveform" className="h-4 w-4 text-[var(--accent-primary)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Ambiances & Soundscapes
          </span>
        </div>

        <button
          type="button"
          onClick={toggleMasterMute}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all",
            masterMuted
              ? "border-[var(--danger)]/40 bg-[var(--danger)]/15 text-[var(--danger)]"
              : "border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
        >
          <Icon name={masterMuted ? "speaker-simple-slash" : "speaker-simple-high"} className="h-3.5 w-3.5" />
          <span>{masterMuted ? "Muet" : "Actif"}</span>
        </button>
      </div>

      {/* Soundscape Pills Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SOUNDSCAPES.map((sound) => {
          const isActive = !!activeSounds[sound.id] && !masterMuted;
          return (
            <div
              key={sound.id}
              className={cn(
                "flex flex-col gap-1.5 rounded-xl border p-2.5 transition-all",
                isActive
                  ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 shadow-sm"
                  : "border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 hover:bg-[var(--surface-hover)]/60"
              )}
            >
              <button
                type="button"
                onClick={() => toggleSound(sound.id)}
                className="flex items-center justify-between text-xs font-semibold"
              >
                <div className="flex items-center gap-1.5">
                  <Icon
                    name={sound.icon}
                    className={cn(
                      "h-3.5 w-3.5",
                      isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"
                    )}
                  />
                  <span className={isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>
                    {sound.label}
                  </span>
                </div>

                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isActive ? "bg-[var(--accent-primary)] animate-pulse" : "bg-transparent"
                  )}
                />
              </button>

              {isActive && (
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={activeSounds[sound.id] ?? 70}
                  onChange={(e) => handleVolumeChange(sound.id, Number(e.target.value))}
                  className="h-1 w-full accent-[var(--accent-primary)] cursor-pointer"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
