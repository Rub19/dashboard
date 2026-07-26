import { externalServicesConfig } from "./external-services-config.mjs";

const OPERATIONS = Object.freeze({
  health: Object.freeze({ path: "/health", auth: false, params: [] }),
  diagnostic: Object.freeze({ path: "/api/diagnostic", auth: true, params: ["service"] }),
  steamPlayer: Object.freeze({ path: "/api/steam/player", auth: true, params: ["steamId"] }),
  steamRecentGames: Object.freeze({ path: "/api/steam/recent-games", auth: true, params: ["steamId", "count"] }),
  steamOwnedGames: Object.freeze({ path: "/api/steam/owned-games", auth: true, params: ["steamId", "limit"] }),
  steamAchievements: Object.freeze({ path: "/api/steam/achievements", auth: true, params: ["steamId", "appId"] }),
  trackerApexProfile: Object.freeze({ path: "/api/tracker/apex-profile", auth: true, params: ["platform", "identifier"] }),
  valorantAccount: Object.freeze({ path: "/api/henrik/account", auth: true, params: ["name", "tag"] }),
  valorantStatus: Object.freeze({ path: "/api/henrik/status", auth: true, params: ["region"] }),
  twitchChannel: Object.freeze({ path: "/api/twitch/channel", auth: true, params: ["login"] }),
  lastFmRecentTracks: Object.freeze({ path: "/api/lastfm/recent-tracks", auth: true, params: ["username", "limit"] }),
  lastFmTopArtists: Object.freeze({ path: "/api/lastfm/top-artists", auth: true, params: ["username", "period", "limit"] }),
  lastFmTopTracks: Object.freeze({ path: "/api/lastfm/top-tracks", auth: true, params: ["username", "period", "limit"] }),
  lanyardPresence: Object.freeze({ path: "/api/lanyard/presence", auth: true, params: ["userId"] }),
  nowPlaying: Object.freeze({ path: "/api/now-playing", auth: true, params: ["source", "username", "userId"] }),
  weatherForecast: Object.freeze({ path: "/api/weather", auth: true, params: ["city"] }),
  minecraftProfile: Object.freeze({ path: "/api/minecraft/profile", auth: true, params: ["username"] }),
  publicProfile: Object.freeze({ path: "/api/supabase/public-profile", auth: true, params: ["username"] })
});

function clientError(code, message, details = {}) {
  const error = new Error(String(message || "Le service externe est indisponible.").slice(0, 240));
  error.name = "ExternalServicesError";
  error.code = String(code || "EXTERNAL_SERVICE_ERROR").slice(0, 80);
  error.status = Number(details.status) || 0;
  error.retryable = details.retryable === true;
  error.requestId = String(details.requestId || "").slice(0, 80);
  error.retryAfter = Math.max(0, Number(details.retryAfter) || 0);
  return error;
}

function validBaseUrl(value, environment) {
  const url = new URL(value);
  const loopback = ["127.0.0.1", "localhost"].includes(url.hostname);
  if (url.protocol !== "https:" && !(environment === "development" && loopback && url.protocol === "http:")) {
    throw new TypeError("External services URL must use HTTPS.");
  }
  return url.origin;
}

