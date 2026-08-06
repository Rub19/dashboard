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

function lolChampionImage(championName) {
  const id = normalizeLolChampionName(championName);
  if (!id) return "";
  return safePublicUrl(`https://ddragon.leagueoflegends.com/cdn/${DDRAGON_LOL_VERSION}/img/champion/${id}.png`, ["leagueoflegends.com"]);
}

function lolItemImage(itemId) {
  if (!itemId || itemId <= 0) return "";
  return safePublicUrl(`https://ddragon.leagueoflegends.com/cdn/${DDRAGON_LOL_VERSION}/img/item/${itemId}.png`, ["leagueoflegends.com"]);
}

function safeLolName(p) {
  return safeText(p.riotIdGameName || p.summonerName || "Summoner", 32);
}

function safeLolTag(p) {
  return safeText(p.riotIdTagline || p.tagLine || "", 16);
}

function normalizeLolScoreboard(info, mePuuid) {
  const participants = info.participants || [];
  const teams = { Blue: { kills: 0, won: false }, Red: { kills: 0, won: false } };
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
      lolItemImage(p.item0), lolItemImage(p.item1), lolItemImage(p.item2), lolItemImage(p.item3),
      lolItemImage(p.item4), lolItemImage(p.item5), lolItemImage(p.item6)
    ];
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
        champion: Object.freeze({ small: lolChampionImage(p.championName) })
      }),
      items: Object.freeze(items.filter(Boolean))
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

export async function getLolMatches(env, riotId, mode, apiKeyOverride) {
  const apiKey = apiKeyOverride || requireSecret(env, "RIOT_API_KEY");
  const [name, tag] = riotId.split("#");
  
  const puuid = await getPuuid(env, name, tag, apiKey);
  if (!puuid) return [];
  
  const matchIdsPath = `/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=10`;
  const matchIdsResponse = await requestExternal(new URL(matchIdsPath, RIOT_EUROPE), {
    env,
    expectedOrigin: RIOT_EUROPE,
    service: "tracker",
    dedupeKey: `riot:matches_list:${puuid}`,
    headers: { "X-Riot-Token": apiKey },
    retries: 1
  });
  
  const matchIds = matchIdsResponse.data || [];
  
  const matches = await Promise.all(matchIds.map(async (matchId) => {
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
  }));
  
  return Object.freeze(matches.filter(Boolean).map((match) => {
    const info = match.info || {};
    const participants = info.participants || [];
    const me = participants.find(p => p.puuid === puuid) || participants[0];
    const minutes = Math.max(1, Math.floor((info.gameDuration || 0) / 60));
    const scoreboard = normalizeLolScoreboard(info, puuid);
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
        agentImageUrl: lolChampionImage(me?.championName),
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
