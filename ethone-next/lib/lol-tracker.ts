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

export const LOL_QUEUES = [
  { id: "all", label: "Tous les modes", queueId: null },
  { id: "ranked_solo_duo", label: "Classé Solo / Duo", queueId: 420 },
  { id: "ranked_flex", label: "Classé Flex 5v5", queueId: 440 },
  { id: "draft", label: "Partie normale (Draft)", queueId: 400 },
  { id: "blind", label: "Partie normale (Blind / Quickplay)", queueId: 490 },
  { id: "aram", label: "ARAM (Abîme Hurlant)", queueId: 450 },
  { id: "arena", label: "Arena (2v2v2v2)", queueId: 1700 },
  { id: "clash", label: "Tournois Clash", queueId: 700 },
];

export async function fetchLolMatchesDirect(
  name: string,
  tag: string,
  queue: string = "all",
  apiKey?: string | null
): Promise<LolMatch[]> {
  const cleanName = name.trim();
  const cleanTag = tag.trim().replace(/^#/, "");
  if (!cleanName || !cleanTag) return [];

  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["X-Riot-Token"] = apiKey;
  }

  // 1. Account by Riot ID
  const accountUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(cleanName)}/${encodeURIComponent(cleanTag)}`;
  const accRes = await fetch(accountUrl, { headers });
  if (!accRes.ok) {
    throw new Error(`Riot API Account: ${accRes.status}`);
  }
  const accJson = await accRes.json();
  const puuid = accJson.puuid;
  if (!puuid) return [];

  // 2. Matches IDs by PUUID
  const qObj = LOL_QUEUES.find((q) => q.id === queue);
  const queueParam = qObj?.queueId ? `&queue=${qObj.queueId}` : "";
  const matchIdsUrl = `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?count=10${queueParam}`;
  const idsRes = await fetch(matchIdsUrl, { headers });
  if (!idsRes.ok) {
    throw new Error(`Riot API Match IDs: ${idsRes.status}`);
  }
  const matchIds: string[] = await idsRes.json();
  if (!Array.isArray(matchIds) || matchIds.length === 0) return [];

  // 3. Fetch each match in parallel
  const matchDetails = await Promise.allSettled(
    matchIds.slice(0, 8).map(async (mId) => {
      const mUrl = `https://europe.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(mId)}`;
      const mRes = await fetch(mUrl, { headers });
      if (!mRes.ok) return null;
      return mRes.json();
    })
  );

  const validMatches: LolMatch[] = [];

  for (const item of matchDetails) {
    if (item.status === "fulfilled" && item.value) {
      const matchData = item.value;
      const info = matchData.info || {};
      const participants: any[] = info.participants || [];
      const me =
        participants.find(
          (p) =>
            p.puuid === puuid ||
            p.riotIdGameName?.toLowerCase() === cleanName.toLowerCase()
        ) || participants[0];
      if (!me) continue;

      const duration = info.gameDuration || 1;
      const durationMin = duration / 60;
      const kills = me.kills || 0;
      const deaths = me.deaths || 0;
      const assists = me.assists || 0;
      const kda =
        deaths === 0
          ? kills + assists
          : Number(((kills + assists) / deaths).toFixed(2));
      const cs = (me.totalMinionsKilled || 0) + (me.neutralMinionsKilled || 0);
      const csPerMin = Number((cs / Math.max(1, durationMin)).toFixed(1));
      const damage = me.totalDamageDealtToChampions || 0;
      const damagePerMin = Math.round(damage / Math.max(1, durationMin));
      const gold = me.goldEarned || 0;
      const goldPerMin = Math.round(gold / Math.max(1, durationMin));

      const modeName =
        info.gameMode === "ARAM"
          ? "ARAM"
          : info.queueId === 420
          ? "Classé Solo/Duo"
          : info.queueId === 440
          ? "Classé Flex"
          : info.queueId === 400
          ? "Draft Normale"
          : info.queueId === 1700
          ? "Arena"
          : info.gameMode || "Classé";

      const championName = me.championName || "Ahri";
      const championImg = `https://ddragon.leagueoflegends.com/cdn/14.16.1/img/champion/${championName}.png`;

      const players: LolPlayer[] = participants.map((p) => {
        const isMe =
          p.puuid === puuid ||
          p.riotIdGameName?.toLowerCase() === cleanName.toLowerCase();
        return {
          name: p.riotIdGameName || p.summonerName || "",
          tag: p.riotIdTagline || "",
          team: p.teamId === 100 ? "Blue" : "Red",
          isMe,
          win: Boolean(p.win),
          championId: p.championId,
          character: p.championName,
          level: p.champLevel || 1,
          position: p.teamPosition || p.individualPosition || "",
          spells: [
            {
              name: "Spell 1",
              image: `https://ddragon.leagueoflegends.com/cdn/14.16.1/img/spell/SummonerFlash.png`,
            },
          ],
          items: [],
          stats: {
            kills: p.kills || 0,
            deaths: p.deaths || 0,
            assists: p.assists || 0,
            kda:
              p.deaths === 0
                ? p.kills + p.assists
                : Number(((p.kills + p.assists) / p.deaths).toFixed(2)),
            cs: (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0),
            csPerMin: Number(
              ((p.totalMinionsKilled || 0) / Math.max(1, durationMin)).toFixed(1)
            ),
            gold: p.goldEarned || 0,
            goldPerMin: Math.round((p.goldEarned || 0) / Math.max(1, durationMin)),
            damage: p.totalDamageDealtToChampions || 0,
            damagePerMin: Math.round(
              (p.totalDamageDealtToChampions || 0) / Math.max(1, durationMin)
            ),
          },
        };
      });

      validMatches.push({
        id: matchData.metadata?.matchId || `lol-${info.gameCreation || Date.now()}`,
        metadata: {
          modeName,
          result: me.win ? "Victory" : "Defeat",
          championName,
          championId: me.championId,
          championImageUrl: championImg,
          duration,
          timestamp: info.gameCreation
            ? new Date(info.gameCreation).toISOString()
            : new Date().toISOString(),
        },
        scoreboard: {
          players,
        },
        segments: [
          {
            type: "overview",
            stats: {
              kills: { value: kills, displayValue: String(kills) },
              deaths: { value: deaths, displayValue: String(deaths) },
              assists: { value: assists, displayValue: String(assists) },
              kda: { value: kda, displayValue: kda.toFixed(2) },
              cs: { value: cs, displayValue: String(cs) },
              csPerMin: { value: csPerMin, displayValue: String(csPerMin) },
              damagePerMin: { value: damagePerMin, displayValue: String(damagePerMin) },
              goldPerMin: { value: goldPerMin, displayValue: String(goldPerMin) },
              totalDamageDealtToChampions: {
                value: damage,
                displayValue: `${(damage / 1000).toFixed(1)}k`,
              },
            },
          },
        ],
      });
    }
  }

  return validMatches;
}

export function generateFallbackLolMatches(
  _playerName = "Rub19",
  _playerTag = "boss"
): LolMatch[] {
  return [];
}
