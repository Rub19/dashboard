import { assertAllowedQuery, PATTERNS, queryText } from "../middleware/validation.js";
import { getValorantAccount, getValorantStatus } from "../services/henrik-client.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";

export async function henrikRoute({ env, url, route }) {
  if (route.action === "status") {
    assertAllowedQuery(url, ["region"]);
    const region = queryText(url, "region", { values: ["eu", "na", "latam", "br", "ap", "kr"], max: 8 });
    const result = await cachedLoad(`henrik:status:${region}`, 60, () => getValorantStatus(env, region));
    return routeResult(result.data, { source: "henrik", cached: result.cached });
  }
  assertAllowedQuery(url, ["name", "tag"]);
  const name = queryText(url, "name", { pattern: PATTERNS.playerName, max: 32 });
  const tag = queryText(url, "tag", { pattern: PATTERNS.playerTag, max: 8 });
  const result = await cachedLoad(`henrik:account:${name.toLowerCase()}:${tag.toLowerCase()}`, 120, () => getValorantAccount(env, name, tag));
  return routeResult(result.data, { source: "henrik", cached: result.cached });
}
