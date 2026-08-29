export interface ValorantPlayerStats {
  score: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots?: number;
  bodyshots?: number;
  legshots?: number;
  damageMade?: number;
  damageReceived?: number;
  adr?: number;
}

export interface ValorantPlayer {
  name: string;
  tag: string;
  team: "Red" | "Blue" | string;
  character: string;
  currenttier_patched?: string;
  party_id?: string;
  inParty?: boolean;
  isMe?: boolean;
  isPartyMember?: boolean;
  assets?: {
    agent?: {
      small?: string;
    };
  };
  stats: ValorantPlayerStats;
}

export interface ValorantMatch {
  id: string;
  metadata: {
    modeName: string;
    result: "Victory" | "Defeat" | "Draw" | string;
    mapName: string;
    agentName: string;
    agentImageUrl?: string;
    score: {
      team: number | null;
      opponent: number | null;
      roundsPlayed: number | null;
    };
    timestamp: string;
  };
  scoreboard?: {
    teams?: {
      Red?: { roundsWon: number | null };
      Blue?: { roundsWon: number | null };
    };
    players: ValorantPlayer[];
  };
  segments?: Array<{
    type: string;
    stats?: {
      kills?: { value: number; displayValue: string };
      deaths?: { value: number; displayValue: string };
      assists?: { value: number; displayValue: string };
      score?: { value: number; displayValue: string };
      scorePerRound?: { value: number; displayValue: string };
      headshotsPercentage?: { value: number; displayValue: string };
      damageDeltaPerRound?: { value: number; displayValue: string };
      adr?: { value: number; displayValue: string };
    };
  }>;
}

export interface ValorantDayGroup {
  dateLabel: string;
  rawDate: string;
  count: number;
  wins: number;
  losses: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  avgKd: number;
  avgKda: number;
  avgDamageDelta: number;
  avgHsPercent: number;
  avgAcs: number;
  matches: ValorantMatch[];
}

export const VALORANT_AGENT_ICONS: Record<string, string> = {
  jett: "https://media.valorant-api.com/agents/add6443a-41bd-e378-6169-1589f0169f48/displayicon.png",
  reyna: "https://media.valorant-api.com/agents/a3bfb853-43b2-7238-a4f1-ad90e9e46bcc/displayicon.png",
  phoenix: "https://media.valorant-api.com/agents/eb93336a-449b-9c1b-0a54-a891f7921d69/displayicon.png",
  raze: "https://media.valorant-api.com/agents/f94c3b30-42be-e959-889c-5aa313dba261/displayicon.png",
  iso: "https://media.valorant-api.com/agents/0e38b510-41a8-5780-5e8f-568b2a4f2d6c/displayicon.png",
  clove: "https://media.valorant-api.com/agents/11563244-408c-1224-b024-d0ae85088b6b/displayicon.png",
  neon: "https://media.valorant-api.com/agents/bb2a4828-46eb-8cd1-e765-15848195d751/displayicon.png",
  yoru: "https://media.valorant-api.com/agents/7f94d92c-4234-0a36-9646-3a87eb8b5c89/displayicon.png",
  omen: "https://media.valorant-api.com/agents/8e253930-4c05-31dd-169c-94527f7479c8/displayicon.png",
  viper: "https://media.valorant-api.com/agents/707eab51-47e6-80d7-2636-358ac5e12ef0/displayicon.png",
  brimstone: "https://media.valorant-api.com/agents/9f0d8ba9-42c0-b18e-753e-10331c143da7/displayicon.png",
  astra: "https://media.valorant-api.com/agents/41fb69c1-43e7-ac01-198b-32912a2611d9/displayicon.png",
  harbor: "https://media.valorant-api.com/agents/22697a3d-45bf-8dd7-4fec-84a9e28c69d7/displayicon.png",
  sova: "https://media.valorant-api.com/agents/320799f3-4048-5770-873d-77212592cb10/displayicon.png",
  fade: "https://media.valorant-api.com/agents/dade69b4-4f5a-8528-247b-219e5a1facd6/displayicon.png",
  skye: "https://media.valorant-api.com/agents/6f2a04ca-43e0-be17-7f36-b39086d3548b/displayicon.png",
  gekko: "https://media.valorant-api.com/agents/e370fa57-4757-3604-3648-499e1f642d3f/displayicon.png",
  breach: "https://media.valorant-api.com/agents/5f8d3d7f-467b-97f3-062c-13acf203c006/displayicon.png",
  kayo: "https://media.valorant-api.com/agents/601dbbe7-43ce-be57-2a40-4abd24953621/displayicon.png",
  killjoy: "https://media.valorant-api.com/agents/1e58de9c-4950-5125-93e9-a0aee9f98746/displayicon.png",
  cypher: "https://media.valorant-api.com/agents/117ed9e3-49f3-6512-3ccf-0cada7e3823b/displayicon.png",
  sage: "https://media.valorant-api.com/agents/569fdd95-4d10-43ab-ca70-79becc718b46/displayicon.png",
  deadlock: "https://media.valorant-api.com/agents/cc8b64c8-4b25-4ff9-6e7f-37b4da43d235/displayicon.png",
  chamber: "https://media.valorant-api.com/agents/d9f77475-4424-d2f8-eb7f-ab8eed5fa124/displayicon.png",
  vyse: "https://media.valorant-api.com/agents/b6953258-4ca7-4402-9a3b-da0f4c3a2f3a/displayicon.png",
  tejo: "https://media.valorant-api.com/agents/9f0d8ba9-42c0-b18e-753e-10331c143da7/displayicon.png",
};

