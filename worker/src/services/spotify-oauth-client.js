import { httpError } from "../middleware/errors.js";
import { requestExternal } from "../utils/external-request.js";
import { safeNumber, safePublicUrl, safeText } from "../utils/normalize.js";
import { deleteOAuthToken, getOAuthToken, setOAuthToken } from "./supabase-client.js";

const TOKEN_ORIGIN = "https://accounts.spotify.com";
const API_ORIGIN = "https://api.spotify.com";
const REDIRECT_URI = "https://ethone.dev/";

async function tokenRequest(env, params) {
  const response = await requestExternal(new URL("/api/token", TOKEN_ORIGIN), {
    env,
    expectedOrigin: TOKEN_ORIGIN,
    service: "spotify",
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

export async function exchangeSpotifyCode(env, userId, { code, codeVerifier, clientId }) {
  const data = await tokenRequest(env, {
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    code_verifier: codeVerifier
  });
  if (!data?.access_token || !data?.refresh_token) throw httpError("PROVIDER_REQUEST_REJECTED", 502, { retryable: false });
  await setOAuthToken(env, userId, "spotify", {
    accessToken: safeText(data.access_token, 4000),
    refreshToken: safeText(data.refresh_token, 4000),
    scope: safeText(data.scope, 500),
    expiresAt: expiryFrom(data.expires_in)
  });
  return true;
}

async function refreshSpotifyToken(env, userId, stored, clientId) {
  const data = await tokenRequest(env, {
    grant_type: "refresh_token",
    refresh_token: stored.refreshToken,
    client_id: clientId
  });
  if (!data?.access_token) throw httpError("AUTH_EXPIRED", 401, { retryable: false });
  const next = {
    accessToken: safeText(data.access_token, 4000),
    refreshToken: safeText(data.refresh_token, 4000) || stored.refreshToken,
    scope: safeText(data.scope, 500) || stored.scope,
    expiresAt: expiryFrom(data.expires_in)
  };
  await setOAuthToken(env, userId, "spotify", next);
  return next;
}

async function validAccessToken(env, userId, clientId) {
  const stored = await getOAuthToken(env, userId, "spotify");
  if (!stored) throw httpError("AUTH_REQUIRED", 401, { retryable: false });
  const expiresAt = Date.parse(stored.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > 30000) return stored.accessToken;
  const refreshed = await refreshSpotifyToken(env, userId, stored, clientId);
  return refreshed.accessToken;
}

function normalizeTrack(payload) {
  const item = payload?.item;
  if (!item) return Object.freeze({ playing: false, track: null });
  const artists = Array.isArray(item.artists) ? item.artists.map((artist) => safeText(artist?.name, 80)).filter(Boolean).join(", ") : "";
  return Object.freeze({
    playing: payload.is_playing === true,
    track: Object.freeze({
      id: safeText(item.id, 64),
      title: safeText(item.name, 180),
      artist: artists.slice(0, 180),
      album: safeText(item.album?.name, 180),
      artworkUrl: safePublicUrl(item.album?.images?.[0]?.url, ["scdn.co"]),
      progressMs: safeNumber(payload.progress_ms, 0, 86400000),
      durationMs: safeNumber(item.duration_ms, 0, 86400000)
    })
  });
}

export async function getSpotifyNowPlaying(env, userId, clientId) {
  const accessToken = await validAccessToken(env, userId, clientId);
  const response = await requestExternal(new URL("/v1/me/player/currently-playing", API_ORIGIN), {
    env,
    expectedOrigin: API_ORIGIN,
    service: "spotify",
    dedupeKey: `now-playing:${userId}`,
    headers: { authorization: `Bearer ${accessToken}` },
    retries: 1,
    maxBytes: 256 * 1024
  });
  return normalizeTrack(response.data);
}

const CONTROL_METHODS = Object.freeze({ play: "PUT", pause: "PUT", next: "POST", previous: "POST" });

export async function controlSpotifyPlayback(env, userId, clientId, action) {
  const method = CONTROL_METHODS[action];
  if (!method) throw httpError("INVALID_PARAMETER", 400);
  const accessToken = await validAccessToken(env, userId, clientId);
  try {
    await requestExternal(new URL(`/v1/me/player/${action}`, API_ORIGIN), {
      env,
      expectedOrigin: API_ORIGIN,
      service: "spotify",
      method,
      headers: { authorization: `Bearer ${accessToken}` },
      retries: 0,
      maxBytes: 8192
    });
  } catch (error) {
    if (error?.code === "PROVIDER_NOT_FOUND") throw httpError("PROVIDER_NOT_FOUND", 404, { retryable: false });
    throw error;
  }
  return true;
}

export async function isSpotifyTrackSaved(env, userId, clientId, trackId) {
  const accessToken = await validAccessToken(env, userId, clientId);
  const response = await requestExternal(new URL(`/v1/me/tracks/contains?ids=${encodeURIComponent(safeText(trackId, "", 64))}`, API_ORIGIN), {
    env,
    expectedOrigin: API_ORIGIN,
    service: "spotify",
    headers: { authorization: `Bearer ${accessToken}` },
    retries: 0,
    maxBytes: 8192
  });
  return Array.isArray(response.data) ? response.data[0] === true : false;
}

export async function saveSpotifyTrack(env, userId, clientId, trackId, save = true) {
  const accessToken = await validAccessToken(env, userId, clientId);
  const id = safeText(trackId, "", 64);
  if (!id) throw httpError("INVALID_PARAMETER", 400);
  await requestExternal(new URL("/v1/me/tracks", API_ORIGIN), {
    env,
    expectedOrigin: API_ORIGIN,
    service: "spotify",
    method: save ? "PUT" : "DELETE",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ ids: [id] }),
    retries: 0,
    maxBytes: 8192
  });
  return true;
}

export async function disconnectSpotify(env, userId) {
  await deleteOAuthToken(env, userId, "spotify");
  return true;
}
