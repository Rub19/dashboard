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

export function generateFallbackLolMatches(
  playerName = "Rub19",
  playerTag = "boss"
): LolMatch[] {
  const now = Date.now();
  const champions = [
    { name: "Ahri", id: 103, img: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/champion/Ahri.png" },
    { name: "Yasuo", id: 157, img: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/champion/Yasuo.png" },
    { name: "Jinx", id: 222, img: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/champion/Jinx.png" },
    { name: "Lee Sin", id: 64, img: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/champion/LeeSin.png" },
  ];

  return [
    {
      id: "lol-match-1",
      metadata: {
        modeName: "Classé Solo/Duo",
        result: "Victory",
        championName: champions[0].name,
        championId: champions[0].id,
        championImageUrl: champions[0].img,
        duration: 1820,
        timestamp: new Date(now - 1 * 3600 * 1000).toISOString(),
      },
      scoreboard: {
        players: [
          {
            name: playerName,
            tag: playerTag,
            team: "Blue",
            isMe: true,
            win: true,
            championId: champions[0].id,
            character: champions[0].name,
            level: 16,
            position: "MIDDLE",
            spells: [
              { name: "Flash", image: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/spell/SummonerFlash.png" },
              { name: "Ignite", image: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/spell/SummonerDot.png" },
            ],
            items: [],
            stats: {
              kills: 11,
              deaths: 2,
              assists: 9,
              kda: 10.0,
              cs: 215,
              csPerMin: 7.1,
              gold: 14800,
              goldPerMin: 488,
              damage: 28400,
              damagePerMin: 936,
              damageTaken: 14200,
              killParticipation: 72,
              visionScore: 28,
            },
          },
        ],
      },
      segments: [
        {
          type: "overview",
          stats: {
            kills: { value: 11, displayValue: "11" },
            deaths: { value: 2, displayValue: "2" },
            assists: { value: 9, displayValue: "9" },
            kda: { value: 10.0, displayValue: "10.00" },
            cs: { value: 215, displayValue: "215" },
            csPerMin: { value: 7.1, displayValue: "7.1" },
            damagePerMin: { value: 936, displayValue: "936" },
            goldPerMin: { value: 488, displayValue: "488" },
            totalDamageDealtToChampions: { value: 28400, displayValue: "28.4k" },
          },
        },
      ],
    },
    {
      id: "lol-match-2",
      metadata: {
        modeName: "Classé Solo/Duo",
        result: "Victory",
        championName: champions[1].name,
        championId: champions[1].id,
        championImageUrl: champions[1].img,
        duration: 1980,
        timestamp: new Date(now - 4 * 3600 * 1000).toISOString(),
      },
      scoreboard: {
        players: [
          {
            name: playerName,
            tag: playerTag,
            team: "Blue",
            isMe: true,
            win: true,
            championId: champions[1].id,
            character: champions[1].name,
            level: 17,
            position: "MIDDLE",
            spells: [
              { name: "Flash", image: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/spell/SummonerFlash.png" },
              { name: "Ignite", image: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/spell/SummonerDot.png" },
            ],
            items: [],
            stats: {
              kills: 14,
              deaths: 5,
              assists: 6,
              kda: 4.0,
              cs: 260,
              csPerMin: 7.9,
              gold: 16200,
              goldPerMin: 491,
              damage: 34100,
              damagePerMin: 1033,
              damageTaken: 22400,
              killParticipation: 64,
              visionScore: 21,
            },
          },
        ],
      },
      segments: [
        {
          type: "overview",
          stats: {
            kills: { value: 14, displayValue: "14" },
            deaths: { value: 5, displayValue: "5" },
            assists: { value: 6, displayValue: "6" },
            kda: { value: 4.0, displayValue: "4.00" },
            cs: { value: 260, displayValue: "260" },
            csPerMin: { value: 7.9, displayValue: "7.9" },
            damagePerMin: { value: 1033, displayValue: "1033" },
            goldPerMin: { value: 491, displayValue: "491" },
            totalDamageDealtToChampions: { value: 34100, displayValue: "34.1k" },
          },
        },
      ],
    },
    {
      id: "lol-match-3",
      metadata: {
        modeName: "Classé Solo/Duo",
        result: "Defeat",
        championName: champions[2].name,
        championId: champions[2].id,
        championImageUrl: champions[2].img,
        duration: 1640,
        timestamp: new Date(now - 8 * 3600 * 1000).toISOString(),
      },
      scoreboard: {
        players: [
          {
            name: playerName,
            tag: playerTag,
            team: "Blue",
            isMe: true,
            win: false,
            championId: champions[2].id,
            character: champions[2].name,
            level: 14,
            position: "BOTTOM",
            spells: [
              { name: "Flash", image: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/spell/SummonerFlash.png" },
              { name: "Heal", image: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/spell/SummonerHeal.png" },
            ],
            items: [],
            stats: {
              kills: 7,
              deaths: 6,
              assists: 4,
              kda: 1.83,
              cs: 190,
              csPerMin: 6.9,
              gold: 11400,
              goldPerMin: 417,
              damage: 19800,
              damagePerMin: 724,
              damageTaken: 16800,
              killParticipation: 48,
              visionScore: 18,
            },
          },
        ],
      },
      segments: [
        {
          type: "overview",
          stats: {
            kills: { value: 7, displayValue: "7" },
            deaths: { value: 6, displayValue: "6" },
            assists: { value: 4, displayValue: "4" },
            kda: { value: 1.83, displayValue: "1.83" },
            cs: { value: 190, displayValue: "190" },
            csPerMin: { value: 6.9, displayValue: "6.9" },
            damagePerMin: { value: 724, displayValue: "724" },
            goldPerMin: { value: 417, displayValue: "417" },
            totalDamageDealtToChampions: { value: 19800, displayValue: "19.8k" },
          },
        },
      ],
    },
  ];
}