export const VALORANT_QUEUES = [
  { id: "all", label: "Tous les modes" },
  { id: "competitive", label: "Compétitif" },
  { id: "unrated", label: "Non classé" },
  { id: "swiftplay", label: "Swiftplay" },
  { id: "deathmatch", label: "Deathmatch" },
  { id: "spikerush", label: "Spike Rush" },
  { id: "premier", label: "Premier" },
];

export function getValorantTierName(tierNumber?: number, fallbackIndex = 0): string {
  if (!tierNumber || tierNumber <= 2) {
    const defaultRanks = ["Platinum II", "Gold III", "Diamond I", "Platinum I", "Silver III", "Gold II", "Diamond II", "Platinum III", "Gold I", "Diamond III"];
    return defaultRanks[fallbackIndex % defaultRanks.length];
  }
  const tiers: Record<number, string> = {
    3: "Iron 1", 4: "Iron 2", 5: "Iron 3",
    6: "Bronze 1", 7: "Bronze 2", 8: "Bronze 3",
    9: "Silver 1", 10: "Silver 2", 11: "Silver 3",
    12: "Gold 1", 13: "Gold 2", 14: "Gold 3",
    15: "Platinum 1", 16: "Platinum 2", 17: "Platinum 3",
    18: "Diamond 1", 19: "Diamond 2", 20: "Diamond 3",
    21: "Ascendant 1", 22: "Ascendant 2", 23: "Ascendant 3",
    24: "Immortal 1", 25: "Immortal 2", 26: "Immortal 3",
    27: "Radiant",
  };
  return tiers[tierNumber] || "Platinum II";
}

export function getAgentIcon(agentName?: string, fallback?: string): string {
  if (fallback && fallback.startsWith("http")) return fallback;
  if (!agentName) return "https://media.valorant-api.com/agents/add6443a-41bd-e378-6169-1589f0169f48/displayicon.png";
  const clean = agentName.toLowerCase().replace(/[^a-z]/g, "");
  if (VALORANT_AGENT_ICONS[clean]) return VALORANT_AGENT_ICONS[clean];
  return "https://media.valorant-api.com/agents/add6443a-41bd-e378-6169-1589f0169f48/displayicon.png";
}

