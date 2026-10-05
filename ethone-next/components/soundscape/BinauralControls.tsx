"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import {
  BRAINWAVE_BANDS,
  SOLFEGGIO_FREQUENCIES,
  type BrainwaveBand,
} from "@/lib/audio/binaural-engine";
import { Headphones, Volume2, Sparkles, Activity } from "@/components/icons/ph";
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

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl backdrop-blur-2xl transition-all">
      {/* En-tête : Titre & Commutateur Master */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-300",
              isActive
                ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : "border-white/10 bg-white/5 text-[var(--text-muted)]"
            )}
          >
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Ondes Binaurales & Fréquences
              </h3>
              <span className="flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                <Headphones className="h-3 w-3" /> Casque requis
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Synchronisation des ondes cérébrales par écart de phase stéréo
            </p>
          </div>
        </div>

        {/* Bouton d'activation avec ressort Apple */}
        <button
          type="button"
          onClick={onToggleActive}
          className={cn(
            "relative flex h-8 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-all duration-300 active:scale-95",
            isActive
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400"
              : "border border-white/15 bg-white/5 text-[var(--text-primary)] hover:bg-white/10"
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              isActive ? "animate-pulse bg-white" : "bg-zinc-500"
            )}
          />
          {isActive ? "Actif" : "Activer"}
        </button>
      </div>

      {/* Sélecteur de bandes d'ondes (Delta, Theta, Alpha, Beta, Gamma) */}
      <div className="grid grid-cols-5 gap-1.5 rounded-2xl bg-black/30 p-1.5 border border-white/5">
        {(Object.keys(BRAINWAVE_BANDS) as BrainwaveBand[]).map((bandKey) => {
          const info = BRAINWAVE_BANDS[bandKey];
          const isSelected = activeBand === bandKey;
          return (
            <button
              key={bandKey}
              type="button"
              onClick={() => onSelectBand(bandKey)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center transition-all duration-200",
                isSelected
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              )}
            >
              <span className="text-[11px] font-bold capitalize">{bandKey}</span>
              <span className="text-[9px] opacity-75 font-mono">{info.range[0]}-{info.range[1]} Hz</span>
              {isSelected && (
                <motion.div
                  layoutId="activeBandIndicator"
                  className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-emerald-400"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Carte d'information de l'onde active */}
      <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-xs">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
        <div>
          <span className="font-semibold text-[var(--text-primary)]">{currentBandInfo.name}</span>
          <span className="text-[var(--text-muted)]"> — {currentBandInfo.description}. {currentBandInfo.benefit}</span>
        </div>
      </div>

      {/* Curseurs de réglage fin : Fréquence du battement (Hz) & Volume */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Curseur Fréquence cible (Hz) */}
        <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-black/20 p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--text-secondary)]">Fréquence du battement</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">{beatFreq.toFixed(1)} Hz</span>
          </div>
          <input
            type="range"
            min={currentBandInfo.range[0]}
            max={currentBandInfo.range[1]}
            step={0.1}
            value={beatFreq}
            onChange={(e) => onBeatChange(parseFloat(e.target.value))}
            className="accent-emerald-500 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
            aria-label="Fréquence binaurale en Hertz"
          />
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
            <span>{currentBandInfo.range[0]} Hz</span>
            <span>Cible</span>
            <span>{currentBandInfo.range[1]} Hz</span>
          </div>
        </div>

        {/* Curseur Volume de l'onde */}
        <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-black/20 p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
              <Volume2 className="h-3.5 w-3.5" /> Intensité de l'onde
            </span>
            <span className="font-mono font-bold text-[var(--text-primary)] text-sm">
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
            className="accent-emerald-500 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
            aria-label="Volume de l'onde binaurale"
          />
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
            <span>0%</span>
            <span>Subtile</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Fréquence porteuse sacrée (Solfeggio) */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[var(--text-secondary)]">Harmonique porteuse (Solfeggio)</span>
          <span className="font-mono text-xs text-[var(--accent-primary)] font-semibold">{carrierFreq} Hz</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {SOLFEGGIO_FREQUENCIES.map((item) => {
            const isSelected = carrierFreq === item.freq;
            return (
              <button
                key={item.freq}
                type="button"
                onClick={() => onCarrierChange(item.freq)}
                className={cn(
                  "flex flex-col items-center rounded-xl p-2 text-center transition-all duration-200 border text-xs active:scale-95",
                  isSelected
                    ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300 font-bold shadow-sm"
                    : "border-white/5 bg-white/[0.02] text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                )}
              >
                <span className="font-mono font-semibold">{item.title}</span>
                <span className="text-[9px] line-clamp-1 opacity-70 mt-0.5">{item.harmonic}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});
