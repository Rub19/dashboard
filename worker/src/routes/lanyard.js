import { assertAllowedQuery, PATTERNS, queryText } from "../middleware/validation.js";
import { getLanyardPresence } from "../services/lanyard-client.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";

export async function lanyardRoute({ env, url }) {
  assertAllowedQuery(url, ["userId"]);
  const userId = queryText(url, "userId", { pattern: PATTERNS.discordId, min: 17, max: 20 });
  const result = await cachedLoad(`lanyard:presence:${userId}`, 10, () => getLanyardPresence(env, userId));
  return routeResult(result.data, { source: "lanyard", cached: result.cached });
}
