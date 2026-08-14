import { httpError } from "../middleware/errors.js";
import { applyAuthRateLimit } from "../middleware/rate-limit.js";
import { PATTERNS, assertAllowedQuery } from "../middleware/validation.js";
import {
  createRegistrationOptions,
  verifyRegistration,
  createAuthenticationOptions,
  verifyAuthentication,
  renamePasskey,
  revokePasskey
} from "../services/webauthn-service.js";
import { sendOtp, verifyOtp } from "../services/otp-service.js";
import { signServiceToken } from "../utils/jwt.js";
import {
  getOrCreateDevice,
  trustDevice,
  revokeDevice,
  removeDevice,
  listUserDevices
} from "../services/device-service.js";
import { listSecurityEvents, getUserIdByEmail, listPasskeys } from "../services/security-identity-client.js";
import { generateTotpSecret, verifyTotp } from "../services/totp-service.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_RE = /^\d{6}$/;
const NAME_RE = /^[\p{L}\p{N}\s._-]{1,120}$/u;

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

function requireField(body, key, pattern, maxLength) {
  const value = String(body[key] || "");
  if (!pattern.test(value) || (maxLength && value.length > maxLength)) throw httpError("INVALID_PARAMETER", 400);
  return value;
}

function fieldText(body, key, pattern, maxLength, fallback = "") {
  const value = String(body[key] || fallback);
  if (!value) return value;
  if (!pattern.test(value) || (maxLength && value.length > maxLength)) throw httpError("INVALID_PARAMETER", 400);
  return value;
}

function safeBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw httpError("INVALID_REQUEST", 400);
  return body;
}

function deviceContext(request, auth) {
  const userAgent = request.headers.get("user-agent") || "";
  return { userAgent, sessionId: auth?.sessionId || null };
}

export async function passkeyRegisterOptionsRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 3);
  const email = requireField(body, "email", EMAIL_RE, 320);
  const name = fieldText(body, "name", NAME_RE, 120, "");
  const deviceName = fieldText(body, "deviceName", NAME_RE, 120, "");

  const options = await createRegistrationOptions(env, auth.userId, email, name, deviceName);
  return { data: options };
}

export async function passkeyRegisterRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 3);
  const response = safeBody(body.response);
  const deviceId = fieldText(body, "deviceId", UUID_RE, 36, null);
  const requestOrigin = request.headers.get("origin") || "";

  // Ensure the device exists before binding a passkey to it.
  const { userAgent, sessionId } = deviceContext(request, auth);
  const device = deviceId
    ? { id: deviceId }
    : await getOrCreateDevice(env, auth.userId, sessionId, userAgent, "");

  const result = await verifyRegistration(env, requestOrigin, auth.userId, device.id, response);
  return { data: result };
}

export async function passkeyAuthenticateOptionsRoute({ request, env }) {
  const body = await readJsonBody(request, 2);
  const requestOrigin = request.headers.get("origin") || "";
  let userId = body.userId && UUID_RE.test(body.userId) ? body.userId : null;
  const email = body.email && EMAIL_RE.test(body.email) ? String(body.email).toLowerCase().trim() : null;
  if (!userId && email) userId = await getUserIdByEmail(env, email);
  if (!userId) throw httpError("INVALID_PARAMETER", 400);
  const options = await createAuthenticationOptions(env, requestOrigin, userId);
  return { data: { ...options, userId } };
}

export async function passkeyAuthenticateRoute({ request, env }) {
  const body = await readJsonBody(request, 1);
  const response = safeBody(body.response);
  const requestOrigin = request.headers.get("origin") || "";

  const result = await verifyAuthentication(env, requestOrigin, response);
  return { data: result };
}

export async function passkeyRenameRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 2);
  const passkeyId = requireField(body, "passkeyId", UUID_RE, 36);
  const name = fieldText(body, "name", NAME_RE, 120, "");
  const updated = await renamePasskey(env, auth.userId, passkeyId, name);
  return { data: updated };
}

export async function passkeyRevokeRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 1);
  const passkeyId = requireField(body, "passkeyId", UUID_RE, 36);
  await revokePasskey(env, auth.userId, passkeyId);
  return { data: { revoked: true } };
}

export async function otpSendRoute({ request, env }) {
  const body = await readJsonBody(request, 2);
  const email = requireField(body, "email", EMAIL_RE, 320);
  await applyAuthRateLimit({ request, env, route: { id: "otp.send" } }, email);
  const userId = body.userId && UUID_RE.test(body.userId) ? body.userId : null;
  const acceptLanguage = request.headers.get("accept-language") || "";
  const country = request.headers.get("cf-ipcountry") || request.cf?.country || "";
  const timezone = request.cf?.timezone || "Europe/Paris";
  const result = await sendOtp(env, email, userId, acceptLanguage, country, timezone);
  return { data: { sent: result.sent, userId: result.userId, contact: result.contact, expiresIn: result.expiresIn, ...(result.code ? { code: result.code } : {}) } };
}

