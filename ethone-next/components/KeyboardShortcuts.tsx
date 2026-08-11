"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSettings } from "@/components/SettingsProvider";
import { useWindowManager } from "@/components/WindowManagerProvider";
import { useHaptics } from "@/lib/hooks/useHaptics";

const DOCK_ROUTES: Record<string, string> = {
  home: "/",
  notes: "/notes",
  tasks: "/tasks",
  calendar: "/calendar",
  files: "/files",
  bills: "/bills",
  activity: "/activity",
  interactions: "/interactions",
  connections: "/connections",
  plugins: "/plugins",
  spaces: "/spaces",
  flows: "/flows",
  brain: "/brain",
  focus: "/focus",
  team: "/team",
  mail: "/mail",
  settings: "/settings",
};

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export default function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const { settings, update } = useSettings();
  const { toggleMissionControl } = useWindowManager();
  const haptics = useHaptics();

  useEffect(() => {
    function scrollTo(top?: boolean) {
      window.scrollTo({ top: top ? 0 : document.body.scrollHeight, behavior: "smooth" });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isEditable(event.target)) return;

      // Ctrl/Cmd + Shift + letter creation shortcuts.
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey) {
        const key = event.key.toLowerCase();
        if (key === "n") { event.preventDefault(); haptics.trigger(8); router.push("/notes"); return; }
        if (key === "t") { event.preventDefault(); haptics.trigger(8); router.push("/tasks"); return; }
        if (key === "e") { event.preventDefault(); haptics.trigger(8); router.push("/calendar"); return; }
        if (key === "s") { event.preventDefault(); haptics.trigger(8); router.push("/scratchpad"); return; }
      }

      // F2 / ? alternative mission control.
      if (event.key === "F2" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        haptics.trigger(12);
        toggleMissionControl();
        return;
      }

      // Alt+Z toggle minimal / default layout.
      if (event.altKey && event.key.toLowerCase() === "z" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        haptics.trigger(12);
        update({ layoutPreset: settings.layoutPreset === "minimal" ? "default" : "minimal" });
        return;
      }

      // Ctrl+S manual cloud sync — prevent browser save dialog.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        haptics.trigger(12);
        return;
      }

      // Number keys for dock navigation.
      if (/^[1-9]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
        const index = Number(event.key) - 1;
        const items = settings.dockItems.filter((id) => DOCK_ROUTES[id]);
        const item = items[index];
        if (item) {
          event.preventDefault();
          haptics.trigger(8);
          const href = DOCK_ROUTES[item];
          if (pathname !== href) router.push(href);
        }
      }

      // Page scrolling.
      if (event.key === "Home" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        scrollTo(true);
      }
      if (event.key === "End" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        scrollTo(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, pathname, settings.dockItems, settings.layoutPreset, update, toggleMissionControl, haptics]);

  return null;
}
