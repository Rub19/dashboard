import { assertAllowedQuery, PATTERNS, queryText } from "../middleware/validation.js";
import { getTrackerApexProfile } from "../services/tracker-client.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";

export async function trackerRoute({ env, url }) {
  assertAllowedQuery(url, ["platform", "identifier"]);
  const platform = queryText(url, "platform", { values: ["origin", "xbl", "psn"], max: 12 });
  const identifier = queryText(url, "identifier", { pattern: PATTERNS.trackerIdentifier, max: 64 });
  const result = await cachedLoad(`tracker:apex:${platform}:${identifier.toLowerCase()}`, 90, () => getTrackerApexProfile(env, platform, identifier));
  return routeResult(result.data, { source: "tracker", cached: result.cached });
}
