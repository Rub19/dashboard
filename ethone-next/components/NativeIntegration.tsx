"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/components/SettingsProvider";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { onAppUrlOpen, initializePushAndLocalNotifications, updateStatusBar } from "@/lib/native";
import { configurePurchases } from "@/lib/purchases";
import { isNativeIOS } from "@/lib/apple";
import { isNativeAndroid, getMaterialColors, applyAndroidDynamicColors, onAndroidWindowLayoutChange } from "@/lib/android";

function useQuickActions(router: ReturnType<typeof useRouter>, openPalette: () => void) {
  useEffect(() => {
    if (!isNativeIOS()) return;
    // Quick actions are native-only and not available in the PWA.
    return;
  }, [router, openPalette]);
}

export default function NativeIntegration() {
  const router = useRouter();
  const { settings } = useSettings();
  const { setOpen } = useCommandPalette();

  useQuickActions(router, () => setOpen(true));

  useEffect(() => {
    if (isNativeAndroid() && settings.useMaterialYou) {
      getMaterialColors().then((colors) => {
        if (colors?.supported) {
          const root = document.documentElement;
          const variableMap: Record<string, string> = {
            "--accent-primary": colors.colorPrimary as string,
            "--accent-secondary": colors.colorSecondary as string,
            "--accent-tertiary": colors.colorTertiary as string,
            "--surface-container": colors.colorPrimaryContainer as string,
            "--surface-container-high": colors.colorSurface as string,
            "--surface-variant": colors.colorSurfaceVariant as string,
            "--text-primary": colors.colorOnSurface as string,
            "--text-muted": colors.colorOnSurfaceVariant as string,
            "--background": colors.colorBackground as string,
            "--outline": colors.colorOutline as string,
            "--danger": colors.colorError as string,
            "--monet-primary": colors.colorPrimary as string,
            "--monet-primary-container": colors.colorPrimaryContainer as string,
            "--monet-secondary": colors.colorSecondary as string,
            "--monet-tertiary": colors.colorTertiary as string,
            "--monet-surface": colors.colorSurface as string,
            "--monet-surface-variant": colors.colorSurfaceVariant as string,
            "--monet-on-surface": colors.colorOnSurface as string,
            "--monet-background": colors.colorBackground as string,
          };
          for (const [key, value] of Object.entries(variableMap)) {
            if (typeof value === "string" && value) root.style.setProperty(key, value);
          }
          applyAndroidDynamicColors();
        }
      });
    } else {
      const root = document.documentElement;
      const keys = [
        "--accent-primary", "--accent-secondary", "--accent-tertiary",
        "--surface-container", "--surface-container-high", "--surface-variant",
        "--text-primary", "--text-muted", "--background", "--outline", "--danger",
        "--monet-primary", "--monet-primary-container", "--monet-secondary",
        "--monet-tertiary", "--monet-surface", "--monet-surface-variant",
        "--monet-on-surface", "--monet-background",
      ];
      for (const key of keys) root.style.removeProperty(key);
    }
  }, [settings.useMaterialYou]);

  useEffect(() => {
    if (isNativeAndroid()) {
      const cleanup = onAndroidWindowLayoutChange((info) => {
        const root = document.documentElement;
        root.setAttribute("data-fold-state", info.isTableTop ? "tabletop" : info.isHalfOpen ? "half-open" : "flat");
      });
      return () => cleanup.remove();
    }
    return;
  }, []);

  useEffect(() => {
    const cleanup = onAppUrlOpen((url) => {
      try {
        if (!url) return;
        const parsed = new URL(url);
        if (parsed.hostname === "ethone.dev") {
          router.push(parsed.pathname + parsed.search);
        } else if (parsed.protocol === "ethone:") {
          const path = parsed.pathname.replace(/^\//, "") || "/";
          router.push("/" + path + parsed.search);
        }
      } catch {
        // ignore malformed urls
      }
    });
    return () => cleanup();
  }, [router]);

  useEffect(() => {
    initializePushAndLocalNotifications(
      (token) => {
        console.log("Push token:", token);
      },
      (notification) => {
        const route = notification.data?.route;
        if (route) router.push(route);
      },
      (action) => {
        const data = action.notification?.data;
        const route = data?.route;
        if (route) router.push(route);
        if (action.actionId === "ETHONE_TASK_DONE" && data?.taskId) {
          // TODO: mark task done via API
        }
      }
    );
  }, [router]);

  useEffect(() => {
    updateStatusBar(settings.darkMode ? "DARK" : "LIGHT");
  }, [settings.darkMode]);

  useEffect(() => {
    configurePurchases();
  }, []);

  useEffect(() => {
    if (document) {
      document.documentElement.style.setProperty("--status-bar-height", "env(safe-area-inset-top)");
    }
  }, []);

  return null;
}
