"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useSettings } from "@/components/SettingsProvider";
import type { SoundAmbient } from "@/lib/settings";

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

const MIN_INTERVALS: Partial<Record<SoundType, number>> = {
  click: 120,
  hover: 680,
  success: 180,
  error: 300,
  toggle: 150,
  notification: 180,
  warning: 300,
  brain: 900,
  pulse: 500,
  launch: 260,
  open: 120,
  close: 120,
  notice: 180,
  confirm: 180,
};

const ACTION_EVENT_MAP: Record<string, SoundType> = {
  "v8.home.open": "open",
  "v8.notes.open": "open",
  "v8.tasks.open": "open",
  "v8.calendar.open": "open",
  "v8.files.open": "open",
  "v8.activity.open": "open",
  "v8.connections.open": "open",
  "v8.spaces.open": "launch",
  "v8.flows.open": "launch",
  "v8.brain.open": "brain",
  "v8.brain.call": "brain",
  "v8.brain.thinking": "pulse",
  "v8.brain.respond": "brain",
  "v8.brain.complete": "confirm",
  "v8.brain.error": "error",
  "v8.settings.open": "open",
  "v8.command.open": "open",
  "v8.command.close": "close",
  "v8.panel.close": "close",
  "v8.notes.new": "notice",
  "v8.notes.delete": "close",
  "v8.tasks.new": "notice",
  "v8.calendar.new": "notice",
  "v8.files.new-link": "notice",
  "v8.files.new-folder": "notice",
  "v8.files.new.cancel": "close",
  "v8.sync.refresh": "pulse",
  "v8.auth.signout": "close",
  "v8.theme.toggle": "notice",
  "v8.theme.night": "notice",
  "v8.theme.graphite": "notice",
  "v8.theme.day": "notice",
  "v8.theme.auto": "notice",
  "v8.zen.toggle": "notice",
  "v8.dock.scale": "notice",
  "v8.density.toggle": "notice",
  "v8.spotlight.toggle": "notice",
  "v8.motion.ambient.toggle": "notice",
  "v8.motion.blur.toggle": "notice",
  "v8.sidebar.toggle": "hover",
};

export function soundTypeForAction(actionId: string): SoundType {
  const id = String(actionId || "");
  if (ACTION_EVENT_MAP[id]) return ACTION_EVENT_MAP[id];
  if (id.includes("error")) return "error";
  if (id.includes("warning")) return "warning";
  if (id.startsWith("v8.brain.")) return "brain";
  if (id.startsWith("v8.space.") || id.startsWith("v8.flow.")) return "launch";
  if (id.endsWith(".open")) return "open";
  if (
    id.endsWith(".close") ||
    id.endsWith(".cancel") ||
    id.endsWith(".delete") ||
    id.endsWith(".remove") ||
    id.endsWith(".signout")
  )
    return "close";
  if (id.endsWith(".new") || id.endsWith(".create") || id.endsWith(".add")) return "notice";
  if (
    id.endsWith(".toggle") ||
    id.includes(".theme.") ||
    id.includes(".dock.") ||
    id.includes(".density.") ||
    id.includes(".spotlight.") ||
    id.includes(".zen.") ||
    id.includes(".motion.") ||
    id.includes(".sound.") ||
    id.includes(".appearance.") ||
    id.includes(".automation.")
  )
    return "toggle";
  return "click";
}

type SoundContextValue = {
  play: (sound: SoundType, pack?: string) => void;
  enabled: boolean;
  playAction: (action: string) => void;
  playAmbient: (type: SoundAmbient) => void;
  stopAmbient: () => void;
  downloadWav: (type: SoundType, pack?: string) => Promise<boolean>;
  ambientSound: SoundAmbient;
};

