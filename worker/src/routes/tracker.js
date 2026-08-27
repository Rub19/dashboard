import { assertAllowedQuery, PATTERNS, queryText } from "../middleware/validation.js";
import { getTrackerApexProfile, getTrackerApexMatches } from "../services/tracker-client.js";
import { getValorantProfile, getValorantMatches } from "../services/henrik-client.js";
import { getLolProfile, getLolMatches } from "../services/riot-client.js";
import { getUserProviderCredential } from "../services/supabase-client.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";

async function ownKeyTracker(env, auth) {
  if (!auth?.userId) return null;
  const credential = await getUserProviderCredential(env, auth.userId, "tracker");
  return typeof credential?.apiKey === "string" ? credential.apiKey : null;
}

async function ownKeyHenrik(env, auth) {
  if (!auth?.userId) return null;
  const credential = await getUserProviderCredential(env, auth.userId, "riot");
  if (typeof credential?.henrikApiKey === "string" && credential.henrikApiKey) return credential.henrikApiKey;
  if (typeof credential?.apiKey === "string" && credential.apiKey) return credential.apiKey;
  const valoCredential = await getUserProviderCredential(env, auth.userId, "valorant");
  if (typeof valoCredential?.apiKey === "string" && valoCredential.apiKey) return valoCredential.apiKey;
  return null;
}

async function ownKeyRiot(env, auth) {
  if (!auth?.userId) return null;
  const credential = await getUserProviderCredential(env, auth.userId, "riot");
  return typeof credential?.riotApiKey === "string" ? credential.riotApiKey : null;
}

export async function trackerRoute({ env, url, auth }) {
  assertAllowedQuery(url, ["platform", "identifier"]);
  const platform = queryText(url, "platform", { values: ["origin", "xbl", "psn"], max: 12 });
  const identifier = queryText(url, "identifier", { pattern: PATTERNS.trackerIdentifier, max: 64 });
  try {
    const loader = async () => getTrackerApexProfile(env, platform, identifier, await ownKeyTracker(env, auth));
    const result = await cachedLoad(`tracker:apex:${platform}:${identifier.toLowerCase()}`, 90, loader);
    return routeResult(result.data, { source: "tracker", cached: result.cached });
  } catch (error) {
    if (error?.code === "AUTH_REQUIRED" || (error?.status >= 500 && error?.status < 600)) {
      return routeResult({ available: false }, { source: "tracker", cached: false });
    }
    throw error;
  }
}

export async function trackerValorantRoute({ env, url, auth }) {
  assertAllowedQuery(url, ["name", "tag"]);
  const name = queryText(url, "name", { pattern: PATTERNS.playerName, max: 32 });
  const tag = queryText(url, "tag", { pattern: PATTERNS.playerTag, max: 8 });
  const riotId = `${name}#${tag}`;
  const loader = async () => getValorantProfile(env, riotId, await ownKeyHenrik(env, auth));
  const result = await cachedLoad(`tracker:valorant:${name.toLowerCase()}:${tag.toLowerCase()}`, 180, loader);
  return routeResult(result.data, { source: "henrikdev", cached: result.cached });
}

export async function trackerLolRoute({ env, url, auth }) {
  assertAllowedQuery(url, ["name", "tag"]);
  const name = queryText(url, "name", { pattern: PATTERNS.playerName, max: 32 });
  const tag = queryText(url, "tag", { pattern: PATTERNS.playerTag, max: 8 });
  const riotId = `${name}#${tag}`;
  const loader = async () => getLolProfile(env, riotId, await ownKeyRiot(env, auth));
  const result = await cachedLoad(`tracker:lol:${name.toLowerCase()}:${tag.toLowerCase()}`, 180, loader);
  return routeResult(result.data, { source: "riot", cached: result.cached });
}

export async function trackerValorantMatchesRoute({ env, url, auth }) {
  assertAllowedQuery(url, ["name", "tag", "mode"]);
  const name = queryText(url, "name", { pattern: PATTERNS.playerName, max: 32 });
  const tag = queryText(url, "tag", { pattern: PATTERNS.playerTag, max: 8 });
  const mode = queryText(url, "mode", { max: 32 }) || "all";
  const riotId = `${name}#${tag}`;
  const loader = async () => getValorantMatches(env, riotId, mode, await ownKeyHenrik(env, auth));
  const result = await cachedLoad(`tracker:valorant:matches:${name.toLowerCase()}:${tag.toLowerCase()}:${mode}`, 600, loader);
  return routeResult(result.data, { source: "henrikdev", cached: result.cached });
}

export async function trackerLolMatchesRoute({ env, url, auth }) {
  assertAllowedQuery(url, ["name", "tag", "mode"]);
  const name = queryText(url, "name", { pattern: PATTERNS.playerName, max: 32 });
  const tag = queryText(url, "tag", { pattern: PATTERNS.playerTag, max: 8 });
  const mode = queryText(url, "mode", { max: 32 }) || "all";
  const riotId = `${name}#${tag}`;
  const loader = async () => getLolMatches(env, riotId, mode, await ownKeyRiot(env, auth));
  const result = await cachedLoad(`tracker:lol:matches:${name.toLowerCase()}:${tag.toLowerCase()}:${mode}`, 600, loader);
  return routeResult(result.data, { source: "riot", cached: result.cached });
}

export async function trackerApexMatchesRoute({ env, url, auth }) {
  assertAllowedQuery(url, ["platform", "identifier", "mode"]);
  const platform = queryText(url, "platform", { values: ["origin", "xbl", "psn"], max: 12 });
  const identifier = queryText(url, "identifier", { pattern: PATTERNS.trackerIdentifier, max: 64 });
  const mode = queryText(url, "mode", { max: 32 }) || "all";
  const loader = async () => getTrackerApexMatches(env, platform, identifier, mode, await ownKeyTracker(env, auth));
  const result = await cachedLoad(`tracker:apex:matches:${platform}:${identifier.toLowerCase()}:${mode}`, 600, loader);
  return routeResult(result.data, { source: "tracker", cached: result.cached });
}
