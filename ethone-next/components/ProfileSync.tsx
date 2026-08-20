"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useSettings } from "@/components/SettingsProvider";
import { useActiveProfile } from "@/components/SettingsProvider";
import { usePresence } from "@/components/PresenceProvider";
import type { Settings } from "@/lib/settings";

export default function ProfileSync() {
  const { user } = useAuth();
  const { settings, update } = useSettings();
  const { activeProfile, loaded } = useActiveProfile();
  const { setSync, setStatus } = usePresence();
  const syncedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !loaded || !activeProfile) return;

    // Only sync once per active profile. Without this guard, every settings
    // change (e.g. user picking a new accent color) would be overwritten by
    // the active profile's stored accent.
    if (syncedForRef.current === activeProfile.id) return;
    syncedForRef.current = activeProfile.id;

    setStatus(user ? "online" : "offline");
    setSync("syncing");
    const t = setTimeout(() => setSync(), 1200);

    const next: Partial<Settings> = {};
    if (JSON.stringify(settings.dockItems) !== JSON.stringify(activeProfile.widgets)) {
      next.dockItems = activeProfile.widgets;
    }
    if (settings.accentColor !== activeProfile.accent) {
      next.accentColor = activeProfile.accent as Settings["accentColor"];
    }
    if (Object.keys(next).length) update(next);

    return () => clearTimeout(t);
  }, [user, loaded, activeProfile, settings, update, setSync, setStatus]);

  return null;
}
