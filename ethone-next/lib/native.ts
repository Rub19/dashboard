"use client";

import {
  initializePushAndLocalNotifications,
  setBadgeCount,
  clearBadge,
  getNotificationCategories,
} from "@/lib/notifications";

export { initializePushAndLocalNotifications, setBadgeCount, clearBadge, getNotificationCategories };

export function isNative() {
  return false;
}

export function getPlatform() {
  return "web";
}

export async function updateStatusBar(_style: "DARK" | "LIGHT") {
  if (!isNative()) return;
}

export async function nativeShare(options: { title?: string; text?: string; url?: string; files?: string[] }) {
  if (!isNative()) {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: options.title, text: options.text, url: options.url });
        return { ok: true } as const;
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err : new Error(String(err)) } as const;
      }
    }
    return { ok: false, error: new Error("Partage non disponible.") } as const;
  }
  return { ok: false, error: new Error("Partage natif non disponible.") } as const;
}

export async function showNativeActionSheet(_title: string, _options: string[], _destructive?: number, _cancel = "Annuler") {
  if (!isNative()) return { index: -1 };
  return { index: -1 };
}

export function onAppUrlOpen(_callback: (url: string) => void) {
  if (!isNative()) return () => {};
  return () => {};
}
