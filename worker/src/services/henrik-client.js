import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeIsoSeconds, safeNumber, safePublicUrl, safeText } from "../utils/normalize.js";

const ORIGIN = "https://api.henrikdev.xyz";

async function henrikRequest(env, path, dedupeKey, apiKeyOverride) {
  const apiKey = apiKeyOverride || requireSecret(env, "HENRIK_API_KEY");
  return requestExternal(new URL(path, ORIGIN), {
    env,
    expectedOrigin: ORIGIN,
    service: "henrik",
    dedupeKey,
    headers: { Authorization: apiKey },
    retries: 1
  });
}

export async function getValorantAccount(env, name, tag, apiKeyOverride) {
  const response = await henrikRequest(env, `/valorant/v2/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, `account:${name.toLowerCase()}:${tag.toLowerCase()}`, apiKeyOverride);
  const value = response.data?.data || {};
  return Object.freeze({
    puuid: safeText(value.puuid, 80),
    name: safeText(value.name || name, 40),
    tag: safeText(value.tag || tag, 12),
    region: safeText(value.region, 12),
    accountLevel: safeNumber(value.account_level, 0, 10000),
    cardUrl: safePublicUrl(typeof value.card === "string" ? value.card : value.card?.large, ["valorant-api.com", "henrikdev.xyz", "riotcdn.net"]),
    updatedAt: safeText(value.updated_at || value.last_update, 64)
  });
}

export async function getValorantStatus(env, region, apiKeyOverride) {
  const response = await henrikRequest(env, `/valorant/v1/status/${encodeURIComponent(region)}`, `status:${region}`, apiKeyOverride);
  const value = response.data || {};
  return Object.freeze({
    region: safeText(value.region || region, 12),
    maintenances: Object.freeze((value.data?.maintenances || []).slice(0, 12).map((entry) => Object.freeze({
      createdAt: safeText(entry.created_at, 64),
      archiveAt: safeText(entry.archive_at, 64),
      updates: Object.freeze((entry.updates || []).slice(0, 8).map((update) => Object.freeze({
        createdAt: safeText(update.created_at, 64),
        content: safeText(update.translations?.[0]?.content, 500)
      })))
    })))
  });
}

export async function getValorantRank(env, region, name, tag, apiKeyOverride) {
  const response = await henrikRequest(env, `/valorant/v2/mmr/${encodeURIComponent(region)}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, `rank:${region}:${name.toLowerCase()}:${tag.toLowerCase()}`, apiKeyOverride);
  const value = response.data?.data || {};
  return Object.freeze({
    tier: safeNumber(value.currenttier, 0, 30),
    tierName: safeText(value.currenttierpatched, 40),
    rankInTier: safeNumber(value.ranking_in_tier, 0, 100),
    lastGameDelta: Math.max(-999, Math.min(999, Math.round(Number(value.mmr_change_to_last_game) || 0))),
    elo: safeNumber(value.elo, 0, 5000),
    emblemUrl: safePublicUrl(value.images?.small, ["valorant-api.com", "henrikdev.xyz", "riotcdn.net"])
  });
}

function normalizeValorantMatch(match, name, tag) {
  const metadata = match?.metadata || {};
  const players = match?.players?.all_players || [];
  const self = players.find((entry) => safeText(entry?.name, 40).toLowerCase() === name.toLowerCase() && safeText(entry?.tag, 12).toLowerCase() === tag.toLowerCase()) || null;
  const team = safeText(self?.team, 8).toLowerCase();
  const teams = match?.teams || {};
  const won = team && teams[team] ? teams[team].has_won === true : null;
  return Object.freeze({
    id: safeText(match?.metadata?.matchid, 64),
    map: safeText(metadata.map, 32),
    mode: safeText(metadata.mode, 32),
    won,
    kills: safeNumber(self?.stats?.kills, 0, 200),
    deaths: safeNumber(self?.stats?.deaths, 0, 200),
    assists: safeNumber(self?.stats?.assists, 0, 200),
    score: safeNumber(self?.stats?.score, 0, 999999),
    characterName: safeText(self?.character, 32),
    startedAt: safeIsoSeconds(metadata.game_start),
    durationSeconds: safeNumber(metadata.game_length, 0, 36000)
  });
}

export async function getValorantMatches(env, region, name, tag, apiKeyOverride) {
  const response = await henrikRequest(env, `/valorant/v3/matches/${encodeURIComponent(region)}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=5`, `matches:${region}:${name.toLowerCase()}:${tag.toLowerCase()}`, apiKeyOverride);
  const list = Array.isArray(response.data?.data) ? response.data.data : [];
  return Object.freeze(list.slice(0, 5).map((match) => normalizeValorantMatch(match, name, tag)));
}
