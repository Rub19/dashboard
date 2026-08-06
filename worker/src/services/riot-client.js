import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safePublicUrl, safeStats, safeText } from "../utils/normalize.js";

const RIOT_EUROPE = "https://europe.api.riotgames.com";
const DDRAGON_LOL_VERSION = "16.15.1";

async function getPuuid(env, name, tag, apiKey) {
  const path = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  const response = await requestExternal(new URL(path, RIOT_EUROPE), {
    env,
    expectedOrigin: RIOT_EUROPE,
    service: "tracker",
    dedupeKey: `riot:account:${name.toLowerCase()}:${tag.toLowerCase()}`,
    headers: { "X-Riot-Token": apiKey },
    retries: 1
  });
  return response.data?.puuid;
}

export async function getLolProfile(env, riotId, apiKeyOverride) {
  const apiKey = apiKeyOverride || requireSecret(env, "RIOT_API_KEY");
  const [name, tag] = riotId.split("#");
  
  const puuid = await getPuuid(env, name, tag, apiKey);
  if (!puuid) return null;
  
  // Try to find the platform ID from recent matches
  const matchIdsPath = `/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=1`;
  const matchIdsResponse = await requestExternal(new URL(matchIdsPath, RIOT_EUROPE), {
    env,
    expectedOrigin: RIOT_EUROPE,
    service: "tracker",
    dedupeKey: `riot:recent_match:${puuid}`,
    headers: { "X-Riot-Token": apiKey },
    retries: 1
  });
  
  const matchIds = matchIdsResponse.data || [];
  const platformId = matchIds.length > 0 ? matchIds[0].split("_")[0].toLowerCase() : "euw1";
  const platformOrigin = `https://${platformId}.api.riotgames.com`;
  
  // Fetch summoner
  const summonerPath = `/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  const summonerResponse = await requestExternal(new URL(summonerPath, platformOrigin), {
    env,
    expectedOrigin: platformOrigin,
    service: "tracker",
    dedupeKey: `riot:summoner:${puuid}`,
    headers: { "X-Riot-Token": apiKey },
    retries: 1
  });
  
  const summoner = summonerResponse.data || {};
  
  // Fetch league
  let tier = "Unranked";
  let lp = 0;
  if (summoner.id) {
    const leaguePath = `/lol/league/v4/entries/by-summoner/${summoner.id}`;
    const leagueResponse = await requestExternal(new URL(leaguePath, platformOrigin), {
      env,
      expectedOrigin: platformOrigin,
      service: "tracker",
      dedupeKey: `riot:league:${summoner.id}`,
      headers: { "X-Riot-Token": apiKey },
      retries: 1
    });
    const leagues = leagueResponse.data || [];
    const soloq = leagues.find(l => l.queueType === "RANKED_SOLO_5x5") || leagues[0];
    if (soloq) {
      tier = `${soloq.tier} ${soloq.rank}`;
      lp = soloq.leaguePoints;
    }
  }

  return Object.freeze({
    platform: "riot",
    identifier: riotId,
    handle: riotId,
    avatarUrl: safePublicUrl(`https://ddragon.leagueoflegends.com/cdn/${DDRAGON_LOL_VERSION}/img/profileicon/${summoner.profileIconId || 1}.png`, ["leagueoflegends.com"]),
    segments: Object.freeze([{
      type: "overview",
      name: "Ranked",
      stats: safeStats({
        rank: { value: 0, displayValue: tier },
        lp: { value: lp, displayValue: `${lp} LP` },
        level: { value: summoner.summonerLevel || 0, displayValue: String(summoner.summonerLevel || 0) }
      })
    }])
  });
}

const LOL_QUEUE_NAMES = Object.freeze({
  400: "Normal Draft Pick",
  420: "Ranked Solo",
  430: "Normal Blind Pick",
  440: "Ranked Flex",
  450: "ARAM",
  700: "Clash",
  900: "URF",
  920: "Nexus Blitz",
  1300: "Nexus Blitz",
  1400: "Ultimate Spellbook"
});

