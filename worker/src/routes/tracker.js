import { assertAllowedQuery, PATTERNS, queryText } from "../middleware/validation.js";
import { getTrackerApexProfile } from "../services/tracker-client.js";
import { getUserProviderCredential } from "../services/supabase-client.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";

export async function trackerRoute({ env, url, auth }) {
  assertAllowedQuery(url, ["platform", "identifier"]);
  const platform = queryText(url, "platform", { values: ["origin", "xbl", "psn"], max: 12 });
  const identifier = queryText(url, "identifier", { pattern: PATTERNS.trackerIdentifier, max: 64 });
  const loader = async () => {
    let apiKeyOverride = null;
    if (auth?.userId) {
      const credential = await getUserProviderCredential(env, auth.userId, "tracker");
      apiKeyOverride = typeof credential?.apiKey === "string" ? credential.apiKey : null;
    }
    return getTrackerApexProfile(env, platform, identifier, apiKeyOverride);
  };
  const result = await cachedLoad(`tracker:apex:${platform}:${identifier.toLowerCase()}`, 90, loader);
  return routeResult(result.data, { source: "tracker", cached: result.cached });
}
