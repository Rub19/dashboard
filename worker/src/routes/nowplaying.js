import { assertAllowedQuery, PATTERNS, queryText } from "../middleware/validation.js";
import { getNowPlaying } from "../services/now-playing-client.js";
import { getUserProviderCredential } from "../services/supabase-client.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";

export async function nowPlayingRoute({ env, url, auth }) {
  const source = queryText(url, "source", { values: ["lastfm", "lanyard"], max: 12 });
  assertAllowedQuery(url, source === "lastfm" ? ["source", "username"] : ["source", "userId"]);
  const identity = source === "lastfm"
    ? queryText(url, "username", { pattern: PATTERNS.username, max: 32 })
    : queryText(url, "userId", { pattern: PATTERNS.discordId, min: 17, max: 20 });
  const loader = async () => {
    let apiKeyOverride = null;
    if (source === "lastfm" && auth?.userId) {
      const credential = await getUserProviderCredential(env, auth.userId, "lastfm");
      apiKeyOverride = typeof credential?.apiKey === "string" ? credential.apiKey : null;
    }
    return getNowPlaying(env, source, identity, apiKeyOverride);
  };
  const result = await cachedLoad(`nowplaying:${source}:${identity.toLowerCase()}`, 10, loader);
  return routeResult(result.data, { source: `nowplaying:${source}`, cached: result.cached });
}
