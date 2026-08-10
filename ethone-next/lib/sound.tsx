"use client";

import { createContext, useContext, useEffect, useRef, useCallback } from "react";
import { useSettings } from "@/components/SettingsProvider";

type SoundType = "click" | "hover" | "success" | "error" | "toggle" | "notification";

type SoundContextValue = {
  play: (sound: SoundType) => void;
  enabled: boolean;
};

const SoundContext = createContext<SoundContextValue>({
  play: () => {},
  enabled: false,
});

export const useSound = () => useContext(SoundContext);

type SoundConfig = { freq: number; type: OscillatorType; duration: number; sweep: number; volume?: number };

function packConfig(pack: string): Record<SoundType, SoundConfig> {
  switch (pack) {
    case "mechanical":
      return {
        click: { freq: 180, type: "square", duration: 0.03, sweep: -40, volume: 0.12 },
        hover: { freq: 1200, type: "sine", duration: 0.02, sweep: 0, volume: 0.06 },
        success: { freq: 720, type: "square", duration: 0.1, sweep: 240, volume: 0.1 },
        error: { freq: 140, type: "sawtooth", duration: 0.18, sweep: -70, volume: 0.14 },
        toggle: { freq: 380, type: "square", duration: 0.05, sweep: 80, volume: 0.1 },
        notification: { freq: 1400, type: "sine", duration: 0.08, sweep: -400, volume: 0.08 },
      };
    case "liquid":
      return {
        click: { freq: 420, type: "sine", duration: 0.12, sweep: -80, volume: 0.12 },
        hover: { freq: 760, type: "sine", duration: 0.07, sweep: 160, volume: 0.05 },
        success: { freq: 560, type: "sine", duration: 0.28, sweep: 220, volume: 0.12 },
        error: { freq: 180, type: "sine", duration: 0.35, sweep: -50, volume: 0.12 },
        toggle: { freq: 340, type: "sine", duration: 0.14, sweep: 120, volume: 0.1 },
        notification: { freq: 880, type: "sine", duration: 0.22, sweep: 180, volume: 0.1 },
      };
    default: // minimal
      return {
        click: { freq: 480, type: "sine", duration: 0.04, sweep: 0, volume: 0.1 },
        hover: { freq: 880, type: "sine", duration: 0.025, sweep: 0, volume: 0.04 },
        success: { freq: 640, type: "sine", duration: 0.14, sweep: 260, volume: 0.12 },
        error: { freq: 220, type: "triangle", duration: 0.18, sweep: -60, volume: 0.12 },
        toggle: { freq: 540, type: "sine", duration: 0.05, sweep: 120, volume: 0.1 },
        notification: { freq: 1040, type: "sine", duration: 0.12, sweep: 0, volume: 0.09 },
      };
  }
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const audioRef = useRef<AudioContext | null>(null);

  const play = useCallback((type: SoundType) => {
    if (settings.soundPack === "none" || !settings.soundEffects) return;
    const volume = settings.soundVolume / 100;

    try {
      if (!audioRef.current) {
        audioRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const cfg = packConfig(settings.soundPack)[type];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = cfg.type;
      osc.frequency.setValueAtTime(cfg.freq, ctx.currentTime);
      if (cfg.sweep !== 0) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(60, cfg.freq + cfg.sweep), ctx.currentTime + cfg.duration);
      }

      const peak = volume * (cfg.volume ?? 0.15);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cfg.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + cfg.duration + 0.02);
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("button, a, [role='button']")) play("click");
    }

    function onMouseOver(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("button, a, [role='button']")) play("hover");
    }

    if (settings.soundPack !== "none" && settings.soundEffects) {
      document.addEventListener("click", onClick, { passive: true });
      document.addEventListener("mouseover", onMouseOver, { passive: true });
      return () => {
        document.removeEventListener("click", onClick);
        document.removeEventListener("mouseover", onMouseOver);
      };
    }
  }, [settings.soundEffects, settings.soundPack, play]);

  return (
    <SoundContext.Provider value={{ play, enabled: settings.soundPack !== "none" && settings.soundEffects }}>
      {children}
    </SoundContext.Provider>
  );
}
