"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/components/SettingsProvider";
import { onAppUrlOpen, initializePushNotifications, updateStatusBar } from "@/lib/native";

export default function NativeIntegration() {
  const router = useRouter();
  const { settings } = useSettings();

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
    if (document) {
      document.documentElement.style.setProperty("--status-bar-height", "env(safe-area-inset-top)");
    }
  }, []);

  return null;
}
