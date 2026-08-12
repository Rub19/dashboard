"use client";

import { useSettings } from "@/components/SettingsProvider";
import { useLiveFetch } from "./useLiveFetch";

export type DiscordStatus = "online" | "idle" | "dnd" | "offline";

export type DiscordActivity = {
  name: string;
  state?: string;
  details?: string;
};

export type DiscordUser = {
  id?: string;
  username?: string;
  global_name?: string;
  display_name?: string;
  discriminator?: string;
  avatar?: string;
};

export type DiscordProfile = {
  userId?: string;
  displayName?: string;
  avatarUrl?: string;
  status?: DiscordStatus;
  discord_user?: DiscordUser;
  activities?: DiscordActivity[];
  spotify?: {
    playing?: boolean;
    title?: string;
    artist?: string;
    album?: string;
    artworkUrl?: string;
  };
};

export type DiscordLive = {
  online: boolean;
  status: DiscordStatus;
  activity: DiscordActivity | null;
  avatar: string | undefined;
  username: string | undefined;
  discriminator: string | undefined;
  profile: DiscordProfile | null;
  loading: boolean;
  error: Error | null;
  updatedAt: Date | null;
};

export function useDiscordLive(pollMs = 30000): DiscordLive {
  const { settings } = useSettings();
  const userId = settings.liveLanyardUserId;
  const path = userId
    ? `/api/lanyard/presence?userId=${encodeURIComponent(userId)}`
    : null;

  const { data, loading, error, updatedAt } = useLiveFetch<DiscordProfile>(path, {
    pollMs,
    ttlMs: pollMs,
  });

  const profile = data || null;
  const rawStatus =
    (profile?.status as string | undefined) ||
    ((profile as Record<string, unknown>)?.discord_status as string | undefined);
  const normalized = (rawStatus || "offline").toLowerCase();
  const status: DiscordStatus =
    normalized === "online" ||
    normalized === "idle" ||
    normalized === "dnd" ||
    normalized === "offline"
      ? (normalized as DiscordStatus)
      : "offline";
  const online = status !== "offline";

  const activity = profile?.activities?.[0] || null;
  const avatar = profile?.avatarUrl;
  const username = profile?.discord_user?.username || profile?.displayName;
  const discriminator = profile?.discord_user?.discriminator;

  return {
    online,
    status,
    activity,
    avatar,
    username,
    discriminator,
    profile,
    loading,
    error,
    updatedAt,
  };
}
