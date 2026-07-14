import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeIsoSeconds, safeNumber, safePublicUrl, safeText } from "../utils/normalize.js";

const ORIGIN = "https://api.steampowered.com";

async function steamRequest(env, path, params, dedupeKey) {
  const key = requireSecret(env, "STEAM_API_KEY");
  const url = new URL(path, ORIGIN);
  url.searchParams.set("key", key);
  Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, String(value)));
  return requestExternal(url, {
    env,
    expectedOrigin: ORIGIN,
    service: "steam",
    dedupeKey,
    retries: 1
  });
}

function game(value = {}) {
  const appId = safeNumber(value.appid, 0, 999999999);
  const iconHash = /^[a-f0-9]{20,80}$/i.test(String(value.img_icon_url || "")) ? String(value.img_icon_url) : "";
  return Object.freeze({
    appId,
    name: safeText(value.name, 160),
    playtimeMinutes: safeNumber(value.playtime_forever, 0, 100000000),
    recentPlaytimeMinutes: safeNumber(value.playtime_2weeks, 0, 1000000),
    iconUrl: iconHash ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${iconHash}.jpg` : ""
  });
}

export async function getSteamPlayer(env, steamId) {
  const response = await steamRequest(env, "/ISteamUser/GetPlayerSummaries/v0002/", { steamids: steamId, format: "json" }, `player:${steamId}`);
  const value = response.data?.response?.players?.[0];
  if (!value) return null;
  return Object.freeze({
    steamId: safeText(value.steamid, 24),
    displayName: safeText(value.personaname, 100),
    profileUrl: safePublicUrl(value.profileurl, ["steamcommunity.com"]),
    avatarUrl: safePublicUrl(value.avatarfull || value.avatarmedium, ["steamstatic.com"]),
    personaState: safeNumber(value.personastate, 0, 6),
    gameId: safeText(value.gameid, 24),
    gameName: safeText(value.gameextrainfo, 120),
    lastLogoff: safeIsoSeconds(value.lastlogoff)
  });
}

export async function getSteamRecentGames(env, steamId, count) {
  const response = await steamRequest(env, "/IPlayerService/GetRecentlyPlayedGames/v0001/", { steamid: steamId, count, format: "json" }, `recent:${steamId}:${count}`);
  return Object.freeze((response.data?.response?.games || []).slice(0, count).map(game));
}

export async function getSteamOwnedGames(env, steamId, limit) {
  const response = await steamRequest(env, "/IPlayerService/GetOwnedGames/v0001/", { steamid: steamId, include_appinfo: 1, include_played_free_games: 1, format: "json" }, `owned:${steamId}`);
  return Object.freeze((response.data?.response?.games || []).slice(0, limit).map(game));
}

export async function getSteamAchievements(env, steamId, appId) {
  const response = await steamRequest(env, "/ISteamUserStats/GetPlayerAchievements/v0001/", { steamid: steamId, appid: appId, l: "en", format: "json" }, `achievements:${steamId}:${appId}`);
  return Object.freeze((response.data?.playerstats?.achievements || []).slice(0, 500).map((value) => Object.freeze({
    apiName: safeText(value.apiname, 128),
    achieved: value.achieved === 1,
    unlockedAt: safeIsoSeconds(value.unlocktime),
    name: safeText(value.name, 160),
    description: safeText(value.description, 300)
  })));
}
