import { httpError } from "../middleware/errors.js";
import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeNumber, safeText } from "../utils/normalize.js";
import { deleteOAuthToken, getOAuthToken, setOAuthToken } from "./supabase-client.js";

const TOKEN_ORIGIN = "https://oauth2.googleapis.com";
const API_ORIGIN = "https://www.googleapis.com";
const REDIRECT_URI = "https://ethone.dev/";
const PROVIDER = "google-calendar";

async function tokenRequest(env, params) {
  const response = await requestExternal(new URL("/token", TOKEN_ORIGIN), {
    env,
    expectedOrigin: TOKEN_ORIGIN,
    service: "google-calendar",
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

export async function exchangeGoogleCalendarCode(env, userId, { code, clientId }) {
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

async function refreshGoogleCalendarToken(env, userId, stored, clientId) {
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
  const refreshed = await refreshGoogleCalendarToken(env, userId, stored, clientId);
  return refreshed.accessToken;
}

function normalizeEvent(item) {
  const start = item?.start?.dateTime || item?.start?.date || "";
  const end = item?.end?.dateTime || item?.end?.date || "";
  const allDay = Boolean(item?.start?.date && !item?.start?.dateTime);
  return Object.freeze({
    id: safeText(item?.id, 128),
    title: safeText(item?.summary, 200) || "(Sans titre)",
    start: safeText(start, 40),
    end: safeText(end, 40),
    allDay,
    location: safeText(item?.location, 200)
  });
}

export async function getUpcomingEvents(env, userId, clientId) {
  const accessToken = await validAccessToken(env, userId, clientId);
  const url = new URL("/calendar/v3/calendars/primary/events", API_ORIGIN);
  url.searchParams.set("timeMin", new Date().toISOString());
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  let response;
  try {
    response = await requestExternal(url, {
      env,
      expectedOrigin: API_ORIGIN,
      service: "google-calendar",
      dedupeKey: `events:${userId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      retries: 1,
      maxBytes: 512 * 1024
    });
  } catch (error) {
    if (error?.status === 502) throw httpError("AUTH_EXPIRED", 401, { retryable: false });
    throw error;
  }
  const items = Array.isArray(response.data?.items) ? response.data.items : [];
  return items.slice(0, 5).map(normalizeEvent);
}

export async function disconnectGoogleCalendar(env, userId) {
  await deleteOAuthToken(env, userId, PROVIDER);
  return true;
}
