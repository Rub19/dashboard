import { externalServicesConfig } from "./external-services-config.mjs";

const OPERATIONS = Object.freeze({
  health: Object.freeze({ path: "/health", auth: false, params: [] }),
  diagnostic: Object.freeze({ path: "/api/diagnostic", auth: true, params: ["service"] }),
  steamPlayer: Object.freeze({ path: "/api/steam/player", auth: true, params: ["steamId"] }),
  steamRecentGames: Object.freeze({ path: "/api/steam/recent-games", auth: true, params: ["steamId", "count"] }),
  steamOwnedGames: Object.freeze({ path: "/api/steam/owned-games", auth: true, params: ["steamId", "limit"] }),
  steamAchievements: Object.freeze({ path: "/api/steam/achievements", auth: true, params: ["steamId", "appId"] }),
  trackerApexProfile: Object.freeze({ path: "/api/tracker/apex-profile", auth: true, params: ["platform", "identifier"] }),
  trackerValorantProfile: Object.freeze({ path: "/api/tracker/valorant-profile", auth: true, params: ["name", "tag"] }),
  trackerLolProfile: Object.freeze({ path: "/api/tracker/lol-profile", auth: true, params: ["name", "tag"] }),
  trackerApexMatches: Object.freeze({ path: "/api/tracker/apex-matches", auth: true, params: ["platform", "identifier", "mode"] }),
  trackerValorantMatches: Object.freeze({ path: "/api/tracker/valorant-matches", auth: true, params: ["name", "tag", "mode"] }),
  trackerLolMatches: Object.freeze({ path: "/api/tracker/lol-matches", auth: true, params: ["name", "tag", "mode"] }),
  twitchChannel: Object.freeze({ path: "/api/twitch/channel", auth: true, params: ["login"] }),
  lastFmRecentTracks: Object.freeze({ path: "/api/lastfm/recent-tracks", auth: true, params: ["username", "limit"] }),
  lastFmTopArtists: Object.freeze({ path: "/api/lastfm/top-artists", auth: true, params: ["username", "period", "limit"] }),
  lastFmTopTracks: Object.freeze({ path: "/api/lastfm/top-tracks", auth: true, params: ["username", "period", "limit"] }),
  lanyardPresence: Object.freeze({ path: "/api/lanyard/presence", auth: true, params: ["userId"] }),
  nowPlaying: Object.freeze({ path: "/api/now-playing", auth: true, params: ["source", "username", "userId"] }),
  weatherForecast: Object.freeze({ path: "/api/weather", auth: true, params: ["city"] }),
  minecraftProfile: Object.freeze({ path: "/api/minecraft/profile", auth: true, params: ["username"] }),
  spotifyOAuthExchange: Object.freeze({ path: "/api/spotify/oauth/exchange", method: "POST", auth: true, params: ["code", "codeVerifier", "clientId"] }),
  spotifyNowPlaying: Object.freeze({ path: "/api/spotify/now-playing", auth: true, params: ["clientId"] }),
  spotifyControl: Object.freeze({ path: "/api/spotify/control", method: "POST", auth: true, params: ["action", "clientId"] }),
  spotifyOAuthDisconnect: Object.freeze({ path: "/api/spotify/oauth/disconnect", method: "POST", auth: true, params: [] }),
  githubOAuthExchange: Object.freeze({ path: "/api/github/oauth/exchange", method: "POST", auth: true, params: ["code", "clientId"] }),
  githubProfile: Object.freeze({ path: "/api/github/profile", auth: true, params: [] }),
  githubOAuthDisconnect: Object.freeze({ path: "/api/github/oauth/disconnect", method: "POST", auth: true, params: [] }),
  googleCalendarOAuthExchange: Object.freeze({ path: "/api/google-calendar/oauth/exchange", method: "POST", auth: true, params: ["code", "clientId"] }),
  googleCalendarEvents: Object.freeze({ path: "/api/google-calendar/events", auth: true, params: ["clientId"] }),
  googleCalendarOAuthDisconnect: Object.freeze({ path: "/api/google-calendar/oauth/disconnect", method: "POST", auth: true, params: [] }),
  notionOAuthExchange: Object.freeze({ path: "/api/notion/oauth/exchange", method: "POST", auth: true, params: ["code", "clientId"] }),
  notionPages: Object.freeze({ path: "/api/notion/pages", auth: true, params: [] }),
  notionOAuthDisconnect: Object.freeze({ path: "/api/notion/oauth/disconnect", method: "POST", auth: true, params: [] }),
  todoistOAuthExchange: Object.freeze({ path: "/api/todoist/oauth/exchange", method: "POST", auth: true, params: ["code", "clientId"] }),
  todoistTasks: Object.freeze({ path: "/api/todoist/tasks", auth: true, params: [] }),
  todoistOAuthDisconnect: Object.freeze({ path: "/api/todoist/oauth/disconnect", method: "POST", auth: true, params: [] }),
  googleDriveOAuthExchange: Object.freeze({ path: "/api/google-drive/oauth/exchange", method: "POST", auth: true, params: ["code", "clientId"] }),
  googleDriveFiles: Object.freeze({ path: "/api/google-drive/files", auth: true, params: ["clientId"] }),
  googleDriveOAuthDisconnect: Object.freeze({ path: "/api/google-drive/oauth/disconnect", method: "POST", auth: true, params: [] }),
  youtubeOAuthExchange: Object.freeze({ path: "/api/youtube/oauth/exchange", method: "POST", auth: true, params: ["code", "clientId"] }),
  youtubeActivity: Object.freeze({ path: "/api/youtube/activity", auth: true, params: ["clientId"] }),
  youtubeOAuthDisconnect: Object.freeze({ path: "/api/youtube/oauth/disconnect", method: "POST", auth: true, params: [] }),
  redditOAuthExchange: Object.freeze({ path: "/api/reddit/oauth/exchange", method: "POST", auth: true, params: ["code", "clientId"] }),
  redditActivity: Object.freeze({ path: "/api/reddit/activity", auth: true, params: ["clientId"] }),
  redditOAuthDisconnect: Object.freeze({ path: "/api/reddit/oauth/disconnect", method: "POST", auth: true, params: [] }),
  publicProfile: Object.freeze({ path: "/api/supabase/public-profile", auth: true, params: ["username"] }),
  brainComplete: Object.freeze({ path: "/api/brain/complete", method: "POST", auth: true, params: [], rawBody: true }),
  passkeyRegisterOptions: Object.freeze({ path: "/api/auth/passkey/register-options", method: "POST", auth: true, params: ["email", "name", "deviceName"] }),
  passkeyRegister: Object.freeze({ path: "/api/auth/passkey/register", method: "POST", auth: true, params: ["response", "deviceId"] }),
  passkeyAuthenticateOptions: Object.freeze({ path: "/api/auth/passkey/authenticate-options", method: "POST", auth: false, params: ["email", "userId"] }),
  passkeyAuthenticate: Object.freeze({ path: "/api/auth/passkey/authenticate", method: "POST", auth: false, params: ["response"] }),
  passkeyRename: Object.freeze({ path: "/api/auth/passkey/rename", method: "POST", auth: true, params: ["passkeyId", "name"] }),
  passkeyRevoke: Object.freeze({ path: "/api/auth/passkey/revoke", method: "POST", auth: true, params: ["passkeyId"] }),
  otpSend: Object.freeze({ path: "/api/auth/otp/send", method: "POST", auth: false, params: ["email", "userId"] }),
  otpVerify: Object.freeze({ path: "/api/auth/otp/verify", method: "POST", auth: false, params: ["userId", "email", "code"] }),
  deviceUpsert: Object.freeze({ path: "/api/auth/device", method: "POST", auth: true, params: ["name"] }),
  deviceList: Object.freeze({ path: "/api/auth/devices", auth: true, params: [] }),
  deviceTrust: Object.freeze({ path: "/api/auth/device/trust", method: "POST", auth: true, params: ["deviceId", "trusted"] }),
  deviceRevoke: Object.freeze({ path: "/api/auth/device/revoke", method: "POST", auth: true, params: ["deviceId"] }),
  deviceRemove: Object.freeze({ path: "/api/auth/device/remove", method: "POST", auth: true, params: ["deviceId"] }),
  securityEvents: Object.freeze({ path: "/api/auth/security-events", auth: true, params: ["limit"] })
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
      throw clientError("AUTH_REQUIRED", "Reconnectez-vous pour utiliser cette intégration.", { status: 401 });
    }
    return token;
  }

  async function execute(operationName, values = {}, requestOptions = {}) {
    if (destroyed) throw clientError("CLIENT_DESTROYED", "Le client des intégrations est ferme.");
    const operation = OPERATIONS[operationName];
    if (!operation) throw clientError("OPERATION_NOT_ALLOWED", "Cette opération externe n'est pas autorisee.", { status: 400 });
    const method = operation.method === "POST" ? "POST" : "GET";
    const url = new URL(operation.path, `${baseUrl}/`);
    let body;
    if (method === "GET") {
      operation.params.forEach((name) => {
        const value = values?.[name];
        if (value !== undefined && value !== null && String(value).trim()) url.searchParams.set(name, String(value).trim());
      });
    } else if (operation.rawBody) {
      body = JSON.stringify(values || {});
    } else {
      body = JSON.stringify(Object.fromEntries(operation.params
        .map((name) => [name, values?.[name]])
        .filter(([, value]) => value !== undefined && value !== null && String(value).trim())));
    }
    const controller = new AbortController();
    activeControllers.add(controller);
    const startedAt = Date.now();
    publish({ requests: status.requests + 1, lastError: "" });
    try {
      const headers = new Headers({ accept: "application/json", "x-request-id": runtime.crypto?.randomUUID?.() || `${Date.now()}-ethone` });
      if (method === "POST") headers.set("content-type", "application/json");
      if (operation.auth) headers.set("authorization", `Bearer ${await accessToken()}`);
      if (destroyed || controller.signal.aborted) throw clientError("CLIENT_DESTROYED", "Le client des intégrations est ferme.");
      const payload = await network.requestJSON(url.href, {
        method,
        body,
        headers,
        signal: controller.signal,
        timeoutMs: requestOptions.timeoutMs || 8000,
        retries: requestOptions.retries ?? (method === "GET" ? 1 : 0),
        dedupeKey: `ethone-worker:${operationName}:${method === "GET" ? url.search : body}`,
        maxResponseBytes: 1024 * 1024
      });
      if (!payload || payload.ok !== true || typeof payload.meta !== "object") {
        throw clientError(payload?.error?.code, payload?.error?.message || "Réponse Worker invalide.", payload?.error || {});
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
    tracker: Object.freeze({
      apexProfile: (platform, identifier) => execute("trackerApexProfile", { platform, identifier }),
      valorantProfile: (name, tag) => execute("trackerValorantProfile", { name, tag }),
      lolProfile: (name, tag) => execute("trackerLolProfile", { name, tag }),
      apexMatches: (platform, identifier, mode) => execute("trackerApexMatches", { platform, identifier, mode }),
      valorantMatches: (name, tag, mode) => execute("trackerValorantMatches", { name, tag, mode }),
      lolMatches: (name, tag, mode) => execute("trackerLolMatches", { name, tag, mode })
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
    spotifyOAuth: Object.freeze({
      exchange: (code, codeVerifier, clientId) => execute("spotifyOAuthExchange", { code, codeVerifier, clientId }),
      nowPlaying: (clientId) => execute("spotifyNowPlaying", { clientId }),
      control: (action, clientId) => execute("spotifyControl", { action, clientId }),
      disconnect: () => execute("spotifyOAuthDisconnect", {})
    }),
    githubOAuth: Object.freeze({
      exchange: (code, clientId) => execute("githubOAuthExchange", { code, clientId }),
      profile: () => execute("githubProfile", {}),
      disconnect: () => execute("githubOAuthDisconnect", {})
    }),
    googleCalendarOAuth: Object.freeze({
      exchange: (code, clientId) => execute("googleCalendarOAuthExchange", { code, clientId }),
      events: (clientId) => execute("googleCalendarEvents", { clientId }),
      disconnect: () => execute("googleCalendarOAuthDisconnect", {})
    }),
    notionOAuth: Object.freeze({
      exchange: (code, clientId) => execute("notionOAuthExchange", { code, clientId }),
      pages: () => execute("notionPages", {}),
      disconnect: () => execute("notionOAuthDisconnect", {})
    }),
    todoistOAuth: Object.freeze({
      exchange: (code, clientId) => execute("todoistOAuthExchange", { code, clientId }),
      tasks: () => execute("todoistTasks", {}),
      disconnect: () => execute("todoistOAuthDisconnect", {})
    }),
    googleDriveOAuth: Object.freeze({
      exchange: (code, clientId) => execute("googleDriveOAuthExchange", { code, clientId }),
      files: (clientId) => execute("googleDriveFiles", { clientId }),
      disconnect: () => execute("googleDriveOAuthDisconnect", {})
    }),
    youtubeOAuth: Object.freeze({
      exchange: (code, clientId) => execute("youtubeOAuthExchange", { code, clientId }),
      activity: (clientId) => execute("youtubeActivity", { clientId }),
      disconnect: () => execute("youtubeOAuthDisconnect", {})
    }),
    redditOAuth: Object.freeze({
      exchange: (code, clientId) => execute("redditOAuthExchange", { code, clientId }),
      activity: (clientId) => execute("redditActivity", { clientId }),
      disconnect: () => execute("redditOAuthDisconnect", {})
    }),
    publicProfile: (username) => execute("publicProfile", { username }),
    brain: Object.freeze({
      complete: (input) => execute("brainComplete", input, { timeoutMs: 20000, retries: 0 })
    }),
    security: Object.freeze({
      passkeyRegisterOptions: (email, name, deviceName) => execute("passkeyRegisterOptions", { email, name, deviceName }),
      passkeyRegister: (response, deviceId) => execute("passkeyRegister", { response, deviceId }),
      passkeyAuthenticateOptions: (email, userId) => execute("passkeyAuthenticateOptions", { email, userId }),
      passkeyAuthenticate: (response) => execute("passkeyAuthenticate", { response }),
      passkeyRename: (passkeyId, name) => execute("passkeyRename", { passkeyId, name }),
      passkeyRevoke: (passkeyId) => execute("passkeyRevoke", { passkeyId }),
      otpSend: (email, userId) => execute("otpSend", { email, userId }),
      otpVerify: (userId, email, code) => execute("otpVerify", { userId, email, code }),
      deviceUpsert: (name) => execute("deviceUpsert", { name }),
      deviceList: () => execute("deviceList", {}),
      deviceTrust: (deviceId, trusted) => execute("deviceTrust", { deviceId, trusted }),
      deviceRevoke: (deviceId) => execute("deviceRevoke", { deviceId }),
      deviceRemove: (deviceId) => execute("deviceRemove", { deviceId }),
      securityEvents: (limit) => execute("securityEvents", limit ? { limit } : {})
    }),
    diagnostics: () => Object.freeze({ ...status, activeRequests: activeControllers.size, environment: config.environment, baseUrl: network.redactUrl?.(baseUrl) || baseUrl }),
    destroy
  });
}
