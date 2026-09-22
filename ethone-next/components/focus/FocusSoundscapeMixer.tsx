"use client";

import { useRef, useState } from "react";
import { Icon } from "@/lib/icons";
import { useSound, type SoundAmbient } from "@/lib/sound";
import { cn } from "@/lib/utils";

type SoundscapePreset = {
  id: string;
  label: string;
  icon: string;
  layers: Partial<Record<SoundAmbient, number>>;
};

const PRESETS: SoundscapePreset[] = [
  {
    id: "cafe-lofi",
    label: "Café Lo-Fi",
    icon: "coffee",
    layers: { cafe: 60, rain: 40 },
  },
  {
    id: "stormy-night",
    label: "Nuit d'orage",
    icon: "cloud-lightning",
    layers: { storm: 60, rain: 50, fireplace: 35 },
  },
  {
    id: "forest-zen",
    label: "Forêt Zen",
    icon: "tree",
    layers: { forest: 65, wind: 35, nature: 50 },
  },
  {
    id: "cosmos",
    label: "Cosmos",
    icon: "sparkles",
    layers: { space: 75, night: 40 },
  },
];

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

  const hasActiveSounds = Object.keys(activeSounds).length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-4 shadow-lg backdrop-blur-xl">
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
            "flex items-center gap-1.5 rounded-[var(--inset-radius)] border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
            masterMuted
              ? "border-[var(--danger)]/40 bg-[var(--danger)]/15 text-[var(--danger)]"
              : "border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
        >
          <Icon name={masterMuted ? "speaker-simple-slash" : "speaker-simple-high"} className="h-3.5 w-3.5" />
          <span>{masterMuted ? "Muet" : "Actif"}</span>
        </button>
      </div>

      {/* 1-Click Ambient Presets */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mr-1">
          Mix :
        </span>
        {PRESETS.map((preset) => {
          const isPresetActive =
            !masterMuted &&
            Object.entries(preset.layers).every(
              ([layerId]) => activeSounds[layerId as SoundAmbient] !== undefined
            );

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                if (isPresetActive) {
                  stopAmbient();
                } else {
                  if (masterMuted) setMasterMuted(false);
                  stopAmbient();
                  Object.entries(preset.layers).forEach(([layerId, vol]) => {
                    playAmbientLayer(layerId as SoundAmbient, vol);
                  });
                }
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                isPresetActive
                  ? "bg-[var(--accent-primary)] text-white shadow-xs"
                  : "bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--panel-border)]/50"
              )}
            >
              <Icon name={preset.icon} className="h-3 w-3" />
              <span>{preset.label}</span>
            </button>
          );
        })}

        {hasActiveSounds && !masterMuted && (
          <button
            type="button"
            onClick={() => stopAmbient()}
            title="Couper toutes les ambiances"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors cursor-pointer ml-auto"
          >
            <Icon name="x" className="h-2.5 w-2.5" />
            <span>Couper tout</span>
          </button>
        )}
      </div>

      {/* Soundscape Pills Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SOUNDSCAPES.map((sound) => {
          const isActive = !!activeSounds[sound.id] && !masterMuted;
          return (
            <div
              key={sound.id}
              className={cn(
                "flex flex-col gap-1.5 rounded-[var(--inset-radius)] border p-2.5 transition-all",
                isActive
                  ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 shadow-sm"
                  : "border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 hover:bg-[var(--surface-hover)]/60"
              )}
            >
              <button
                type="button"
                onClick={() => toggleSound(sound.id)}
                className="flex items-center justify-between text-xs font-semibold cursor-pointer"
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
