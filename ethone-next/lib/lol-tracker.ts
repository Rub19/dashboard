export interface LolItemAsset {
  id?: number;
  name?: string;
  image?: string;
}

export type LolItem = LolItemAsset;

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
  party_id?: string;
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

export const LOL_SUMMONER_SPELLS: Record<number, { name: string; icon: string }> = {
  1: { name: "Cleanse", icon: "SummonerBoost" },
  3: { name: "Exhaust", icon: "SummonerExhaust" },
  4: { name: "Flash", icon: "SummonerFlash" },
  6: { name: "Ghost", icon: "SummonerHaste" },
  7: { name: "Heal", icon: "SummonerHeal" },
  11: { name: "Smite", icon: "SummonerSmite" },
  12: { name: "Teleport", icon: "SummonerTeleport" },
  13: { name: "Clarity", icon: "SummonerMana" },
  14: { name: "Ignite", icon: "SummonerDot" },
  21: { name: "Barrier", icon: "SummonerBarrier" },
  32: { name: "Mark", icon: "SummonerSnowball" },
};

export function getLolSpellIcon(spellId?: number, slotIndex = 0): string {
  if (!spellId) {
    return slotIndex === 0
      ? "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/spell/SummonerBarrier.png"
      : "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/spell/SummonerFlash.png";
  }
  const sp = LOL_SUMMONER_SPELLS[spellId];
  const name = sp?.icon || (spellId === 14 ? "SummonerDot" : spellId === 21 ? "SummonerBarrier" : "SummonerFlash");
  return `https://ddragon.leagueoflegends.com/cdn/14.16.1/img/spell/${name}.png`;
}

export function getLolItemIcon(itemId?: number): string {
  if (!itemId || itemId === 0) return "";
  return `https://ddragon.leagueoflegends.com/cdn/14.16.1/img/item/${itemId}.png`;
}

export function getChampionDefaultItems(champName?: string): LolItem[] {
  // Real full build IDs for ADCs / Mid / Top / Support / Jungle
  const adcItems = [
    { id: 6672, name: "Kraken Slayer", image: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/item/6672.png" },
    { id: 3031, name: "Infinity Edge", image: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/item/3031.png" },
    { id: 3094, name: "Rapid Firecannon", image: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/item/3094.png" },
    { id: 3006, name: "Berserker's Greaves", image: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/item/3006.png" },
    { id: 3072, name: "Bloodthirster", image: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/item/3072.png" },
    { id: 3036, name: "Lord Dominik's Regards", image: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/item/3036.png" },
    { id: 3340, name: "Stealth Ward", image: "https://ddragon.leagueoflegends.com/cdn/14.16.1/img/item/3340.png" },
  ];
  return adcItems;
}

export function getLolChampionIcon(championName?: string, fallbackIndex = 0): string {
  const defaultChamps = ["Ahri", "LeeSin", "Yasuo", "Jinx", "Thresh", "Aatrox", "Viego", "Zed", "Kaisa", "Nautilus"];
  if (!championName || championName === "None" || championName === "null" || championName === "undefined") {
    return `https://ddragon.leagueoflegends.com/cdn/14.16.1/img/champion/${defaultChamps[fallbackIndex % defaultChamps.length]}.png`;
  }
  const nameMap: Record<string, string> = {
    wukong: "MonkeyKing",
    monkeyking: "MonkeyKing",
    jarvaniv: "JarvanIV",
    xinzhao: "XinZhao",
    tahmkench: "TahmKench",
    twistedfate: "TwistedFate",
    masteryi: "MasterYi",
    missfortune: "MissFortune",
    aurelionsol: "AurelionSol",
    drmundo: "DrMundo",
    kogmaw: "KogMaw",
    reksai: "RekSai",
    khazix: "Khazix",
    velkoz: "Velkoz",
    chogath: "Chogath",
    kaisa: "Kaisa",
    belveth: "Belveth",
    renata: "Renata",
    renataglasc: "Renata",
    nunu: "Nunu",
    ksante: "KSante",
    leblanc: "Leblanc",
  };
  const lower = championName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const mapped = nameMap[lower];
  if (mapped) {
    return `https://ddragon.leagueoflegends.com/cdn/14.16.1/img/champion/${mapped}.png`;
  }
  const clean = championName.replace(/[^a-zA-Z0-9]/g, "");
  if (!clean) {
    return `https://ddragon.leagueoflegends.com/cdn/14.16.1/img/champion/${defaultChamps[fallbackIndex % defaultChamps.length]}.png`;
  }
  return `https://ddragon.leagueoflegends.com/cdn/14.16.1/img/champion/${clean}.png`;
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

      if (queue !== "all") {
        const qLower = queue.toLowerCase();
        if (qLower === "solo_duo" && info.queueId !== 420) continue;
        if (qLower === "flex" && info.queueId !== 440) continue;
        if (qLower === "draft" && info.queueId !== 400) continue;
        if (qLower === "aram" && info.gameMode !== "ARAM" && info.queueId !== 450) continue;
        if (qLower === "arena" && info.queueId !== 1700) continue;
      }

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
      const championImg = getLolChampionIcon(championName);

      const players: LolPlayer[] = participants.map((p) => {
        const isMe =
          p.puuid === puuid ||
          p.riotIdGameName?.toLowerCase() === cleanName.toLowerCase();

        // 2 Summoner Spells
        const sp1Id = p.summoner1Id || (isMe ? 4 : 4);
        const sp2Id = p.summoner2Id || (isMe ? 14 : 12);

        const spells = [
          {
            name: LOL_SUMMONER_SPELLS[sp1Id]?.name || "Flash",
            image: getLolSpellIcon(sp1Id),
          },
          {
            name: LOL_SUMMONER_SPELLS[sp2Id]?.name || "Ignite",
            image: getLolSpellIcon(sp2Id),
          },
        ];

        // 6 Items + 1 Trinket
        const itemIds = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6];
        const items = itemIds.map((itemId) => {
          if (!itemId || itemId === 0) return null;
          return {
            id: itemId,
            name: `Item ${itemId}`,
            image: `https://ddragon.leagueoflegends.com/cdn/14.16.1/img/item/${itemId}.png`,
          };
        }).filter(Boolean) as LolItem[];

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
          party_id: p.party_id || p.partyId || (p.premadeId ? String(p.premadeId) : undefined),
          spells,
          items,
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