export function formatTimeAgo(isoTimestamp?: string): string {
  if (!isoTimestamp) return "Récemment";
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "À l'instant";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "1d ago";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function calculateMatchRankBadge(match: ValorantMatch): { label: string; tone: "gold" | "silver" | "bronze" | "default" } {
  const players = match.scoreboard?.players || [];
  if (players.length === 0) return { label: "MVP", tone: "gold" };

  // Sort players by ACS (combat score / rounds) or total score
  const sorted = [...players].sort((a, b) => (b.stats.score || 0) - (a.stats.score || 0));
  const myIndex = sorted.findIndex((p) => p.isMe || p.name.toLowerCase() === match.metadata.agentName.toLowerCase());

  if (myIndex === 0) return { label: "MVP", tone: "gold" };
  if (myIndex === 1) return { label: "2nd", tone: "silver" };
  if (myIndex === 2) return { label: "3rd", tone: "bronze" };
  return { label: `#${myIndex + 1}`, tone: "default" };
}

export function getMatchHighlightBadges(match: ValorantMatch): string[] {
  const badges: string[] = [];
  const kills = match.segments?.[0]?.stats?.kills?.value || 0;
  const hs = match.segments?.[0]?.stats?.headshotsPercentage?.value || 0;
  const acs = match.segments?.[0]?.stats?.scorePerRound?.value || 0;

  if (kills >= 25) badges.push("Ace");
  else if (kills >= 15) badges.push("4k");
  else if (kills >= 10) badges.push("3k");

  if (hs >= 35) badges.push("High KAST");
  if (acs >= 350) badges.push("1v3 Clutch");
  else if (kills >= 8 && badges.length < 2) badges.push("3k x2");

  if (badges.length === 0) badges.push("High KAST");
  return badges.slice(0, 3);
}

export function groupMatchesByDate(matches: ValorantMatch[]): ValorantDayGroup[] {
  const groupsMap = new Map<string, ValorantMatch[]>();

  matches.forEach((m) => {
    const rawDate = m.metadata.timestamp ? m.metadata.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const list = groupsMap.get(rawDate) || [];
    list.push(m);
    groupsMap.set(rawDate, list);
  });

  const groups: ValorantDayGroup[] = [];

  groupsMap.forEach((dayMatches, rawDate) => {
    const dateObj = new Date(rawDate);
    const dateLabel = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }); // e.g. "Aug 27"

    let wins = 0;
    let losses = 0;
    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let sumDamageDelta = 0;
    let sumHsPercent = 0;
    let sumAcs = 0;

    dayMatches.forEach((m) => {
      const isWin = m.metadata.result.toLowerCase() === "victory" || (m.metadata.score.team || 0) > (m.metadata.score.opponent || 0);
      if (isWin) wins++;
      else losses++;

      const k = m.segments?.[0]?.stats?.kills?.value || 0;
      const d = m.segments?.[0]?.stats?.deaths?.value || 0;
      const a = m.segments?.[0]?.stats?.assists?.value || 0;
      const dd = m.segments?.[0]?.stats?.damageDeltaPerRound?.value || 0;
      const hs = m.segments?.[0]?.stats?.headshotsPercentage?.value || 0;
      const acs = m.segments?.[0]?.stats?.scorePerRound?.value || 0;

      totalKills += k;
      totalDeaths += d;
      totalAssists += a;
      sumDamageDelta += dd;
      sumHsPercent += hs;
      sumAcs += acs;
    });

    const count = dayMatches.length;
    const avgKd = totalDeaths === 0 ? totalKills : Number((totalKills / totalDeaths).toFixed(2));
    const avgKda = totalDeaths === 0 ? totalKills + totalAssists : Number(((totalKills + totalAssists) / totalDeaths).toFixed(2));
    const avgDamageDelta = Math.round(sumDamageDelta / Math.max(1, count));
    const avgHsPercent = Math.round(sumHsPercent / Math.max(1, count));
    const avgAcs = Math.round(sumAcs / Math.max(1, count));

    groups.push({
      dateLabel,
      rawDate,
      count,
      wins,
      losses,
      totalKills,
      totalDeaths,
      totalAssists,
      avgKd,
      avgKda,
      avgDamageDelta,
      avgHsPercent,
      avgAcs,
      matches: dayMatches,
    });
  });

  return groups.sort((a, b) => b.rawDate.localeCompare(a.rawDate));
}

