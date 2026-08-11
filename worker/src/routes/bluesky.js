import { httpError } from "../middleware/errors.js";
import { assertAllowedQuery, queryText } from "../middleware/validation.js";
import { getBlueskyProfile } from "../services/bluesky-client.js";

const HANDLE_RE = /^[A-Za-z0-9._-]{2,80}$/;

export async function blueskyProfileRoute({ url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, ["handle"]);
  const handle = queryText(url, "handle", { pattern: HANDLE_RE });
  const profile = await getBlueskyProfile(env, handle);
  return { data: profile };
}
