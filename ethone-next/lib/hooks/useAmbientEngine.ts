"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSettings } from "@/components/SettingsProvider";
import { useFocus } from "@/components/FocusProvider";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { applyAmbientVariables, millisecondsUntilAmbientRefresh, AMBIENT_REFRESH_MS } from "@/lib/ambient-engine";

function routeContext(pathname: string) {
  const root = pathname.split("/")[1] || "home";
  const map: Record<string, string> = {
    focus: "focus",
    brain: "dev",
    code: "dev",
    notes: "study",
    tasks: "study",
    settings: "dev",
    games: "gaming",
    matches: "gaming",
    plugins: "gaming",
  };
  return map[root] || root;
}

export function useAmbientEngine() {
  const pathname = usePathname();
  const { settings } = useSettings();
  const { state } = useFocus();
  const [activeSpace] = useLocalStorage<string>("ethone-active-workspace", "personal");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function refresh() {
      const html = document.documentElement;
      if (!html) return;
      const focusActive = state.phase === "focus" && !state.paused;
      applyAmbientVariables(html, {
        theme: settings.theme,
        space: activeSpace,
        mode: settings.sessionMode,
        flow: settings.aura,
        activity: settings.ambientSound,
        context: routeContext(pathname),
        focus: focusActive,
      });
      const ms = millisecondsUntilAmbientRefresh(new Date(), AMBIENT_REFRESH_MS);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(refresh, ms);
    }

    refresh();
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else {
        refresh();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname, settings.theme, settings.sessionMode, settings.aura, settings.ambientSound, activeSpace, state.phase, state.paused]);
}
