"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

interface EthoneShortcuts {
  donateFocusShortcut(minutes: number): Promise<void>;
  donateCreateNoteShortcut(title: string, body: string): Promise<void>;
  donateViewTasksShortcut(): Promise<void>;
  openShortcutsSettings(): Promise<void>;
}

const EthoneShortcuts = registerPlugin<EthoneShortcuts>("EthoneShortcuts", {
  web: async () => {
    return {
      donateFocusShortcut: async () => {},
      donateCreateNoteShortcut: async () => {},
      donateViewTasksShortcut: async () => {},
      openShortcutsSettings: async () => {
        window.open("/settings", "_self");
      },
    };
  },
});

export function isNative() {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

export async function donateSiriShortcuts() {
  if (!isNative()) return;
  try {
    await EthoneShortcuts.donateFocusShortcut(25);
    await EthoneShortcuts.donateCreateNoteShortcut("Note rapide", "");
    await EthoneShortcuts.donateViewTasksShortcut();
  } catch (err) {
    console.warn("Donate Siri shortcuts failed", err);
  }
}

export async function openShortcutsSettings() {
  if (!isNative()) return;
  try {
    await EthoneShortcuts.openShortcutsSettings();
  } catch (err) {
    console.warn("Open shortcuts settings failed", err);
  }
}
