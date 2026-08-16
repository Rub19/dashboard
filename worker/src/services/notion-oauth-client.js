import { httpError } from "../middleware/errors.js";
import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeText } from "../utils/normalize.js";
import { deleteOAuthToken, getOAuthToken, setOAuthToken } from "./supabase-client.js";

const API_ORIGIN = "https://api.notion.com";
const REDIRECT_URI = "https://ethone.dev/";
const NOTION_VERSION = "2022-06-28";
const PROVIDER = "notion";

function basicAuth(clientId, clientSecret) {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}

export async function exchangeNotionCode(env, userId, { code, clientId, clientSecret }) {
  const secret = clientSecret ? clientSecret : requireSecret(env, "NOTION_CLIENT_SECRET");
  const response = await requestExternal(new URL("/v1/oauth/token", API_ORIGIN), {
    env,
    expectedOrigin: API_ORIGIN,
    service: "notion",
    method: "POST",
    headers: { "content-type": "application/json", authorization: basicAuth(clientId, secret) },
    body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI }),
    retries: 0,
    maxBytes: 8192
  });
  const data = response.data;
  if (!data?.access_token) throw httpError("PROVIDER_REQUEST_REJECTED", 502, { retryable: false });
  await setOAuthToken(env, userId, PROVIDER, {
    accessToken: safeText(data.access_token, 4000),
    refreshToken: "",
    scope: safeText(data.workspace_name, 200),
    expiresAt: null
  });
  return true;
}

async function accessToken(env, userId) {
  const stored = await getOAuthToken(env, userId, PROVIDER);
  if (!stored?.accessToken) throw httpError("AUTH_REQUIRED", 401, { retryable: false });
  return stored.accessToken;
}

function notionHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "notion-version": NOTION_VERSION
  };
}

function pageTitle(page) {
  const properties = page?.properties && typeof page.properties === "object" ? page.properties : {};
  const titleProperty = Object.values(properties).find((property) => property?.type === "title");
  const fragments = Array.isArray(titleProperty?.title) ? titleProperty.title : [];
  const text = fragments.map((fragment) => safeText(fragment?.plain_text, 120)).join("");
  return safeText(text, 200) || "(Sans titre)";
}

function normalizePage(page) {
  const title = page?.object === "database" ? (safeText(page?.title?.[0]?.plain_text, 200) || "(Sans titre)") : pageTitle(page);
  return Object.freeze({
    id: safeText(page?.id, 64),
    title,
    url: safeText(page?.url, 400),
    lastEditedTime: safeText(page?.last_edited_time, 40),
    kind: page?.object === "database" ? "Base" : "Page"
  });
}

export async function getRecentPages(env, userId) {
  const token = await accessToken(env, userId);
  let response;
  try {
    response = await requestExternal(new URL("/v1/search", API_ORIGIN), {
      env,
      expectedOrigin: API_ORIGIN,
      service: "notion",
      dedupeKey: `search:${userId}`,
      method: "POST",
      headers: notionHeaders(token),
      body: JSON.stringify({ sort: { direction: "descending", timestamp: "last_edited_time" }, page_size: 5 }),
      retries: 1,
      maxBytes: 512 * 1024
    });
  } catch (error) {
    if (error?.status === 502) throw httpError("AUTH_EXPIRED", 401, { retryable: false });
    throw error;
  }
  const results = Array.isArray(response.data?.results) ? response.data.results : [];
  return results.slice(0, 5).map(normalizePage).filter((page) => page.id);
}

export async function disconnectNotion(env, userId) {
  await deleteOAuthToken(env, userId, PROVIDER);
  return true;
}