const LOL_MAPS = Object.freeze({
  11: "Summoner's Rift",
  12: "Howling Abyss",
  21: "Nexus Blitz",
  22: "ARAM"
});

const LOL_QUEUE_MODES = Object.freeze({
  ranked: Object.freeze([420, 440]),
  normal: Object.freeze([400, 430]),
  aram: Object.freeze([450])
});

function lolQueueName(queueId) {
  return LOL_QUEUE_NAMES[queueId] || "Custom";
}

function lolMapName(mapId) {
  return LOL_MAPS[mapId] || `Map ${mapId}`;
}

function lolTeamName(teamId) {
  return teamId === 200 ? "Red" : "Blue";
}

const DDRAGON_CHAMPION_NAME_OVERRIDES = Object.freeze({
  "Bel'Veth": "Belveth",
  "BelVeth": "Belveth",
  "Cho'Gath": "Chogath",
  "ChoGath": "Chogath",
  "FiddleSticks": "Fiddlesticks",
  "Jarvan IV": "JarvanIV",
  "JarvanIV": "JarvanIV",
  "Kai'Sa": "Kaisa",
  "KaiSa": "Kaisa",
  "Kha'Zix": "Khazix",
  "KhaZix": "Khazix",
  "Kog'Maw": "KogMaw",
  "Kogmaw": "KogMaw",
  "K'Sante": "KSante",
  "Ksante": "KSante",
  "LeBlanc": "Leblanc",
  "Nunu & Willump": "Nunu",
  "Rek'Sai": "RekSai",
  "Reksai": "RekSai",
  "Renata Glasc": "Renata",
  "Vel'Koz": "Velkoz",
  "VelKoz": "Velkoz",
  "Wukong": "MonkeyKing"
});

function normalizeLolChampionName(championName) {
  if (!championName) return "";
  let name = String(championName).trim();
  if (!name) return "";
  name = name.split(" & ")[0].trim();
  const override = DDRAGON_CHAMPION_NAME_OVERRIDES[name];
  if (override) return override;
  name = name.replace(/[^a-zA-Z0-9]/g, "");
  return DDRAGON_CHAMPION_NAME_OVERRIDES[name] || name;
}

