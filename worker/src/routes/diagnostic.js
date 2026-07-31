import { assertAllowedQuery, queryText } from "../middleware/validation.js";
import { cacheDiagnostics } from "../utils/cache.js";
import { externalRequestDiagnostics } from "../utils/external-request.js";
import { routeResult } from "../utils/response.js";
import { twitchDiagnostics } from "../services/twitch-client.js";

const REQUIREMENTS = Object.freeze({
  steam: Object.freeze(["STEAM_API_KEY"]),
  tracker: Object.freeze(["TRACKER_API_KEY"]),
  twitch: Object.freeze(["TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET"]),
  lastfm: Object.freeze(["LASTFM_API_KEY"]),
  lanyard: Object.freeze([]),
  nowplaying: Object.freeze([]),
  weather: Object.freeze([]),
  minecraft: Object.freeze([]),
  spotify: Object.freeze([]),
  github: Object.freeze(["GITHUB_CLIENT_SECRET"]),
  "google-calendar": Object.freeze(["GOOGLE_CLIENT_SECRET"]),
  notion: Object.freeze(["NOTION_CLIENT_SECRET"]),
  todoist: Object.freeze(["TODOIST_CLIENT_SECRET"]),
  "google-drive": Object.freeze(["GOOGLE_CLIENT_SECRET"]),
  youtube: Object.freeze(["GOOGLE_CLIENT_SECRET"]),
  reddit: Object.freeze(["REDDIT_CLIENT_SECRET"]),
  supabase: Object.freeze(["SUPABASE_URL", "SUPABASE_SECRET_KEY"]),
  brain: Object.freeze(["GROQ_API_KEY"])
});

function configured(env, name) {
  const value = env?.[name];
  return typeof value === "string" && value.length >= 8;
}

function serviceState(env, service) {
  const requirements = REQUIREMENTS[service];
  return Object.freeze({
    id: service,
    available: requirements.every((name) => configured(env, name)),
    requiredBindings: requirements.length,
    routeEnabled: true
  });
}

export async function diagnosticRoute({ env, url }) {
  assertAllowedQuery(url, ["service"]);
  const service = queryText(url, "service", { required: false, values: Object.keys(REQUIREMENTS) });
  const services = service ? [serviceState(env, service)] : Object.keys(REQUIREMENTS).map((name) => serviceState(env, name));
  return routeResult({
    worker: "connected",
    version: String(env.WORKER_VERSION || "1.0.0").slice(0, 32),
    services: Object.freeze(services),
    authentication: Object.freeze({
      jwtVerification: "signature-expiration-issuer-audience",
      algorithms: Object.freeze(["HS256", "RS256", "ES256"])
    }),
    rateLimit: Object.freeze({
      edge: Boolean(env.RATE_LIMIT_EDGE?.limit),
      standard: Boolean(env.RATE_LIMIT_STANDARD?.limit),
      strict: Boolean(env.RATE_LIMIT_STRICT?.limit),
      remaining: null
    }),
    cache: cacheDiagnostics(),
    outbound: externalRequestDiagnostics(),
    twitch: twitchDiagnostics(env)
  }, { source: "ethone-worker", cached: false });
}
