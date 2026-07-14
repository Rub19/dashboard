import { assertAllowedQuery, PATTERNS, queryText } from "../middleware/validation.js";
import { findPublicProfile } from "../services/supabase-client.js";
import { routeResult } from "../utils/response.js";

export async function supabaseRoute({ env, url }) {
  assertAllowedQuery(url, ["username"]);
  const username = queryText(url, "username", { pattern: PATTERNS.username, min: 3, max: 32 });
  const profile = await findPublicProfile(env, username);
  return routeResult(profile, { source: "supabase", cached: false });
}
