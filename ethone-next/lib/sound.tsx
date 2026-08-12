"use client";

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { useSettings } from "@/components/SettingsProvider";

export type SoundType =
  | "click"
  | "hover"
  | "success"
  | "error"
  | "toggle"
  | "notification"
  | "warning"
  | "brain"
  | "pulse"
  | "launch"
  | "open"
  | "close"
  | "notice"
  | "confirm";

const SOUND_TYPES: SoundType[] = [
  "click",
  "hover",
  "success",
  "error",
  "toggle",
  "notification",
  "warning",
  "brain",
  "pulse",
  "launch",
  "open",
  "close",
  "notice",
  "confirm",
];

const SOUND_CATEGORIES: Record<SoundType, "interface" | "notifications" | "brain" | "system"> = {
  click: "interface",
  hover: "interface",
  toggle: "interface",
  open: "interface",
  close: "interface",
  confirm: "notifications",
  success: "notifications",
  error: "notifications",
  notification: "notifications",
  warning: "notifications",
  notice: "notifications",
  brain: "brain",
  pulse: "system",
  launch: "system",
};

type SoundContextValue = {
  play: (sound: SoundType) => void;
  enabled: boolean;
};

const SoundContext = createContext<SoundContextValue>({
  play: () => {},
  enabled: false,
});

export const useSound = () => useContext(SoundContext);

const MAX_SPATIAL_PAN = 0.07;

type BaseTone = {
  base: number;
  type: OscillatorType;
  duration: number;
  sweep: number;
  volume: number;
};

type ToneRecipe = BaseTone & {
  harmonic?: number;
  harmonicGain?: number;
  harmonicType?: OscillatorType;
  air?: number;
  release?: number;
};

type PackConfig = {
  pitch: number;
  harmonic: number;
  harmonicGain: number;
  harmonicType: OscillatorType;
  air: number;
  release: number;
  tones: Record<SoundType, ToneRecipe>;
};

type PackProfile = {
  pitch: number;
  harmonic: number;
  harmonicGain: number;
  harmonicType: OscillatorType;
  air: number;
  release: number;
  volumeScale: number;
  durationScale: number;
  sweepScale: number;
  defaultType: OscillatorType;
  types?: Partial<Record<SoundType, OscillatorType>>;
};

const BASE_TONES: Record<SoundType, BaseTone> = {
  click: { base: 540, type: "sine", duration: 0.05, sweep: 90, volume: 0.12 },
  hover: { base: 1200, type: "sine", duration: 0.025, sweep: 0, volume: 0.045 },
  success: { base: 720, type: "sine", duration: 0.16, sweep: 280, volume: 0.13 },
  error: { base: 160, type: "sawtooth", duration: 0.22, sweep: -80, volume: 0.14 },
  toggle: { base: 420, type: "sine", duration: 0.06, sweep: 120, volume: 0.11 },
  notification: { base: 1000, type: "sine", duration: 0.13, sweep: -320, volume: 0.1 },
  warning: { base: 340, type: "triangle", duration: 0.2, sweep: 80, volume: 0.12 },
  brain: { base: 260, type: "sine", duration: 0.3, sweep: 100, volume: 0.1 },
  pulse: { base: 130, type: "square", duration: 0.1, sweep: 50, volume: 0.1 },
  launch: { base: 240, type: "sine", duration: 0.34, sweep: 360, volume: 0.13 },
  open: { base: 380, type: "sine", duration: 0.08, sweep: 100, volume: 0.09 },
  close: { base: 320, type: "sine", duration: 0.07, sweep: -70, volume: 0.09 },
  notice: { base: 920, type: "sine", duration: 0.14, sweep: -240, volume: 0.1 },
  confirm: { base: 600, type: "sine", duration: 0.11, sweep: 160, volume: 0.1 },
};

