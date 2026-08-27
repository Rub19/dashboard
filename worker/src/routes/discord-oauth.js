import { httpError } from "../middleware/errors.js";
import { buildDiscordAuthUrl, disconnectDiscord, exchangeDiscordCallback, exchangeDiscordCode, getDiscordProfile, refreshDiscordProfile } from "../services/discord-oauth-client.js";

const CODE_RE = /^[A-Za-z0-9_-]{10,255}$/;

async function readJsonBody(request, maxFields) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw httpError("INVALID_REQUEST", 400);
  let body;
  try {
    body = await request.json();
  } catch {
    throw httpError("INVALID_REQUEST", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length > maxFields) {
    throw httpError("INVALID_REQUEST", 400);
  }
  return body;
}

function queryParam(url, key) {
  return String(url.searchParams.get(key) || "");
}

function requireField(body, key, pattern) {
  const value = String(body[key] || "");
  if (!pattern.test(value)) throw httpError("INVALID_PARAMETER", 400);
  return value;
}

function safeReturnUrl(input) {
  try {
    const url = new URL(input);
    if (!/^https?:$/.test(url.protocol)) return "/settings?discord=connected";
    return url.href;
  } catch {
    return "/settings?discord=connected";
  }
}

export async function discordOAuthUrlRoute({ env, auth, request }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const url = new URL(request.url);
  const redirectUri = queryParam(url, "redirect_uri") || "http://localhost:3000/api/auth/callback/discord";
  const returnTo = queryParam(url, "return_to") || "http://localhost:3000/settings?discord=connected";
  const scopes = queryParam(url, "scopes").split(/\s+/).filter(Boolean);
  const authUrl = await buildDiscordAuthUrl(env, {
    userId: auth.userId,
    redirectUri,
    returnTo,
    scopes: scopes.length ? scopes : undefined,
  });
  return { data: { authUrl } };
}

export async function discordOAuthCallbackRoute({ env, request }) {
  const url = new URL(request.url);
  const code = queryParam(url, "code");
  const state = queryParam(url, "state");
  if (!code || !state) throw httpError("INVALID_PARAMETER", 400);

  try {
    const { returnTo } = await exchangeDiscordCallback(env, { code, state });
    return {
      raw: true,
      response: Response.redirect(safeReturnUrl(returnTo), 302),
    };
  } catch (error) {
    if (error?.code) throw error;
    throw httpError("PROVIDER_REQUEST_REJECTED", 502, { retryable: false, detail: error?.message });
  }
}

export async function discordOAuthExchangeRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 4);
  const code = requireField(body, "code", CODE_RE);
  const redirectUri = String(body.redirectUri || "http://localhost:3000/api/auth/callback/discord");
  const profile = await exchangeDiscordCode(env, auth.userId, { code, redirectUri });
  return { data: profile };
}

export async function discordOAuthProfileRoute({ env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  try {
    const profile = await getDiscordProfile(env, auth.userId);
    return { data: profile || { connected: false } };
  } catch {
    return { data: { connected: false } };
  }
}

export async function discordOAuthRefreshRoute({ env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const profile = await refreshDiscordProfile(env, auth.userId);
  return { data: profile };
}

export async function discordOAuthDisconnectRoute({ env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  await disconnectDiscord(env, auth.userId);
  return { data: { connected: false } };
}
