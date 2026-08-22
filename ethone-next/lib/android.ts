"use client";

import { registerPlugin } from "@capacitor/core";
import { Capacitor } from "@capacitor/core";

export type MaterialPalette = {
  supported: boolean;
  primary: string;
  primaryContainer: string;
  secondary: string;
  tertiary: string;
  surface: string;
  surfaceVariant: string;
  onSurface: string;
  background: string;
};

const EthoneTheme = registerPlugin<{
  getMaterialColors(): Promise<MaterialPalette>;
  applyDynamicColors(): Promise<void>;
}>("EthoneTheme");

const EthoneHaptics = registerPlugin<{
  waveform(options: { timings: number[]; amplitudes: number[] }): Promise<void>;
  predefined(options: { effect: string }): Promise<void>;
}>("EthoneHaptics");

export function isNativeAndroid() {
  return Capacitor.getPlatform() === "android";
}

export async function getMaterialColors(): Promise<MaterialPalette | null> {
  if (!isNativeAndroid()) return null;
  try {
    const colors = await EthoneTheme.getMaterialColors();
    return colors;
  } catch {
    return null;
  }
}

export async function applyAndroidDynamicColors() {
  if (!isNativeAndroid()) return;
  try {
    await EthoneTheme.applyDynamicColors();
  } catch {
    // ignore
  }
}

export async function androidWaveform(timings: number[], amplitudes: number[]) {
  if (!isNativeAndroid()) return;
  try {
    await EthoneHaptics.waveform({ timings, amplitudes });
  } catch {
    // ignore
  }
}

export async function androidPredefinedHaptic(effect: "tick" | "click" | "heavy" | "double") {
  if (!isNativeAndroid()) return;
  try {
    await EthoneHaptics.predefined({ effect });
  } catch {
    // ignore
  }
}
