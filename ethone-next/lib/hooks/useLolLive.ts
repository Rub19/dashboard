"use client";

import { useSettings } from "@/components/SettingsProvider";
import { useLiveFetch } from "./useLiveFetch";

export type LolStat = {
  value: number;
  displayValue: string;
};

export type LolSegment = {
  type?: string;
  name?: string;
  stats?: Record<string, LolStat>;
};

export type LolProfile = {
  handle?: string;
  avatarUrl?: string;
  segments?: LolSegment[];
};

export type LolMatch = {
  id: string;
  metadata?: {
    modeName?: string;
    result?: string;
    mapName?: string;
    agentName?: string;
    championId?: number;
    gameDuration?: string;
    timestamp?: string;
    score?: { team: number; opponent: number };
  };
  scoreboard?: unknown;
  segments?: LolSegment[];
};

export type LolLive = {
  profile: LolProfile | null;
  matches: LolMatch[] | null;
  lastMatch: LolMatch | null;
  rank: string | undefined;
  loading: boolean;
  error: Error | null;
  updatedAt: Date | null;
};

function asRank(profile: LolProfile | null): string | undefined {
  if (!profile?.segments?.length) return undefined;
  const overview = profile.segments[0];
  return overview?.stats?.rank?.displayValue || overview?.name || undefined;
}

export function useLolLive(pollMs = 60000): LolLive {
  const { settings } = useSettings();
  const { liveTrackerRiotName, liveTrackerRiotTag } = settings;
  const hasId = !!liveTrackerRiotName && !!liveTrackerRiotTag;

  const query = hasId
    ? `?name=${encodeURIComponent(liveTrackerRiotName)}&tag=${encodeURIComponent(liveTrackerRiotTag)}`
    : null;
  const profilePath = query ? `/api/tracker/lol-profile${query}` : null;
  const matchesPath = query ? `/api/tracker/lol-matches${query}&mode=all` : null;

  const {
    data: profileData,
    loading: profileLoading,
    error: profileError,
    updatedAt: profileUpdatedAt,
  } = useLiveFetch<LolProfile>(profilePath, { pollMs, ttlMs: pollMs });

  const {
    data: matchesData,
    loading: matchesLoading,
    error: matchesError,
    updatedAt: matchesUpdatedAt,
  } = useLiveFetch<LolMatch[]>(matchesPath, { pollMs, ttlMs: pollMs });

  const profile = profileData || null;
  const matches = Array.isArray(matchesData) ? matchesData : null;
  const lastMatch = matches?.[0] || null;
  const rank = asRank(profile);

  const loading = profileLoading || matchesLoading;
  const error = profileError || matchesError || null;
  const updatedAt =
    profileUpdatedAt && matchesUpdatedAt
      ? profileUpdatedAt > matchesUpdatedAt
        ? profileUpdatedAt
        : matchesUpdatedAt
      : profileUpdatedAt || matchesUpdatedAt;

  return {
    profile,
    matches,
    lastMatch,
    rank,
    loading,
    error,
    updatedAt,
  };
}
