"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import {
  BRAINWAVE_BANDS,
  SOLFEGGIO_FREQUENCIES,
  type BrainwaveBand,
} from "@/lib/audio/binaural-engine";
import {
  Headphones,
  Volume2,
  Activity,
  Plus,
  Minus,
  Sparkles,
} from "@/components/icons/ph";
import { cn } from "@/lib/utils";

interface BinauralControlsProps {
  isActive: boolean;
  onToggleActive: () => void;
  carrierFreq: number;
  onCarrierChange: (freq: number) => void;
  beatFreq: number;
  onBeatChange: (freq: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  activeBand: BrainwaveBand;
  onSelectBand: (band: BrainwaveBand) => void;
}

export const BinauralControls = memo(function BinauralControls({
  isActive,
  onToggleActive,
  carrierFreq,
  onCarrierChange,
  beatFreq,
  onBeatChange,
  volume,
  onVolumeChange,
  activeBand,
  onSelectBand,
}: BinauralControlsProps) {
  const currentBandInfo = BRAINWAVE_BANDS[activeBand];

  const handleStepBeat = (delta: number) => {
    const min = currentBandInfo.range[0];
    const max = currentBandInfo.range[1];
    const next = Math.max(min, Math.min(max, parseFloat((beatFreq + delta).toFixed(1))));
    onBeatChange(next);
  };

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg border transition-all",
              isActive
                ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                : "border-white/10 bg-white/5 text-zinc-400"
            )}
          >
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Battements binauraux & Fréquences
              </h3>
              <span className="flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-mono text-sky-300">
                <Headphones className="h-3 w-3" /> Casque requis
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Synchronisation cérébrale par décalage de phase stéréo
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={onToggleActive}
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg border px-4 text-xs font-bold transition-all cursor-pointer",
            isActive
              ? "border-emerald-500 bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400"
              : "border-white/15 bg-white/5 text-white hover:bg-white/10"
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-sm transition-colors",
              isActive ? "bg-zinc-950 animate-pulse" : "bg-zinc-500"
            )}
          />
          <span>{isActive ? "Actif" : "Activer"}</span>
        </motion.button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(Object.keys(BRAINWAVE_BANDS) as BrainwaveBand[]).map((bandKey) => {
          const info = BRAINWAVE_BANDS[bandKey];
          const isSelected = activeBand === bandKey;

          return (
            <motion.button
              key={bandKey}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => onSelectBand(bandKey)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-lg border py-2.5 px-2 text-center transition-all cursor-pointer",
                isSelected
                  ? "border-emerald-400/80 bg-emerald-500/15 text-white shadow-sm font-bold"
                  : "border-white/10 bg-black/30 text-zinc-400 hover:border-white/20 hover:text-white"
              )}
            >
              <span className="text-xs capitalize font-bold">{bandKey}</span>
              <span className="text-[10px] opacity-80 font-mono mt-0.5">
                {info.range[0]} – {info.range[1]} Hz
              </span>

              {isSelected && (
                <motion.div
                  layoutId="activeBinauralBand"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-sm bg-emerald-400"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-black/25 p-3 text-xs">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-white">{currentBandInfo.name}</span>
          <span className="text-zinc-400"> : {currentBandInfo.description}. {currentBandInfo.benefit}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/30 p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-300">Fréquence du battement</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleStepBeat(-0.5)}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
                title="-0.5 Hz"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="font-mono font-bold text-emerald-400 text-sm px-1">
                {beatFreq.toFixed(1)} Hz
              </span>
              <button
                type="button"
                onClick={() => handleStepBeat(0.5)}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
                title="+0.5 Hz"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          <input
            type="range"
            min={currentBandInfo.range[0]}
            max={currentBandInfo.range[1]}
            step={0.1}
            value={beatFreq}
            onChange={(e) => onBeatChange(parseFloat(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-sm bg-white/10 accent-emerald-500"
            aria-label="Fréquence binaurale en Hertz"
          />

          <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
            <span>{currentBandInfo.range[0]} Hz</span>
            <span>Plage {currentBandInfo.name}</span>
            <span>{currentBandInfo.range[1]} Hz</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/30 p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
              <Volume2 className="h-3.5 w-3.5 text-zinc-400" />
              <span>Volume de l'onde</span>
            </span>
            <span className="font-mono font-bold text-white text-sm">
              {Math.round(volume * 100)}%
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-sm bg-white/10 accent-emerald-500"
            aria-label="Volume de l'onde binaurale"
          />

          <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
            <span>0%</span>
            <span>Dosage doux</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-300">Harmonique porteuse (Solfeggio)</span>
          <span className="font-mono text-xs text-emerald-400 font-bold">{carrierFreq} Hz</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {SOLFEGGIO_FREQUENCIES.map((item) => {
            const isSelected = carrierFreq === item.freq;

            return (
              <motion.button
                key={item.freq}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => onCarrierChange(item.freq)}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border p-2.5 text-center transition-all cursor-pointer",
                  isSelected
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 font-bold shadow-sm"
                    : "border-white/10 bg-black/30 text-zinc-400 hover:border-white/20 hover:text-white"
                )}
              >
                <span className="font-mono font-bold text-xs">{item.title}</span>
                <span className="text-[10px] opacity-75 mt-0.5 truncate max-w-full">
                  {item.harmonic}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
});
