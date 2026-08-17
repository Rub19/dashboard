"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFocus } from "@/components/FocusProvider";
import { useSettings } from "@/components/SettingsProvider";
import { useWindowManager } from "@/components/WindowManagerProvider";
import { useToast } from "@/components/ToastProvider";
import type { Settings } from "@/lib/settings";

const WALLPAPERS: Settings["wallpaper"][] = [
  "none",
  "aurora",
  "nebula",
  "mesh",
  "noise",
  "grain",
  "mineral",
];

function cycle<T>(arr: T[], current: T): T {
  const idx = arr.indexOf(current);
  return arr[(idx + 1) % arr.length];
}

export function useContextMenuActions() {
  const router = useRouter();
  const { start: startFocus } = useFocus();
  const { settings, update } = useSettings();
  const { toggleMissionControl } = useWindowManager();
  const { success } = useToast();

  const newTask = useCallback(() => {
    router.push("/tasks/");
  }, [router]);

  const startPomodoro = useCallback(() => {
    startFocus("pomodoro");
    router.push("/focus/");
  }, [startFocus, router]);

  const openBrain = useCallback(() => {
    router.push("/brain/");
  }, [router]);

  const cycleWallpaper = useCallback(() => {
    const next = cycle(WALLPAPERS, settings.wallpaper || "none");
    update({ wallpaper: next });
    success(`Fond d'écran : ${next}`);
  }, [settings.wallpaper, update, success]);

  const reorganizeWidgets = useCallback(() => {
    toggleMissionControl();
  }, [toggleMissionControl]);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      /* ignore unsupported fullscreen changes */
    }
  }, []);

  const reload = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  const openSettings = useCallback(() => {
    router.push("/settings/");
  }, [router]);

  return {
    newTask,
    startPomodoro,
    openBrain,
    cycleWallpaper,
    reorganizeWidgets,
    toggleFullscreen,
    reload,
    openSettings,
  };
}
