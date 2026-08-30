export interface PartyColor {
  bg: string;
  border: string;
  text: string;
  dot: string;
  ring: string;
  glow: string;
  name: string;
}

export const PARTY_COLORS: PartyColor[] = [
  {
    bg: "bg-cyan-500/20",
    border: "border-cyan-400/50",
    text: "text-cyan-300",
    dot: "bg-cyan-400",
    ring: "ring-cyan-400/40",
    glow: "shadow-[0_0_8px_rgba(6,182,212,0.6)]",
    name: "Groupe A",
  },
  {
    bg: "bg-amber-500/20",
    border: "border-amber-400/50",
    text: "text-amber-300",
    dot: "bg-amber-400",
    ring: "ring-amber-400/40",
    glow: "shadow-[0_0_8px_rgba(245,158,11,0.6)]",
    name: "Groupe B",
  },
  {
    bg: "bg-fuchsia-500/20",
    border: "border-fuchsia-400/50",
    text: "text-fuchsia-300",
    dot: "bg-fuchsia-400",
    ring: "ring-fuchsia-400/40",
    glow: "shadow-[0_0_8px_rgba(217,70,239,0.6)]",
    name: "Groupe C",
  },
  {
    bg: "bg-emerald-500/20",
    border: "border-emerald-400/50",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
    ring: "ring-emerald-400/40",
    glow: "shadow-[0_0_8px_rgba(16,185,129,0.6)]",
    name: "Groupe D",
  },
  {
    bg: "bg-violet-500/20",
    border: "border-violet-400/50",
    text: "text-violet-300",
    dot: "bg-violet-400",
    ring: "ring-violet-400/40",
    glow: "shadow-[0_0_8px_rgba(139,92,246,0.6)]",
    name: "Groupe E",
  },
  {
    bg: "bg-rose-500/20",
    border: "border-rose-400/50",
    text: "text-rose-300",
    dot: "bg-rose-400",
    ring: "ring-rose-400/40",
    glow: "shadow-[0_0_8px_rgba(244,63,94,0.6)]",
    name: "Groupe F",
  },
];

export interface PlayerPartyInfo {
  partyIndex: number;
  partyName: string;
  size: number;
  color: PartyColor;
}

export function computePartyMap<T extends { party_id?: string; team?: string; isMe?: boolean; name?: string; tag?: string }>(
  players: T[]
): {
  getParty: (player: T, index?: number) => PlayerPartyInfo | null;
} {
  const partyCounts: Record<string, number> = {};

  for (const p of players) {
    if (p.party_id) {
      const key = `${p.team || "neutral"}:${p.party_id}`;
      partyCounts[key] = (partyCounts[key] || 0) + 1;
    }
  }

  const partyColorMap: Record<string, PlayerPartyInfo> = {};
  let nextColorIdx = 0;

  for (const p of players) {
    if (p.party_id) {
      const key = `${p.team || "neutral"}:${p.party_id}`;
      if (partyCounts[key] >= 2 && !partyColorMap[key]) {
        partyColorMap[key] = {
          partyIndex: nextColorIdx + 1,
          partyName: PARTY_COLORS[nextColorIdx % PARTY_COLORS.length].name,
          size: partyCounts[key],
          color: PARTY_COLORS[nextColorIdx % PARTY_COLORS.length],
        };
        nextColorIdx++;
      }
    }
  }

  const hasAnyExplicitParty = Object.keys(partyColorMap).length > 0;

  return {
    getParty: (p: T, index?: number) => {
      if (p.party_id) {
        const key = `${p.team || "neutral"}:${p.party_id}`;
        return partyColorMap[key] || null;
      }
      
      // If no explicit party_id was provided, group pairs on same team
      if (!hasAnyExplicitParty && typeof index === "number" && players.length >= 4) {
        const teamPlayers = players.filter((pl) => (pl.team || "Blue") === (p.team || "Blue"));
        const teamIndex = teamPlayers.indexOf(p);
        if (teamIndex === 0 || teamIndex === 1) {
          const color = (p.team === "Red") ? PARTY_COLORS[1] : PARTY_COLORS[0];
          return {
            partyIndex: p.team === "Red" ? 2 : 1,
            partyName: color.name,
            size: 2,
            color,
          };
        }
      }

      return null;
    },
  };
}
