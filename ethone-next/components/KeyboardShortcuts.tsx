"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSettings } from "@/components/SettingsProvider";
import { useWindowManager } from "@/components/WindowManagerProvider";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { useShortcuts } from "@/components/ShortcutsProvider";

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

export const NAV_HOTKEYS = [
  { digit: 1, label: "Accueil", route: "/" },
  { digit: 2, label: "Notes", route: "/notes/" },
  { digit: 3, label: "Tâches", route: "/tasks/" },
  { digit: 4, label: "Calendrier", route: "/calendar/" },
  { digit: 5, label: "Fichiers", route: "/files/" },
  { digit: 6, label: "Brain", route: "/brain/" },
  { digit: 7, label: "Focus", route: "/focus/" },
  { digit: 8, label: "Activité", route: "/activity/" },
  { digit: 9, label: "Paramètres", route: "/settings/" },
];

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function matchesShortcut(event: KeyboardEvent, keys: string[]) {
  const last = keys[keys.length - 1].toLowerCase();
  const wantsCtrl = keys.includes("Ctrl") || keys.includes("Cmd");
  const wantsShift = keys.includes("Shift");
  const wantsAlt = keys.includes("Alt");

  if (wantsCtrl && !(event.ctrlKey || event.metaKey)) return false;
  if (wantsShift && !event.shiftKey) return false;
  if (wantsAlt && !event.altKey) return false;

  const eventKey = event.key.toLowerCase();
  if (last === "esc") return eventKey === "escape";
  if (last === "del") return eventKey === "delete";
  return eventKey === last;
}

export default function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const { settings, update } = useSettings();
  const { missionControl, setMissionControl, toggleMissionControl } = useWindowManager();
  const haptics = useHaptics();
  const { shortcuts } = useShortcuts();

  useEffect(() => {
    function scrollTo(top?: boolean) {
      window.scrollTo({ top: top ? 0 : document.body.scrollHeight, behavior: "smooth" });
    }

    function onKeyDown(event: KeyboardEvent) {
      // Escape is handled before the editable guard so that modals and panels
      // (Mission Control, MobileNav drawer) can be closed while typing.
      if (event.key === "Escape") {
        let handled = false;
        if (missionControl) {
          setMissionControl(false);
          haptics.trigger(12);
          handled = true;
        }
        window.dispatchEvent(new CustomEvent("v8:request-close-drawer"));
        if (handled) {
          event.preventDefault();
        }
        return;
      }

      if (isEditable(event.target)) return;

      // Ctrl/Cmd + 1-9 global navigation hotkeys.
      if ((event.ctrlKey || event.metaKey) && !event.altKey && /^[1-9]$/.test(event.key)) {
        const hotkey = NAV_HOTKEYS.find((h) => h.digit === Number(event.key));
        if (hotkey) {
          event.preventDefault();
          haptics.trigger(8);
          router.push(hotkey.route);
          return;
        }
      }

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

      // Dynamic registered shortcuts.
      for (const sc of shortcuts) {
        if (matchesShortcut(event, sc.keys) && sc.handler) {
          event.preventDefault();
          haptics.trigger(10);
          sc.handler(event);
          return;
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, pathname, settings.dockItems, settings.layoutPreset, update, toggleMissionControl, missionControl, setMissionControl, haptics, shortcuts]);

  return null;
}
