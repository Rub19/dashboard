export interface TftTrait {
  name?: string;
  numUnits?: number;
  tierCurrent?: number;
  tierTotal?: number;
  style?: number;
}

export interface TftUnit {
  characterId?: string;
  name?: string;
  tier?: number;
  rarity?: number;
  items?: string[];
}

export interface TftPlayer {
  placement?: number;
  level?: number;
  playersEliminated?: number;
  damage?: number;
  goldLeft?: number;
  lastRound?: number;
  traits?: TftTrait[];
  units?: TftUnit[];
}

export interface TftMatch {
  id?: string;
  mode?: string;
  setNumber?: number;
  playedAt?: string;
  durationSeconds?: number;
  me?: TftPlayer | null;
  players?: TftPlayer[];
}

export interface TftSummary {
  games: number;
  average: number;
  topFour: number;
  wins: number;
  topFourRate: number;
}

export function tftSummary(matches: TftMatch[]): TftSummary {
  const placements = matches.flatMap((match) => {
    const placement = match.me?.placement;
    return typeof placement === "number" && placement > 0 ? [placement] : [];
  });
  const games = placements.length;
  const topFour = placements.filter((placement) => placement <= 4).length;
  return {
    games,
    average: games ? placements.reduce((total, placement) => total + placement, 0) / games : 0,
    topFour,
    wins: placements.filter((placement) => placement === 1).length,
    topFourRate: games ? Math.round((topFour / games) * 100) : 0,
  };
}

export function tftPlacementTone(placement?: number): "first" | "top" | "out" | "unknown" {
  if (!placement) return "unknown";
  if (placement === 1) return "first";
  return placement <= 4 ? "top" : "out";
}

export function tftDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "";
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${Math.round(seconds % 60)} s`;
}

export function tftRiotId(identity: { name: string; tag: string } | null): string {
  if (!identity?.name || !identity.tag) return "";
  return `${identity.name}#${identity.tag}`;
}
