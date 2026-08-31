import { assertAllowedQuery, PATTERNS, queryInteger, queryText } from "../middleware/validation.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";
import { getSteamAchievements, getSteamOwnedGames, getSteamPlayer, getSteamRecentGames, resolveSteamId } from "../services/steam-client.js";
import { getUserProviderCredential } from "../services/supabase-client.js";

async function ownKey(env, auth) {
  if (!auth?.userId) return null;
  const credential = await getUserProviderCredential(env, auth.userId, "steam");
  return typeof credential?.apiKey === "string" ? credential.apiKey : null;
}

export async function steamRoute({ env, url, route, auth }) {
  const action = route.action;
  const allowed = action === "achievements" ? ["steamId", "appId"] : action === "owned-games" ? ["steamId", "limit"] : action === "recent-games" ? ["steamId", "count"] : ["steamId"];
  assertAllowedQuery(url, allowed);
  const rawIdentifier = queryText(url, "steamId", { pattern: PATTERNS.steamIdentifier, min: 2, max: 100 });
  const steamId = /^\d{17}$/.test(rawIdentifier)
    ? rawIdentifier
    : await cachedLoad(`steam:resolve:${rawIdentifier.toLowerCase()}`, 86400, () => resolveSteamId(env, rawIdentifier, () => ownKey(env, auth))).then((result) => result.data);
  let key;
  let ttl;
  let loader;
  if (action === "player") {
    key = `steam:player:${steamId}`;
    ttl = 120;
    loader = async () => getSteamPlayer(env, steamId, await ownKey(env, auth));
  } else if (action === "recent-games") {
    const count = queryInteger(url, "count", { required: false, fallback: 10, min: 1, max: 20 });
    key = `steam:recent:${steamId}:${count}`;
    ttl = 60;
    loader = async () => getSteamRecentGames(env, steamId, count, await ownKey(env, auth));
  } else if (action === "owned-games") {
    const limit = queryInteger(url, "limit", { required: false, fallback: 50, min: 1, max: 100 });
    key = `steam:owned:${steamId}:${limit}`;
    ttl = 300;
    loader = async () => getSteamOwnedGames(env, steamId, limit, await ownKey(env, auth));
  } else {
    const appId = queryInteger(url, "appId", { min: 1, max: 999999999 });
    key = `steam:achievements:${steamId}:${appId}`;
    ttl = 300;
    loader = async () => getSteamAchievements(env, steamId, appId, await ownKey(env, auth));
  }
  const result = await cachedLoad(key, ttl, loader);
  return routeResult(result.data, { source: "steam", cached: result.cached });
}