function deriveLolDdragonVersion(gameVersion) {
  const version = String(gameVersion || "").trim();
  if (!version) return DDRAGON_LOL_VERSION;
  const parts = version.split(".");
  if (parts.length < 3) return DDRAGON_LOL_VERSION;
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

function lolChampionImage(championName, gameVersion) {
  const id = normalizeLolChampionName(championName);
  if (!id) return "";
  const version = deriveLolDdragonVersion(gameVersion);
  return safePublicUrl(`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${id}.png`, ["leagueoflegends.com"]);
}

function lolItemImage(itemId, gameVersion) {
  if (!itemId || itemId <= 0) return "";
  const version = deriveLolDdragonVersion(gameVersion);
  return safePublicUrl(`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`, ["leagueoflegends.com"]);
}

const ddragonDataCache = new Map();

async function getLolDdragonData(env, gameVersion) {
  const version = deriveLolDdragonVersion(gameVersion);
  if (ddragonDataCache.has(version)) return ddragonDataCache.get(version);

  const [summonerResponse, itemResponse, runeResponse] = await Promise.all([
    requestExternal(new URL(`https://ddragon.leagueoflegends.com/cdn/${version}/data/fr_FR/summoner.json`), {
      env,
      expectedOrigin: "https://ddragon.leagueoflegends.com",
      service: "tracker",
      dedupeKey: `ddragon:summoner:${version}`,
      retries: 1
    }),
    requestExternal(new URL(`https://ddragon.leagueoflegends.com/cdn/${version}/data/fr_FR/item.json`), {
      env,
      expectedOrigin: "https://ddragon.leagueoflegends.com",
      service: "tracker",
      dedupeKey: `ddragon:item:${version}`,
      retries: 1
    }),
    requestExternal(new URL(`https://ddragon.leagueoflegends.com/cdn/${version}/data/fr_FR/runesReforged.json`), {
      env,
      expectedOrigin: "https://ddragon.leagueoflegends.com",
      service: "tracker",
      dedupeKey: `ddragon:runes:${version}`,
      retries: 1
    })
  ]);

  const summonerMap = Object.create(null);
  for (const spell of Object.values(summonerResponse?.data?.data || {})) {
    if (spell?.key && spell?.image?.full) {
      summonerMap[String(spell.key)] = {
        name: safeText(spell.name, 32),
        image: safePublicUrl(`https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spell.image.full}`, ["leagueoflegends.com"])
      };
    }
  }

  const itemMap = Object.create(null);
  for (const [id, item] of Object.entries(itemResponse?.data?.data || {})) {
    if (item?.name) {
      itemMap[String(id)] = {
        name: safeText(item.name, 48),
        image: safePublicUrl(`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${item.image?.full || `${id}.png`}`, ["leagueoflegends.com"])
      };
    }
  }

  const runeMap = Object.create(null);
  for (const path of runeResponse?.data || []) {
    if (path?.icon && path?.id != null) {
      runeMap[String(path.id)] = {
        name: safeText(path.name, 32),
        image: safePublicUrl(`https://ddragon.leagueoflegends.com/cdn/${version}/img/${path.icon}`, ["leagueoflegends.com"])
      };
    }
    for (const slot of path?.slots || []) {
      for (const rune of slot?.runes || []) {
        if (rune?.icon && rune?.id != null) {
          runeMap[String(rune.id)] = {
            name: safeText(rune.name, 32),
            image: safePublicUrl(`https://ddragon.leagueoflegends.com/cdn/${version}/img/${rune.icon}`, ["leagueoflegends.com"])
          };
        }
      }
    }
  }

  const result = Object.freeze({ version, summonerMap: Object.freeze(summonerMap), itemMap: Object.freeze(itemMap), runeMap: Object.freeze(runeMap) });
  ddragonDataCache.set(version, result);
  return result;
}

function lolItemAsset(itemId, gameVersion, ddragonData) {
  if (!itemId || itemId <= 0) return Object.freeze({ image: "", name: "" });
  const fallback = Object.freeze({ image: lolItemImage(itemId, gameVersion), name: "" });
  const fromData = ddragonData?.itemMap?.[String(itemId)];
  if (fromData) return Object.freeze({ image: fromData.image, name: fromData.name });
  return fallback;
}

function lolSummonerSpellAsset(spellId, gameVersion, ddragonData) {
  if (!spellId) return Object.freeze({ image: "", name: "" });
  const fromData = ddragonData?.summonerMap?.[String(spellId)];
  if (fromData) return Object.freeze({ image: fromData.image, name: fromData.name });
  return Object.freeze({ image: "", name: "" });
}

function lolRuneAsset(runeId, gameVersion, ddragonData) {
  if (!runeId) return Object.freeze({ image: "", name: "" });
  const fromData = ddragonData?.runeMap?.[String(runeId)];
  if (fromData) return Object.freeze({ image: fromData.image, name: fromData.name });
  return Object.freeze({ image: "", name: "" });
}

function lolKeystoneRuneId(p) {
  return p?.perks?.styles?.[0]?.selections?.[0]?.perk;
}

function safeLolName(p) {
  return safeText(p.riotIdGameName || p.summonerName || "Summoner", 32);
}

function safeLolTag(p) {
  return safeText(p.riotIdTagline || p.tagLine || "", 16);
}

function normalizeLolScoreboard(info, mePuuid, ddragonData) {
  const participants = info.participants || [];
  const teams = { Blue: { kills: 0, won: false }, Red: { kills: 0, won: false } };
  const gameVersion = info.gameVersion;
  const players = participants.map((p) => {
    const team = lolTeamName(p.teamId);
    const isMe = p.puuid === mePuuid;
    const kills = Number(p.kills) || 0;
    const deaths = Number(p.deaths) || 0;
    const assists = Number(p.assists) || 0;
    const cs = (Number(p.totalMinionsKilled) || 0) + (Number(p.neutralMinionsKilled) || 0);
    const minutes = Math.max(1, Math.floor((info.gameDuration || 0) / 60));
    const isWin = Boolean(p.win);
    teams[team].kills += kills;
    teams[team].won = isWin;
    const items = [
      lolItemAsset(p.item0, gameVersion, ddragonData), lolItemAsset(p.item1, gameVersion, ddragonData), lolItemAsset(p.item2, gameVersion, ddragonData), lolItemAsset(p.item3, gameVersion, ddragonData),
      lolItemAsset(p.item4, gameVersion, ddragonData), lolItemAsset(p.item5, gameVersion, ddragonData), lolItemAsset(p.item6, gameVersion, ddragonData)
    ];
    const spells = [
      lolSummonerSpellAsset(p.summoner1Id, gameVersion, ddragonData),
      lolSummonerSpellAsset(p.summoner2Id, gameVersion, ddragonData)
    ];
    const rune = lolRuneAsset(lolKeystoneRuneId(p), gameVersion, ddragonData);
    return Object.freeze({
      name: safeLolName(p),
      tag: safeLolTag(p),
      team,
      isMe,
      character: safeText(p.championName, 32),
      level: Number(p.champLevel) || 1,
      currenttier_patched: "",
      stats: Object.freeze({
        score: Number(p.totalDamageDealtToChampions) || 0,
        kills,
        deaths,
        assists,
        cs,
        gold: Number(p.goldEarned) || 0,
        damage: Number(p.totalDamageDealtToChampions) || 0,
        csPerMin: Math.round((cs / minutes) * 10) / 10,
        goldPerMin: Math.round(((Number(p.goldEarned) || 0) / minutes) * 10) / 10,
        damagePerMin: Math.round(((Number(p.totalDamageDealtToChampions) || 0) / minutes) * 10) / 10
      }),
      assets: Object.freeze({
        champion: Object.freeze({ small: lolChampionImage(p.championName, gameVersion) }),
        spells: Object.freeze(spells),
        rune: rune
      }),
      items: Object.freeze(items)
    });
  });
  return Object.freeze({
    teams: Object.freeze({
      Blue: Object.freeze({ roundsWon: teams.Blue.kills }),
      Red: Object.freeze({ roundsWon: teams.Red.kills })
    }),
    players
  });
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await mapper(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, Math.max(1, items.length || 1)) }, worker));
  return results;
}

