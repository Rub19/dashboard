"use client";

import { useSettings } from "@/components/SettingsProvider";
import { useLiveFetch } from "./useLiveFetch";

export type MinecraftNameHistoryEntry = {
  name: string;
  changedAt?: string | null;
};

export type MinecraftProfile = {
  username?: string;
  name?: string;
  uuid?: string;
  uuidWithDashes?: string;
  skinUrl?: string;
  avatarUrl?: string;
  bodyUrl?: string;
  capeUrl?: string;
  model?: string;
  nameHistory?: MinecraftNameHistoryEntry[];
};

export type MinecraftLive = {
  profile: MinecraftProfile | null;
  username: string | undefined;
  uuid: string | undefined;
  avatarUrl: string | undefined;
  lastSeen: string | undefined;
  loading: boolean;
  error: Error | null;
  updatedAt: Date | null;
  refresh: () => Promise<void>;
};

function deriveAvatarUrl(profile: MinecraftProfile | null): string | undefined {
  if (!profile) return undefined;
  return profile.avatarUrl || profile.skinUrl || profile.capeUrl;
}

function deriveLastSeen(profile: MinecraftProfile | null): string | undefined {
  if (!profile?.nameHistory?.length) return undefined;
  const entries = profile.nameHistory.filter((n) => n.changedAt);
  return entries[entries.length - 1]?.changedAt || undefined;
}

export function useMinecraftLive(pollMs = 60000): MinecraftLive {
  const { settings } = useSettings();
  const username = settings.liveMinecraftUsername;
  const path = username
    ? `/api/minecraft/profile?username=${encodeURIComponent(username)}`
    : null;

  const { data, loading, error, updatedAt, refresh } = useLiveFetch<MinecraftProfile>(path, {
    pollMs,
    ttlMs: pollMs,
  });

  const profile = data || null;

  return {
    profile,
    username: profile?.username || profile?.name || username,
    uuid: profile?.uuid,
    avatarUrl: deriveAvatarUrl(profile),
    lastSeen: deriveLastSeen(profile),
    loading,
    error,
    updatedAt,
    refresh,
  };
}
