"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
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

export default function SoundscapePage() {
  const {
    ambientLayers,
    playAmbientLayer,
    stopAmbientLayer,
    setAmbientLayerVolume,
    stopAmbient,
    play,
  } = useSound();

  // Mode de visualisation actif
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>("nebula");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // État synthétiseur binaural
  const synthRef = useRef<BinauralSynth | null>(null);
  const [isBinauralActive, setIsBinauralActive] = useState(false);
  const [carrierFreq, setCarrierFreq] = useState(432);
  const [beatFreq, setBeatFreq] = useState(10.0);
  const [binauralVolume, setBinauralVolume] = useState(0.5);
  const [activeBand, setActiveBand] = useState<BrainwaveBand>("alpha");

  // Préréglage actif
  const [activePresetId, setActivePresetId] = useState<string | null>("alpha-zen");

  // Minuteur de mise en veille
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // Initialisation du synthétiseur binaural
  useEffect(() => {
    synthRef.current = new BinauralSynth();
    return () => {
      synthRef.current?.stop(false);
    };
  }, []);

  // Décompte du minuteur de sommeil
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
          // Arrêt complet avec fondu
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

  // Commutateur de l'onde binaurale
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

  // Changement de porteuse (Solfeggio)
  const handleCarrierChange = useCallback(
    (freq: number) => {
      play("click");
      setCarrierFreq(freq);
      synthRef.current?.setCarrier(freq);
    },
    [play]
  );

  // Changement de battement (Hz)
  const handleBeatChange = useCallback((freq: number) => {
    setBeatFreq(freq);
    synthRef.current?.setBeat(freq);
  }, []);

  // Changement de volume binaural
  const handleBinauralVolumeChange = useCallback((vol: number) => {
    setBinauralVolume(vol);
    synthRef.current?.setVolume(vol);
  }, []);

  // Sélection d'une bande d'ondes
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

  // Gestion des pistes d'ambiance
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

  // Application d'un préréglage complet
  const handleApplyPreset = useCallback(
    (preset: SoundscapePreset) => {
      play("success");
      setActivePresetId(preset.id);
      setVisualizerMode(preset.visualizerMode);

      // Configuration binaurale
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

      // Arrêt des pistes non présentes et lancement des nouvelles
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

  // Formatage du temps restant du minuteur
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col overflow-x-hidden bg-[var(--surface-base)] text-[var(--text-primary)] transition-all",
        isFullscreen && "fixed inset-0 z-50 overflow-y-auto"
      )}
    >
      {/* Visualiseur interactif de fond ou de scène */}
      <div className="relative h-[340px] sm:h-[420px] w-full overflow-hidden border-b border-white/10 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <VisualizerCanvas
          mode={visualizerMode}
          isAudioActive={isAnyAudioActive}
          className="absolute inset-0"
        />

        {/* Voile dégradé subtil pour le contraste du texte */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--surface-base)] via-transparent to-black/30" />

        {/* Commandes flottantes sur le visualiseur (Glassmorphism Sonoma) */}
        <div className="absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-3 p-5 z-20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-xl border border-white/15 shadow-xl">
              <AudioWaveform className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">
                  Studio Soundscape & Fréquences
                </h1>
                {isAnyAudioActive && (
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-white/70">
                Visualiseur interactif réactif 60 FPS · Synthèse binaurale pure
              </p>
            </div>
          </div>

          {/* Boutons d'actions rapides : Mode d'affichage, Minuteur & Plein écran */}
          <div className="flex items-center gap-2">
            {/* Sélecteur de mode de visualisation */}
            <div className="flex rounded-full border border-white/15 bg-black/40 p-1 backdrop-blur-xl">
              {(
                [
                  { id: "nebula", label: "Nébuleuse" },
                  { id: "spectrum", label: "Spectre" },
                  { id: "horizon", label: "Horizon" },
                  { id: "ripples", label: "Ondes Zen" },
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
                    "rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200",
                    visualizerMode === m.id
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Minuteur de veille */}
            <div className="relative flex items-center">
              <select
                value={sleepTimerMinutes}
                onChange={(e) => {
                  play("click");
                  setSleepTimerMinutes(parseInt(e.target.value, 10));
                }}
                className="cursor-pointer rounded-full border border-white/15 bg-black/40 py-1.5 pl-8 pr-4 text-xs font-semibold text-white backdrop-blur-xl hover:bg-white/10 focus:outline-none appearance-none"
                aria-label="Minuteur de mise en veille"
              >
                {SLEEP_TIMER_OPTIONS.map((opt) => (
                  <option key={opt.minutes} value={opt.minutes} className="bg-zinc-900 text-white">
                    {opt.minutes === 0 ? "Minuteur off" : `Veille : ${opt.label}`}
                  </option>
                ))}
              </select>
              <Clock className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-white/70" />
            </div>

            {/* Plein écran */}
            <button
              type="button"
              onClick={() => {
                play("click");
                setIsFullscreen(!isFullscreen);
              }}
              title={isFullscreen ? "Quitter le plein écran" : "Plein écran immersif"}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-xl hover:bg-white/10 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Badge d'indication minuteur actif */}
        {remainingSeconds !== null && (
          <div className="absolute bottom-5 left-5 z-20 flex items-center gap-2 rounded-full border border-amber-500/40 bg-black/60 px-3.5 py-1 text-xs font-mono text-amber-300 backdrop-blur-xl">
            <Clock className="h-3.5 w-3.5 animate-spin" />
            <span>Extinction dans {formatTimer(remainingSeconds)}</span>
          </div>
        )}
      </div>

      {/* Contenu principal : Grille Bento Apple-grade */}
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6"
      >
        {/* Section 1 : Préréglages d'ambiance en 1 clic */}
        <PresetGrid
          activePresetId={activePresetId}
          onApplyPreset={handleApplyPreset}
        />

        {/* Section 2 : Ondes Binaurales & Fréquences Sacrées Solfeggio */}
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

        {/* Section 3 : Mixeur Multi-Pistes */}
        <MixerDeck
          layers={ambientLayers}
          onToggleLayer={handleToggleLayer}
          onVolumeChange={handleLayerVolumeChange}
          onClearAll={handleClearAll}
        />
      </motion.main>
    </div>
  );
}
