import { httpError } from "../middleware/errors.js";
import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeNumber, safePublicUrl, safeText } from "../utils/normalize.js";
import { deleteOAuthToken, getOAuthToken, setOAuthToken } from "./supabase-client.js";

const TOKEN_ORIGIN = "https://oauth2.googleapis.com";
const API_ORIGIN = "https://www.googleapis.com";
const REDIRECT_URI = "https://ethone.dev/";
const PROVIDER = "youtube";

async function tokenRequest(env, params) {
  const response = await requestExternal(new URL("/token", TOKEN_ORIGIN), {
    env,
    expectedOrigin: TOKEN_ORIGIN,
    service: "youtube",
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
    retries: 0,
    maxBytes: 8192
  });
  return response.data;
}

function expiryFrom(expiresInSeconds) {
  const seconds = Math.max(60, Math.min(86400, safeNumber(expiresInSeconds, 3600)));
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function exchangeYoutubeCode(env, userId, { code, clientId }) {
  const clientSecret = requireSecret(env, "GOOGLE_CLIENT_SECRET");
  const data = await tokenRequest(env, {
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    client_secret: clientSecret
  });
  if (!data?.access_token || !data?.refresh_token) throw httpError("PROVIDER_REQUEST_REJECTED", 502, { retryable: false });
  await setOAuthToken(env, userId, PROVIDER, {
    accessToken: safeText(data.access_token, 4000),
    refreshToken: safeText(data.refresh_token, 4000),
    scope: safeText(data.scope, 500),
    expiresAt: expiryFrom(data.expires_in)
  });
  return true;
}

async function refreshYoutubeToken(env, userId, stored, clientId) {
  const clientSecret = requireSecret(env, "GOOGLE_CLIENT_SECRET");
  const data = await tokenRequest(env, {
    grant_type: "refresh_token",
    refresh_token: stored.refreshToken,
    client_id: clientId,
    client_secret: clientSecret
  });
  if (!data?.access_token) throw httpError("AUTH_EXPIRED", 401, { retryable: false });
  const next = {
    accessToken: safeText(data.access_token, 4000),
    refreshToken: safeText(data.refresh_token, 4000) || stored.refreshToken,
    scope: safeText(data.scope, 500) || stored.scope,
    expiresAt: expiryFrom(data.expires_in)
  };
  await setOAuthToken(env, userId, PROVIDER, next);
  return next;
}

async function validAccessToken(env, userId, clientId) {
  const stored = await getOAuthToken(env, userId, PROVIDER);
  if (!stored) throw httpError("AUTH_REQUIRED", 401, { retryable: false });
  const expiresAt = Date.parse(stored.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > 30000) return stored.accessToken;
  const refreshed = await refreshYoutubeToken(env, userId, stored, clientId);
  return refreshed.accessToken;
}

async function apiRequest(env, path, params, accessToken, dedupeKey) {
  const url = new URL(path, API_ORIGIN);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  try {
    return await requestExternal(url, {
      env,
      expectedOrigin: API_ORIGIN,
      service: "youtube",
      dedupeKey,
      headers: { authorization: `Bearer ${accessToken}` },
      retries: 1,
      maxBytes: 512 * 1024
    });
  } catch (error) {
    if (error?.status === 502) throw httpError("AUTH_EXPIRED", 401, { retryable: false });
    throw error;
  }
}

export async function getChannelActivity(env, userId, clientId) {
  const accessToken = await validAccessToken(env, userId, clientId);
  const channelResponse = await apiRequest(env, "/youtube/v3/channels", { part: "snippet,statistics", mine: "true" }, accessToken, `channel:${userId}`);
  const channel = channelResponse.data?.items?.[0];
  if (!channel) return Object.freeze({ channel: null, latestVideo: null });
  const searchResponse = await apiRequest(env, "/youtube/v3/search", { part: "snippet", forMine: "true", type: "video", order: "date", maxResults: "1" }, accessToken, `latest:${userId}`);
  const video = searchResponse.data?.items?.[0] || null;
  return Object.freeze({
    channel: Object.freeze({
      id: safeText(channel.id, 40),
      title: safeText(channel.snippet?.title, 120),
      thumbnailUrl: safePublicUrl(channel.snippet?.thumbnails?.default?.url, ["ytimg.com", "googleusercontent.com", "ggpht.com"]),
      subscriberCount: safeNumber(channel.statistics?.subscriberCount, 0, 1000000000),
      videoCount: safeNumber(channel.statistics?.videoCount, 0, 1000000000)
    }),
    latestVideo: video ? Object.freeze({
      id: safeText(video.id?.videoId, 40),
      title: safeText(video.snippet?.title, 200),
      publishedAt: safeText(video.snippet?.publishedAt, 40),
      thumbnailUrl: safePublicUrl(video.snippet?.thumbnails?.medium?.url, ["ytimg.com", "googleusercontent.com", "ggpht.com"])
    }) : null
  });
}

export async function disconnectYoutube(env, userId) {
  await deleteOAuthToken(env, userId, PROVIDER);
  return true;
}
