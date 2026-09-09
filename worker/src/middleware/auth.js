import { base64UrlBytes, decodeJwtPart } from "../utils/crypto.js";
import { httpError } from "./errors.js";
import { getDeviceBySession } from "../services/security-identity-client.js";

const MAX_TOKEN_LENGTH = 8192;
const CLOCK_SKEW_SECONDS = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const jwksCache = new Map();

// Per-request session revocation check. JWTs are stateless — verifying the
// signature only proves Supabase issued this token, not that the session it
// belongs to is still meant to be trusted. `ethone_devices` doubles as the
// app's session table (one row per session_id, see device-service.js); a
// revoked row must block every subsequent request carrying that session_id,
// including a *refreshed* access token, since Supabase keeps the same
// session_id across a token refresh within one login. That's what makes
// revocation actually immediate instead of "eventually, once the old token
// expires." Results are cached briefly per isolate (same pattern as the JWKS
// cache below) so this doesn't add a DB round-trip to every authenticated
// request while still propagating a revocation within a few seconds.
const REVOCATION_CACHE_TTL_MS = 5000;
const revocationCache = new Map();

async function isSessionRevoked(env, userId, sessionId) {
  if (!sessionId) return false; // no session_id claim to check against (legacy/system tokens)
  const cacheKey = `${userId}:${sessionId}`;
  const cached = revocationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.revoked;

  let revoked = false;
  try {
    const device = await getDeviceBySession(env, userId, sessionId);
    revoked = Boolean(device?.revoked_at);
  } catch {
    // If the lookup itself fails (Supabase hiccup), fail open on this specific
    // check rather than locking every authenticated user out of the app —
    // JWT signature/expiry verification above already did the real gatekeeping.
    revoked = false;
  }

  revocationCache.set(cacheKey, { revoked, expiresAt: Date.now() + REVOCATION_CACHE_TTL_MS });
  return revoked;
}

function fetcher(env) {
  return typeof env?.__TEST_FETCH__ === "function" ? env.__TEST_FETCH__ : fetch;
}

function supabaseBaseUrl(env) {
  let url;
  try {
    url = new URL(String(env.SUPABASE_URL || ""));
  } catch {
    throw httpError("AUTH_CONFIGURATION_ERROR", 503);
  }
  if (url.protocol !== "https:" && String(env.ENVIRONMENT || "production") === "production") {
    throw httpError("AUTH_CONFIGURATION_ERROR", 503);
  }
  url.pathname = url.pathname.replace(/\/$/, "");
  url.search = "";
  url.hash = "";
  return url;
}

function expectedIssuer(env) {
  const configured = String(env.SUPABASE_ISSUER || "").trim();
  if (configured) return configured.replace(/\/$/, "");
  return `${supabaseBaseUrl(env).origin}/auth/v1`;
}

function bearerToken(request) {
  const authorization = String(request.headers.get("authorization") || "");
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) throw httpError("AUTH_REQUIRED", 401);
  if (match[1].length > MAX_TOKEN_LENGTH) throw httpError("AUTH_INVALID", 401);
  return match[1];
}

async function verifyHs256(input, signature, secret) {
  if (typeof secret !== "string" || secret.length < 32) throw httpError("AUTH_CONFIGURATION_ERROR", 503);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return crypto.subtle.verify("HMAC", key, signature, input);
}

async function fetchJwks(env, force = false) {
  const base = supabaseBaseUrl(env);
  const endpoint = `${base.origin}/auth/v1/.well-known/jwks.json`;
  const cached = jwksCache.get(endpoint);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.keys;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetcher(env)(endpoint, {
      method: "GET",
      headers: { accept: "application/json" },
      redirect: "manual",
      signal: controller.signal
    });
    if (!response.ok || !String(response.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
      throw httpError("AUTH_CONFIGURATION_ERROR", 503);
    }
    const text = await response.text();
    if (text.length > 65536) throw httpError("AUTH_CONFIGURATION_ERROR", 503);
    const payload = JSON.parse(text);
    const keys = Array.isArray(payload?.keys) ? payload.keys.filter((key) => key && typeof key === "object") : [];
    if (!keys.length) throw httpError("AUTH_CONFIGURATION_ERROR", 503);
    jwksCache.set(endpoint, { keys, expiresAt: Date.now() + 10 * 60 * 1000 });
    return keys;
  } catch (error) {
    if (error?.code === "AUTH_CONFIGURATION_ERROR") throw error;
    throw httpError("AUTH_CONFIGURATION_ERROR", 503);
  } finally {
    clearTimeout(timer);
  }
}

