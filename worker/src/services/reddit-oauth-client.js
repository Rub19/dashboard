import { httpError } from "../middleware/errors.js";
import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeNumber, safePublicUrl, safeText } from "../utils/normalize.js";
import { deleteOAuthToken, getOAuthToken, setOAuthToken } from "./supabase-client.js";

const TOKEN_ORIGIN = "https://www.reddit.com";
const API_ORIGIN = "https://oauth.reddit.com";
const REDIRECT_URI = "https://ethone.dev/";
const PROVIDER = "reddit";
const USER_AGENT = "ethone-worker/1.0 (+https://ethone.dev)";

function basicAuth(clientId, clientSecret) {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}

async function tokenRequest(env, clientId, clientSecret, params) {
  const response = await requestExternal(new URL("/api/v1/access_token", TOKEN_ORIGIN), {
    env,
    expectedOrigin: TOKEN_ORIGIN,
    service: "reddit",
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: basicAuth(clientId, clientSecret),
      "user-agent": USER_AGENT
    },
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

export async function exchangeRedditCode(env, userId, { code, clientId }) {
  const clientSecret = requireSecret(env, "REDDIT_CLIENT_SECRET");
  const data = await tokenRequest(env, clientId, clientSecret, {
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI
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

async function refreshRedditToken(env, userId, stored, clientId) {
  const clientSecret = requireSecret(env, "REDDIT_CLIENT_SECRET");
  const data = await tokenRequest(env, clientId, clientSecret, {
    grant_type: "refresh_token",
    refresh_token: stored.refreshToken
  });
  if (!data?.access_token) throw httpError("AUTH_EXPIRED", 401, { retryable: false });
  const next = {
    accessToken: safeText(data.access_token, 4000),
    refreshToken: stored.refreshToken,
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
  const refreshed = await refreshRedditToken(env, userId, stored, clientId);
  return refreshed.accessToken;
}

async function apiRequest(env, path, accessToken, dedupeKey) {
  try {
    return await requestExternal(new URL(path, API_ORIGIN), {
      env,
      expectedOrigin: API_ORIGIN,
      service: "reddit",
      dedupeKey,
      headers: { authorization: `Bearer ${accessToken}`, "user-agent": USER_AGENT },
      retries: 1,
      maxBytes: 512 * 1024
    });
  } catch (error) {
    if (error?.status === 502) throw httpError("AUTH_EXPIRED", 401, { retryable: false });
    throw error;
  }
}

export async function getRedditActivity(env, userId, clientId) {
  const accessToken = await validAccessToken(env, userId, clientId);
  const meResponse = await apiRequest(env, "/api/v1/me", accessToken, `me:${userId}`);
  const me = meResponse.data || {};
  if (!me.name) return Object.freeze({ profile: null, latestPost: null });
  const submittedResponse = await apiRequest(env, `/user/${encodeURIComponent(me.name)}/submitted?limit=1&sort=new`, accessToken, `submitted:${userId}`);
  const post = submittedResponse.data?.data?.children?.[0]?.data || null;
  return Object.freeze({
    profile: Object.freeze({
      username: safeText(me.name, 32),
      avatarUrl: safePublicUrl(String(me.icon_img || "").split("?")[0], ["redditstatic.com", "redd.it"]),
      karma: safeNumber((me.link_karma || 0) + (me.comment_karma || 0), 0, 1000000000)
    }),
    latestPost: post ? Object.freeze({
      id: safeText(post.id, 32),
      title: safeText(post.title, 240),
      subreddit: safeText(post.subreddit_name_prefixed, 60),
      permalink: safePublicUrl(post.permalink ? `https://www.reddit.com${post.permalink}` : "", ["reddit.com"]),
      createdAt: safeNumber(post.created_utc, 0, 9999999999)
    }) : null
  });
}

export async function disconnectReddit(env, userId) {
  await deleteOAuthToken(env, userId, PROVIDER);
  return true;
}
