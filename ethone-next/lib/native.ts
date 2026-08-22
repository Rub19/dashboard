"use client";

import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Share } from "@capacitor/share";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Badge } from "@capawesome/capacitor-badge";
import { PushNotifications } from "@capacitor/push-notifications";
import { ActionSheet, ActionSheetButtonStyle } from "@capacitor/action-sheet";

export function isNative() {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

export async function initializePushNotifications(onToken?: (token: string) => void, onMessage?: (data: unknown) => void) {
  if (!isNative()) return;
  try {
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted") {
      await PushNotifications.requestPermissions();
    }

    PushNotifications.register();

    PushNotifications.addListener("registration", (token) => {
      onToken?.(token.value);
    });

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      onMessage?.(notification);
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      onMessage?.(action.notification);
    });
  } catch {
    // ignore on web
  }
}

export async function setBadgeCount(count: number) {
  if (!isNative()) return;
  try {
    await Badge.set({ count });
  } catch {
    // ignore
  }
}

export async function clearBadge() {
  if (!isNative()) return;
  try {
    await Badge.clear();
  } catch {
    // ignore
  }
}

export async function updateStatusBar(style: "DARK" | "LIGHT") {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: Style[style as keyof typeof Style] });
    await StatusBar.setBackgroundColor({ color: "#00000000" });
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    // ignore
  }
}

export async function nativeShare(options: { title?: string; text?: string; url?: string; files?: string[] }) {
  if (!isNative()) {
    if (navigator.share) {
      try {
        await navigator.share({ title: options.title, text: options.text, url: options.url });
        return { ok: true } as const;
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err : new Error(String(err)) } as const;
      }
    }
    return { ok: false, error: new Error("Partage non disponible.") } as const;
  }

  try {
    const result = await Share.share({
      title: options.title,
      text: options.text,
      url: options.url,
      files: options.files,
      dialogTitle: options.title || "Partager",
    });
    return { ok: true, result } as const;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) } as const;
  }
}

export async function showNativeActionSheet(title: string, options: string[], destructive?: number, cancel = "Annuler") {
  if (!isNative()) return { index: -1 };
  try {
    const sheetOptions = options.map((label, i) => ({
      title: label,
      style: i === destructive ? ActionSheetButtonStyle.Destructive : undefined,
    }));
    const cancelIndex = options.length;
    sheetOptions.push({ title: cancel, style: ActionSheetButtonStyle.Cancel });
    const result = await ActionSheet.showActions({
      title,
      options: sheetOptions,
    });
    if (result.index === cancelIndex) return { index: -1 };
    return result;
  } catch {
    return { index: -1 };
  }
}

export function onAppUrlOpen(callback: (url: string) => void) {
  if (!isNative()) return () => {};
  const handler = App.addListener("appUrlOpen", ({ url }) => {
    callback(url);
  });
  return () => {
    handler.then((h) => h.remove());
  };
}
