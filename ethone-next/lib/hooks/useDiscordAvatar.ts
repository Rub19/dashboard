"use client";

import { useSettings } from "@/components/SettingsProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";

export function useDiscordAvatar() {
  const { settings } = useSettings();
  const { profile } = useDiscordOAuth();

  if (settings.discordMode !== "oauth2" || !profile?.connected || !profile.user) {
    return { avatarUrl: undefined, displayName: undefined };
  }

  return {
    avatarUrl: profile.user.avatarUrlSmall || profile.user.avatarUrl,
    displayName: profile.user.globalName || profile.user.displayName || profile.user.username,
  };
}