const SoundContext = createContext<SoundContextValue>({
  play: () => {},
  enabled: false,
  playAction: () => {},
  playAmbient: () => {},
  stopAmbient: () => {},
  downloadWav: async () => false,
  ambientSound: "none",
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

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

function getNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
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

function scheduleSound(
  ctx: BaseAudioContext,
  dest: AudioNode,
  type: SoundType,
  pack: PackConfig,
  startTime: number,
  master: number,
  categoryVolume: number,
  panValue: number | null = null
): number | null {
  const recipe = pack.tones[type];
  if (!recipe || recipe.volume <= 0) return null;

  const peak = master * categoryVolume * recipe.volume;
  if (peak <= 0.0001) return null;

  const duration = Math.max(0.01, recipe.duration);
  const release = Math.max(0.01, recipe.release ?? pack.release);
  const end = startTime + duration + release;
  const base = Math.max(40, recipe.base);
  const target = Math.max(40, recipe.base + recipe.sweep);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peak, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  let mixDest: AudioNode = dest;

  if (panValue != null && typeof ctx.createStereoPanner === "function") {
    const panner = ctx.createStereoPanner();
    const pan = Math.max(-MAX_SPATIAL_PAN, Math.min(MAX_SPATIAL_PAN, panValue));
    panner.pan.setValueAtTime(pan, startTime);
    panner.connect(dest);
    mixDest = panner;
  }

  const osc = ctx.createOscillator();
  osc.type = recipe.type;
  osc.frequency.setValueAtTime(base, startTime);
  if (recipe.sweep !== 0) {
    osc.frequency.exponentialRampToValueAtTime(target, startTime + duration);
  }
  osc.connect(gain);
  gain.connect(mixDest);
  osc.start(startTime);
  osc.stop(end + 0.02);

  const harmonic = recipe.harmonic ?? pack.harmonic;
  if (harmonic > 0) {
    const hGainValue = recipe.harmonicGain ?? pack.harmonicGain;
    const hPeak = peak * hGainValue;
    if (hPeak > 0) {
      const hGain = ctx.createGain();
      hGain.gain.setValueAtTime(0.0001, startTime);
      hGain.gain.exponentialRampToValueAtTime(hPeak, startTime + 0.01);
      hGain.gain.exponentialRampToValueAtTime(0.0001, end);

      const hOsc = ctx.createOscillator();
      hOsc.type = recipe.harmonicType ?? pack.harmonicType;
      const hBase = Math.max(40, base * harmonic);
      hOsc.frequency.setValueAtTime(hBase, startTime);
      if (recipe.sweep !== 0) {
        const hTarget = Math.max(40, target * harmonic);
        hOsc.frequency.exponentialRampToValueAtTime(hTarget, startTime + duration);
      }

      hOsc.connect(hGain);
      hGain.connect(mixDest);
      hOsc.start(startTime);
      hOsc.stop(end + 0.02);
    }
  }

  const air = recipe.air ?? pack.air;
  if (air > 0) {
    const nPeak = peak * air * 0.3;
    if (nPeak > 0) {
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.0001, startTime);
      nGain.gain.exponentialRampToValueAtTime(nPeak, startTime + 0.01);
      nGain.gain.exponentialRampToValueAtTime(0.0001, end);

      const noise = ctx.createBufferSource();
      noise.buffer = getNoiseBuffer(ctx);
      noise.connect(nGain);
      nGain.connect(mixDest);
      noise.start(startTime);
      noise.stop(end + 0.02);
    }
  }

  return end;
}

function computePan(clientX: number, width: number): number {
  if (!width) return (Math.random() - 0.5) * 2 * MAX_SPATIAL_PAN;
  const x = (clientX / width) * 2 - 1;
  return Math.max(-MAX_SPATIAL_PAN, Math.min(MAX_SPATIAL_PAN, x * MAX_SPATIAL_PAN));
}

function encodeWav(samples: Float32Array, sampleRate: number, channels = 1): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(pos + i, str.charCodeAt(i));
    }
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function downloadBuffer(buffer: ArrayBuffer, filename: string, type: string) {
  if (typeof document === "undefined" || typeof URL === "undefined") return;
  const blob = new Blob([buffer], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadWav(type: SoundType, packId = "ethone"): Promise<boolean> {
  try {
    const pack = packConfig(packId);
    const recipe = pack.tones[type];
    if (!recipe || recipe.volume <= 0) return false;

    if (typeof window === "undefined") return false;
    const Offline =
      window.OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    if (!Offline) return false;

    const sampleRate = 44100;
    const ctx = new Offline(1, sampleRate, sampleRate);
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    scheduleSound(ctx, gain, type, pack, 0, 1, 1, undefined);

    const buffer = await ctx.startRendering();
    const samples = buffer.getChannelData(0);
    const wav = encodeWav(samples, sampleRate, 1);
    downloadBuffer(wav, `ethone-sound-${packId}-${type}.wav`, "audio/wav");
    return true;
  } catch {
    return false;
  }
}

type AmbientState = {
  type: SoundAmbient;
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  filter: BiquadFilterNode | null;
  nodes: AudioScheduledSourceNode[];
};

function createAmbientBuffer(ctx: BaseAudioContext, type: SoundAmbient): AudioBuffer {
  const duration = type === "rain" ? 16 : 4;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === "white") {
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.12;
    }
  } else if (type === "pink") {
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  } else if (type === "brown") {
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.08 * white) / 1.08;
      data[i] = last * 0.6;
    }
  } else if (type === "rain") {
    renderRainLayer(data, ctx.sampleRate);
  } else if (type === "fireplace") {
    renderFireplace(data, ctx.sampleRate);
  } else if (type === "ocean") {
    renderOcean(data, ctx.sampleRate);
  } else if (type === "wind") {
    renderWind(data, ctx.sampleRate);
  } else if (["forest", "cafe", "night"].includes(type)) {
    renderColorScene(data, ctx.sampleRate, type as "forest" | "cafe" | "night");
  } else {
    for (let i = 0; i < length; i++) data[i] = 0;
  }

  return buffer;
}

