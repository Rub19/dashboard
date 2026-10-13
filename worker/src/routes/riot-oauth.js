import { httpError } from "../middleware/errors.js";
import {
  buildRiotAuthUrl,
  disconnectRiot,
  exchangeRiotCallback,
  exchangeRiotCode,
  getRiotOAuthStatus,
} from "../services/riot-oauth-client.js";

const CODE_RE = /^[A-Za-z0-9_-]{10,512}$/;

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
    if (!/^https?:$/.test(url.protocol)) return "/settings/connections?service=riot";
    return url.href;
  } catch {
    return "/settings/connections?service=riot";
  }
}

export async function riotOAuthStatusRoute({ env, auth }) {
  const status = await getRiotOAuthStatus(env, auth?.userId);
  return { data: status };
}

export async function riotOAuthUrlRoute({ env, auth, request }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const url = new URL(request.url);
  const redirectUri = queryParam(url, "redirect_uri") || "https://ethone.dev/api/auth/callback/riot";
  const returnTo = queryParam(url, "return_to") || "https://ethone.dev/settings/connections?service=riot";
  const scopes = queryParam(url, "scopes").split(/\s+/).filter(Boolean);

  const authUrl = await buildRiotAuthUrl(env, {
    userId: auth.userId,
    redirectUri,
    returnTo,
    scopes: scopes.length ? scopes : undefined,
  });
  return { data: { authUrl } };
}

export async function riotOAuthCallbackRoute({ env, request }) {
  const url = new URL(request.url);
  const code = queryParam(url, "code");
  const state = queryParam(url, "state");
  if (!code || !state) throw httpError("INVALID_PARAMETER", 400);

  try {
    const { returnTo } = await exchangeRiotCallback(env, { code, state });
    return {
      raw: true,
      response: Response.redirect(safeReturnUrl(returnTo), 302),
    };
  } catch (error) {
    if (error?.code) throw error;
    throw httpError("PROVIDER_REQUEST_REJECTED", 502, { retryable: false, detail: error?.message });
  }
}

export async function riotOAuthExchangeRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 4);
  const code = requireField(body, "code", CODE_RE);
  const redirectUri = String(body.redirectUri || "https://ethone.dev/api/auth/callback/riot");
  const result = await exchangeRiotCode(env, auth.userId, { code, redirectUri });
  return { data: result };
}

export async function riotOAuthDisconnectRoute({ env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  await disconnectRiot(env, auth.userId);
  return { data: { disconnected: true } };
}
