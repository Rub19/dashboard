import { httpError } from "../middleware/errors.js";
import { PATTERNS, assertAllowedQuery, queryText } from "../middleware/validation.js";
import { disconnectSpotify, exchangeSpotifyCode, getSpotifyNowPlaying } from "../services/spotify-oauth-client.js";

const CODE_RE = /^[A-Za-z0-9_-]{10,512}$/;
const VERIFIER_RE = /^[A-Za-z0-9_-]{43,128}$/;

async function readJsonBody(request, maxFields) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw httpError("INVALID_REQUEST", 400);
  let body;
  try {
    body = await request.json();
  } catch {
    throw httpError("INVALID_REQUEST", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length > maxFields) throw httpError("INVALID_REQUEST", 400);
  return body;
}

function requireField(body, key, pattern) {
  const value = String(body[key] || "");
  if (!pattern.test(value)) throw httpError("INVALID_PARAMETER", 400);
  return value;
}

export async function spotifyOAuthExchangeRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 3);
  const code = requireField(body, "code", CODE_RE);
  const codeVerifier = requireField(body, "codeVerifier", VERIFIER_RE);
  const clientId = requireField(body, "clientId", PATTERNS.spotifyClientId);
  await exchangeSpotifyCode(env, auth.userId, { code, codeVerifier, clientId });
  return { data: { connected: true } };
}

export async function spotifyNowPlayingRoute({ url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, ["clientId"]);
  const clientId = queryText(url, "clientId", { pattern: PATTERNS.spotifyClientId });
  const track = await getSpotifyNowPlaying(env, auth.userId, clientId);
  return { data: track };
}

export async function spotifyOAuthDisconnectRoute({ env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  await disconnectSpotify(env, auth.userId);
  return { data: { connected: false } };
}
