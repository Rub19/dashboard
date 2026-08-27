"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useSettings } from "@/components/SettingsProvider";
import { useSound } from "@/lib/sound";
import { useI18n } from "@/lib/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { SoundAmbient } from "@/lib/settings";

export interface SoundscapeItem {
  id: SoundAmbient;
  label: string;
  category: "weather" | "nature" | "ambient" | "focus";
  icon: string;
  description: string;
}

export const SOUNDSCAPES: SoundscapeItem[] = [
  { id: "rain", label: "Pluie", category: "weather", icon: "cloud-rain", description: "Averse continue et gouttes fines" },
  { id: "storm", label: "Orage", category: "weather", icon: "cloud-lightning", description: "Pluie, rafales et tonnerre espacé" },
  { id: "forest", label: "Forêt", category: "nature", icon: "trees", description: "Bruissement de feuilles et brise sylvestre" },
  { id: "ocean", label: "Océan", category: "nature", icon: "waves", description: "Roulis des vagues et ressac profond" },
  { id: "fireplace", label: "Cheminée", category: "ambient", icon: "flame", description: "Feu de bois chaleureux et crépitements" },
  { id: "cafe", label: "Café", category: "ambient", icon: "coffee", description: "Atmosphère chaleureuse de salon de café" },
  { id: "wind", label: "Vent", category: "weather", icon: "wind", description: "Souffle continu et bourrasques naturelles" },
  { id: "blizzard", label: "Blizzard", category: "weather", icon: "snowflake", description: "Tourbillon polaire et tempête glaciale" },
  { id: "night", label: "Nuit", category: "ambient", icon: "moon", description: "Grillons d'été et quiétude nocturne" },
  { id: "train", label: "Train", category: "focus", icon: "train", description: "Rythme régulier et roulement sur les rails" },
  { id: "city", label: "Ville", category: "ambient", icon: "buildings", description: "Rumeur urbaine lointaine et douce" },
  { id: "library", label: "Bibliothèque", category: "focus", icon: "book-open", description: "Silence feutré et concentration studieuse" },
  { id: "space", label: "Espace", category: "focus", icon: "planet", description: "Drone cosmique éthéré et harmoniques" },
  { id: "nature", label: "Nature", category: "nature", icon: "leaf", description: "Cours d'eau limpide et murmure de la terre" },
];

export const SOUNDSCAPE_PRESETS = [
  { id: "rainy-night", name: "Rainy Night", icon: "cloud-rain", layers: [{ id: "rain" as SoundAmbient, vol: 70 }, { id: "night" as SoundAmbient, vol: 40 }] },
  { id: "storm", name: "Epic Storm", icon: "cloud-lightning", layers: [{ id: "storm" as SoundAmbient, vol: 85 }, { id: "wind" as SoundAmbient, vol: 45 }] },
  { id: "forest", name: "Deep Forest", icon: "trees", layers: [{ id: "forest" as SoundAmbient, vol: 75 }, { id: "nature" as SoundAmbient, vol: 50 }] },
  { id: "cafe", name: "Cozy Café", icon: "coffee", layers: [{ id: "cafe" as SoundAmbient, vol: 80 }, { id: "rain" as SoundAmbient, vol: 30 }] },
  { id: "ocean", name: "Deep Ocean", icon: "waves", layers: [{ id: "ocean" as SoundAmbient, vol: 85 }, { id: "wind" as SoundAmbient, vol: 25 }] },
  { id: "fireplace", name: "Fireplace", icon: "flame", layers: [{ id: "fireplace" as SoundAmbient, vol: 80 }, { id: "night" as SoundAmbient, vol: 20 }] },
  { id: "midnight", name: "Midnight Focus", icon: "moon", layers: [{ id: "night" as SoundAmbient, vol: 60 }, { id: "space" as SoundAmbient, vol: 40 }] },
  { id: "focus", name: "Silent Study", icon: "book-open", layers: [{ id: "library" as SoundAmbient, vol: 75 }, { id: "rain" as SoundAmbient, vol: 25 }] },
];

