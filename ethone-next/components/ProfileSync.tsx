"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useSettings } from "@/components/SettingsProvider";
import { useProfiles } from "@/lib/hooks/useProfiles";

export default function ProfileSync() {
  const { user } = useAuth();
  const { settings, update } = useSettings();
  const { active, profiles, loaded } = useProfiles();

  useEffect(() => {
    if (!user || !loaded || !active) return;
    const profile = profiles.find((p) => p.id === active);
    if (!profile) return;
    const next: Partial<typeof settings> = {};
    if (JSON.stringify(settings.dockItems) !== JSON.stringify(profile.widgets)) {
      next.dockItems = profile.widgets;
    }
    if (settings.accentColor !== profile.accent) {
      next.accentColor = profile.accent as never;
    }
    if (Object.keys(next).length) update(next);
  }, [user, loaded, active, profiles, settings, update]);

  return null;
}
