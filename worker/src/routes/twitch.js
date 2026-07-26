import { assertAllowedQuery, PATTERNS, queryText } from "../middleware/validation.js";
import { getTwitchChannel } from "../services/twitch-client.js";
import { getUserProviderCredential } from "../services/supabase-client.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";

export async function twitchRoute({ env, url, auth }) {
  assertAllowedQuery(url, ["login"]);
  const login = queryText(url, "login", { pattern: PATTERNS.twitchLogin, max: 25 }).toLowerCase();
  const loader = async () => {
    let credentials = null;
    if (auth?.userId) {
      const credential = await getUserProviderCredential(env, auth.userId, "twitch");
      if (typeof credential?.clientId === "string" && typeof credential?.clientSecret === "string") {
        credentials = { clientId: credential.clientId, clientSecret: credential.clientSecret };
      }
    }
    return getTwitchChannel(env, login, credentials);
  };
  const result = await cachedLoad(`twitch:channel:${login}`, 30, loader);
  return routeResult(result.data, { source: "twitch", cached: result.cached });
}