/** Multi-layer procedural rain: continuous shower, mid-body pink noise and close droplets. */
function renderRainLayer(data: Float32Array, sampleRate: number): void {
  const length = data.length;
  const dropDecay = Math.exp(-1 / (sampleRate * 0.06));

  const drops: { start: number; amp: number }[] = [];
  let t = Math.floor(sampleRate * 0.3);
  while (t < length) {
    t += Math.floor(sampleRate * (0.05 + Math.random() * 0.32));
    if (t >= length) break;
    drops.push({ start: t, amp: 0.25 + Math.random() * 0.55 });
  }
  drops.sort((a, b) => a.start - b.start);

  let brown = 0;
  let p0 = 0,
    p1 = 0,
    p2 = 0,
    p3 = 0,
    p4 = 0,
    p5 = 0,
    p6 = 0;
  let nextDrop = 0;
  let dropEnv = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;

    brown = (brown + 0.03 * white) / 1.03;

    p0 = 0.99886 * p0 + white * 0.0555179;
    p1 = 0.99332 * p1 + white * 0.0750759;
    p2 = 0.969 * p2 + white * 0.153852;
    p3 = 0.8665 * p3 + white * 0.3104856;
    p4 = 0.55 * p4 + white * 0.5329522;
    p5 = -0.7616 * p5 - white * 0.016898;
    const pink = (p0 + p1 + p2 + p3 + p4 + p5 + p6 + white * 0.5362) * 0.08;
    p6 = white * 0.115926;

    while (nextDrop < drops.length && i >= drops[nextDrop].start) {
      dropEnv += drops[nextDrop].amp;
      nextDrop++;
    }
    dropEnv *= dropDecay;
    const droplet = dropEnv * white;

    const time = i / sampleRate;
    const modulation = 0.8 + 0.13 * Math.sin(time * 0.22) + 0.07 * Math.sin(time * 0.05) + Math.random() * 0.05;

    data[i] = Math.max(-1, Math.min(1, (brown * 0.42 + pink * 0.32 + droplet * 0.85) * modulation * 0.55));
  }
}

function renderBrownNoise(data: Float32Array, scale = 0.6): number {
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.08 * white) / 1.08;
    data[i] = last * scale;
  }
  return 0;
}

function renderPinkNoise(data: Float32Array, scale = 0.1): void {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const out = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * scale;
    b6 = white * 0.115926;
    data[i] = out;
  }
}

