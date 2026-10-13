"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useActiveProfile } from "@/components/SettingsProvider";
import { usePresence } from "@/components/PresenceProvider";

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

    return () => clearTimeout(t);
  }, [user, loaded, activeProfile, setSync, setStatus]);

  return null;
}
