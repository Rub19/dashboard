// Generic tracker.gg tracker — CS2, Rainbow Six, XDefiant, The Finals,
// Splitgate, Rocket League, The Division 2, Battlefield 2042.
// Goes through the ETHONE Worker (`/api/stats/tracker-*`), which holds the
// TRACKER_API_KEY. Also accepts the user's own key via the `x-tracker-api-key`
// header — kept server-side.

import { fetchWorker } from "@/lib/api";

export type TrackerStat = { value?: number; displayValue?: string; percentile?: number };
export type TrackerStats = Record<string, TrackerStat>;

export interface TrackerSegment {
  type: string;
  name: string;
  stats: TrackerStats;
}

export type TrackerUnavailableReason = "no_api_key" | "key_rejected" | "not_found" | "upstream";

export interface TrackerProfile {
  available: boolean;
  reason?: TrackerUnavailableReason;
  platform: string;
  identifier: string;
  handle: string;
  avatarUrl: string | null;
  segments: TrackerSegment[];
}

export interface TrackerMatch {
  id: string;
  metadata: {
    modeName: string;
    result: string;
    mapName: string;
    agentName: string;
    agentImageUrl: string | null;
    timestamp: string;
  };
  segments: { type: string; stats: TrackerStats }[];
}

export interface TrackerGame {
  id: string; // tracker.gg slug
  label: string;
  platforms: { value: string; label: string }[];
  idLabel: string;
  idHint: string;
}

export const TRACKER_GAMES: TrackerGame[] = [
  {
    id: "csgo",
    label: "Counter-Strike 2",
    platforms: [{ value: "steam", label: "Steam" }],
    idLabel: "SteamID64 / Vanity",
    idHint: "76561198… ou ton vanity Steam",
  },
  {
    id: "the-finals",
    label: "The Finals",
    platforms: [{ value: "steam", label: "Steam" }, { value: "psn", label: "PSN" }, { value: "xbl", label: "Xbox" }],
    idLabel: "Nom Embark",
    idHint: "PseudoEmbark#1234",
  },
  {
    id: "xdefiant",
    label: "XDefiant",
    platforms: [{ value: "ubi", label: "Ubisoft" }],
    idLabel: "Nom Ubisoft",
    idHint: "Ton pseudo Ubisoft Connect",
  },
  {
    id: "splitgate",
    label: "Splitgate",
    platforms: [{ value: "steam", label: "Steam" }, { value: "xbl", label: "Xbox" }, { value: "psn", label: "PSN" }],
    idLabel: "Nom",
    idHint: "Ton pseudo Splitgate",
  },
  {
    id: "division-2",
    label: "The Division 2",
    platforms: [{ value: "ubi", label: "Ubisoft" }, { value: "psn", label: "PSN" }, { value: "xbl", label: "Xbox" }],
    idLabel: "Nom",
    idHint: "Ton pseudo",
  },
  {
    id: "bf2042",
    label: "Battlefield 2042",
    platforms: [{ value: "origin", label: "EA / Origin" }, { value: "psn", label: "PSN" }, { value: "xbl", label: "Xbox" }],
    idLabel: "Nom EA",
    idHint: "Ton pseudo EA",
  },
];

function qs(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
}

export async function fetchTrackerProfile(game: string, platform: string, identifier: string): Promise<TrackerProfile | null> {
  try {
    const res = await fetchWorker(`/api/stats/tracker-profile?${qs({ game, platform, identifier })}`);
    const d = res?.data ?? res;
    if (!d || d.available === false) {
      return { available: false, reason: d?.reason, platform, identifier, handle: identifier, avatarUrl: null, segments: [] };
    }
    return {
      available: true,
      platform: String(d.platform ?? platform),
      identifier: String(d.identifier ?? identifier),
      handle: String(d.handle ?? identifier),
      avatarUrl: d.avatarUrl ?? null,
      segments: Array.isArray(d.segments) ? d.segments : [],
    };
  } catch {
    return null;
  }
}

export async function fetchTrackerMatches(game: string, platform: string, identifier: string, mode = "all"): Promise<TrackerMatch[]> {
  try {
    const res = await fetchWorker(`/api/stats/tracker-matches?${qs({ game, platform, identifier, mode })}`);
    const d = res?.data ?? res;
    const list = Array.isArray(d?.matches) ? d.matches : Array.isArray(d) ? d : [];
    return list as TrackerMatch[];
  } catch {
    return [];
  }
}

/** Pull a handful of headline stats from an "overview" segment for the summary tiles. */
export function overviewStats(profile: TrackerProfile | null): { label: string; value: string }[] {
  if (!profile?.available) return [];
  const seg = profile.segments.find((s) => s.type === "overview") || profile.segments[0];
  if (!seg) return [];
  const keys = ["kills", "kd", "kdRatio", "wins", "winPercentage", "matchesPlayed", "timePlayed", "score", "rankScore", "level"];
  return keys
    .map((k) => {
      const s = seg.stats[k];
      if (!s) return null;
      const name = k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
      return { label: name, value: s.displayValue ?? String(s.value ?? "—") };
    })
    .filter(Boolean)
    .slice(0, 6) as { label: string; value: string }[];
}