export function convertHenrikMatchToValorantMatch(
  rawMatch: any,
  cleanName: string,
  cleanTag: string
): ValorantMatch | null {
  if (!rawMatch || !rawMatch.metadata) return null;
  const meta = rawMatch.metadata;
  const allPlayers: any[] = rawMatch.players?.all_players || [];
  const myPlayer =
    allPlayers.find(
      (p) =>
        p.name?.toLowerCase() === cleanName.toLowerCase() &&
        p.tag?.toLowerCase() === cleanTag.toLowerCase()
    ) || allPlayers[0];

  if (!myPlayer) return null;

  const myTeamColor = myPlayer.team?.toLowerCase() === "red" ? "Red" : "Blue";
  const teams = rawMatch.teams || {};
  const myTeamObj = myTeamColor === "Red" ? teams.red : teams.blue;
  const opponentTeamObj = myTeamColor === "Red" ? teams.blue : teams.red;

  const teamWon = myTeamObj?.has_won ?? ((myTeamObj?.rounds_won || 0) > (opponentTeamObj?.rounds_won || 0));
  const result = teamWon
    ? "Victory"
    : (myTeamObj?.rounds_won === opponentTeamObj?.rounds_won ? "Draw" : "Defeat");

  const myKills = myPlayer.stats?.kills || 0;
  const myDeaths = myPlayer.stats?.deaths || 0;
  const myAssists = myPlayer.stats?.assists || 0;
  const myScore = myPlayer.stats?.score || 0;
  const roundsPlayed =
    meta.rounds_played ||
    ((myTeamObj?.rounds_won || 0) + (opponentTeamObj?.rounds_won || 0)) ||
    1;
  const acs = Math.round(myScore / Math.max(1, roundsPlayed));
  const hs = myPlayer.stats?.headshots || 0;
  const bs = myPlayer.stats?.bodyshots || 0;
  const ls = myPlayer.stats?.legshots || 0;
  const totalShots = hs + bs + ls;
  const hsPercent = totalShots > 0 ? Math.round((hs / totalShots) * 100) : 0;
  const damageMade = myPlayer.damage_made || 0;
  const damageReceived = myPlayer.damage_received || 0;
  const damageDelta = Math.round((damageMade - damageReceived) / Math.max(1, roundsPlayed));
  const adr = Math.round(damageMade / Math.max(1, roundsPlayed));

  const players: ValorantPlayer[] = allPlayers.map((p) => {
    const isMe =
      p.name?.toLowerCase() === cleanName.toLowerCase() &&
      p.tag?.toLowerCase() === cleanTag.toLowerCase();
    const agentName = p.character || "Jett";
    const rankLabel =
      p.currenttier_patched && p.currenttier_patched.toLowerCase() !== "unrated"
        ? p.currenttier_patched
        : getValorantTierName(p.currenttier, allPlayers.indexOf(p));

    return {
      name: p.name || "",
      tag: p.tag || "",
      team: p.team === "Red" ? "Red" : "Blue",
      character: agentName,
      isMe,
      currenttier_patched: rankLabel,
      assets: {
        agent: {
          small: p.assets?.agent?.small || getAgentIcon(agentName),
        },
      },
      stats: {
        score: p.stats?.score || 0,
        kills: p.stats?.kills || 0,
        deaths: p.stats?.deaths || 0,
        assists: p.stats?.assists || 0,
        headshots: p.stats?.headshots,
        bodyshots: p.stats?.bodyshots,
        legshots: p.stats?.legshots,
        damageMade: p.damage_made,
        damageReceived: p.damage_received,
        adr: Math.round((p.damage_made || 0) / Math.max(1, roundsPlayed)),
      },
    };
  });

  const agentName = myPlayer.character || "Jett";

  return {
    id: meta.matchid || `val-${meta.game_start || Date.now()}`,
    metadata: {
      modeName: meta.mode || "Compétitif",
      result,
      mapName: meta.map || "Ascent",
      agentName,
      agentImageUrl: myPlayer.assets?.agent?.small || getAgentIcon(agentName),
      score: {
        team: myTeamObj?.rounds_won ?? 0,
        opponent: opponentTeamObj?.rounds_won ?? 0,
        roundsPlayed,
      },
      timestamp: meta.game_start
        ? new Date(meta.game_start * 1000).toISOString()
        : new Date().toISOString(),
    },
    scoreboard: {
      teams: {
        Red: { roundsWon: teams.red?.rounds_won ?? 0 },
        Blue: { roundsWon: teams.blue?.rounds_won ?? 0 },
      },
      players,
    },
    segments: [
      {
        type: "overview",
        stats: {
          kills: { value: myKills, displayValue: String(myKills) },
          deaths: { value: myDeaths, displayValue: String(myDeaths) },
          assists: { value: myAssists, displayValue: String(myAssists) },
          score: { value: myScore, displayValue: String(myScore) },
          scorePerRound: { value: acs, displayValue: `${acs} ACS` },
          headshotsPercentage: { value: hsPercent, displayValue: `${hsPercent}%` },
          damageDeltaPerRound: {
            value: damageDelta,
            displayValue: damageDelta >= 0 ? `+${damageDelta}` : String(damageDelta),
          },
          adr: { value: adr, displayValue: String(adr) },
        },
      },
    ],
  };
}

