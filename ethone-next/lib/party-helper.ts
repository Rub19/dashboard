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

function normalizePlayerKey(p?: { name?: string; tag?: string; puuid?: string } | null): string {
  if (!p) return "";
  const name = (p.name || "").trim().toLowerCase();
  const tag = (p.tag || "").trim().toLowerCase().replace(/^#/, "");
  if (name && tag) return `${name}#${tag}`;
  return name;
}

function extractMatchPlayers<T>(match: any): T[] {
  if (!match) return [];
  if (Array.isArray(match.scoreboard?.players)) return match.scoreboard.players;
  if (Array.isArray(match.players)) return match.players;
  if (Array.isArray(match.players?.all)) return match.players.all;
  return [];
}

function getStoredMatches(): any[] {
  if (typeof window === "undefined") return [];
  const stored: any[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("ethone-lol-cache:")) {
        const item = localStorage.getItem(k);
        if (item) {
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed?.matches)) {
            stored.push(...parsed.matches);
          }
        }
      }
    }
  } catch {}
  return stored;
}

function buildConfirmedDuoPairs<T extends { name?: string; tag?: string; team?: string; isMe?: boolean }>(
  allMatches: any[]
): Set<string> {
  const pairCounts = new Map<string, number>();
  const confirmed = new Set<string>();

  confirmed.add("doretdebriar#jul:::rub19#boss");

  if (typeof window !== "undefined") {
    try {
      const storageKey = "ethone:tracker:known-duos";
      const cachedRaw = localStorage.getItem(storageKey);
      const cachedList: string[] = cachedRaw ? JSON.parse(cachedRaw) : [];
      for (const p of cachedList) {
        confirmed.add(p);
      }
    } catch {}
  }

  for (const match of allMatches) {
    const list = extractMatchPlayers<T>(match);
    if (!list.length) continue;

    const teamGroups: Record<string, T[]> = {};
    for (const pl of list) {
      const tm = pl.team || "Blue";
      if (!teamGroups[tm]) teamGroups[tm] = [];
      teamGroups[tm].push(pl);
    }

    for (const teamMembers of Object.values(teamGroups)) {
      for (let i = 0; i < teamMembers.length; i++) {
        for (let j = i + 1; j < teamMembers.length; j++) {
          const kA = normalizePlayerKey(teamMembers[i]);
          const kB = normalizePlayerKey(teamMembers[j]);
          if (!kA || !kB || kA === kB) continue;
          const pairKey = kA < kB ? `${kA}:::${kB}` : `${kB}:::${kA}`;
          const count = (pairCounts.get(pairKey) || 0) + 1;
          pairCounts.set(pairKey, count);
          if (count >= 2) {
            confirmed.add(pairKey);
          }
        }
      }
    }
  }

  if (typeof window !== "undefined") {
    try {
      const storageKey = "ethone:tracker:known-duos";
      const toSave = Array.from(confirmed).slice(0, 150);
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch {}
  }

  return confirmed;
}

export function computePartyMap<T extends { party_id?: string; team?: string; isMe?: boolean; name?: string; tag?: string; puuid?: string }>(
  players: T[],
  allMatches?: any[]
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
  if (hasAnyExplicitParty) {
    return {
      getParty: (p: T) => {
        if (p.party_id) {
          const key = `${p.team || "neutral"}:${p.party_id}`;
          return partyColorMap[key] || null;
        }
        return null;
      },
    };
  }

  const matchesToInspect: any[] = [];
  if (Array.isArray(allMatches) && allMatches.length > 0) {
    matchesToInspect.push(...allMatches);
  } else {
    matchesToInspect.push(...getStoredMatches<T>());
  }

  const confirmedPairs = buildConfirmedDuoPairs<T>(matchesToInspect);
  const playerPartyByPlayerKey: Record<string, PlayerPartyInfo> = {};

  const teamGroups: Record<string, T[]> = {};
  for (const p of players) {
    const tm = p.team || "Blue";
    if (!teamGroups[tm]) teamGroups[tm] = [];
    teamGroups[tm].push(p);
  }

  for (const teamMembers of Object.values(teamGroups)) {
    const adj: Record<string, Set<string>> = {};
    for (const p of teamMembers) {
      const k = normalizePlayerKey(p);
      if (k) adj[k] = new Set();
    }

    for (let i = 0; i < teamMembers.length; i++) {
      for (let j = i + 1; j < teamMembers.length; j++) {
        const kA = normalizePlayerKey(teamMembers[i]);
        const kB = normalizePlayerKey(teamMembers[j]);
        if (!kA || !kB || kA === kB) continue;
        const pairKey = kA < kB ? `${kA}:::${kB}` : `${kB}:::${kA}`;
        if (confirmedPairs.has(pairKey)) {
          adj[kA].add(kB);
          adj[kB].add(kA);
        }
      }
    }

    const visited = new Set<string>();
    for (const p of teamMembers) {
      const k = normalizePlayerKey(p);
      if (!k || visited.has(k)) continue;

      const component: string[] = [];
      const queue = [k];
      visited.add(k);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        component.push(curr);
        for (const neighbor of adj[curr] || []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      if (component.length >= 2) {
        const color = PARTY_COLORS[nextColorIdx % PARTY_COLORS.length];
        const partyInfo: PlayerPartyInfo = {
          partyIndex: nextColorIdx + 1,
          partyName: color.name,
          size: component.length,
          color,
        };
        nextColorIdx++;
        for (const memberKey of component) {
          playerPartyByPlayerKey[memberKey] = partyInfo;
        }
      }
    }
  }

  return {
    getParty: (p: T) => {
      const key = normalizePlayerKey(p);
      return playerPartyByPlayerKey[key] || null;
    },
  };
}
