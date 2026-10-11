"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSound } from "@/lib/sound";
import { BinauralSynth, type BrainwaveBand, BRAINWAVE_BANDS } from "@/lib/audio/binaural-engine";
import { VisualizerCanvas, type VisualizerMode } from "@/components/soundscape/VisualizerCanvas";
import { BinauralControls } from "@/components/soundscape/BinauralControls";
import { MixerDeck } from "@/components/soundscape/MixerDeck";
import { PresetGrid, type SoundscapePreset } from "@/components/soundscape/PresetGrid";
import { type SoundAmbient } from "@/lib/settings";
import {
  Maximize2,
  Minimize2,
  Clock,
  AudioWaveform,
  Sliders,
  Sparkles,
  Activity,
  Layers,
  Pause,
  Play,
  VolumeX,
} from "@/components/icons/ph";
import { cn } from "@/lib/utils";

const SLEEP_TIMER_OPTIONS = [
  { label: "Désactivé", minutes: 0 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 heure", minutes: 60 },
  { label: "2 heures", minutes: 120 },
];

type StudioTab = "all" | "mixer" | "presets" | "binaural";

export default function SoundscapePage() {
  const {
    ambientLayers,
    playAmbientLayer,
    stopAmbientLayer,
    setAmbientLayerVolume,
    stopAmbient,
    play,
  } = useSound();

  const [activeTab, setActiveTab] = useState<StudioTab>("all");
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>("nebula");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const synthRef = useRef<BinauralSynth | null>(null);
  const [isBinauralActive, setIsBinauralActive] = useState(false);
  const [carrierFreq, setCarrierFreq] = useState(432);
  const [beatFreq, setBeatFreq] = useState(10.0);
  const [binauralVolume, setBinauralVolume] = useState(0.5);
  const [activeBand, setActiveBand] = useState<BrainwaveBand>("alpha");

  const [activePresetId, setActivePresetId] = useState<string | null>("rain-fire");
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [sleepTimerOpen, setSleepTimerOpen] = useState(false);
  const timerRef = useRef<HTMLDivElement>(null);

  const previousMixRef = useRef<{
    layers: Partial<Record<SoundAmbient, number>>;
    binaural: boolean;
  } | null>(null);

  useEffect(() => {
    synthRef.current = new BinauralSynth();
    return () => {
      synthRef.current?.stop(false);
    };
  }, []);

  useEffect(() => {
    if (sleepTimerMinutes === 0) {
      setRemainingSeconds(null);
      return;
    }

    setRemainingSeconds(sleepTimerMinutes * 60);

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          synthRef.current?.stop(true);
          setIsBinauralActive(false);
          stopAmbient();
          setSleepTimerMinutes(0);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerMinutes, stopAmbient]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (timerRef.current && !timerRef.current.contains(e.target as Node)) {
        setSleepTimerOpen(false);
      }
    };
    if (sleepTimerOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sleepTimerOpen]);

  const handleToggleBinaural = useCallback(() => {
    play("toggle");
    if (isBinauralActive) {
      synthRef.current?.stop(true);
      setIsBinauralActive(false);
    } else {
      synthRef.current?.start(carrierFreq, beatFreq, binauralVolume);
      setIsBinauralActive(true);
    }
  }, [isBinauralActive, carrierFreq, beatFreq, binauralVolume, play]);

  const handleCarrierChange = useCallback(
    (freq: number) => {
      play("click");
      setCarrierFreq(freq);
      synthRef.current?.setCarrier(freq);
    },
    [play]
  );

  const handleBeatChange = useCallback((freq: number) => {
    setBeatFreq(freq);
    synthRef.current?.setBeat(freq);
  }, []);

  const handleBinauralVolumeChange = useCallback((vol: number) => {
    setBinauralVolume(vol);
    synthRef.current?.setVolume(vol);
  }, []);

  const handleSelectBand = useCallback(
    (band: BrainwaveBand) => {
      play("click");
      setActiveBand(band);
      const defaultHz = BRAINWAVE_BANDS[band].defaultFreq;
      setBeatFreq(defaultHz);
      synthRef.current?.setBeat(defaultHz);
    },
    [play]
  );

  const handleToggleLayer = useCallback(
    (id: SoundAmbient) => {
      play("toggle");
      const current = ambientLayers[id] ?? 0;
      if (current > 0) {
        stopAmbientLayer(id);
      } else {
        playAmbientLayer(id, 65);
      }
    },
    [ambientLayers, playAmbientLayer, stopAmbientLayer, play]
  );

  const handleLayerVolumeChange = useCallback(
    (id: SoundAmbient, vol: number) => {
      if (vol <= 0) {
        stopAmbientLayer(id);
      } else {
        setAmbientLayerVolume(id, vol);
      }
    },
    [setAmbientLayerVolume, stopAmbientLayer]
  );

  const handleClearAll = useCallback(() => {
    play("click");
    stopAmbient();
    synthRef.current?.stop(true);
    setIsBinauralActive(false);
    setActivePresetId(null);
  }, [stopAmbient, play]);

  const handleApplyPreset = useCallback(
    (preset: SoundscapePreset) => {
      play("success");
      setActivePresetId(preset.id);
      setVisualizerMode(preset.visualizerMode);

      setActiveBand(preset.binaural.band);
      setCarrierFreq(preset.binaural.carrier);
      setBeatFreq(preset.binaural.beat);
      setBinauralVolume(preset.binaural.volume);

      synthRef.current?.start(
        preset.binaural.carrier,
        preset.binaural.beat,
        preset.binaural.volume
      );
      setIsBinauralActive(true);

      Object.keys(ambientLayers).forEach((key) => {
        const trackId = key as SoundAmbient;
        if (!preset.layers[trackId]) {
          stopAmbientLayer(trackId);
        }
      });

      Object.entries(preset.layers).forEach(([trackId, vol]) => {
        playAmbientLayer(trackId as SoundAmbient, vol);
      });
    },
    [ambientLayers, playAmbientLayer, stopAmbientLayer, play]
  );

  const activeLayersCount = Object.keys(ambientLayers).filter(
    (k) => (ambientLayers[k as SoundAmbient] ?? 0) > 0
  ).length;
  const isAnyAudioActive = isBinauralActive || activeLayersCount > 0;

  const handleMasterPlaybackToggle = useCallback(() => {
    play("click");
    if (isAnyAudioActive) {
      previousMixRef.current = {
        layers: { ...ambientLayers },
        binaural: isBinauralActive,
      };
      stopAmbient();
      synthRef.current?.stop(true);
      setIsBinauralActive(false);
    } else {
      if (previousMixRef.current && Object.keys(previousMixRef.current.layers).length > 0) {
        Object.entries(previousMixRef.current.layers).forEach(([id, vol]) => {
          if (vol && vol > 0) {
            playAmbientLayer(id as SoundAmbient, vol);
          }
        });
        if (previousMixRef.current.binaural) {
          synthRef.current?.start(carrierFreq, beatFreq, binauralVolume);
          setIsBinauralActive(true);
        }
      } else {
        playAmbientLayer("rain", 65);
      }
    }
  }, [
    isAnyAudioActive,
    ambientLayers,
    isBinauralActive,
    carrierFreq,
    beatFreq,
    binauralVolume,
    playAmbientLayer,
    stopAmbient,
    play,
  ]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden os-scroll bg-[var(--surface-base)] text-white transition-all",
        isFullscreen && "fixed inset-0 z-50 h-screen w-screen"
      )}
    >
      <div
        className={cn(
          "relative w-full shrink-0 overflow-hidden border-b border-white/10 bg-black/90 transition-all duration-300",
          isFullscreen ? "h-screen" : "h-36 sm:h-44"
        )}
      >
        <VisualizerCanvas
          mode={visualizerMode}
          isAudioActive={isAnyAudioActive}
          className="absolute inset-0"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--surface-base)] via-black/30 to-black/60" />

        <div className="absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-3 p-4 z-20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white backdrop-blur-md shadow-md">
              <AudioWaveform className="h-4.5 w-4.5 text-emerald-400" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Soundscape
                </h1>

                {isAnyAudioActive ? (
                  <span className="flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-sm bg-emerald-400 animate-pulse" />
                    ACTIF
                  </span>
                ) : (
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                    PAUSE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-300 hidden sm:block">
                Studio d'ambiances & fréquences acoustiques
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={handleMasterPlaybackToggle}
              title={isAnyAudioActive ? "Mettre en pause tout l'audio" : "Démarrer l'audio"}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-all cursor-pointer",
                isAnyAudioActive
                  ? "border-emerald-500 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
                  : "border-white/15 bg-black/60 text-white hover:bg-white/10"
              )}
            >
              {isAnyAudioActive ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Écouter</span>
                </>
              )}
            </motion.button>

            <div className="hidden sm:flex rounded-lg border border-white/15 bg-black/60 p-0.5 backdrop-blur-md">
              {(
                [
                  { id: "nebula", label: "Nébuleuse" },
                  { id: "spectrum", label: "Spectre" },
                  { id: "horizon", label: "Horizon" },
                  { id: "ripples", label: "Ondes" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    play("click");
                    setVisualizerMode(m.id);
                  }}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                    visualizerMode === m.id
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div ref={timerRef} className="relative">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                aria-label="Minuteur de mise en veille"
                onClick={() => {
                  play("click");
                  setSleepTimerOpen((o) => !o);
                }}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold backdrop-blur-md transition-all cursor-pointer",
                  sleepTimerMinutes > 0
                    ? "border-amber-500/60 bg-amber-500/15 text-amber-300 shadow-sm shadow-amber-500/10"
                    : "border-white/15 bg-black/60 text-zinc-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {sleepTimerMinutes === 0
                    ? "Veille"
                    : SLEEP_TIMER_OPTIONS.find((o) => o.minutes === sleepTimerMinutes)?.label ?? "Veille"}
                </span>
              </motion.button>

              <AnimatePresence>
                {sleepTimerOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -6 }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    className="absolute right-0 top-full z-50 mt-2 min-w-[9rem] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
                  >
                    {SLEEP_TIMER_OPTIONS.map((opt, i) => {
                      const isActive = sleepTimerMinutes === opt.minutes;
                      return (
                        <motion.button
                          key={opt.minutes}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04, type: "spring", stiffness: 350, damping: 26 }}
                          type="button"
                          onClick={() => {
                            play("click");
                            setSleepTimerMinutes(opt.minutes);
                            setSleepTimerOpen(false);
                          }}
                          className={cn(
                            "relative flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                            isActive
                              ? "text-amber-300"
                              : "text-zinc-400 hover:text-white hover:bg-white/5"
                          )}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="sleepTimerActive"
                              className="absolute inset-0 rounded-lg bg-amber-500/15 border border-amber-500/30"
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <Clock className="relative h-3 w-3 shrink-0 opacity-70" />
                          <span className="relative">
                            {opt.minutes === 0 ? "Désactivé" : opt.label}
                          </span>
                          {isActive && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="relative ml-auto h-1.5 w-1.5 rounded-full bg-amber-400"
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={() => {
                play("click");
                setIsFullscreen(!isFullscreen);
              }}
              title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/60 text-white backdrop-blur-md hover:bg-white/10 transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </motion.button>
          </div>
        </div>

        {remainingSeconds !== null && (
          <div className="absolute bottom-3 left-4 z-20 flex items-center gap-2 rounded-md border border-amber-500/40 bg-black/80 px-3 py-1 text-xs font-mono text-amber-300 backdrop-blur-md">
            <Clock className="h-3.5 w-3.5 animate-spin" />
            <span>Extinction dans {formatTimer(remainingSeconds)}</span>
          </div>
        )}
      </div>

      {!isFullscreen && (
        <main className="mx-auto flex w-full max-w-7xl shrink-0 flex-col gap-5 px-4 py-6 pb-36 sm:px-6 sm:pb-44">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-1">
              {(
                [
                  { id: "all", label: "Vue complète", icon: Layers },
                  { id: "mixer", label: "Mixeur", icon: Sliders },
                  { id: "presets", label: "Atmosphères", icon: Sparkles },
                  { id: "binaural", label: "Fréquences", icon: Activity },
                ] as const
              ).map((tab) => {
                const isSelected = activeTab === tab.id;
                const Icon = tab.icon;

                return (
                  <motion.button
                    key={tab.id}
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => {
                      play("click");
                      setActiveTab(tab.id);
                    }}
                    className={cn(
                      "relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                      isSelected
                        ? "bg-white/15 text-white shadow-sm"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>

                    {tab.id === "mixer" && activeLayersCount > 0 && (
                      <span className="rounded-sm bg-emerald-500/30 px-1 text-[10px] font-mono text-emerald-300">
                        {activeLayersCount}
                      </span>
                    )}

                    {tab.id === "binaural" && isBinauralActive && (
                      <span className="rounded-sm bg-emerald-500/30 px-1 text-[10px] font-mono text-emerald-300">
                        ON
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {isAnyAudioActive && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>Tout couper</span>
                </button>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "all" && (
              <motion.div
                key="all"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-6"
              >
                <PresetGrid
                  activePresetId={activePresetId}
                  onApplyPreset={handleApplyPreset}
                />

                <MixerDeck
                  layers={ambientLayers}
                  onToggleLayer={handleToggleLayer}
                  onVolumeChange={handleLayerVolumeChange}
                  onClearAll={handleClearAll}
                />

                <BinauralControls
                  isActive={isBinauralActive}
                  onToggleActive={handleToggleBinaural}
                  carrierFreq={carrierFreq}
                  onCarrierChange={handleCarrierChange}
                  beatFreq={beatFreq}
                  onBeatChange={handleBeatChange}
                  volume={binauralVolume}
                  onVolumeChange={handleBinauralVolumeChange}
                  activeBand={activeBand}
                  onSelectBand={handleSelectBand}
                />
              </motion.div>
            )}

            {activeTab === "mixer" && (
              <motion.div
                key="mixer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <MixerDeck
                  layers={ambientLayers}
                  onToggleLayer={handleToggleLayer}
                  onVolumeChange={handleLayerVolumeChange}
                  onClearAll={handleClearAll}
                />
              </motion.div>
            )}

            {activeTab === "presets" && (
              <motion.div
                key="presets"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <PresetGrid
                  activePresetId={activePresetId}
                  onApplyPreset={handleApplyPreset}
                />
              </motion.div>
            )}

            {activeTab === "binaural" && (
              <motion.div
                key="binaural"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <BinauralControls
                  isActive={isBinauralActive}
                  onToggleActive={handleToggleBinaural}
                  carrierFreq={carrierFreq}
                  onCarrierChange={handleCarrierChange}
                  beatFreq={beatFreq}
                  onBeatChange={handleBeatChange}
                  volume={binauralVolume}
                  onVolumeChange={handleBinauralVolumeChange}
                  activeBand={activeBand}
                  onSelectBand={handleSelectBand}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      )}
    </div>
  );
}
