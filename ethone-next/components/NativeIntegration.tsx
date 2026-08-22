"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShortcuts } from "@capawesome/capacitor-app-shortcuts";
import { useSettings } from "@/components/SettingsProvider";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { App } from "@capacitor/app";
import { onAppUrlOpen, initializePushNotifications, updateStatusBar } from "@/lib/native";
import { isNativeIOS } from "@/lib/apple";
import { isNativeAndroid, getMaterialColors, applyAndroidDynamicColors } from "@/lib/android";

const QUICK_ACTIONS = [
  { id: "new-note", title: "Nouvelle Note Rapide", iosIcon: "doc.badge.plus" },
  { id: "start-focus", title: "Lancer un Focus", iosIcon: "target" },
  { id: "scan-doc", title: "Scanner un Document", iosIcon: "doc.viewfinder" },
  { id: "search", title: "Rechercher", iosIcon: "magnifyingglass" },
];

function useQuickActions(router: ReturnType<typeof useRouter>, openPalette: () => void) {
  useEffect(() => {
    if (!isNativeIOS()) return;
    AppShortcuts.set({ shortcuts: QUICK_ACTIONS }).catch(() => {});

    const listener = AppShortcuts.addListener("click", (event) => {
      switch (event.shortcutId) {
        case "new-note":
          router.push("/notes/?new=1");
          break;
        case "start-focus":
          router.push("/focus/");
          break;
        case "scan-doc":
          router.push("/files/?scan=1");
          break;
        case "search":
          openPalette();
          break;
      }
    });

    return () => {
      listener.then((h) => h.remove()).catch(() => {});
    };
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
          root.style.setProperty("--monet-primary", colors.primary);
          root.style.setProperty("--monet-primary-container", colors.primaryContainer);
          root.style.setProperty("--monet-secondary", colors.secondary);
          root.style.setProperty("--monet-tertiary", colors.tertiary);
          root.style.setProperty("--monet-surface", colors.surface);
          root.style.setProperty("--monet-surface-variant", colors.surfaceVariant);
          root.style.setProperty("--monet-on-surface", colors.onSurface);
          root.style.setProperty("--monet-background", colors.background);
          applyAndroidDynamicColors();
        }
      });
    } else {
      const root = document.documentElement;
      root.style.removeProperty("--monet-primary");
      root.style.removeProperty("--monet-primary-container");
      root.style.removeProperty("--monet-secondary");
      root.style.removeProperty("--monet-tertiary");
      root.style.removeProperty("--monet-surface");
      root.style.removeProperty("--monet-surface-variant");
      root.style.removeProperty("--monet-on-surface");
      root.style.removeProperty("--monet-background");
    }
  }, [settings.useMaterialYou]);

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
    initializePushNotifications(
      (token) => {
        console.log("Push token:", token);
      },
      (notification) => {
        const data = (notification as { data?: Record<string, string> })?.data;
        const route = data?.route;
        if (route) router.push(route);
      }
    );
  }, [router]);

  useEffect(() => {
    updateStatusBar(settings.darkMode ? "DARK" : "LIGHT");
  }, [settings.darkMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const onBack = () => {
      // Try to close open overlays before letting the system handle back
      const anyOverlay =
        document.querySelector("[data-drawer-open='true']") ||
        document.querySelector("[data-sheet-open='true']") ||
        document.querySelector("[data-command-open='true']") ||
        document.querySelector("[data-modal-open='true']");

      if (anyOverlay) {
        const event = new CustomEvent("v8:request-close-overlay");
        anyOverlay.dispatchEvent(event);
      }
    };

    const handler = App.addListener("backButton", onBack);
    return () => {
      handler.then((h) => h.remove());
    };
  }, []);

  useEffect(() => {
    if (document) {
      document.documentElement.style.setProperty("--status-bar-height", "env(safe-area-inset-top)");
    }
  }, []);

  return null;
}
