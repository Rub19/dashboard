"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/components/SettingsProvider";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useItems } from "@/lib/hooks/useItems";
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
  const tasks = useItems("tasks");
  // Read via a ref rather than adding `tasks` to the notification effect's
  // deps below — useItems' return identity changes on every task update, and
  // this effect re-registering the native push/notification listeners on
  // every task edit (rather than once) risks stacking duplicate handlers.
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

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
        // TODO: no backend endpoint exists yet to register native (APNs/FCM)
        // device tokens — this is a different delivery channel from the web
        // push subscription in lib/push.ts (VAPID endpoint+keys), which IS
        // fully wired. Sending server-triggered push to the native apps
        // needs a dedicated worker route plus APNs/FCM credentials before
        // this token is useful; logging it only in dev avoids leaking a
        // device identifier to the production console in the meantime.
        if (process.env.NODE_ENV !== "production") {
          console.log("Push token:", token);
        }
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
          const taskId = String(data.taskId);
          const current = tasksRef.current;
          const item = current.items.find((t) => t.id === taskId);
          if (item && !item.done) {
            current.update(taskId, { done: true }).catch(() => {});
          }
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
