export interface EvalPlayer {
  puuid: string;
  name: string;
  tag: string;
  team: string;
  agent: string;
  agentId: string;
  tier: number;
  card: string;
  level: number;
  party: string;
  score: number;
  kills: number;
  deaths: number;
  assists: number;
  hs: number;
  bs: number;
  ls: number;
  dmg: number;
}

export interface EvalRound { n: number; winner: string; end: string; plant: string; site: string; defuse: string }
export interface EvalKill { r: number; t: number; k: string; v: string; w: string; a: string[] }

export interface EvalMatch {
  id: string;
  map: string;
  mapId: string;
  mode: string;
  queue: string;
  cluster?: string | null;
  startedAt: string | null;
  lengthSec: number;
  teams: { Red: { won: boolean; rounds: number }; Blue: { won: boolean; rounds: number } };
  players: EvalPlayer[];
  rounds?: EvalRound[];
  kills?: EvalKill[];
}

export interface EvalHistoryPoint {
  match: string;
  tier: number;
  rr: number;
  change: number;
}

export interface EvalAccount {
  puuid: string;
  name: string;
  tag: string;
  level: number | null;
  card: string | null;
  tier: number | null;
  mmr?: { tier?: number; rr?: number; peakTier?: number; leaderboardRank?: number; history?: EvalHistoryPoint[] };
}

const MEDIA = "https://media.valorant-api.com";
const RANKS: Record<number, string> = {
  3: "Fer 1", 4: "Fer 2", 5: "Fer 3", 6: "Bronze 1", 7: "Bronze 2", 8: "Bronze 3", 9: "Argent 1", 10: "Argent 2", 11: "Argent 3",
  12: "Or 1", 13: "Or 2", 14: "Or 3", 15: "Platine 1", 16: "Platine 2", 17: "Platine 3", 18: "Diamant 1", 19: "Diamant 2", 20: "Diamant 3",
  21: "Ascendant 1", 22: "Ascendant 2", 23: "Ascendant 3", 24: "Immortel 1", 25: "Immortel 2", 26: "Immortel 3", 27: "Radiant",
};
const MODES: Record<string, string> = {
  competitive: "Compétition", unrated: "Non classé", swiftplay: "Vélocité", spikerush: "Spike Rush", deathmatch: "Combat à mort",
  teamdeathmatch: "Combat en équipe", escalation: "Escalade", replication: "Réplication", premier: "Premier", custom: "Personnalisée",
};

export const rankName = (tier: number) => RANKS[tier] ?? "Non classé";
export const tierIcon = (tier: number) => `${MEDIA}/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/${tier}/largeicon.png`;
export const agentIcon = (id: string) => `${MEDIA}/agents/${id}/displayicon.png`;
export const mapImage = (id: string) => `${MEDIA}/maps/${id}/listviewicon.png`;
export const bannerImage = (card: string) => `${MEDIA}/playercards/${card}/wideart.png`;
export const weaponIcon = (id: string) => `${MEDIA}/weapons/${id}/killstreamicon.png`;
export const modeName = (mode: string) => MODES[mode.toLowerCase().replace(/[\s_-]/g, "")] ?? mode;

export function rankColor(tier: number): string {
  if (tier >= 27) return "#d4b13f";
  if (tier >= 24) return "#fd5b68";
  if (tier >= 21) return "#2dd4a0";
  if (tier >= 18) return "#c084fc";
  if (tier >= 15) return "#3fc1c9";
  if (tier >= 12) return "#e8c15a";
  if (tier >= 9) return "#c7c7cf";
  if (tier >= 6) return "#c08457";
  return "#8e8e93";
}

export function splitRiotId(value: string): { name: string; tag: string } | null {
  const [name, tag, extra] = value.split("#").map((part) => part.trim());
  return name && tag && extra === undefined ? { name, tag } : null;
}

const rounds = (match: EvalMatch) => match.teams.Red.rounds + match.teams.Blue.rounds;
const headshots = (player: EvalPlayer) => {
  const shots = player.hs + player.bs + player.ls;
  return shots === 0 ? 0 : Math.round((player.hs / shots) * 100);
};

export function matchLine(player: EvalPlayer, match: EvalMatch) {
  const count = Math.max(1, rounds(match));
  return {
    acs: Math.round(player.score / count),
    adr: Math.round(player.dmg / count),
    hs: headshots(player),
    kd: player.kills / Math.max(1, player.deaths),
  };
}