const PACK_PROFILES: Record<string, PackProfile> = {
  ethone: {
    pitch: 1,
    harmonic: 1.5,
    harmonicGain: 0.12,
    harmonicType: "triangle",
    air: 0.05,
    release: 0.04,
    volumeScale: 1,
    durationScale: 1,
    sweepScale: 1,
    defaultType: "sine",
    types: {
      click: "triangle",
      toggle: "square",
      launch: "sawtooth",
      pulse: "square",
      warning: "triangle",
    },
  },
  minimal: {
    pitch: 1,
    harmonic: 0,
    harmonicGain: 0,
    harmonicType: "sine",
    air: 0,
    release: 0.01,
    volumeScale: 0.85,
    durationScale: 0.7,
    sweepScale: 0.5,
    defaultType: "sine",
  },
  classic: {
    pitch: 1,
    harmonic: 2,
    harmonicGain: 0.1,
    harmonicType: "square",
    air: 0,
    release: 0.02,
    volumeScale: 1,
    durationScale: 1,
    sweepScale: 1,
    defaultType: "square",
    types: {
      hover: "sine",
      notification: "sine",
      brain: "triangle",
      launch: "sawtooth",
    },
  },
  "apple-inspired": {
    pitch: 1,
    harmonic: 1.5,
    harmonicGain: 0.08,
    harmonicType: "sine",
    air: 0.1,
    release: 0.05,
    volumeScale: 0.75,
    durationScale: 0.9,
    sweepScale: 0.8,
    defaultType: "sine",
    types: {
      success: "triangle",
      warning: "triangle",
    },
  },
  "cyber-pulse": {
    pitch: 0.9,
    harmonic: 2.5,
    harmonicGain: 0.18,
    harmonicType: "square",
    air: 0.25,
    release: 0.08,
    volumeScale: 1.05,
    durationScale: 1.15,
    sweepScale: 1.3,
    defaultType: "sawtooth",
    types: {
      click: "square",
      hover: "sine",
      brain: "sine",
      launch: "sawtooth",
    },
  },
  silent: {
    pitch: 1,
    harmonic: 0,
    harmonicGain: 0,
    harmonicType: "sine",
    air: 0,
    release: 0.01,
    volumeScale: 0,
    durationScale: 0.01,
    sweepScale: 1,
    defaultType: "sine",
  },
};

function buildPack(profile: PackProfile): PackConfig {
  const tones = SOUND_TYPES.reduce<Record<SoundType, ToneRecipe>>((acc, type) => {
    const base = BASE_TONES[type];
    const typeOverride = profile.types?.[type] ?? profile.defaultType;
    acc[type] = {
      base: base.base * profile.pitch,
      type: typeOverride,
      duration: Math.max(0.01, base.duration * profile.durationScale),
      sweep: base.sweep * profile.sweepScale,
      volume: base.volume * profile.volumeScale,
      harmonic: profile.harmonic > 0 ? profile.harmonic : undefined,
      harmonicGain: profile.harmonic > 0 ? profile.harmonicGain : undefined,
      harmonicType: profile.harmonic > 0 ? profile.harmonicType : undefined,
      air: profile.air,
      release: profile.release,
    };
    return acc;
  }, {} as Record<SoundType, ToneRecipe>);

  return {
    pitch: profile.pitch,
    harmonic: profile.harmonic,
    harmonicGain: profile.harmonicGain,
    harmonicType: profile.harmonicType,
    air: profile.air,
    release: profile.release,
    tones,
  };
}

const PACKS: Record<string, PackConfig> = {
  ethone: buildPack(PACK_PROFILES.ethone),
  minimal: buildPack(PACK_PROFILES.minimal),
  classic: buildPack(PACK_PROFILES.classic),
  "apple-inspired": buildPack(PACK_PROFILES["apple-inspired"]),
  "cyber-pulse": buildPack(PACK_PROFILES["cyber-pulse"]),
  silent: buildPack(PACK_PROFILES.silent),
  // Legacy aliases kept for safety before settings migration runs.
  mechanical: buildPack(PACK_PROFILES.classic),
  liquid: buildPack(PACK_PROFILES["apple-inspired"]),
  none: buildPack(PACK_PROFILES.silent),
};

function packConfig(pack: string): PackConfig {
  return PACKS[pack] ?? PACKS.ethone;
}

const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>();

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * 0.5));
    buffer = ctx.createBuffer(1, length, sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      channel[i] = Math.random() * 2 - 1;
    }
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

