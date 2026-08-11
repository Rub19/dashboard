import { httpError } from "../middleware/errors.js";
import { safeText } from "../utils/normalize.js";
import { getBlueskyProfile } from "../services/bluesky-client.js";
import { getCatalogProfile, CATALOG_PROVIDERS } from "../services/catalog-connector-client.js";

const ALLOWED = new Set([...CATALOG_PROVIDERS, "bluesky"]);

export async function catalogProfileRoute({ url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const provider = safeText(url.searchParams.get("provider"), 32);
  if (!ALLOWED.has(provider)) throw httpError("INVALID_PARAMETER", 400, { detail: "provider" });

  if (provider === "bluesky") {
    const handle = safeText(url.searchParams.get("handle"), 120);
    if (!handle) throw httpError("INVALID_PARAMETER", 400, { detail: "handle" });
    const profile = await getBlueskyProfile(env, handle);
    return { data: { provider, profile } };
  }

  const profile = await getCatalogProfile(env, auth.userId, provider);
  return { data: { provider, profile } };
}
