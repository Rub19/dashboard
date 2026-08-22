"use client";

import { registerPlugin } from "@capacitor/core";
import { Capacitor } from "@capacitor/core";

export type MaterialPalette = {
  supported: boolean;
  isDynamic: boolean;
  [key: string]: string | boolean;
};

const EthoneTheme = registerPlugin<{
  getMaterialColors(): Promise<MaterialPalette>;
  applyDynamicColors(): Promise<void>;
}>("EthoneTheme");

const EthoneHaptics = registerPlugin<{
  waveform(options: { timings: number[]; amplitudes: number[] }): Promise<void>;
  predefined(options: { effect: string }): Promise<void>;
}>("EthoneHaptics");

const EthoneSecurity = registerPlugin<{
  setSecureFlag(options: { secure: boolean }): Promise<void>;
  clearClipboard(): Promise<void>;
  isScreenRecording(): Promise<{ recording: boolean }>;
}>("EthoneSecurity");

const EthonePhotoPicker = registerPlugin<{
  pickPhoto(): Promise<{ uris: string[] }>;
  pickMultiplePhotos(options?: { limit?: number }): Promise<{ uris: string[] }>;
}>("EthonePhotoPicker");

const EthoneWindow = registerPlugin<{
  getWindowLayout(): Promise<{ deviceType: string; widthDp: number; heightDp: number; sizeClassWidth: string; sizeClassHeight: string }>;
  addListener(event: "windowLayoutChanged", listener: (info: { isTableTop: boolean; isHalfOpen: boolean; hasFold: boolean }) => void): Promise<{ remove: () => void }>;
}>("EthoneWindow");

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

export async function setAndroidSecureFlag(secure: boolean) {
  if (!isNativeAndroid()) return;
  try {
    await EthoneSecurity.setSecureFlag({ secure });
  } catch {
    // ignore
  }
}

export async function clearAndroidClipboard() {
  if (!isNativeAndroid()) return;
  try {
    await EthoneSecurity.clearClipboard();
  } catch {
    // ignore
  }
}

export async function isAndroidScreenRecording() {
  if (!isNativeAndroid()) return { recording: false };
  try {
    return await EthoneSecurity.isScreenRecording();
  } catch {
    return { recording: false };
  }
}

export async function pickAndroidPhoto(limit?: number) {
  if (!isNativeAndroid()) return { uris: [] as string[] };
  try {
    if (limit && limit > 1) {
      return await EthonePhotoPicker.pickMultiplePhotos({ limit });
    }
    return await EthonePhotoPicker.pickPhoto();
  } catch {
    return { uris: [] as string[] };
  }
}

export async function getAndroidWindowLayout() {
  if (!isNativeAndroid()) {
    return { deviceType: "phone", widthDp: 0, heightDp: 0, sizeClassWidth: "COMPACT", sizeClassHeight: "COMPACT" };
  }
  try {
    return await EthoneWindow.getWindowLayout();
  } catch {
    return { deviceType: "phone", widthDp: 0, heightDp: 0, sizeClassWidth: "COMPACT", sizeClassHeight: "COMPACT" };
  }
}

export function onAndroidWindowLayoutChange(listener: (info: { isTableTop: boolean; isHalfOpen: boolean; hasFold: boolean }) => void) {
  if (!isNativeAndroid()) return { remove: () => {} };
  const refs: { remove?: () => void } = {};
  EthoneWindow.addListener("windowLayoutChanged", listener).then((h) => {
    refs.remove = h.remove;
  });
  return {
    remove: () => {
      refs.remove?.();
    },
  };
}
