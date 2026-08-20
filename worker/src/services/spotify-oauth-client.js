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

function imageSources(item) {
  const raw = [];
  if (Array.isArray(item.album?.images)) raw.push(...item.album.images);
  if (Array.isArray(item.images)) raw.push(...item.images);
  if (Array.isArray(item.show?.images)) raw.push(...item.show.images);
  return raw;
}

function sortBySize(images) {
  return [...images].sort((a, b) => {
    const areaA = (a.width || 0) * (a.height || 0);
    const areaB = (b.width || 0) * (b.height || 0);
    return areaB - areaA;
  });
}

function normalizeTrack(payload) {
  const item = payload?.item;
  if (!item) return Object.freeze({ playing: false, track: null });
  const artists = Array.isArray(item.artists) ? item.artists.map((artist) => safeText(artist?.name, 80)).filter(Boolean).join(", ") : "";
  const images = sortBySize(imageSources(item));
  const covers = images
    .map((img) => safePublicUrl(img?.url, ["scdn.co", "spotifycdn.com", "spotify.com"]))
    .filter(Boolean);
  return Object.freeze({
    playing: payload.is_playing === true,
    track: Object.freeze({
      id: safeText(item.id, 64),
      title: safeText(item.name, 180),
      artist: artists.slice(0, 180),
      album: safeText(item.album?.name ?? item.show?.name, 180),
      artworkUrl: covers[1] || covers[0] || undefined,
      covers,
      progressMs: safeNumber(payload.progress_ms, 0, 86400000),
      durationMs: safeNumber(item.duration_ms, 0, 86400000),
      volumePercent: typeof payload?.device?.volume_percent === "number" ? Math.max(0, Math.min(100, payload.device.volume_percent)) : undefined,
      deviceId: safeText(payload?.device?.id, 64) || undefined
    })
  });
}

async function fetchAlbumImages(env, accessToken, albumId) {
  if (!albumId) return [];
  try {
    const response = await requestExternal(new URL(`/v1/albums/${encodeURIComponent(albumId)}`, API_ORIGIN), {
      env,
      expectedOrigin: API_ORIGIN,
      service: "spotify",
      headers: { authorization: `Bearer ${accessToken}` },
      retries: 0,
      maxBytes: 64 * 1024
    });
    const images = Array.isArray(response.data?.images) ? response.data.images : [];
    return sortBySize(images)
      .map((img) => safePublicUrl(img?.url, ["scdn.co", "spotifycdn.com", "spotify.com"]))
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchShowImages(env, accessToken, showId) {
  if (!showId) return [];
  try {
    const response = await requestExternal(new URL(`/v1/shows/${encodeURIComponent(showId)}`, API_ORIGIN), {
      env,
      expectedOrigin: API_ORIGIN,
      service: "spotify",
      headers: { authorization: `Bearer ${accessToken}` },
      retries: 0,
      maxBytes: 64 * 1024
    });
    const images = Array.isArray(response.data?.images) ? response.data.images : [];
    return sortBySize(images)
      .map((img) => safePublicUrl(img?.url, ["scdn.co", "spotifycdn.com", "spotify.com"]))
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchTrackImages(env, accessToken, trackId) {
  if (!trackId) return [];
  try {
    const response = await requestExternal(new URL(`/v1/tracks/${encodeURIComponent(trackId)}`, API_ORIGIN), {
      env,
      expectedOrigin: API_ORIGIN,
      service: "spotify",
      headers: { authorization: `Bearer ${accessToken}` },
      retries: 0,
      maxBytes: 96 * 1024
    });
    const item = response.data;
    const images = imageSources(item);
    const covers = sortBySize(images)
      .map((img) => safePublicUrl(img?.url, ["scdn.co", "spotifycdn.com", "spotify.com"]))
      .filter(Boolean);
    if (covers.length > 0) return covers;
    if (item?.album?.id) return await fetchAlbumImages(env, accessToken, item.album.id);
    return [];
  } catch {
    return [];
  }
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
  const normalized = normalizeTrack(response.data);
  const track = normalized.track;
  if (track && track.covers.length === 0) {
    const item = response.data?.item;
    let covers = [];
    if (item?.album?.id) covers = await fetchAlbumImages(env, accessToken, item.album.id);
    if (covers.length === 0 && item?.show?.id) covers = await fetchShowImages(env, accessToken, item.show.id);
    if (covers.length === 0 && item?.id && !item?.is_local) covers = await fetchTrackImages(env, accessToken, item.id);
    if (covers.length > 0) {
      return Object.freeze({
        playing: normalized.playing,
        track: Object.freeze({
          ...track,
          artworkUrl: covers[1] || covers[0],
          covers
        })
      });
    }
  }
  return normalized;
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

export async function seekSpotifyPlayback(env, userId, clientId, positionMs) {
  const position = Number(positionMs);
  if (!Number.isFinite(position) || position < 0) throw httpError("INVALID_PARAMETER", 400);
  const accessToken = await validAccessToken(env, userId, clientId);
  try {
    await requestExternal(new URL(`/v1/me/player/seek?position_ms=${Math.round(position)}`, API_ORIGIN), {
      env,
      expectedOrigin: API_ORIGIN,
      service: "spotify",
      method: "PUT",
      headers: { authorization: `Bearer ${accessToken}` },
      retries: 0,
      maxBytes: 8192
    });
  } catch (error) {
    if (error?.code === "PROVIDER_NOT_FOUND") throw httpError("PROVIDER_NOT_FOUND", 404, { retryable: false });
    throw error;
  }
  return { positionMs: Math.round(position) };
}

export async function setSpotifyVolume(env, userId, clientId, volumePercent, deviceId) {
  const volume = Number(volumePercent);
  if (!Number.isFinite(volume) || volume < 0 || volume > 100) throw httpError("INVALID_PARAMETER", 400);
  const accessToken = await validAccessToken(env, userId, clientId);
  const params = new URLSearchParams({ volume_percent: String(Math.round(volume)) });
  if (deviceId) params.set("device_id", String(deviceId));
  try {
    await requestExternal(new URL(`/v1/me/player/volume?${params.toString()}`, API_ORIGIN), {
      env,
      expectedOrigin: API_ORIGIN,
      service: "spotify",
      method: "PUT",
      headers: { authorization: `Bearer ${accessToken}` },
      retries: 0,
      maxBytes: 8192
    });
  } catch (error) {
    if (error?.code === "PROVIDER_NOT_FOUND") throw httpError("PROVIDER_NOT_FOUND", 404, { retryable: false });
    throw error;
  }
  return { volumePercent: Math.round(volume) };
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