function renderFireplace(data: Float32Array, sampleRate: number): void {
  renderBrownNoise(data, 0.45);
  const length = data.length;
  const crackles: { start: number; amp: number; decay: number }[] = [];
  let t = Math.floor(sampleRate * 0.2);
  while (t < length) {
    t += Math.floor(sampleRate * (0.15 + Math.random() * 1.1));
    if (t >= length) break;
    crackles.push({ start: t, amp: 0.3 + Math.random() * 0.5, decay: Math.exp(-1 / (sampleRate * 0.018)) });
  }
  crackles.sort((a, b) => a.start - b.start);
  let next = 0;
  let env = 0;
  for (let i = 0; i < length; i++) {
    while (next < crackles.length && i >= crackles[next].start) {
      env += crackles[next].amp;
      next++;
    }
    env *= crackles[next - 1]?.decay ?? 0.95;
    const snap = (Math.random() * 2 - 1) * env * 0.9;
    data[i] = Math.max(-1, Math.min(1, data[i] * (1 + env * 0.4) + snap));
  }
}

function renderOcean(data: Float32Array, sampleRate: number): void {
  renderPinkNoise(data, 0.08);
  const length = data.length;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const wave = 0.5 + 0.5 * Math.sin(t * 0.08) * (0.7 + 0.3 * Math.sin(t * 0.03));
    data[i] *= wave;
  }
}

function renderWind(data: Float32Array, sampleRate: number): void {
  renderPinkNoise(data, 0.1);
  const length = data.length;
  let gust = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const target = 0.6 + 0.4 * Math.sin(t * 0.2) + 0.2 * Math.sin(t * 1.1) + (Math.random() - 0.5) * 0.15;
    gust += (target - gust) * 0.0015;
    data[i] *= Math.max(0.3, gust);
  }
}

function renderColorScene(data: Float32Array, sampleRate: number, type: "forest" | "cafe" | "night"): void {
  renderBrownNoise(data, type === "night" ? 0.35 : 0.5);
  const length = data.length;
  const interval = type === "night" ? 1.8 : type === "cafe" ? 0.9 : 1.4;
  const events: { start: number; amp: number; freq: number; decay: number }[] = [];
  let t = Math.floor(sampleRate * 0.5);
  while (t < length) {
    t += Math.floor(sampleRate * (interval * 0.5 + Math.random() * interval));
    if (t >= length) break;
    events.push({
      start: t,
      amp: 0.15 + Math.random() * 0.25,
      freq: type === "night" ? 4500 + Math.random() * 2500 : 2000 + Math.random() * 6000,
      decay: Math.exp(-1 / (sampleRate * (type === "night" ? 0.04 : 0.025))),
    });
  }
  events.sort((a, b) => a.start - b.start);
  let phase = 0;
  let next = 0;
  let env = 0;
  let active: { freq: number; decay: number } | null = null;
  for (let i = 0; i < length; i++) {
    while (next < events.length && i >= events[next].start) {
      active = { freq: events[next].freq, decay: events[next].decay };
      env += events[next].amp;
      next++;
    }
    if (active) {
      phase += (active.freq / sampleRate) * Math.PI * 2;
      env *= active.decay;
      if (env < 0.001) active = null;
    }
    const burst = Math.sin(phase) * env * 0.7;
    data[i] = Math.max(-1, Math.min(1, data[i] + burst));
  }
}

