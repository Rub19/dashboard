import { assertAllowedQuery, PATTERNS, queryText } from "../middleware/validation.js";
import { getNowPlaying } from "../services/now-playing-client.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";

export async function nowPlayingRoute({ env, url }) {
  const source = queryText(url, "source", { values: ["lastfm", "lanyard"], max: 12 });
  assertAllowedQuery(url, source === "lastfm" ? ["source", "username"] : ["source", "userId"]);
  const identity = source === "lastfm"
    ? queryText(url, "username", { pattern: PATTERNS.username, max: 32 })
    : queryText(url, "userId", { pattern: PATTERNS.discordId, min: 17, max: 20 });
  const result = await cachedLoad(`nowplaying:${source}:${identity.toLowerCase()}`, 10, () => getNowPlaying(env, source, identity));
  return routeResult(result.data, { source: `nowplaying:${source}`, cached: result.cached });
}
