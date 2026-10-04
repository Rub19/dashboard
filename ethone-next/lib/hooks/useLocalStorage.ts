"use client";

import { useEffect, useState } from "react";
import { useUserState } from "@/lib/hooks/useUserState";

/**
 * Clés qui suivent le compte plutôt que le navigateur : elles passent par Supabase (useUserState) et sont donc
 * identiques et mises à jour en direct sur tous les appareils. L'ancienne valeur locale sert de départ.
 */
export const SYNCED_LOCAL_KEYS = new Set([
  "ethone-active-workspace",
  "ethone-home-layout-locked",
  "ethone-widget-configs",
  "ethone-favorite-widgets",
  "ethone-pinned-widgets",
  "ethone-marketplace-favorites-v1",
  "ethone-marketplace-saved-v1",
]);

function useBrowserOnly<T>(key: string, initial: T, enabled: boolean) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        setValue(JSON.parse(raw));
      } catch {}
    }
  }, [key, enabled]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value, enabled]);

  return [value, setValue] as const;
}

export function useLocalStorage<T>(key: string, initial: T) {
  const synced = SYNCED_LOCAL_KEYS.has(key);
  const local = useBrowserOnly(key, initial, !synced);
  const remote = useUserState<T>(`local:${key}`, initial, { legacyKey: key, enabled: synced });
  return synced ? remote : local;
}
