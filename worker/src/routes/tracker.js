import { assertAllowedQuery, PATTERNS, queryText } from "../middleware/validation.js";
import { getTrackerApexProfile, getTrackerApexMatches } from "../services/tracker-client.js";
import { getValorantProfile, getValorantMatches } from "../services/henrik-client.js";
import { getLolProfile, getLolMatches } from "../services/riot-client.js";
import { getUserProviderCredential } from "../services/supabase-client.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";

async function ownKeyTracker(env, auth, request) {
  const headerKey = request?.headers?.get?.("x-tracker-api-key") || request?.headers?.get?.("x-api-key");
  if (headerKey) return headerKey;
  if (!auth?.userId) return null;
  const credential = await getUserProviderCredential(env, auth.userId, "tracker");
  return typeof credential?.apiKey === "string" ? credential.apiKey : null;
}

async function ownKeyHenrik(env, auth, request) {
  const headerKey = request?.headers?.get?.("x-henrik-api-key") || request?.headers?.get?.("x-riot-api-key") || request?.headers?.get?.("x-api-key");
  if (headerKey) return headerKey;
  if (!auth?.userId) return null;
  const credential = await getUserProviderCredential(env, auth.userId, "riot");
  if (typeof credential?.henrikApiKey === "string" && credential.henrikApiKey) return credential.henrikApiKey;
  if (typeof credential?.apiKey === "string" && credential.apiKey) return credential.apiKey;
  const valoCredential = await getUserProviderCredential(env, auth.userId, "valorant");
  if (typeof valoCredential?.apiKey === "string" && valoCredential.apiKey) return valoCredential.apiKey;
  return null;
}

async function ownKeyRiot(env, auth, request) {
  const headerKey = request?.headers?.get?.("x-riot-api-key") || request?.headers?.get?.("x-api-key");
  if (headerKey) return headerKey;
  if (!auth?.userId) return null;
  const credential = await getUserProviderCredential(env, auth.userId, "riot");
  if (typeof credential?.riotApiKey === "string" && credential.riotApiKey) return credential.riotApiKey;
  if (typeof credential?.apiKey === "string" && credential.apiKey) return credential.apiKey;
  const lolCredential = await getUserProviderCredential(env, auth.userId, "leagueoflegends");
  if (typeof lolCredential?.apiKey === "string" && lolCredential.apiKey) return lolCredential.apiKey;
  return null;
}

export async function trackerRoute({ env, url, auth, request }) {
  assertAllowedQuery(url, ["platform", "identifier", "mode", "region", "_t", "t", "force"]);
  const platform = queryText(url, "platform", { values: ["origin", "xbl", "psn"], max: 12 });
  const identifier = queryText(url, "identifier", { pattern: PATTERNS.trackerIdentifier, max: 64 });
  try {
    const loader = async () => getTrackerApexProfile(env, platform, identifier, await ownKeyTracker(env, auth, request));
    const result = await cachedLoad(`tracker:apex:${platform}:${identifier.toLowerCase()}`, 90, loader);
    return routeResult(result.data, { source: "tracker", cached: result.cached });
  } catch (error) {
    if (error?.code === "AUTH_REQUIRED" || (error?.status >= 500 && error?.status < 600)) {
      return routeResult({ available: false }, { source: "tracker", cached: false });
    }
    throw error;
  }
}

export async function trackerValorantRoute({ env, url, auth, request }) {
  assertAllowedQuery(url, ["name", "tag", "mode", "region", "_t", "t", "force"]);
  const name = queryText(url, "name", { pattern: PATTERNS.playerName, max: 32 });
  const tag = queryText(url, "tag", { pattern: PATTERNS.playerTag, max: 10 }).replace(/^#/, "");
  const riotId = `${name}#${tag}`;
  const loader = async () => getValorantProfile(env, riotId, await ownKeyHenrik(env, auth, request));
  const result = await cachedLoad(`tracker:valorant:${name.toLowerCase()}:${tag.toLowerCase()}`, 180, loader);
  return routeResult(result.data, { source: "henrikdev", cached: result.cached });
}

export async function trackerLolRoute({ env, url, auth, request }) {
  assertAllowedQuery(url, ["name", "tag", "mode", "region", "_t", "t", "force"]);
  const name = queryText(url, "name", { pattern: PATTERNS.playerName, max: 32 });
  const tag = queryText(url, "tag", { pattern: PATTERNS.playerTag, max: 10 }).replace(/^#/, "");
  const riotId = `${name}#${tag}`;
  const loader = async () => getLolProfile(env, riotId, await ownKeyRiot(env, auth, request));
  const result = await cachedLoad(`tracker:lol:${name.toLowerCase()}:${tag.toLowerCase()}`, 180, loader);
  return routeResult(result.data, { source: "riot", cached: result.cached });
}

export async function trackerValorantMatchesRoute({ env, url, auth, request }) {
  assertAllowedQuery(url, ["name", "tag", "mode", "region", "_t", "t", "force"]);
  const name = queryText(url, "name", { pattern: PATTERNS.playerName, max: 32 });
  const tag = queryText(url, "tag", { pattern: PATTERNS.playerTag, max: 10 }).replace(/^#/, "");
  const mode = queryText(url, "mode", { max: 32, required: false }) || "all";
  const riotId = `${name}#${tag}`;
  const loader = async () => getValorantMatches(env, riotId, mode, await ownKeyHenrik(env, auth, request));
  const result = await cachedLoad(`tracker:valorant:matches:${name.toLowerCase()}:${tag.toLowerCase()}:${mode}`, 600, loader);
  return routeResult(result.data, { source: "henrikdev", cached: result.cached });
}

export async function trackerLolMatchesRoute({ env, url, auth, request }) {
  assertAllowedQuery(url, ["name", "tag", "mode", "region", "_t", "t", "force"]);
  const name = queryText(url, "name", { pattern: PATTERNS.playerName, max: 32 });
  const tag = queryText(url, "tag", { pattern: PATTERNS.playerTag, max: 10 }).replace(/^#/, "");
  const mode = queryText(url, "mode", { max: 32, required: false }) || "all";
  const riotId = `${name}#${tag}`;
  const loader = async () => getLolMatches(env, riotId, mode, await ownKeyRiot(env, auth, request));
  const result = await cachedLoad(`tracker:lol:matches:${name.toLowerCase()}:${tag.toLowerCase()}:${mode}`, 600, loader);
  return routeResult(result.data, { source: "riot", cached: result.cached });
}

export async function trackerApexMatchesRoute({ env, url, auth, request }) {
  assertAllowedQuery(url, ["platform", "identifier", "mode", "region", "_t", "t", "force"]);
  const platform = queryText(url, "platform", { values: ["origin", "xbl", "psn"], max: 12 });
  const identifier = queryText(url, "identifier", { pattern: PATTERNS.trackerIdentifier, max: 64 });
  const mode = queryText(url, "mode", { max: 32, required: false }) || "all";
  const loader = async () => getTrackerApexMatches(env, platform, identifier, mode, await ownKeyTracker(env, auth, request));
  const result = await cachedLoad(`tracker:apex:matches:${platform}:${identifier.toLowerCase()}:${mode}`, 600, loader);
  return routeResult(result.data, { source: "tracker", cached: result.cached });
}
