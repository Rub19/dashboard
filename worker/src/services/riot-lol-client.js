import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeIsoSeconds, safeNumber, safeText } from "../utils/normalize.js";

const CONTINENTS = ["europe", "americas", "asia"];
const DEFAULT_PLATFORM = Object.freeze({ europe: "euw1", americas: "na1", asia: "kr" });

function originFor(host) {
  return `https://${host}.api.riotgames.com`;
}

async function riotRequest(env, host, path, dedupeKey) {
  const apiKey = requireSecret(env, "RIOT_API_KEY");
  const origin = originFor(host);
  return requestExternal(new URL(path, origin), {
    env,
    expectedOrigin: origin,
    service: "riot-lol",
    dedupeKey,
    headers: { "X-Riot-Token": apiKey },
    retries: 1
  });
}

export async function resolveRiotAccount(env, gameName, tagLine) {
  for (const continent of CONTINENTS) {
    try {
      const response = await riotRequest(env, continent, `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`, `account:${continent}:${gameName.toLowerCase()}:${tagLine.toLowerCase()}`);
      const value = response.data || {};
      if (!value.puuid) continue;
      return Object.freeze({
        puuid: safeText(value.puuid, 100),
        gameName: safeText(value.gameName || gameName, 40),
        tagLine: safeText(value.tagLine || tagLine, 12),
        continent
      });
    } catch (error) {
      if (error?.code === "PROVIDER_NOT_FOUND") continue;
      throw error;
    }
  }
  return null;
}

export async function getLeagueRank(env, puuid, continent) {
  const platform = DEFAULT_PLATFORM[continent] || "euw1";
  const response = await riotRequest(env, platform, `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`, `rank:${platform}:${puuid}`);
  const entries = Array.isArray(response.data) ? response.data : [];
  const solo = entries.find((entry) => entry.queueType === "RANKED_SOLO_5x5") || entries[0] || null;
  if (!solo) return Object.freeze({ ranked: false });
  return Object.freeze({
    ranked: true,
    queueType: safeText(solo.queueType, 32),
    tier: safeText(solo.tier, 16),
    rank: safeText(solo.rank, 4),
    leaguePoints: safeNumber(solo.leaguePoints, 0, 4000),
    wins: safeNumber(solo.wins, 0, 100000),
    losses: safeNumber(solo.losses, 0, 100000)
  });
}

function normalizeLeagueMatch(matchData, puuid) {
  const info = matchData?.info || {};
  const participant = (info.participants || []).find((entry) => entry.puuid === puuid) || null;
  if (!participant) return null;
  const endMs = Number(info.gameEndTimestamp) || (Number(info.gameCreation) || 0) + (Number(info.gameDuration) || 0) * 1000;
  return Object.freeze({
    id: safeText(matchData?.metadata?.matchId, 64),
    mode: safeText(info.gameMode, 24),
    champion: safeText(participant.championName, 32),
    win: participant.win === true,
    kills: safeNumber(participant.kills, 0, 200),
    deaths: safeNumber(participant.deaths, 0, 200),
    assists: safeNumber(participant.assists, 0, 200),
    cs: safeNumber((participant.totalMinionsKilled || 0) + (participant.neutralMinionsKilled || 0), 0, 2000),
    durationSeconds: safeNumber(info.gameDuration, 0, 36000),
    endedAt: endMs > 0 ? safeIsoSeconds(Math.floor(endMs / 1000)) : null
  });
}

export async function getRecentMatches(env, puuid, continent, count) {
  const idsResponse = await riotRequest(env, continent, `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?start=0&count=${count}`, `matchids:${continent}:${puuid}:${count}`);
  const ids = Array.isArray(idsResponse.data) ? idsResponse.data.slice(0, count) : [];
  const matches = [];
  for (const id of ids) {
    const detail = await riotRequest(env, continent, `/lol/match/v5/matches/${encodeURIComponent(id)}`, `match:${continent}:${id}`);
    const normalized = normalizeLeagueMatch(detail.data, puuid);
    if (normalized) matches.push(normalized);
  }
  return Object.freeze(matches);
}