export function createExternalServicesClient(options = {}) {
  const runtime = options.runtime || globalThis;
  const network = options.network;
  const auth = options.auth;
  const config = options.config || externalServicesConfig(runtime);
  if (!network?.requestJSON) throw new TypeError("ExternalServicesClient requires a network client");
  if (!auth?.getClient) throw new TypeError("ExternalServicesClient requires an auth adapter");
  const baseUrl = validBaseUrl(config.baseUrl, config.environment);
  const activeControllers = new Set();
  let destroyed = false;
  let status = Object.freeze({
    workerConnected: false,
    lastLatencyMs: null,
    lastError: "",
    lastCheckedAt: null,
    requests: 0,
    successes: 0,
    failures: 0,
    cache: null,
    rateLimit: null,
    services: Object.freeze([]),
    lastRequestId: ""
  });

  function publish(patch) {
    status = Object.freeze({ ...status, ...patch });
  }

  async function accessToken() {
    const client = await auth.getClient();
    if (!client?.auth?.getSession) throw clientError("AUTH_REQUIRED", "La session Supabase est indisponible.", { status: 401 });
    const response = await client.auth.getSession();
    const token = response?.data?.session?.access_token;
    if (response?.error || typeof token !== "string" || token.length < 20) {
      throw clientError("AUTH_REQUIRED", "Reconnectez-vous pour utiliser cette integration.", { status: 401 });
    }
    return token;
  }

  async function execute(operationName, values = {}, requestOptions = {}) {
    if (destroyed) throw clientError("CLIENT_DESTROYED", "Le client des integrations est ferme.");
    const operation = OPERATIONS[operationName];
    if (!operation) throw clientError("OPERATION_NOT_ALLOWED", "Cette operation externe n'est pas autorisee.", { status: 400 });
    const url = new URL(operation.path, `${baseUrl}/`);
    operation.params.forEach((name) => {
      const value = values?.[name];
      if (value !== undefined && value !== null && String(value).trim()) url.searchParams.set(name, String(value).trim());
    });
    const controller = new AbortController();
    activeControllers.add(controller);
    const startedAt = Date.now();
    publish({ requests: status.requests + 1, lastError: "" });
    try {
      const headers = new Headers({ accept: "application/json", "x-request-id": runtime.crypto?.randomUUID?.() || `${Date.now()}-ethone` });
      if (operation.auth) headers.set("authorization", `Bearer ${await accessToken()}`);
      if (destroyed || controller.signal.aborted) throw clientError("CLIENT_DESTROYED", "Le client des integrations est ferme.");
      const payload = await network.requestJSON(url.href, {
        headers,
        signal: controller.signal,
        timeoutMs: requestOptions.timeoutMs || 8000,
        retries: requestOptions.retries ?? 1,
        dedupeKey: `ethone-worker:${operationName}:${url.search}`,
        maxResponseBytes: 1024 * 1024
      });
      if (!payload || payload.ok !== true || typeof payload.meta !== "object") {
        throw clientError(payload?.error?.code, payload?.error?.message || "Reponse Worker invalide.", payload?.error || {});
      }
      const latencyMs = Date.now() - startedAt;
      const result = Object.freeze({ ...payload, meta: Object.freeze({ ...payload.meta, latencyMs }) });
      publish({
        workerConnected: true,
        lastLatencyMs: latencyMs,
        lastCheckedAt: new Date().toISOString(),
        successes: status.successes + 1,
        cache: payload.data?.cache || Object.freeze({ cached: payload.meta.cached === true }),
        rateLimit: payload.meta?.rateLimit || payload.data?.rateLimit || status.rateLimit,
        services: Array.isArray(payload.data?.services) ? Object.freeze(payload.data.services.map((entry) => Object.freeze({
          id: String(entry?.id || "").slice(0, 40),
          available: entry?.available === true,
          routeEnabled: entry?.routeEnabled === true
        }))) : status.services,
        lastRequestId: String(payload.meta.requestId || "").slice(0, 80)
      });
      return result;
    } catch (error) {
      const safeMessage = network.redactMessage?.(error?.message) || "Le Worker ETHONE est indisponible.";
      const reachedWorker = error?.name === "NetworkHttpError" && Number(error?.status) > 0;
      publish({
        workerConnected: reachedWorker ? true : error?.code === "AUTH_REQUIRED" ? status.workerConnected : false,
        lastLatencyMs: Date.now() - startedAt,
        lastError: safeMessage,
        lastCheckedAt: new Date().toISOString(),
        failures: status.failures + 1,
        lastRequestId: String(error?.requestId || "").slice(0, 80)
      });
      if (error?.name === "ExternalServicesError") throw error;
      throw clientError(error?.code, safeMessage, error);
    } finally {
      activeControllers.delete(controller);
    }
  }

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    activeControllers.forEach((controller) => controller.abort());
    activeControllers.clear();
    return true;
  }

  return Object.freeze({
    health: () => execute("health", {}, { retries: 0, timeoutMs: 5000 }),
    diagnostic: (service = "") => execute("diagnostic", service ? { service } : {}, { retries: 0 }),
    steam: Object.freeze({
      player: (steamId) => execute("steamPlayer", { steamId }),
      recentGames: (steamId, count) => execute("steamRecentGames", { steamId, count }),
      ownedGames: (steamId, limit) => execute("steamOwnedGames", { steamId, limit }),
      achievements: (steamId, appId) => execute("steamAchievements", { steamId, appId })
    }),
    tracker: Object.freeze({ apexProfile: (platform, identifier) => execute("trackerApexProfile", { platform, identifier }) }),
    henrik: Object.freeze({
      account: (name, tag) => execute("valorantAccount", { name, tag }),
      status: (region) => execute("valorantStatus", { region })
    }),
    twitch: Object.freeze({ channel: (login) => execute("twitchChannel", { login }) }),
    lastfm: Object.freeze({
      recentTracks: (username, limit) => execute("lastFmRecentTracks", { username, limit }),
      topArtists: (username, period, limit) => execute("lastFmTopArtists", { username, period, limit }),
      topTracks: (username, period, limit) => execute("lastFmTopTracks", { username, period, limit })
    }),
    lanyard: Object.freeze({ presence: (userId) => execute("lanyardPresence", { userId }) }),
    nowPlaying: (source, identity) => execute("nowPlaying", source === "lanyard" ? { source, userId: identity } : { source, username: identity }),
    weather: Object.freeze({ forecast: (city) => execute("weatherForecast", { city }) }),
    minecraft: Object.freeze({ profile: (username) => execute("minecraftProfile", { username }) }),
    publicProfile: (username) => execute("publicProfile", { username }),
    diagnostics: () => Object.freeze({ ...status, activeRequests: activeControllers.size, environment: config.environment, baseUrl: network.redactUrl?.(baseUrl) || baseUrl }),
    destroy
  });
}
