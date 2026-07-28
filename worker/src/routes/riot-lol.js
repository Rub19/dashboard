import { httpError } from "../middleware/errors.js";
import { assertAllowedQuery, PATTERNS, queryText } from "../middleware/validation.js";
import { getLeagueRank, getRecentMatches, resolveRiotAccount } from "../services/riot-lol-client.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";

async function resolveAccount(env, name, tag) {
  const result = await cachedLoad(`riot-lol:account:${name.toLowerCase()}:${tag.toLowerCase()}`, 86400, () => resolveRiotAccount(env, name, tag));
  if (!result.data) throw httpError("PROVIDER_NOT_FOUND", 404);
  return result.data;
}

export async function riotLolRoute({ env, url, route }) {
  assertAllowedQuery(url, ["name", "tag"]);
  const name = queryText(url, "name", { pattern: PATTERNS.playerName, max: 32 });
  const tag = queryText(url, "tag", { pattern: PATTERNS.playerTag, max: 8 });
  const account = await resolveAccount(env, name, tag);
  if (route.action === "rank") {
    const result = await cachedLoad(`riot-lol:rank:${account.continent}:${account.puuid}`, 300, () => getLeagueRank(env, account.puuid, account.continent));
    return routeResult(result.data, { source: "riot-lol", cached: result.cached });
  }
  if (route.action === "matches") {
    const result = await cachedLoad(`riot-lol:matches:${account.continent}:${account.puuid}`, 180, () => getRecentMatches(env, account.puuid, account.continent, 5));
    return routeResult(result.data, { source: "riot-lol", cached: result.cached });
  }
  return routeResult(account, { source: "riot-lol" });
}
