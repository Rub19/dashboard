export interface LolItemAsset {
  id?: number;
  name?: string;
  image?: string;
}

export interface LolSpellAsset {
  name?: string;
  image?: string;
}

export interface LolRuneAsset {
  name?: string;
  image?: string;
}

export interface LolPlayerStats {
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  cs: number;
  csPerMin: number;
  gold: number;
  goldPerMin: number;
  damage: number;
  damagePerMin: number;
  damageTaken?: number;
  killParticipation?: number;
  visionScore?: number;
}

export interface LolPlayer {
  name: string;
  tag: string;
  team: "Blue" | "Red" | string;
  isMe: boolean;
  win: boolean;
  championId: number;
  character: string;
  level: number;
  position?: string;
  spells: LolSpellAsset[];
  items: LolItemAsset[];
  rune?: LolRuneAsset;
  assets?: {
    champion?: {
      small?: string;
    };
  };
  stats: LolPlayerStats;
}

export interface LolMatch {
  id: string;
  metadata: {
    modeName: string;
    result: "Victory" | "Defeat" | string;
    mapName?: string;
    championName?: string;
    championId?: number;
    championImageUrl?: string;
    duration?: number;
    timestamp: string;
  };
  scoreboard?: {
    teams?: {
      Blue?: { kills: number; won: boolean; gold: number; damage: number };
      Red?: { kills: number; won: boolean; gold: number; damage: number };
    };
    players: LolPlayer[];
  };
  segments?: Array<{
    type: string;
    stats?: {
      kills?: { value: number; displayValue: string };
      deaths?: { value: number; displayValue: string };
      assists?: { value: number; displayValue: string };
      kda?: { value: number; displayValue: string };
      cs?: { value: number; displayValue: string };
      csPerMin?: { value: number; displayValue: string };
      damagePerMin?: { value: number; displayValue: string };
      goldPerMin?: { value: number; displayValue: string };
      totalDamageDealtToChampions?: { value: number; displayValue: string };
    };
  }>;
}

export interface LolDayGroup {
  dateLabel: string;
  rawDate: string;
  count: number;
  wins: number;
  losses: number;
  avgDpm: number;
  avgKda: number;
  avgGpm: number;
  matches: LolMatch[];
}

export function formatLolDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "25m 00s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

export function formatLolTimeAgo(isoTimestamp?: string): string {
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
  if (diffDays < 14) return "1w ago";
  if (diffDays < 21) return "2w ago";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function calculateLolTRS(player?: LolPlayer): number {
  if (!player) return 100;
  const kda = player.stats.kda || 1;
  const dpm = player.stats.damagePerMin || 300;
  const csMin = player.stats.csPerMin || 5;

  let trs = Math.round(kda * 120 + dpm * 0.4 + csMin * 35);
  if (player.win) trs += 150;
  return Math.min(999, Math.max(100, trs));
}

export function groupLolMatchesByDate(matches: LolMatch[]): LolDayGroup[] {
  const groupsMap = new Map<string, LolMatch[]>();

  matches.forEach((m) => {
    const rawDate = m.metadata?.timestamp ? m.metadata.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const list = groupsMap.get(rawDate) || [];
    list.push(m);
    groupsMap.set(rawDate, list);
  });

  const groups: LolDayGroup[] = [];

  groupsMap.forEach((dayMatches, rawDate) => {
    const dateObj = new Date(rawDate);
    const dateLabel = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }); // e.g. "Aug 26"

    let wins = 0;
    let losses = 0;
    let sumDpm = 0;
    let sumKda = 0;
    let sumGpm = 0;

    dayMatches.forEach((m) => {
      const isWin = m.metadata?.result?.toLowerCase() === "victory";
      if (isWin) wins++;
      else losses++;

      const me = m.scoreboard?.players?.find((p) => p.isMe) || m.scoreboard?.players?.[0];
      const dpm = me?.stats?.damagePerMin || m.segments?.[0]?.stats?.damagePerMin?.value || 400;
      const kda = me?.stats?.kda || m.segments?.[0]?.stats?.kda?.value || 1.5;
      const gpm = me?.stats?.goldPerMin || m.segments?.[0]?.stats?.goldPerMin?.value || 350;

      sumDpm += dpm;
      sumKda += kda;
      sumGpm += gpm;
    });

    const count = dayMatches.length;
    const avgDpm = Math.round((sumDpm / Math.max(1, count)) * 10) / 10;
    const avgKda = Number((sumKda / Math.max(1, count)).toFixed(2));
    const avgGpm = Math.round((sumGpm / Math.max(1, count)) * 10) / 10;

    groups.push({
      dateLabel,
      rawDate,
      count,
      wins,
      losses,
      avgDpm,
      avgKda,
      avgGpm,
      matches: dayMatches,
    });
  });

  return groups.sort((a, b) => b.rawDate.localeCompare(a.rawDate));
}
