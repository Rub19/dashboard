import { httpError } from "../middleware/errors.js";
import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeNumber, safePublicUrl, safeText } from "../utils/normalize.js";
import { deleteOAuthToken, getOAuthToken, setOAuthToken } from "./supabase-client.js";

const TOKEN_ORIGIN = "https://oauth2.googleapis.com";
const API_ORIGIN = "https://www.googleapis.com";
const REDIRECT_URI = "https://ethone.dev/";
const PROVIDER = "google-drive";

async function tokenRequest(env, params) {
  const response = await requestExternal(new URL("/token", TOKEN_ORIGIN), {
    env,
    expectedOrigin: TOKEN_ORIGIN,
    service: "google-drive",
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

export async function exchangeGoogleDriveCode(env, userId, { code, clientId }) {
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

async function refreshGoogleDriveToken(env, userId, stored, clientId) {
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
  const refreshed = await refreshGoogleDriveToken(env, userId, stored, clientId);
  return refreshed.accessToken;
}

function normalizeFile(item) {
  return Object.freeze({
    id: safeText(item?.id, 128),
    name: safeText(item?.name, 200) || "(Sans titre)",
    mimeType: safeText(item?.mimeType, 120),
    modifiedTime: safeText(item?.modifiedTime, 40),
    webViewLink: safePublicUrl(item?.webViewLink, ["drive.google.com", "docs.google.com"]),
    iconUrl: safePublicUrl(item?.iconLink, ["gstatic.com"])
  });
}

export async function getRecentFiles(env, userId, clientId) {
  const accessToken = await validAccessToken(env, userId, clientId);
  const url = new URL("/drive/v3/files", API_ORIGIN);
  url.searchParams.set("orderBy", "modifiedTime desc");
  url.searchParams.set("pageSize", "5");
  url.searchParams.set("fields", "files(id,name,mimeType,modifiedTime,webViewLink,iconLink)");
  url.searchParams.set("q", "trashed = false");
  let response;
  try {
    response = await requestExternal(url, {
      env,
      expectedOrigin: API_ORIGIN,
      service: "google-drive",
      dedupeKey: `files:${userId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      retries: 1,
      maxBytes: 512 * 1024
    });
  } catch (error) {
    if (error?.status === 502) throw httpError("AUTH_EXPIRED", 401, { retryable: false });
    throw error;
  }
  const items = Array.isArray(response.data?.files) ? response.data.files : [];
  return items.slice(0, 5).map(normalizeFile);
}

export async function disconnectGoogleDrive(env, userId) {
  await deleteOAuthToken(env, userId, PROVIDER);
  return true;
}
