"use client";

export type MaterialPalette = {
  supported: boolean;
  isDynamic: boolean;
  [key: string]: string | boolean;
};

export function isNativeAndroid() {
  return false;
}

export async function getMaterialColors(): Promise<MaterialPalette | null> {
  return null;
}

export async function applyAndroidDynamicColors() {
}

export async function androidWaveform(_timings: number[], _amplitudes: number[]) {
}

export async function androidPredefinedHaptic(_effect: "tick" | "click" | "heavy" | "double") {
}

export async function setAndroidSecureFlag(_secure: boolean) {
}

export async function clearAndroidClipboard() {
}

export async function isAndroidScreenRecording() {
  return { recording: false };
}

export async function pickAndroidPhoto(_limit?: number) {
  return { uris: [] as string[] };
}

export async function getAndroidWindowLayout() {
  return { deviceType: "phone", widthDp: 0, heightDp: 0, sizeClassWidth: "COMPACT", sizeClassHeight: "COMPACT" };
}

export function onAndroidWindowLayoutChange(_listener: (info: { isTableTop: boolean; isHalfOpen: boolean; hasFold: boolean }) => void) {
  return { remove: () => {} };
}
