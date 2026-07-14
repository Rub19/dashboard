import { assertAllowedQuery, PATTERNS, queryText } from "../middleware/validation.js";
import { getTwitchChannel } from "../services/twitch-client.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";

export async function twitchRoute({ env, url }) {
  assertAllowedQuery(url, ["login"]);
  const login = queryText(url, "login", { pattern: PATTERNS.twitchLogin, max: 25 }).toLowerCase();
  const result = await cachedLoad(`twitch:channel:${login}`, 30, () => getTwitchChannel(env, login));
  return routeResult(result.data, { source: "twitch", cached: result.cached });
}
