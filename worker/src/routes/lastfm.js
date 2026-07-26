import { assertAllowedQuery, PATTERNS, queryInteger, queryText } from "../middleware/validation.js";
import { getRecentTracks, getTopArtists, getTopTracks } from "../services/lastfm-client.js";
import { getUserProviderCredential } from "../services/supabase-client.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";

const PERIODS = Object.freeze(["overall", "7day", "1month", "3month", "6month", "12month"]);

async function ownKey(env, auth) {
  if (!auth?.userId) return null;
  const credential = await getUserProviderCredential(env, auth.userId, "lastfm");
  return typeof credential?.apiKey === "string" ? credential.apiKey : null;
}

export async function lastFmRoute({ env, url, route, auth }) {
  const top = route.action !== "recent-tracks";
  assertAllowedQuery(url, top ? ["username", "period", "limit"] : ["username", "limit"]);
  const username = queryText(url, "username", { pattern: PATTERNS.username, max: 32 });
  const limit = queryInteger(url, "limit", { required: false, fallback: 20, min: 1, max: 50 });
  const period = top ? queryText(url, "period", { required: false, fallback: "7day", values: PERIODS, max: 12 }) : "";
  const key = `lastfm:${route.action}:${username.toLowerCase()}:${period}:${limit}`;
  const ttl = route.action === "recent-tracks" ? 15 : 300;
  const loader = route.action === "recent-tracks"
    ? async () => getRecentTracks(env, username, limit, await ownKey(env, auth))
    : route.action === "top-artists"
      ? async () => getTopArtists(env, username, period, limit, await ownKey(env, auth))
      : async () => getTopTracks(env, username, period, limit, await ownKey(env, auth));
  const result = await cachedLoad(key, ttl, loader);
  return routeResult(result.data, { source: "lastfm", cached: result.cached });
}