export function matchSummary(match: EvalMatch, puuid: string) {
  const me = match.players.find((player) => player.puuid === puuid);
  if (!me) return null;
  const mine = me.team === "Red" ? match.teams.Red : match.teams.Blue;
  const other = me.team === "Red" ? match.teams.Blue : match.teams.Red;
  const sorted = [...match.players].sort((left, right) => right.score - left.score);
  const mvp = sorted[0]?.puuid === puuid ? "match" : sorted.find((player) => player.team === me.team)?.puuid === puuid ? "team" : null;
  return { me, won: mine.won, draw: mine.rounds === other.rounds, score: [mine.rounds, other.rounds] as const, mvp, ...matchLine(me, match) };
}

export function statsFor(matches: EvalMatch[], puuid: string) {
  const lines = matches.flatMap((match) => {
    const summary = matchSummary(match, puuid);
    return summary ? [{ ...summary, rounds: rounds(match) }] : [];
  });
  const sum = (pick: (line: (typeof lines)[number]) => number) => lines.reduce((total, line) => total + pick(line), 0);
  const count = lines.length;
  const wins = lines.filter((line) => line.won).length;
  const draws = lines.filter((line) => line.draw).length;
  return {
    count,
    wins,
    losses: count - wins - draws,
    winRate: count ? (wins / count) * 100 : 0,
    kd: sum((line) => line.me.kills) / Math.max(1, sum((line) => line.me.deaths)),
    hs: count ? Math.round(sum((line) => line.hs) / count) : 0,
    adr: Math.round(sum((line) => line.me.dmg) / Math.max(1, sum((line) => line.rounds))),
  };
}

export function lastSession(matches: EvalMatch[]): EvalMatch[] {
  const session: EvalMatch[] = [];
  for (const match of matches) {
    if (!match.startedAt) break;
    const previous = session.at(-1)?.startedAt;
    if (previous && Date.parse(previous) - Date.parse(match.startedAt) > 3 * 3600 * 1000) break;
    session.push(match);
  }
  return session;
}

export function roundsFor(match: EvalMatch, puuid: string) {
  const me = match.players.find((player) => player.puuid === puuid);
  return (match.rounds ?? []).map((round) => {
    const kills = (match.kills ?? []).filter((kill) => kill.r === round.n);
    return { ...round, won: round.winner === me?.team, kills: kills.filter((kill) => kill.k === puuid).length, died: kills.some((kill) => kill.v === puuid), total: kills.length };
  });
}

export function matchAnalysis(match: EvalMatch, puuid: string) {
  const rounds = match.rounds ?? [];
  const kills = match.kills ?? [];
  const team = new Map(match.players.map((player) => [player.puuid, player.team]));
  const me = team.get(puuid);
  let good = 0;
  let firstKills = 0;
  let firstDeaths = 0;
  for (const round of rounds) {
    const inRound = kills.filter((kill) => kill.r === round.n).sort((left, right) => left.t - right.t);
    if (inRound[0]?.k === puuid) firstKills++;
    if (inRound[0]?.v === puuid) firstDeaths++;
    const death = inRound.find((kill) => kill.v === puuid);
    const involved = inRound.some((kill) => kill.k === puuid || kill.a.includes(puuid));
    const traded = death ? inRound.some((kill) => kill.v === death.k && kill.t >= death.t && kill.t - death.t <= 5000 && team.get(kill.k) === me) : false;
    if (involved || !death || traded) good++;
  }
  return {
    kast: rounds.length ? Math.round((good / rounds.length) * 100) : 0,
    firstKills,
    firstDeaths,
    plants: rounds.filter((round) => round.plant === puuid).length,
    defuses: rounds.filter((round) => round.defuse === puuid).length,
  };
}

export function scoreboard(match: EvalMatch, puuid: string) {
  const me = match.players.find((player) => player.puuid === puuid);
  const order = me?.team === "Blue" ? (["Blue", "Red"] as const) : (["Red", "Blue"] as const);
  return order.map((team) => ({
    team,
    ...match.teams[team],
    players: match.players.filter((player) => player.team === team).sort((left, right) => right.score - left.score),
  }));
}