async function importVerificationKey(jwk, algorithm) {
  if (jwk.alg && jwk.alg !== algorithm) throw httpError("AUTH_INVALID", 401);
  if (jwk.use && jwk.use !== "sig") throw httpError("AUTH_INVALID", 401);
  if (algorithm === "RS256") {
    return crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  }
  if (algorithm === "ES256") {
    return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  }
  throw httpError("AUTH_INVALID", 401);
}

async function verifyAsymmetric(input, signature, header, env) {
  if (typeof header.kid !== "string" || header.kid.length < 4 || header.kid.length > 200) return false;
  let keys = await fetchJwks(env);
  let jwk = keys.find((candidate) => candidate.kid === header.kid && candidate.kty);
  if (!jwk) {
    keys = await fetchJwks(env, true);
    jwk = keys.find((candidate) => candidate.kid === header.kid && candidate.kty);
  }
  if (!jwk) return false;
  const key = await importVerificationKey(jwk, header.alg);
  const algorithm = header.alg === "RS256"
    ? { name: "RSASSA-PKCS1-v1_5" }
    : { name: "ECDSA", hash: "SHA-256" };
  return crypto.subtle.verify(algorithm, key, signature, input);
}

function validateClaims(payload, env) {
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(payload.exp) || payload.exp <= now) throw httpError("AUTH_EXPIRED", 401);
  if (Number.isFinite(payload.nbf) && payload.nbf > now + CLOCK_SKEW_SECONDS) throw httpError("AUTH_INVALID", 401);
  if (Number.isFinite(payload.iat) && payload.iat > now + CLOCK_SKEW_SECONDS) throw httpError("AUTH_INVALID", 401);
  if (String(payload.iss || "").replace(/\/$/, "") !== expectedIssuer(env)) throw httpError("AUTH_INVALID", 401);
  const expectedAudience = String(env.SUPABASE_AUDIENCE || "authenticated");
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(expectedAudience)) throw httpError("AUTH_INVALID", 401);
  if (!UUID.test(String(payload.sub || ""))) throw httpError("AUTH_INVALID", 401);
  if (payload.role !== "authenticated") throw httpError("AUTH_INVALID", 401);
  return Object.freeze({
    userId: payload.sub,
    role: payload.role,
    appRole: typeof payload.app_metadata?.role === "string" ? payload.app_metadata.role : null,
    sessionId: typeof payload.session_id === "string" ? payload.session_id.slice(0, 128) : null,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    email: typeof payload.email === "string" ? payload.email : null,
    displayName: typeof payload.user_metadata?.username === "string" ? payload.user_metadata.username
      : (typeof payload.user_metadata?.name === "string" ? payload.user_metadata.name : null)
  });
}

/**
 * Vérifie que l'utilisateur authentifié possède le rôle requis (côté serveur).
 * À utiliser pour toute action administrative ou sensible.
 */
export function requireRole(auth, ...allowed) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  if (!allowed.includes(auth.appRole)) throw httpError("FORBIDDEN", 403);
  return auth;
}

export async function authenticateRequest(request, env) {
  const token = bearerToken(request);
  const segments = token.split(".");
  if (segments.length !== 3 || segments.some((segment) => !segment)) throw httpError("AUTH_INVALID", 401);
  const header = decodeJwtPart(segments[0]);
  const payload = decodeJwtPart(segments[1]);
  const signature = base64UrlBytes(segments[2]);
  if (!header || !payload || !signature || (header.typ && header.typ !== "JWT")) throw httpError("AUTH_INVALID", 401);
  if (!["HS256", "RS256", "ES256"].includes(header.alg)) throw httpError("AUTH_INVALID", 401);
  const input = new TextEncoder().encode(`${segments[0]}.${segments[1]}`);
  const valid = header.alg === "HS256"
    ? await verifyHs256(input, signature, env.SUPABASE_JWT_SECRET)
    : await verifyAsymmetric(input, signature, header, env);
  if (!valid) throw httpError("AUTH_INVALID", 401);
  const auth = validateClaims(payload, env);
  if (await isSessionRevoked(env, auth.userId, auth.sessionId)) {
    throw httpError("SESSION_REVOKED", 401);
  }
  return auth;
}

export function clearJwksCache() {
  jwksCache.clear();
}

export function clearSessionRevocationCache() {
  revocationCache.clear();
}

// Called by device-service.js right after a device/session is actually
// revoked, so THIS isolate never serves a stale "not revoked" answer for it
// out of the short-lived cache above — the guarantee becomes "the very next
// request is blocked," not "blocked within REVOCATION_CACHE_TTL_MS." (A
// revocation still take a moment to reach OTHER already-warm isolates in
// other edge locations, same as the existing JWKS cache's propagation — but
// a fresh isolate, and the isolate that served the revoke request itself,
// are correct immediately.)
export function invalidateSessionRevocationCache(userId, sessionId) {
  if (!sessionId) return;
  revocationCache.delete(`${userId}:${sessionId}`);
}