export default function SoundscapeMixer() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { ambientSound, playAmbient, stopAmbient } = useSound();

  const [activeLayers, setActiveLayers] = useState<Record<string, number>>(() => {
    if (ambientSound && ambientSound !== "none") {
      return { [ambientSound]: 75 };
    }
    return {};
  });

  const [masterVolume, setMasterVolume] = useState(80);
  const [activeTab, setActiveTab] = useState<"all" | "weather" | "nature" | "ambient" | "focus">("all");

  const filteredSoundscapes = useMemo(() => {
    if (activeTab === "all") return SOUNDSCAPES;
    return SOUNDSCAPES.filter((s) => s.category === activeTab);
  }, [activeTab]);

  const toggleLayer = useCallback(
    (id: SoundAmbient) => {
      setActiveLayers((prev) => {
        const next = { ...prev };
        if (next[id] !== undefined) {
          delete next[id];
          const remainingKeys = Object.keys(next) as SoundAmbient[];
          if (remainingKeys.length === 0) {
            stopAmbient();
            update({ ambientSound: "none" });
          } else {
            playAmbient(remainingKeys[0]);
            update({ ambientSound: remainingKeys[0] });
          }
        } else {
          next[id] = 70;
          playAmbient(id);
          update({ ambientSound: id });
        }
        return next;
      });
    },
    [playAmbient, stopAmbient, update]
  );

  const setLayerVolume = useCallback((id: string, vol: number) => {
    setActiveLayers((prev) => ({
      ...prev,
      [id]: vol,
    }));
  }, []);

  const applyPreset = useCallback(
    (preset: typeof SOUNDSCAPE_PRESETS[0]) => {
      const next: Record<string, number> = {};
      preset.layers.forEach((l) => {
        next[l.id] = l.vol;
      });
      setActiveLayers(next);
      if (preset.layers[0]) {
        playAmbient(preset.layers[0].id);
        update({ ambientSound: preset.layers[0].id });
      }
    },
    [playAmbient, update]
  );

  const randomize = useCallback(() => {
    const candidates = SOUNDSCAPES.filter((s) => s.id !== "none");
    const count = 2 + Math.floor(Math.random() * 2); // 2 or 3 layers
    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    const next: Record<string, number> = {};
    selected.forEach((s, idx) => {
      next[s.id] = idx === 0 ? 75 : 30 + Math.floor(Math.random() * 30);
    });

    setActiveLayers(next);
    if (selected[0]) {
      playAmbient(selected[0].id);
      update({ ambientSound: selected[0].id });
    }
  }, [playAmbient, update]);

  const isPlayingAny = Object.keys(activeLayers).length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Soundscape Control Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-gradient-to-br from-[var(--surface-raised)] to-[var(--panel-bg)] p-5 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/30">
              <Icon name="cloud-rain" className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  ETHONE Soundscapes 2.0
                </h3>
                {isPlayingAny && (
                  <span className="flex items-center gap-1 rounded-full bg-[var(--accent-primary)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-primary)] animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]" />
                    En cours
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                14 ambiances continues haute fidélité avec mixeur multi-couches
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={randomize}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--surface-hover)] transition-all active:scale-95"
            >
              <Icon name="sparkles" className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              🎲 Ambiance aléatoire
            </button>
            {isPlayingAny && (
              <button
                type="button"
                onClick={() => {
                  stopAmbient();
                  setActiveLayers({});
                  update({ ambientSound: "none" });
                }}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-all active:scale-95"
              >
                <Icon name="x" className="h-3.5 w-3.5" />
                Tout couper
              </button>
            )}
          </div>
        </div>

        {/* Master Volume Bar */}
        <div className="mt-4 flex items-center gap-3 border-t border-[var(--panel-border)]/50 pt-4">
          <Icon name="speaker-high" className="h-4 w-4 text-[var(--text-muted)]" />
          <span className="text-xs font-medium text-[var(--text-muted)]">Volume général</span>
          <input
            type="range"
            min="0"
            max="100"
            value={masterVolume}
            onChange={(e) => setMasterVolume(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--surface-raised)] accent-[var(--accent-primary)]"
          />
          <span className="w-9 text-right text-xs font-mono tabular-nums text-[var(--text-primary)]">
            {masterVolume}%
          </span>
        </div>
      </div>

      {/* Presets Row */}
      <div className="flex flex-col gap-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Presets d&apos;ambiance recommandés
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {SOUNDSCAPE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="group flex flex-col items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2.5 text-center transition-all hover:border-[var(--accent-primary)]/50 hover:bg-[var(--surface-hover)]/40 active:scale-95"
            >
              <Icon
                name={preset.icon}
                className="h-5 w-5 text-[var(--accent-primary)] transition-transform group-hover:scale-110"
              />
              <span className="mt-1.5 text-[11px] font-semibold text-[var(--text-primary)]">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-[var(--panel-border)] pb-2">
        {(
          [
            { id: "all", label: "Toutes les ambiances (14)" },
            { id: "weather", label: "Météo & Éléments" },
            { id: "nature", label: "Nature & Écosystèmes" },
            { id: "ambient", label: "Lieux & Atmosphères" },
            { id: "focus", label: "Concentration & Étude" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-semibold shadow-sm"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)]/40 hover:text-[var(--text-primary)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Soundscapes Cards Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSoundscapes.map((sound) => {
          const isActive = activeLayers[sound.id] !== undefined;
          const vol = activeLayers[sound.id] ?? 70;

          return (
            <div
              key={sound.id}
              className={cn(
                "flex flex-col justify-between rounded-2xl border p-4 transition-all",
                isActive
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/[0.06] shadow-[0_0_20px_-6px_var(--glow-color)]"
                  : "border-[var(--panel-border)] bg-[var(--panel-bg)] hover:border-[var(--accent-primary)]/30"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleLayer(sound.id)}
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform active:scale-95",
                      isActive
                        ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-md"
                        : "bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <Icon name={sound.icon} className="h-5 w-5" />
                  </button>
                  <div>
                    <h5 className="text-sm font-semibold text-[var(--text-primary)]">
                      {sound.label}
                    </h5>
                    <p className="line-clamp-1 text-[11px] text-[var(--text-muted)]">
                      {sound.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleLayer(sound.id)}
                  className={cn(
                    "flex h-6 w-11 items-center rounded-full p-0.5 transition-colors",
                    isActive ? "bg-[var(--accent-primary)]" : "bg-[var(--surface-raised)]"
                  )}
                >
                  <span
                    className={cn(
                      "h-5 w-5 rounded-full bg-white transition-transform",
                      isActive ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Individual Track Slider (When Active) */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3.5 flex items-center gap-2.5 border-t border-[var(--accent-primary)]/20 pt-3"
                  >
                    <Icon name="volume-2" className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={vol}
                      onChange={(e) => setLayerVolume(sound.id, Number(e.target.value))}
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--surface-raised)] accent-[var(--accent-primary)]"
                    />
                    <span className="w-8 text-right text-[11px] font-mono tabular-nums text-[var(--accent-primary)] font-semibold">
                      {vol}%
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Smart Soundscape Preferences */}
      <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 flex flex-col gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Comportement & Options de mixage
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--panel-border)]/50 bg-[var(--surface-raised)]/40 p-3">
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                Couper lors de la lecture musicale
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                Met en pause les soundscapes dès que Spotify est actif
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.mediaDucking}
              onChange={(e) => update({ mediaDucking: e.target.checked })}
              className="h-4 w-4 rounded accent-[var(--accent-primary)]"
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--panel-border)]/50 bg-[var(--surface-raised)]/40 p-3">
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                Atténuation sur notifications
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                Baisse temporairement le volume lors d&apos;une alerte sonore
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded accent-[var(--accent-primary)]"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
