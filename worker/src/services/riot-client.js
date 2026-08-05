import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safePublicUrl, safeStats, safeText } from "../utils/normalize.js";

const RIOT_EUROPE = "https://europe.api.riotgames.com";

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
    avatarUrl: safePublicUrl(`https://ddragon.leagueoflegends.com/cdn/14.4.1/img/profileicon/${summoner.profileIconId || 1}.png`, ["leagueoflegends.com"]),
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
    
    return Object.freeze({
      id: safeText(match.metadata?.matchId),
      metadata: Object.freeze({
        modeName: safeText(info.gameMode),
        result: safeText(me?.win ? "Victory" : "Defeat"),
        mapName: safeText(`Map ${info.mapId}`),
        agentName: safeText(me?.championName),
        agentImageUrl: safePublicUrl(`https://ddragon.leagueoflegends.com/cdn/14.4.1/img/champion/${me?.championName}.png`, ["leagueoflegends.com"]),
        timestamp: safeText(new Date(info.gameCreation || 0).toISOString())
      }),
      segments: Object.freeze([{
        type: "overview",
        stats: safeStats({
          kills: { value: me?.kills || 0, displayValue: String(me?.kills || 0) },
          deaths: { value: me?.deaths || 0, displayValue: String(me?.deaths || 0) },
          assists: { value: me?.assists || 0, displayValue: String(me?.assists || 0) },
          cs: { value: (me?.totalMinionsKilled || 0) + (me?.neutralMinionsKilled || 0), displayValue: String((me?.totalMinionsKilled || 0) + (me?.neutralMinionsKilled || 0)) }
        })
      }])
    });
  }));
}
