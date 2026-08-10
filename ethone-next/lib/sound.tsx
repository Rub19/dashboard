"use client";

import { createContext, useContext, useEffect, useRef, useCallback } from "react";
import { useSettings } from "@/components/SettingsProvider";

type SoundType = "click" | "hover" | "success" | "error" | "toggle" | "notification";

const SoundContext = createContext({
  play: (_: SoundType) => {},
  enabled: false,
});

export const useSound = () => useContext(SoundContext);

function packConfig(pack: string) {
  switch (pack) {
    case "mechanical":
      return { click: { freq: 220, type: "square" as const, duration: 0.06, sweep: -80 },
               hover: { freq: 880, type: "sine" as const, duration: 0.04, sweep: 0 },
               success: { freq: 660, type: "sine" as const, duration: 0.15, sweep: 220 },
               error: { freq: 180, type: "sawtooth" as const, duration: 0.2, sweep: -60 },
               toggle: { freq: 440, type: "triangle" as const, duration: 0.08, sweep: 110 },
               notification: { freq: 1200, type: "sine" as const, duration: 0.12, sweep: -300 } };
    case "liquid":
      return { click: { freq: 320, type: "sine" as const, duration: 0.1, sweep: 60 },
               hover: { freq: 600, type: "sine" as const, duration: 0.08, sweep: -120 },
               success: { freq: 520, type: "sine" as const, duration: 0.25, sweep: 180 },
               error: { freq: 150, type: "sine" as const, duration: 0.3, sweep: -40 },
               toggle: { freq: 360, type: "sine" as const, duration: 0.12, sweep: 90 },
               notification: { freq: 900, type: "sine" as const, duration: 0.2, sweep: 200 } };
    default: // minimal
      return { click: { freq: 400, type: "sine" as const, duration: 0.05, sweep: 0 },
               hover: { freq: 800, type: "sine" as const, duration: 0.03, sweep: 0 },
               success: { freq: 700, type: "sine" as const, duration: 0.12, sweep: 200 },
               error: { freq: 200, type: "triangle" as const, duration: 0.15, sweep: -50 },
               toggle: { freq: 500, type: "sine" as const, duration: 0.06, sweep: 100 },
               notification: { freq: 1000, type: "sine" as const, duration: 0.1, sweep: 0 } };
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

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(volume * 0.15, ctx.currentTime + 0.01);
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