export async function otpVerifyRoute({ request, env }) {
  const body = await readJsonBody(request, 3);
  const userId = requireField(body, "userId", UUID_RE, 36);
  await applyAuthRateLimit({ request, env, route: { id: "otp.verify" } }, userId);
  const email = requireField(body, "email", EMAIL_RE, 320);
  const code = requireField(body, "code", CODE_RE, 6);

  const userAgent = request.headers.get("user-agent") || "";
  const sessionId = null;
  const device = await getOrCreateDevice(env, userId, sessionId, userAgent, "");
  const result = await verifyOtp(env, userId, email, code, device.id);
  const rememberMe = Boolean(body.rememberMe);
  const tokenTtl = rememberMe ? 30 * 24 * 60 * 60 : 8 * 60 * 60;
  const token = await signServiceToken(env, userId, null, tokenTtl);

  return { data: { verified: true, deviceId: device.id, token, rememberMe } };
}

export async function deviceUpsertRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 2);
  const name = fieldText(body, "name", NAME_RE, 120, "");
  const { userAgent, sessionId } = deviceContext(request, auth);
  const device = await getOrCreateDevice(env, auth.userId, sessionId, userAgent, name);
  return { data: device };
}

export async function deviceListRoute({ env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const devices = await listUserDevices(env, auth.userId);
  return { data: devices };
}

export async function deviceTrustRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 2);
  const deviceId = requireField(body, "deviceId", UUID_RE, 36);
  const trusted = body.trusted === true;
  const device = await trustDevice(env, auth.userId, deviceId, trusted);
  return { data: device };
}

export async function deviceRevokeRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 1);
  const deviceId = requireField(body, "deviceId", UUID_RE, 36);
  const device = await revokeDevice(env, auth.userId, deviceId);
  return { data: device };
}

export async function deviceRemoveRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 1);
  const deviceId = requireField(body, "deviceId", UUID_RE, 36);
  await removeDevice(env, auth.userId, deviceId);
  return { data: { removed: true } };
}

export async function securityEventsRoute({ url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, ["limit"]);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 100;
  const events = await listSecurityEvents(env, auth.userId, limit);
  return { data: events };
}

export async function passkeyListRoute({ env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const passkeys = await listPasskeys(env, auth.userId);
  return { data: passkeys };
}

/**
 * Configure le 2FA TOTP pour l'utilisateur.
 * Retourne un QR code (otpauth URL) et des codes de secours.
 */
export async function totpSetupRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 1);
  const email = requireField(body, "email", EMAIL_RE, 320);

  const existing = await supabaseRequest(env, `/rest/v1/ethone_user_data?user_id=eq.${encodeURIComponent(auth.userId)}&kind=eq.totp&select=*`);
  if (Array.isArray(existing) && existing.length > 0 && existing[0].data?.verified) {
    throw httpError("TOTP_ALREADY_ENABLED", 409);
  }

  const { secret, hashedSecret, otpauth, backupCodes } = await generateTotpSecret(auth.userId, email);

  await supabaseRequest(env, "/rest/v1/ethone_user_data", {
    method: "POST",
    body: JSON.stringify({
      user_id: auth.userId,
      kind: "totp",
      slug: "totp",
      data: {
        secret: hashedSecret,
        verified: false,
        backup: backupCodes,
      },
      profile_id: null,
      active: true,
    }),
    headers: { Prefer: "return=representation" },
  });

  return { data: { secret, otpauth, backupCodes } };
}

/**
 * Vérifie un code TOTP pour activer le 2FA.
 */
export async function totpVerifySetupRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 1);
  const code = requireField(body, "code", /^\d{6}$/, 6);

  const records = await supabaseRequest(env, `/rest/v1/ethone_user_data?user_id=eq.${encodeURIComponent(auth.userId)}&kind=eq.totp&select=*`);
  const record = Array.isArray(records) ? records[0] : null;
  if (!record || !record.data?.secret) throw httpError("TOTP_NOT_SETUP", 400);

  const pendingSecret = record.data.secret;
  const valid = await verifyTotp(pendingSecret, code);
  if (!valid) throw httpError("TOTP_INVALID", 401);

  await supabaseRequest(env, "/rest/v1/ethone_user_data", {
    method: "POST",
    body: JSON.stringify({
      id: record.id,
      data: { ...record.data, verified: true },
    }),
    headers: { Prefer: "return=representation" },
  });

  return { data: { enabled: true } };
}

/**
 * Désactive le 2FA TOTP.
 */
export async function totpDisableRoute({ env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  await supabaseRequest(env, `/rest/v1/ethone_user_data?user_id=eq.${encodeURIComponent(auth.userId)}&kind=eq.totp`, { method: "DELETE" });
  return { data: { disabled: true } };
}
