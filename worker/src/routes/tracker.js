import { assertAllowedQuery, PATTERNS, queryText } from "../middleware/validation.js";
import {
  getTrackerApexProfile,
  getTrackerApexMatches,
  getTrackerProfile,
  getTrackerMatches,
} from "../services/tracker-client.js";
import { getValorantProfile, getValorantMatches } from "../services/henrik-client.js";
import { getLolProfile, getLolMatches, getTftMatches } from "../services/riot-client.js";
import { getUserProviderCredential } from "../services/supabase-client.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";

// tracker.gg v2 game slugs we expose beyond the dedicated Valorant/LoL/Apex tabs.
const TRACKER_GAMES = new Set([
  "csgo", // Counter-Strike 2
  "division-2",
  "splitgate",
  "the-finals",
  "xdefiant",
  "marvel-rivals",
  "rocket-league",
  "bf2042",
  "apex",
]);

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

export async function trackerTftMatchesRoute({ env, url, auth, request }) {
  assertAllowedQuery(url, ["name", "tag", "region", "_t", "t", "force"]);
  const name = queryText(url, "name", { pattern: PATTERNS.playerName, max: 32 });
  const tag = queryText(url, "tag", { pattern: PATTERNS.playerTag, max: 10 }).replace(/^#/, "");
  const riotId = `${name}#${tag}`;
  const loader = async () => getTftMatches(env, riotId, await ownKeyRiot(env, auth, request));
  const result = await cachedLoad(`tracker:tft:matches:${name.toLowerCase()}:${tag.toLowerCase()}`, 600, loader);
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

// --- Generic tracker.gg (CS2, R6/XDefiant, The Finals, Rocket League, …) -------

function readGameQuery(url) {
  const game = queryText(url, "game", { max: 24 });
  if (!TRACKER_GAMES.has(game)) throw new Error(`Jeu non pris en charge: ${game}`);
  const platform = queryText(url, "platform", { pattern: /^[a-z0-9_-]{2,16}$/i, max: 16 });
  const identifier = queryText(url, "identifier", { pattern: PATTERNS.trackerIdentifier, max: 80 });
  return { game, platform, identifier };
}

// Map an upstream/tracker error to a graceful "unavailable" payload with a
// machine-readable reason, so the dashboard can tell "no key" from "key rejected
// for this title" from "profile not found" instead of a blank card.
function trackerUnavailable(error, extra = {}) {
  if (!error) return null;
  const byCode = {
    SERVICE_NOT_CONFIGURED: "no_api_key",
    AUTH_REQUIRED: "no_api_key",
    PROVIDER_REQUEST_REJECTED: "key_rejected",
    PROVIDER_NOT_FOUND: "not_found",
    UPSTREAM_UNAVAILABLE: "upstream",
    UPSTREAM_INVALID_RESPONSE: "upstream",
  };
  const reason = byCode[error.code] || (error.status >= 500 && error.status < 600 ? "upstream" : null);
  if (!reason) return null;
  return { available: false, reason, ...extra };
}

export async function trackerGameProfileRoute({ env, url, auth, request }) {
  assertAllowedQuery(url, ["game", "platform", "identifier", "_t", "t", "force"]);
  const { game, platform, identifier } = readGameQuery(url);
  try {
    const loader = async () => getTrackerProfile(env, game, platform, identifier, await ownKeyTracker(env, auth, request));
    const result = await cachedLoad(`tracker:${game}:${platform}:${identifier.toLowerCase()}`, 120, loader);
    return routeResult(result.data, { source: "tracker", cached: result.cached });
  } catch (error) {
    const fallback = trackerUnavailable(error);
    if (fallback) return routeResult(fallback, { source: "tracker", cached: false });
    throw error;
  }
}

export async function trackerGameMatchesRoute({ env, url, auth, request }) {
  assertAllowedQuery(url, ["game", "platform", "identifier", "mode", "_t", "t", "force"]);
  const { game, platform, identifier } = readGameQuery(url);
  const mode = queryText(url, "mode", { max: 32, required: false }) || "all";
  try {
    const loader = async () => getTrackerMatches(env, game, platform, identifier, mode, await ownKeyTracker(env, auth, request));
    const result = await cachedLoad(`tracker:${game}:matches:${platform}:${identifier.toLowerCase()}:${mode}`, 600, loader);
    return routeResult(result.data, { source: "tracker", cached: result.cached });
  } catch (error) {
    const fallback = trackerUnavailable(error, { matches: [] });
    if (fallback) return routeResult(fallback, { source: "tracker", cached: false });
    throw error;
  }
}
