"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useSettings } from "@/components/SettingsProvider";
import { useActiveProfile } from "@/components/SettingsProvider";
import { usePresence } from "@/components/PresenceProvider";
import type { Settings } from "@/lib/settings";

const SYNCED_KEY = "ethone-profile-synced-v1";

function getSyncedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SYNCED_KEY);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

function markSynced(id: string) {
  if (typeof window === "undefined") return;
  try {
    const ids = getSyncedIds();
    ids.add(id);
    localStorage.setItem(SYNCED_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

export default function ProfileSync() {
  const { user } = useAuth();
  const { settings, update } = useSettings();
  const { activeProfile, loaded } = useActiveProfile();
  const { setSync, setStatus } = usePresence();

  useEffect(() => {
    if (!user || !loaded || !activeProfile) return;

    // Only sync once per active profile across sessions. Without a persisted
    // guard, every refresh overwrites user choices (e.g. accent color) with
    // the active profile's stored defaults.
    const synced = getSyncedIds();
    if (synced.has(activeProfile.id)) return;
    markSynced(activeProfile.id);

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
