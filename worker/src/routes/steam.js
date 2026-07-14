import { assertAllowedQuery, PATTERNS, queryInteger, queryText } from "../middleware/validation.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";
import { getSteamAchievements, getSteamOwnedGames, getSteamPlayer, getSteamRecentGames } from "../services/steam-client.js";

export async function steamRoute({ env, url, route }) {
  const action = route.action;
  const allowed = action === "achievements" ? ["steamId", "appId"] : action === "owned-games" ? ["steamId", "limit"] : action === "recent-games" ? ["steamId", "count"] : ["steamId"];
  assertAllowedQuery(url, allowed);
  const steamId = queryText(url, "steamId", { pattern: PATTERNS.steamId, min: 17, max: 17 });
  let key;
  let ttl;
  let loader;
  if (action === "player") {
    key = `steam:player:${steamId}`;
    ttl = 120;
    loader = () => getSteamPlayer(env, steamId);
  } else if (action === "recent-games") {
    const count = queryInteger(url, "count", { required: false, fallback: 10, min: 1, max: 20 });
    key = `steam:recent:${steamId}:${count}`;
    ttl = 60;
    loader = () => getSteamRecentGames(env, steamId, count);
  } else if (action === "owned-games") {
    const limit = queryInteger(url, "limit", { required: false, fallback: 50, min: 1, max: 100 });
    key = `steam:owned:${steamId}:${limit}`;
    ttl = 300;
    loader = () => getSteamOwnedGames(env, steamId, limit);
  } else {
    const appId = queryInteger(url, "appId", { min: 1, max: 999999999 });
    key = `steam:achievements:${steamId}:${appId}`;
    ttl = 300;
    loader = () => getSteamAchievements(env, steamId, appId);
  }
  const result = await cachedLoad(key, ttl, loader);
  return routeResult(result.data, { source: "steam", cached: result.cached });
}
