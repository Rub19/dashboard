"use client";

import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";

export function useDiscordAvatar() {
  const { profile } = useDiscordOAuth();

  if (!profile?.connected || !profile.user) {
    return { avatarUrl: undefined, displayName: undefined };
  }

  return {
    avatarUrl: profile.user.avatarUrlSmall || profile.user.avatarUrl,
    displayName: profile.user.globalName || profile.user.displayName || profile.user.username,
  };
}
