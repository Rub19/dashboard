import { PATTERNS, assertAllowedQuery, queryText } from "../middleware/validation.js";
import { getMinecraftProfile } from "../services/minecraft-client.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";

export async function minecraftRoute({ env, url }) {
  assertAllowedQuery(url, ["username"]);
  const username = queryText(url, "username", { pattern: PATTERNS.minecraftUsername, min: 3, max: 16 });
  const result = await cachedLoad(`minecraft:${username.toLowerCase()}`, 900, () => getMinecraftProfile(env, username));
  return routeResult(result.data, { source: "minecraft", cached: result.cached });
}
