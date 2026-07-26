import { requireSecret } from "../middleware/validation.js";
import { httpError } from "../middleware/errors.js";
import { requestExternal } from "../utils/external-request.js";
import { safeNumber, safePublicUrl, safeText } from "../utils/normalize.js";

const AUTH_ORIGIN = "https://id.twitch.tv";
const API_ORIGIN = "https://api.twitch.tv";
const tokenCacheByClient = new Map();
const tokenRequestByClient = new Map();

function resolveCredentials(env, credentials) {
  const clientId = credentials?.clientId || requireSecret(env, "TWITCH_CLIENT_ID");
  const clientSecret = credentials?.clientSecret || requireSecret(env, "TWITCH_CLIENT_SECRET");
  return { clientId, clientSecret };
}

async function requestToken(env, credentials) {
  const { clientId, clientSecret } = resolveCredentials(env, credentials);
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" });
  const response = await requestExternal(new URL("/oauth2/token", AUTH_ORIGIN), {
    env,
    expectedOrigin: AUTH_ORIGIN,
    service: "twitch-auth",
    dedupeKey: `app-token:${clientId}`,
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    retries: 1,
    retryUnsafe: true,
    maxBytes: 32768
  });
  const token = String(response.data?.access_token || "");
  const expiresIn = Math.max(60, Math.min(60 * 24 * 60 * 60, Number(response.data?.expires_in) || 0));
  if (token.length < 20) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
  tokenCacheByClient.set(clientId, { token, expiresAt: Date.now() + Math.max(30, expiresIn - 120) * 1000 });
  return token;
}

async function appToken(env, credentials) {
  const { clientId } = resolveCredentials(env, credentials);
  const cached = tokenCacheByClient.get(clientId);
  if (cached?.token && cached.expiresAt > Date.now()) return cached.token;
  let pending = tokenRequestByClient.get(clientId);
  if (!pending) {
    pending = requestToken(env, credentials).finally(() => { tokenRequestByClient.delete(clientId); });
    tokenRequestByClient.set(clientId, pending);
  }
  return pending;
}

async function helix(env, path, query, dedupeKey, credentials, allowRefresh = true) {
  const { clientId } = resolveCredentials(env, credentials);
  const token = await appToken(env, credentials);
  const url = new URL(path, API_ORIGIN);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  try {
    return await requestExternal(url, {
      env,
      expectedOrigin: API_ORIGIN,
      service: "twitch",
      dedupeKey,
      headers: { "Client-Id": clientId, Authorization: `Bearer ${token}` },
      retries: 1
    });
  } catch (error) {
    if (allowRefresh && error?.code === "PROVIDER_REQUEST_REJECTED") {
      tokenCacheByClient.delete(clientId);
      return helix(env, path, query, `${dedupeKey}:refreshed`, credentials, false);
    }
    throw error;
  }
}

export async function getTwitchChannel(env, login, credentials) {
  const userResponse = await helix(env, "/helix/users", { login }, `user:${login.toLowerCase()}`, credentials);
  const user = userResponse.data?.data?.[0];
  if (!user) return null;
  const streamResponse = await helix(env, "/helix/streams", { user_login: login }, `stream:${login.toLowerCase()}`, credentials);
  const stream = streamResponse.data?.data?.[0] || null;
  return Object.freeze({
    id: safeText(user.id, 32),
    login: safeText(user.login, 32),
    displayName: safeText(user.display_name, 80),
    description: safeText(user.description, 300),
    profileImageUrl: safePublicUrl(user.profile_image_url, ["jtvnw.net"]),
    broadcasterType: safeText(user.broadcaster_type, 24),
    live: Boolean(stream),
    stream: stream ? Object.freeze({
      title: safeText(stream.title, 240),
      gameName: safeText(stream.game_name, 120),
      viewers: safeNumber(stream.viewer_count, 0, 100000000),
      startedAt: safeText(stream.started_at, 64),
      language: safeText(stream.language, 12),
      thumbnailUrl: safePublicUrl(String(stream.thumbnail_url || "").replace("{width}", "640").replace("{height}", "360"), ["jtvnw.net"])
    }) : null
  });
}

export function twitchDiagnostics(env = {}) {
  const cached = tokenCacheByClient.get(env.TWITCH_CLIENT_ID);
  return Object.freeze({
    tokenCached: Boolean(cached?.token && cached.expiresAt > Date.now()),
    tokenRequestActive: tokenRequestByClient.has(env.TWITCH_CLIENT_ID),
    cachedClientCount: tokenCacheByClient.size
  });
}

export function clearTwitchToken() {
  tokenCacheByClient.clear();
  tokenRequestByClient.clear();
}