function computePan(clientX: number, width: number): number {
  if (!width) return (Math.random() - 0.5) * 2 * MAX_SPATIAL_PAN;
  const x = (clientX / width) * 2 - 1;
  return Math.max(-MAX_SPATIAL_PAN, Math.min(MAX_SPATIAL_PAN, x * MAX_SPATIAL_PAN));
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const audioRef = useRef<AudioContext | null>(null);
  const lastPanRef = useRef<number | null>(null);
  const panningActive = settings.soundSpatial;

  const play = useCallback(
    (type: SoundType) => {
      if (!settings.soundEffects || !settings.masterVolume) return;
      if (settings.soundPack === "none" || settings.soundPack === "silent") return;

      try {
        if (!audioRef.current) {
          const AC =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!AC) return;
          audioRef.current = new AC();
        }

        const ctx = audioRef.current;
        if (ctx.state === "suspended") {
          void ctx.resume();
        }

        const pack = packConfig(settings.soundPack);
        const recipe = pack.tones[type];
        if (!recipe || recipe.volume <= 0) return;

        const category = SOUND_CATEGORIES[type];
        const categoryVolume = (settings.soundVolumes[category] ?? 100) / 100;
        const master = (settings.soundVolume ?? 50) / 100;
        const peak = master * categoryVolume * recipe.volume;
        if (peak <= 0) return;

        const t0 = ctx.currentTime;
        const duration = Math.max(0.01, recipe.duration);
        const release = Math.max(0.01, recipe.release ?? pack.release);
        const end = t0 + duration + release;

        const base = Math.max(40, recipe.base);
        const target = Math.max(40, recipe.base + recipe.sweep);

        // Main oscillator + gain envelope.
        const osc = ctx.createOscillator();
        osc.type = recipe.type;
        osc.frequency.setValueAtTime(base, t0);
        if (recipe.sweep !== 0) {
          osc.frequency.exponentialRampToValueAtTime(target, t0 + duration);
        }

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, end);

        // Optional stereo panning based on last cursor position.
        let dest: AudioNode = ctx.destination;
        if (panningActive) {
          const panner = ctx.createStereoPanner();
          const pan =
            lastPanRef.current ?? (Math.random() - 0.5) * 2 * MAX_SPATIAL_PAN;
          panner.pan.setValueAtTime(
            Math.max(-MAX_SPATIAL_PAN, Math.min(MAX_SPATIAL_PAN, pan)),
            t0
          );
          gain.connect(panner);
          panner.connect(ctx.destination);
          dest = panner;
        }

        osc.connect(gain);
        gain.connect(dest);

        osc.start(t0);
        osc.stop(end + 0.02);

        // Harmonic layer.
        const harmonic = recipe.harmonic ?? pack.harmonic;
        if (harmonic > 0) {
          const hGain = ctx.createGain();
          const hGainValue = recipe.harmonicGain ?? pack.harmonicGain;
          const hPeak = peak * hGainValue;
          if (hPeak > 0) {
            hGain.gain.setValueAtTime(0.001, t0);
            hGain.gain.exponentialRampToValueAtTime(hPeak, t0 + 0.01);
            hGain.gain.exponentialRampToValueAtTime(0.001, end);

            const hOsc = ctx.createOscillator();
            hOsc.type = recipe.harmonicType ?? pack.harmonicType;
            const hBase = Math.max(40, base * harmonic);
            hOsc.frequency.setValueAtTime(hBase, t0);
            if (recipe.sweep !== 0) {
              const hTarget = Math.max(40, target * harmonic);
              hOsc.frequency.exponentialRampToValueAtTime(hTarget, t0 + duration);
            }

            hOsc.connect(hGain);
            hGain.connect(dest);
            hOsc.start(t0);
            hOsc.stop(end + 0.02);
          }
        }

        // Air / noise layer.
        const air = recipe.air ?? pack.air;
        if (air > 0) {
          const nGain = ctx.createGain();
          const nPeak = peak * air * 0.3;
          if (nPeak > 0) {
            nGain.gain.setValueAtTime(0.001, t0);
            nGain.gain.exponentialRampToValueAtTime(nPeak, t0 + 0.01);
            nGain.gain.exponentialRampToValueAtTime(0.001, end);

            const noise = ctx.createBufferSource();
            noise.buffer = getNoiseBuffer(ctx);
            noise.connect(nGain);
            nGain.connect(dest);
            noise.start(t0);
            noise.stop(end + 0.02);
          }
        }
      } catch {
        // Audio is optional: ignore any Web Audio API errors.
      }
    },
    [settings, panningActive]
  );

  useEffect(() => {
    const soundsOn =
      settings.soundPack !== "none" &&
      settings.soundPack !== "silent" &&
      settings.soundEffects;
    if (!soundsOn) return;

    function onClick(event: MouseEvent) {
      if (typeof window !== "undefined" && window.innerWidth) {
        lastPanRef.current = computePan(event.clientX, window.innerWidth);
      }
      const target = event.target as HTMLElement;
      if (target.closest("button, a, [role='button']")) play("click");
    }

    function onMouseOver(event: MouseEvent) {
      if (typeof window !== "undefined" && window.innerWidth) {
        lastPanRef.current = computePan(event.clientX, window.innerWidth);
      }
      const target = event.target as HTMLElement;
      if (target.closest("button, a, [role='button']")) play("hover");
    }

    function onMouseMove(event: MouseEvent) {
      if (typeof window === "undefined" || !window.innerWidth) return;
      lastPanRef.current = computePan(event.clientX, window.innerWidth);
    }

    document.addEventListener("click", onClick, { passive: true });
    document.addEventListener("mouseover", onMouseOver, { passive: true });
    if (panningActive) {
      document.addEventListener("mousemove", onMouseMove, { passive: true });
    }

    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("mouseover", onMouseOver);
      if (panningActive) {
        document.removeEventListener("mousemove", onMouseMove);
      }
    };
  }, [settings.soundEffects, settings.soundPack, panningActive, play]);

  const enabled =
    settings.soundPack !== "none" &&
    settings.soundPack !== "silent" &&
    settings.soundEffects &&
    settings.masterVolume;

  return (
    <SoundContext.Provider value={{ play, enabled }}>
      {children}
    </SoundContext.Provider>
  );
}
