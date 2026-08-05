import { assertAllowedQuery, PATTERNS, queryText } from "../middleware/validation.js";
import { getTrackerApexProfile, getTrackerApexMatches } from "../services/tracker-client.js";
import { getValorantProfile, getValorantMatches } from "../services/henrik-client.js";
import { getLolProfile, getLolMatches } from "../services/riot-client.js";
import { getUserProviderCredential } from "../services/supabase-client.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";

async function ownKey(env, auth) {
  if (!auth?.userId) return null;
  const credential = await getUserProviderCredential(env, auth.userId, "tracker");
  return typeof credential?.apiKey === "string" ? credential.apiKey : null;
}

export async function trackerRoute({ env, url, auth }) {
  assertAllowedQuery(url, ["platform", "identifier"]);
  const platform = queryText(url, "platform", { values: ["origin", "xbl", "psn"], max: 12 });
  const identifier = queryText(url, "identifier", { pattern: PATTERNS.trackerIdentifier, max: 64 });
  const loader = async () => getTrackerApexProfile(env, platform, identifier, await ownKey(env, auth));
  const result = await cachedLoad(`tracker:apex:${platform}:${identifier.toLowerCase()}`, 90, loader);
  return routeResult(result.data, { source: "tracker", cached: result.cached });
}

export async function trackerValorantRoute({ env, url, auth }) {
  assertAllowedQuery(url, ["name", "tag"]);
  const name = queryText(url, "name", { pattern: PATTERNS.playerName, max: 32 });
  const tag = queryText(url, "tag", { pattern: PATTERNS.playerTag, max: 8 });
  const riotId = `${name}#${tag}`;
  const loader = async () => getValorantProfile(env, riotId, await ownKey(env, auth));
  const result = await cachedLoad(`tracker:valorant:${name.toLowerCase()}:${tag.toLowerCase()}`, 180, loader);
  return routeResult(result.data, { source: "henrikdev", cached: result.cached });
}

export async function trackerLolRoute({ env, url, auth }) {
  assertAllowedQuery(url, ["name", "tag"]);
  const name = queryText(url, "name", { pattern: PATTERNS.playerName, max: 32 });
  const tag = queryText(url, "tag", { pattern: PATTERNS.playerTag, max: 8 });
  const riotId = `${name}#${tag}`;
  const loader = async () => getLolProfile(env, riotId, await ownKey(env, auth));
  const result = await cachedLoad(`tracker:lol:${name.toLowerCase()}:${tag.toLowerCase()}`, 180, loader);
  return routeResult(result.data, { source: "riot", cached: result.cached });
}

export async function trackerValorantMatchesRoute({ env, url, auth }) {
  assertAllowedQuery(url, ["name", "tag", "mode"]);
  const name = queryText(url, "name", { pattern: PATTERNS.playerName, max: 32 });
  const tag = queryText(url, "tag", { pattern: PATTERNS.playerTag, max: 8 });
  const mode = queryText(url, "mode", { max: 32 }) || "all";
  const riotId = `${name}#${tag}`;
  const loader = async () => getValorantMatches(env, riotId, mode, await ownKey(env, auth));
  const result = await cachedLoad(`tracker:valorant:matches:${name.toLowerCase()}:${tag.toLowerCase()}:${mode}`, 180, loader);
  return routeResult(result.data, { source: "henrikdev", cached: result.cached });
}

export async function trackerLolMatchesRoute({ env, url, auth }) {
  assertAllowedQuery(url, ["name", "tag", "mode"]);
  const name = queryText(url, "name", { pattern: PATTERNS.playerName, max: 32 });
  const tag = queryText(url, "tag", { pattern: PATTERNS.playerTag, max: 8 });
  const mode = queryText(url, "mode", { max: 32 }) || "all";
  const riotId = `${name}#${tag}`;
  const loader = async () => getLolMatches(env, riotId, mode, await ownKey(env, auth));
  const result = await cachedLoad(`tracker:lol:matches:${name.toLowerCase()}:${tag.toLowerCase()}:${mode}`, 180, loader);
  return routeResult(result.data, { source: "riot", cached: result.cached });
}

export async function trackerApexMatchesRoute({ env, url, auth }) {
  assertAllowedQuery(url, ["platform", "identifier", "mode"]);
  const platform = queryText(url, "platform", { values: ["origin", "xbl", "psn"], max: 12 });
  const identifier = queryText(url, "identifier", { pattern: PATTERNS.trackerIdentifier, max: 64 });
  const mode = queryText(url, "mode", { max: 32 }) || "all";
  const loader = async () => getTrackerApexMatches(env, platform, identifier, mode, await ownKey(env, auth));
  const result = await cachedLoad("tracker:apex:matches:::", 180, loader);
  return routeResult(result.data, { source: "tracker", cached: result.cached });
}
