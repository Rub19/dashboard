"use client";

export function isNative() {
  return false;
}

export async function donateSiriShortcuts() {
  if (!isNative()) return;
}

export async function openShortcutsSettings() {
  if (!isNative()) return;
  if (typeof window !== "undefined") {
    window.open("/settings", "_self");
  }
}