async function getLolMatchIds(env, puuid, apiKey, queueId) {
  const matchIdsUrl = new URL(`/lol/match/v5/matches/by-puuid/${puuid}/ids`, RIOT_EUROPE);
  matchIdsUrl.searchParams.set("start", "0");
  matchIdsUrl.searchParams.set("count", "25");
  if (queueId != null) matchIdsUrl.searchParams.set("queue", String(queueId));
  const matchIdsResponse = await requestExternal(matchIdsUrl, {
    env,
    expectedOrigin: RIOT_EUROPE,
    service: "tracker",
    dedupeKey: `riot:matches_list:${puuid}:${queueId ?? "all"}`,
    headers: { "X-Riot-Token": apiKey },
    retries: 1
  });
  return matchIdsResponse.data || [];
}

export async function getLolMatches(env, riotId, mode, apiKeyOverride) {
  const apiKey = apiKeyOverride || requireSecret(env, "RIOT_API_KEY");
  const [name, tag] = riotId.split("#");

  const puuid = await getPuuid(env, name, tag, apiKey);
  if (!puuid) return [];

  const queueIds = LOL_QUEUE_MODES[mode];
  const listQueueIds = queueIds ? Array.from(queueIds) : [undefined];

  const matchIdLists = await Promise.all(listQueueIds.map((queueId) =>
    getLolMatchIds(env, puuid, apiKey, queueId)
  ));
  const matchIds = [...new Set(matchIdLists.flat())];

  const matches = await mapLimit(matchIds, 5, async (matchId) => {
    const matchPath = `/lol/match/v5/matches/${matchId}`;
    const matchResponse = await requestExternal(new URL(matchPath, RIOT_EUROPE), {
      env,
      expectedOrigin: RIOT_EUROPE,
      service: "tracker",
      dedupeKey: `riot:match:${matchId}`,
      headers: { "X-Riot-Token": apiKey },
      retries: 1
    });
    return matchResponse.data;
  });

  const allowedQueueIds = queueIds ? new Set(queueIds) : null;

  const sortedMatches = matches
    .filter(Boolean)
    .filter((match) => !allowedQueueIds || allowedQueueIds.has(match.info?.queueId))
    .sort((a, b) => (b.info?.gameCreation || 0) - (a.info?.gameCreation || 0))
    .slice(0, 10);

  const versions = new Set(sortedMatches.map((match) => deriveLolDdragonVersion(match.info?.gameVersion)));
  const ddragonDataByVersion = new Map(await Promise.all([...versions].map(async (version) => [version, await getLolDdragonData(env, version)])));

  return Object.freeze(sortedMatches.map((match) => {
    const info = match.info || {};
    const participants = info.participants || [];
    const me = participants.find(p => p.puuid === puuid) || participants[0];
    const minutes = Math.max(1, Math.floor((info.gameDuration || 0) / 60));
    const gameVersion = info.gameVersion;
    const ddragonData = ddragonDataByVersion.get(deriveLolDdragonVersion(gameVersion));
    const scoreboard = normalizeLolScoreboard(info, puuid, ddragonData);
    const myTeam = scoreboard.players.find(p => p.isMe)?.team || "Blue";
    const myKills = scoreboard.teams[myTeam].roundsWon;
    const opponentTeam = myTeam === "Blue" ? "Red" : "Blue";
    const opponentKills = scoreboard.teams[opponentTeam].roundsWon;
    const cs = (Number(me?.totalMinionsKilled) || 0) + (Number(me?.neutralMinionsKilled) || 0);

    return Object.freeze({
      id: safeText(info.gameId ? String(info.gameId) : match.metadata?.matchId),
      scoreboard,
      metadata: Object.freeze({
        modeName: safeText(lolQueueName(info.queueId)),
        result: safeText(me?.win ? "Victory" : "Defeat"),
        mapName: safeText(lolMapName(info.mapId)),
        gameDuration: safeText(`${Math.floor((info.gameDuration || 0) / 60)}m ${(info.gameDuration || 0) % 60}s`),
        agentName: safeText(me?.championName),
        agentImageUrl: lolChampionImage(me?.championName, gameVersion),
        timestamp: safeText(new Date(info.gameCreation || 0).toISOString()),
        score: Object.freeze({ team: myKills, opponent: opponentKills })
      }),
      segments: Object.freeze([{
        type: "overview",
        stats: safeStats({
          kills: { value: me?.kills || 0, displayValue: String(me?.kills || 0) },
          deaths: { value: me?.deaths || 0, displayValue: String(me?.deaths || 0) },
          assists: { value: me?.assists || 0, displayValue: String(me?.assists || 0) },
          cs: { value: cs, displayValue: String(cs) },
          csPerMin: { value: Math.round((cs / minutes) * 10) / 10, displayValue: String(Math.round((cs / minutes) * 10) / 10) },
          goldPerMin: { value: Math.round(((me?.goldEarned || 0) / minutes) * 10) / 10, displayValue: String(Math.round(((me?.goldEarned || 0) / minutes) * 10) / 10) },
          damagePerMin: { value: Math.round(((me?.totalDamageDealtToChampions || 0) / minutes) * 10) / 10, displayValue: String(Math.round(((me?.totalDamageDealtToChampions || 0) / minutes) * 10) / 10) },
          scorePerRound: { value: Math.round(((me?.totalDamageDealtToChampions || 0) / minutes) * 10) / 10, displayValue: String(Math.round(((me?.totalDamageDealtToChampions || 0) / minutes) * 10) / 10) }
        })
      }])
    });
  }));
}