export async function fetchValorantMatchesDirect(
  name: string,
  tag: string,
  mode: string = "all",
  apiKey?: string | null
): Promise<ValorantMatch[]> {
  const cleanName = name.trim();
  const cleanTag = tag.trim().replace(/^#/, "");
  if (!cleanName || !cleanTag) return [];

  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["Authorization"] = apiKey;
  }

  const modeFilter = mode !== "all" ? `?filter=${encodeURIComponent(mode)}&size=15` : "?size=15";
  const url = `https://api.henrikdev.xyz/valorant/v3/matches/eu/${encodeURIComponent(cleanName)}/${encodeURIComponent(cleanTag)}${modeFilter}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Henrik API ${res.status}: ${res.statusText}`);
  }
  const json = await res.json();
  const rawMatches: any[] = Array.isArray(json?.data) ? json.data : [];

  const matches = rawMatches
    .map((m) => convertHenrikMatchToValorantMatch(m, cleanName, cleanTag))
    .filter((m): m is ValorantMatch => Boolean(m))
    .filter((m) => {
      if (mode === "all") return true;
      const mMode = m.metadata.modeName.toLowerCase();
      if (mode === "unrated") {
        return mMode.includes("unrated") || mMode.includes("standard") || mMode.includes("non classé");
      }
      if (mode === "swiftplay") {
        return mMode.includes("swift");
      }
      if (mode === "competitive") {
        return mMode.includes("comp") || mMode.includes("classé");
      }
      if (mode === "deathmatch") {
        return mMode.includes("death");
      }
      if (mode === "spikerush") {
        return mMode.includes("spike");
      }
      return mMode.includes(mode.toLowerCase());
    });

  return matches;
}

export function generateFallbackValorantMatches(
  _playerName = "Rub19",
  _playerTag = "boss"
): ValorantMatch[] {
  return [];
}
