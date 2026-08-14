import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safePublicUrl, safeStats, safeText } from "../utils/normalize.js";

const RIOT_EUROPE = "https://europe.api.riotgames.com";
const DDRAGON_LOL_VERSION = "16.15.1";

let lolDdragonLatestVersion = null;
let lolDdragonLatestData = null;

function normalizeChampionMatchName(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function getLolDdragonLatestVersion(env) {
  if (lolDdragonLatestVersion) return lolDdragonLatestVersion;
  try {
    const response = await requestExternal(new URL("https://ddragon.leagueoflegends.com/api/versions.json"), {
      env,
      expectedOrigin: "https://ddragon.leagueoflegends.com",
      service: "tracker",
      dedupeKey: "ddragon:versions:latest",
      retries: 1
    });
    const versions = Array.isArray(response?.data) ? response.data : [];
    lolDdragonLatestVersion = String(versions[0] || DDRAGON_LOL_VERSION);
  } catch {
    lolDdragonLatestVersion = DDRAGON_LOL_VERSION;
  }
  return lolDdragonLatestVersion;
}

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

  let platformId = "euw1";
  try {
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
    if (matchIds.length > 0) platformId = matchIds[0].split("_")[0].toLowerCase();
  } catch {}

  const platformOrigin = `https://${platformId}.api.riotgames.com`;

  // Fetch summoner
  let summoner = {};
  try {
    const summonerPath = `/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    const summonerResponse = await requestExternal(new URL(summonerPath, platformOrigin), {
      env,
      expectedOrigin: platformOrigin,
      service: "tracker",
      dedupeKey: `riot:summoner:${puuid}`,
      headers: { "X-Riot-Token": apiKey },
      retries: 1
    });
    summoner = summonerResponse.data || {};
  } catch {}

  // Fetch league
  let tier = "Unranked";
  let lp = 0;
  if (summoner.id) {
    try {
      const leaguePath = `/lol/league/v4/entries/by-summoner/${summoner.id}`;
      const leagueResponse = await requestExternal(new URL(leaguePath, platformOrigin), {
        env,
        expectedOrigin: platformOrigin,
        service: "tracker",
        dedupeKey: `riot:league:${summoner.id}`,
        headers: { "X-Riot-Token": apiKey },
        retries: 1
      });
      const leagues = Array.isArray(leagueResponse.data) ? leagueResponse.data : [];
      const soloq = leagues.find(l => l.queueType === "RANKED_SOLO_5x5") || leagues[0];
      if (soloq?.tier) {
        const rank = soloq.rank ? ` ${soloq.rank}` : "";
        tier = `${soloq.tier}${rank}`.trim();
        lp = Number(soloq.leaguePoints) || 0;
      }
    } catch {}
  }

  const ddragonVersion = await getLolDdragonLatestVersion(env);
  const profileIconId = Number(summoner.profileIconId) || 1;
  return Object.freeze({
    platform: "riot",
    identifier: riotId,
    handle: riotId,
    avatarUrl: safePublicUrl(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${profileIconId}.png`, ["leagueoflegends.com"]),
    profileIconId,
    ddragonVersion,
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

function resolveLolChampionKey(championName, championId, ddragonData) {
  const byName = ddragonData?.championMap?.byName;
  const byKey = ddragonData?.championMap?.byKey;
  if (championId != null && byKey?.[String(championId)]) {
    return byKey[String(championId)];
  }
  if (championName) {
    const normalized = normalizeChampionMatchName(championName);
    if (byName?.[normalized]) return byName[normalized];
    const fallback = normalizeLolChampionName(championName);
    if (fallback) return fallback;
  }
  return "";
}

function lolCommunityDragonChampionImage(championId) {
  if (!championId) return "";
  return safePublicUrl(`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`, ["raw.communitydragon.org"]);
}

function deriveLolDdragonVersion(gameVersion) {
  const version = String(gameVersion || "").trim();
  if (!version) return DDRAGON_LOL_VERSION;
  const parts = version.split(".");
  if (parts.length < 2) return DDRAGON_LOL_VERSION;
  const major = parts[0];
  const minor = parts[1];
  if (parts.length <= 2) return `${major}.${minor}.1`;
  if (parts.length >= 4) return `${major}.${minor}.1`;
  return version;
}

function lolChampionImage(championName, championId, ddragonData) {
  const id = resolveLolChampionKey(championName, championId, ddragonData);
  if (!id) return "";
  const version = ddragonData?.version || lolDdragonLatestVersion || DDRAGON_LOL_VERSION;
  return safePublicUrl(`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${id}.png`, ["leagueoflegends.com"]);
}

function lolItemImage(itemId, ddragonData) {
  if (!itemId || itemId <= 0) return "";
  const version = ddragonData?.version || lolDdragonLatestVersion || DDRAGON_LOL_VERSION;
  return safePublicUrl(`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`, ["leagueoflegends.com"]);
}

const ddragonDataCache = new Map();

function emptyDdragonData() {
  return Object.freeze({
    version: lolDdragonLatestVersion || DDRAGON_LOL_VERSION,
    summonerMap: Object.freeze({}),
    itemMap: Object.freeze({}),
    runeMap: Object.freeze({}),
    championMap: Object.freeze({ byName: Object.freeze({}), byKey: Object.freeze({}) })
  });
}

async function fetchDdragonDataForVersion(env, version) {
  const [summonerResponse, itemResponse, runeResponse, championResponse] = await Promise.all([
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
    }),
    requestExternal(new URL(`https://ddragon.leagueoflegends.com/cdn/${version}/data/fr_FR/champion.json`), {
      env,
      expectedOrigin: "https://ddragon.leagueoflegends.com",
      service: "tracker",
      dedupeKey: `ddragon:champion:${version}`,
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

  const byName = Object.create(null);
  const byKey = Object.create(null);
  for (const [championId, champ] of Object.entries(championResponse?.data?.data || {})) {
    if (!championId || champ?.key == null) continue;
    const id = safeText(championId, 64);
    const name = safeText(champ.name, 64);
    const key = String(champ.key);
    byName[normalizeChampionMatchName(name)] = id;
    byName[normalizeChampionMatchName(id)] = id;
    byKey[key] = id;
  }

  const championMap = Object.freeze({ byName: Object.freeze(byName), byKey: Object.freeze(byKey) });

  return Object.freeze({ version, summonerMap: Object.freeze(summonerMap), itemMap: Object.freeze(itemMap), runeMap: Object.freeze(runeMap), championMap });
}

async function getLolDdragonData(env, gameVersion) {
  if (lolDdragonLatestData) return lolDdragonLatestData;
  const version = await getLolDdragonLatestVersion(env);
  try {
    const result = await fetchDdragonDataForVersion(env, version);
    lolDdragonLatestData = result;
    return result;
  } catch {
    const fallback = emptyDdragonData();
    lolDdragonLatestData = fallback;
    return fallback;
  }
}

function lolItemAsset(itemId, ddragonData) {
  if (!itemId || itemId <= 0) return Object.freeze({ image: "", name: "" });
  const fromData = ddragonData?.itemMap?.[String(itemId)];
  if (fromData) return Object.freeze({ image: fromData.image, name: fromData.name });
  return Object.freeze({ image: lolItemImage(itemId, ddragonData), name: "" });
}

function lolSummonerSpellAsset(spellId, ddragonData) {
  if (!spellId) return Object.freeze({ image: "", name: "" });
  const fromData = ddragonData?.summonerMap?.[String(spellId)];
  if (fromData) return Object.freeze({ image: fromData.image, name: fromData.name });
  return Object.freeze({ image: "", name: "" });
}

function lolRuneAsset(runeId, ddragonData) {
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

function normalizeLolTeamObjectives(info) {
  const objectives = { Blue: { won: false, barons: 0, dragons: 0, towers: 0, inhibitors: 0, riftHeralds: 0 }, Red: { won: false, barons: 0, dragons: 0, towers: 0, inhibitors: 0, riftHeralds: 0 } };
  for (const t of info.teams || []) {
    const team = lolTeamName(t.teamId);
    if (!objectives[team]) continue;
    objectives[team].won = Boolean(t.win);
    objectives[team].barons = Number(t.baronKills) || 0;
    objectives[team].dragons = Number(t.dragonKills) || 0;
    objectives[team].towers = Number(t.towerKills) || 0;
    objectives[team].inhibitors = Number(t.inhibitorKills) || 0;
    objectives[team].riftHeralds = Number(t.riftHeraldKills) || 0;
  }
  return objectives;
}

function normalizeLolScoreboard(info, mePuuid, ddragonData) {
  const participants = info.participants || [];
  const minutes = Math.max(1, Math.floor((info.gameDuration || 0) / 60));
  const teams = { Blue: { kills: 0, won: false, gold: 0, damage: 0 }, Red: { kills: 0, won: false, gold: 0, damage: 0 } };
  const objectives = normalizeLolTeamObjectives(info);

  const players = participants.map((p) => {
    const team = lolTeamName(p.teamId);
    const isMe = p.puuid === mePuuid;
    const kills = Number(p.kills) || 0;
    const deaths = Number(p.deaths) || 0;
    const assists = Number(p.assists) || 0;
    const cs = (Number(p.totalMinionsKilled) || 0) + (Number(p.neutralMinionsKilled) || 0);
    const gold = Number(p.goldEarned) || 0;
    const damage = Number(p.totalDamageDealtToChampions) || 0;
    const damageTaken = Number(p.totalDamageTaken) || 0;
    const isWin = Boolean(p.win);
    teams[team].kills += kills;
    teams[team].won = isWin;
    teams[team].gold += gold;
    teams[team].damage += damage;

    const items = [
      lolItemAsset(p.item0, ddragonData), lolItemAsset(p.item1, ddragonData), lolItemAsset(p.item2, ddragonData), lolItemAsset(p.item3, ddragonData),
      lolItemAsset(p.item4, ddragonData), lolItemAsset(p.item5, ddragonData), lolItemAsset(p.item6, ddragonData)
    ];
    const spells = [
      lolSummonerSpellAsset(p.summoner1Id, ddragonData),
      lolSummonerSpellAsset(p.summoner2Id, ddragonData)
    ];
    const rune = lolRuneAsset(lolKeystoneRuneId(p), ddragonData);
    const teamKills = teams[team].kills;
    const killParticipation = teamKills > 0 ? Math.round(((kills + assists) / teamKills) * 100) : 0;

    return Object.freeze({
      name: safeLolName(p),
      tag: safeLolTag(p),
      team,
      isMe,
      win: isWin,
      championId: Number(p.championId) || 0,
      character: safeText(p.championName, 32),
      level: Number(p.champLevel) || 1,
      position: safeText(p.teamPosition || p.lane || p.role || "", 16),
      currenttier_patched: "",
      stats: Object.freeze({
        score: damage,
        kills,
        deaths,
        assists,
        cs,
        gold,
        damage,
        damageTaken,
        damageToObjectives: Number(p.damageDealtToObjectives) || 0,
        damageToTurrets: Number(p.damageDealtToTurrets) || 0,
        heal: Number(p.totalHeal) || 0,
        visionScore: Number(p.visionScore) || 0,
        wardsPlaced: Number(p.wardsPlaced) || 0,
        wardsKilled: Number(p.wardsKilled) || 0,
        timeCCingOthers: Number(p.timeCCingOthers) || 0,
        goldSpent: Number(p.goldSpent) || 0,
        csPerMin: Math.round((cs / minutes) * 10) / 10,
        goldPerMin: Math.round((gold / minutes) * 10) / 10,
        damagePerMin: Math.round((damage / minutes) * 10) / 10,
        damageTakenPerMin: Math.round((damageTaken / minutes) * 10) / 10,
        killParticipation,
        kda: deaths > 0 ? (kills + assists) / deaths : (kills + assists > 0 ? 99 : 0)
      }),
      assets: Object.freeze({
        champion: Object.freeze({
          small: lolChampionImage(p.championName, p.championId, ddragonData),
          fallback: lolCommunityDragonChampionImage(p.championId)
        }),
        spells: Object.freeze(spells),
        rune: rune
      }),
      items: Object.freeze(items)
    });
  });

  const buildTeam = (teamName) => Object.freeze({
    roundsWon: teams[teamName].kills,
    kills: teams[teamName].kills,
    won: teams[teamName].won,
    gold: Math.round(teams[teamName].gold),
    damage: Math.round(teams[teamName].damage),
    ...objectives[teamName]
  });

  return Object.freeze({
    teams: Object.freeze({ Blue: buildTeam("Blue"), Red: buildTeam("Red") }),
    players,
    duration: info.gameDuration || 0
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
  matchIdsUrl.searchParams.set("count", "100");
  if (queueId != null) matchIdsUrl.searchParams.set("queue", String(queueId));
  try {
    const matchIdsResponse = await requestExternal(matchIdsUrl, {
      env,
      expectedOrigin: RIOT_EUROPE,
      service: "tracker",
      dedupeKey: `riot:matches_list:${puuid}:${queueId ?? "all"}`,
      headers: { "X-Riot-Token": apiKey },
      retries: 1
    });
    return matchIdsResponse.data || [];
  } catch {
    return [];
  }
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
    try {
      const matchResponse = await requestExternal(new URL(matchPath, RIOT_EUROPE), {
        env,
        expectedOrigin: RIOT_EUROPE,
        service: "tracker",
        dedupeKey: `riot:match:${matchId}`,
        headers: { "X-Riot-Token": apiKey },
        retries: 1
      });
      return matchResponse.data;
    } catch {
      return null;
    }
  });

  const allowedQueueIds = queueIds ? new Set(queueIds) : null;

  const sortedMatches = matches
    .filter(Boolean)
    .filter((match) => !allowedQueueIds || allowedQueueIds.has(match.info?.queueId))
    .sort((a, b) => (b.info?.gameCreation || 0) - (a.info?.gameCreation || 0))
    .slice(0, 100);

  const ddragonData = await getLolDdragonData(env);

  return Object.freeze(sortedMatches.map((match) => {
    const info = match.info || {};
    const participants = info.participants || [];
    const me = participants.find(p => p.puuid === puuid) || participants[0];
    const minutes = Math.max(1, Math.floor((info.gameDuration || 0) / 60));
    const scoreboard = normalizeLolScoreboard(info, puuid, ddragonData);
    const myTeam = scoreboard.players.find(p => p.isMe)?.team || "Blue";
    const myKills = scoreboard.teams[myTeam].kills;
    const opponentTeam = myTeam === "Blue" ? "Red" : "Blue";
    const opponentKills = scoreboard.teams[opponentTeam].kills;
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
        agentImageUrl: lolChampionImage(me?.championName, me?.championId, ddragonData),
        agentImageFallback: lolCommunityDragonChampionImage(me?.championId),
        championId: Number(me?.championId) || 0,
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