function isMediaActive(): boolean {
  if (typeof navigator !== "undefined" && navigator.mediaSession?.playbackState === "playing") return true;
  if (typeof document === "undefined") return false;
  const elements = document.querySelectorAll("audio, video");
  for (let i = 0; i < elements.length; i++) {
    const media = elements[i] as HTMLMediaElement;
    if (!media.paused && !media.ended && !media.muted && (media.volume ?? 1) > 0) return true;
  }
  return false;
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const { settings, update } = useSettings();
  const audioRef = useRef<AudioContext | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const ambientRef = useRef<AmbientState | null>(null);
  const lastPanRef = useRef<number | null>(null);
  const lastPlayedAtRef = useRef<Map<SoundType, number>>(new Map());
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const ensureContext = useCallback((): AudioContext | null => {
    if (audioRef.current) return audioRef.current;
    const AC =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      audioRef.current = new AC({ latencyHint: "interactive" });
    } catch {
      audioRef.current = new AC();
    }
    const ctx = audioRef.current;
    const output = ctx.createGain();
    output.gain.value = 1;
    output.connect(ctx.destination);
    outputGainRef.current = output;
    return ctx;
  }, []);

  const stopAmbience = useCallback(() => {
    const ambient = ambientRef.current;
    if (!ambient) return;
    const ctx = audioRef.current;
    if (ambient.gain && ctx) {
      ambient.gain.gain.setValueAtTime(ambient.gain.gain.value, ctx.currentTime);
      ambient.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    }
    const { nodes, filter, gain } = ambient;
    setTimeout(() => {
      nodes.forEach((node) => {
        try {
          node.stop?.();
          node.disconnect();
        } catch {}
      });
      try {
        filter?.disconnect();
      } catch {}
      try {
        gain.disconnect();
      } catch {}
    }, 450);
    ambientRef.current = null;
  }, []);

  const startAmbience = useCallback(
    (type: SoundAmbient) => {
      const ctx = audioRef.current;
      const output = outputGainRef.current;
      if (!ctx || !output || type === "none") return;

      const master = settingsRef.current.masterVolume ? (settingsRef.current.soundVolume ?? 50) / 100 : 0;
      if (master <= 0) {
        stopAmbience();
        return;
      }

      const target = (type === "drone" ? 0.08 : 0.06) * master;

      if (ambientRef.current?.type === type) {
        const now = ctx.currentTime;
        ambientRef.current.gain.gain.cancelScheduledValues(now);
        ambientRef.current.gain.gain.setValueAtTime(ambientRef.current.gain.gain.value, now);
        ambientRef.current.gain.gain.linearRampToValueAtTime(target, now + 0.1);
        return;
      }

      stopAmbience();

      const now = ctx.currentTime;
      const ambientGain = ctx.createGain();
      ambientGain.gain.setValueAtTime(0.0001, now);
      ambientGain.gain.linearRampToValueAtTime(target, now + 1.2);
      ambientGain.connect(output);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      const filterFreq: Record<SoundAmbient, number> = {
        none: 1800,
        rain: 850,
        drone: 420,
        brown: 500,
        white: 2400,
        pink: 1800,
        fireplace: 700,
        ocean: 650,
        wind: 1400,
        forest: 2200,
        cafe: 2400,
        night: 1600,
      };
      filter.frequency.value = filterFreq[type] ?? 1800;
      filter.Q.value = 0.7;

      const state: AmbientState = { type, source: null, gain: ambientGain, filter, nodes: [] };

      if (type === "drone") {
        const droneMix = ctx.createGain();
        droneMix.gain.value = 0.8;

        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.2;

        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.2;
        lfo.connect(lfoGain);
        lfoGain.connect(droneMix.gain);

        const freqs = [110, 165, 220];
        const amps = [0.3, 0.2, 0.15];
        for (let i = 0; i < freqs.length; i++) {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = freqs[i];
          const amp = ctx.createGain();
          amp.gain.value = amps[i];
          osc.connect(amp);
          amp.connect(droneMix);
          osc.start(now);
          state.nodes.push(osc);
        }

        lfo.start(now);
        state.nodes.push(lfo);

        droneMix.connect(filter);
      } else {
        const buffer = createAmbientBuffer(ctx, type);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(filter);
        source.start(now);
        state.source = source;
        state.nodes.push(source);
      }

      filter.connect(ambientGain);
      ambientRef.current = state;
    },
    [stopAmbience]
  );

  useEffect(() => {
    if (settings.ambientSound === "none") {
      stopAmbience();
    } else {
      ensureContext();
      startAmbience(settings.ambientSound);
    }
  }, [settings.ambientSound, startAmbience, stopAmbience, ensureContext]);

  useEffect(() => {
    const interval = setInterval(() => {
      const ctx = audioRef.current;
      const output = outputGainRef.current;
      if (!ctx || !output) return;
      const active = settings.mediaDucking && isMediaActive();
      const target = active ? 0.55 : 1;
      const now = ctx.currentTime;
      output.gain.setValueAtTime(output.gain.value, now);
      output.gain.linearRampToValueAtTime(target, now + 0.1);
    }, 2000);
    return () => clearInterval(interval);
  }, [settings.mediaDucking]);

  useEffect(() => {
    if (settings.ambientSound === "none") return;
    ensureContext();
    startAmbience(settings.ambientSound);
  }, [settings.masterVolume, settings.soundVolume, startAmbience, settings.ambientSound, ensureContext]);

  const play = useCallback(
    (type: SoundType, packOverride?: string) => {
      try {
        if (!settings.masterVolume || !settings.soundEffects) return;

        const packId = packOverride ?? settings.soundPack;
        if (packId === "none" || packId === "silent") return;

        const ctx = ensureContext();
        if (!ctx) return;

        if (ctx.state === "suspended") {
          void ctx.resume();
        }

        const output = outputGainRef.current;
        if (!output) return;

        const now = performance.now();
        const min = MIN_INTERVALS[type] ?? 90;
        const last = lastPlayedAtRef.current.get(type) ?? -Infinity;
        if (now - last < min) return;
        lastPlayedAtRef.current.set(type, now);

        const pack = packConfig(packId);
        const recipe = pack.tones[type];
        if (!recipe || recipe.volume <= 0) return;

        const category = SOUND_CATEGORIES[type];
        const categoryVolume = (settings.soundVolumes[category] ?? 100) / 100;
        const master = (settings.soundVolume ?? 50) / 100;

        const pan = settings.soundSpatial
          ? lastPanRef.current ?? (Math.random() - 0.5) * 2 * MAX_SPATIAL_PAN
          : null;

        scheduleSound(ctx, output, type, pack, ctx.currentTime, master, categoryVolume, pan);
      } catch {
        // Ignorer silencieusement une erreur audio isolée.
      }
    },
    [settings, ensureContext]
  );

  const playAction = useCallback(
    (action: string) => {
      if (!action || !settings.masterVolume || !settings.soundEffects) return;
      const type = soundTypeForAction(action);
      if (type) play(type);
    },
    [play, settings]
  );

  const playAmbient = useCallback(
    (type: SoundAmbient) => {
      try {
        if (type === "none") {
          stopAmbience();
          update({ ambientSound: "none" });
          return;
        }
        const ctx = ensureContext();
        if (!ctx) return;
        if (ctx.state === "suspended") {
          void ctx.resume();
        }
        if (!settingsRef.current.masterVolume) {
          settingsRef.current = { ...settingsRef.current, masterVolume: true };
          update({ masterVolume: true, ambientSound: type });
        } else {
          update({ ambientSound: type });
        }
        startAmbience(type);
      } catch {
        // Ignorer silencieusement une erreur audio isolée.
      }
    },
    [ensureContext, startAmbience, stopAmbience, update]
  );

  const stopAmbient = useCallback(() => {
    stopAmbience();
    update({ ambientSound: "none" });
  }, [stopAmbience, update]);

  useEffect(() => {
    const soundsOn =
      settings.soundPack !== "none" &&
      settings.soundPack !== "silent" &&
      settings.soundEffects &&
      settings.masterVolume;
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
    if (settings.soundSpatial) {
      document.addEventListener("mousemove", onMouseMove, { passive: true });
    }

    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("mouseover", onMouseOver);
      if (settings.soundSpatial) {
        document.removeEventListener("mousemove", onMouseMove);
      }
    };
  }, [settings.soundEffects, settings.soundPack, settings.soundSpatial, settings.masterVolume, play]);

  const enabled =
    settings.soundPack !== "none" &&
    settings.soundPack !== "silent" &&
    settings.soundEffects &&
    settings.masterVolume;

  const value = useMemo(
    () => ({
      play,
      enabled,
      playAction,
      playAmbient,
      stopAmbient,
      downloadWav,
      ambientSound: settings.ambientSound,
    }),
    [play, enabled, playAction, playAmbient, stopAmbient, settings.ambientSound]
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}
