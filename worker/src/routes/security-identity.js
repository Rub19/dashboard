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
  listUserDevices,
  clearMfaPending
} from "../services/device-service.js";
import {
  listSecurityEvents,
  getUserIdByEmail,
  listPasskeys,
  getDeviceBySession,
  getTotpRecord,
  insertTotpRecord,
  updateTotpRecord,
  deleteTotpRecord,
  insertSecurityEvent
} from "../services/security-identity-client.js";
import { generateTotpSecret, verifyTotp, verifyBackupCode } from "../services/totp-service.js";

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
  const requestOrigin = request.headers.get("origin") || "";

  const options = await createRegistrationOptions(env, requestOrigin, auth.userId, email, name, deviceName);
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
  // Pre-auth (this IS the login step, there's no auth.userId yet) — key the
  // brute-force guard on the WebAuthn credential id being presented, which
  // is stable per authenticator and present on every attempt.
  await applyAuthRateLimit({ request, env, route: { id: "passkey.authenticate" } }, response?.id || response?.rawId);
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
  let result;
  try {
    result = await sendOtp(env, email, userId, acceptLanguage, country, timezone);
  } catch (err) {
    // sendOtp throws a plain Error for the expected "this email has no
    // account" / "cooldown" cases — normalise them to real HTTP statuses so
    // the login screen can show a clear message instead of a generic 500.
    const message = err instanceof Error ? err.message : "";
    if (/account not found/i.test(message)) throw httpError("PROVIDER_NOT_FOUND", 404);
    if (/too many/i.test(message)) throw httpError("AUTH_RATE_LIMITED", 429, { retryable: true });
    throw err;
  }
  return { data: { sent: result.sent, userId: result.userId, contact: result.contact, expiresIn: result.expiresIn, ...(result.code ? { code: result.code } : {}) } };
}

export async function otpVerifyRoute({ request, env }) {
  const body = await readJsonBody(request, 3);
  const userId = requireField(body, "userId", UUID_RE, 36);
  await applyAuthRateLimit({ request, env, route: { id: "otp.verify" } }, userId);
  const email = requireField(body, "email", EMAIL_RE, 320);
  const code = requireField(body, "code", CODE_RE, 6);

  const userAgent = request.headers.get("user-agent") || "";
  // A real session_id, shared by the device row and the minted token's
  // session_id claim, is what lets a session actually be revoked later:
  // middleware/auth.js's per-request revocation check looks up
  // ethone_devices by (userId, session_id). Previously both were hardcoded
  // null, so every OTP-issued token was unrevoke-able and every request
  // created a fresh device row (getOrCreateDevice's session-based reuse
  // never matched).
  const sessionId = crypto.randomUUID();
  // Determined BEFORE the device row (= this session) is created, so the
  // very first token this route ever hands back already belongs to a
  // session already flagged pending — unlike the password/OAuth/passkey
  // flows (see deviceUpsertRoute), there's no window here where a request
  // could beat the flag being set, because the Worker mints this session's
  // token itself instead of the client exchanging one directly with Supabase.
  const totpRecord = await getTotpRecord(env, userId);
  const mfaPending = Boolean(totpRecord?.data?.verified);
  const device = await getOrCreateDevice(env, userId, sessionId, userAgent, "", mfaPending);
  const result = await verifyOtp(env, userId, email, code, device.id, sessionId);
  const rememberMe = Boolean(body.rememberMe);
  const tokenTtl = rememberMe ? 30 * 24 * 60 * 60 : 8 * 60 * 60;
  const token = await signServiceToken(env, userId, sessionId, tokenTtl);

  return { data: { verified: true, deviceId: device.id, token, rememberMe } };
}

export async function deviceUpsertRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 2);
  const name = fieldText(body, "name", NAME_RE, 120, "");
  const { userAgent, sessionId } = deviceContext(request, auth);
  // Password, OAuth, and passkey logins never touch the Worker to obtain
  // their session (Supabase hands it to the client directly) — this
  // best-effort call from AuthProvider's SIGNED_IN handler is the earliest
  // point the Worker learns about the session at all, so it's also where
  // the mfa_pending flag has to be decided for those flows (see
  // otpVerifyRoute for the one flow — native OTP — that doesn't need this,
  // because the Worker mints that session's token itself). Only applies the
  // very first time this session's row is created; getOrCreateDevice
  // ignores the flag entirely on a repeat call for an existing row.
  const totpRecord = await getTotpRecord(env, auth.userId);
  const mfaPending = Boolean(totpRecord?.data?.verified);
  const device = await getOrCreateDevice(env, auth.userId, sessionId, userAgent, name, mfaPending);
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

// The device row for the session the CURRENT request is authenticated with
// (not the target being acted on) — the anchor for "is this my own active
// session?" checks below.
async function currentSessionDeviceId(env, auth) {
  if (!auth.sessionId) return null;
  const device = await getDeviceBySession(env, auth.userId, auth.sessionId);
  return device?.id ?? null;
}

export async function deviceRevokeRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  await applyAuthRateLimit({ request, env, route: { id: "device.revoke" } }, auth.userId);
  const body = await readJsonBody(request, 2);
  const deviceId = requireField(body, "deviceId", UUID_RE, 36);
  const confirmCurrent = body.confirmCurrent === true;

  // Revoking the session you're issuing this very request from is allowed,
  // but never silently: it must be an explicit, deliberate choice (the
  // frontend shows a confirmation dialog before setting this flag), not an
  // accidental click on the wrong row in a device list.
  const currentDeviceId = await currentSessionDeviceId(env, auth);
  if (currentDeviceId && deviceId === currentDeviceId && !confirmCurrent) {
    throw httpError("CONFIRMATION_REQUIRED", 409, { detail: "confirmCurrent must be true to revoke your own active session" });
  }

  const device = await revokeDevice(env, auth.userId, deviceId);
  return { data: device };
}

export async function deviceRevokeOthersRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  await applyAuthRateLimit({ request, env, route: { id: "device.revoke-others" } }, auth.userId);
  const currentDeviceId = await currentSessionDeviceId(env, auth);
  const devices = await listUserDevices(env, auth.userId);
  const targets = devices.filter((d) => !d.revoked_at && d.id !== currentDeviceId);
  const revokedDeviceIds = [];
  for (const device of targets) {
    await revokeDevice(env, auth.userId, device.id);
    revokedDeviceIds.push(device.id);
  }
  return { data: { revokedCount: revokedDeviceIds.length, revokedDeviceIds } };
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

  const existing = await getTotpRecord(env, auth.userId);
  if (existing?.data?.verified) {
    throw httpError("TOTP_ALREADY_ENABLED", 409);
  }

  const { secret, otpauth, backupCodes, backupCodeHashes } = await generateTotpSecret(auth.userId, email);
  // The real base32 secret is stored (not a hash of it): TOTP verification
  // has to re-derive codes from this value on every check, which is only
  // possible if the server can read it back verbatim — unlike a password,
  // this is symmetric key material, so a one-way hash here would make
  // verification permanently impossible. Backup codes are the opposite: the
  // user redeems them by presenting the value itself, so only their hashes
  // are persisted, same as ethone_otp_codes' code_hash pattern.
  const data = { secret, verified: false, backup: backupCodeHashes };

  if (existing) {
    // Setup was re-run before a previous attempt was verified (e.g. the user
    // abandoned the QR code step) — replace the pending secret in place
    // instead of conflicting on the primary key with a second insert.
    await updateTotpRecord(env, auth.userId, existing.id, data);
  } else {
    await insertTotpRecord(env, auth.userId, data);
  }

  return { data: { secret, otpauth, backupCodes } };
}

/**
 * Vérifie un code TOTP pour activer le 2FA.
 */
export async function totpVerifySetupRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 1);
  const code = requireField(body, "code", /^\d{6}$/, 6);

  const record = await getTotpRecord(env, auth.userId);
  if (!record || !record.data?.secret) throw httpError("TOTP_NOT_SETUP", 400);

  const pendingSecret = record.data.secret;
  const valid = await verifyTotp(pendingSecret, code);
  if (!valid) throw httpError("TOTP_INVALID", 401);

  await updateTotpRecord(env, auth.userId, record.id, { ...record.data, verified: true });

  return { data: { enabled: true } };
}

/**
 * Désactive le 2FA TOTP.
 */
export async function totpDisableRoute({ env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  await deleteTotpRecord(env, auth.userId);
  return { data: { disabled: true } };
}

/**
 * Login-time 2FA gate. Distinct from totpVerifySetupRoute (which only
 * activates 2FA on an already-fully-authenticated session): this is the
 * route a session stuck in mfa_pending is still allowed to call (see
 * middleware/auth.js's MFA_EXEMPT_ROUTE_IDS) — the only thing that can
 * clear it. Accepts either a 6-digit TOTP code or one single-use backup
 * code, never both in the same request.
 */
export async function totpChallengeRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  await applyAuthRateLimit({ request, env, route: { id: "totp.challenge" } }, auth.userId);

  const body = await readJsonBody(request, 1);
  const hasCode = typeof body.code === "string" && body.code.length > 0;
  const hasBackupCode = typeof body.backupCode === "string" && body.backupCode.length > 0;
  if (hasCode === hasBackupCode) {
    // Exactly one of the two must be provided — neither, or both, is a
    // malformed request rather than "wrong code" (which is TOTP_INVALID).
    throw httpError("INVALID_REQUEST", 400);
  }

  const record = await getTotpRecord(env, auth.userId);
  if (!record || !record.data?.verified) throw httpError("TOTP_NOT_SETUP", 400);

  let valid = false;
  let updatedData = record.data;
  if (hasCode) {
    const code = requireField(body, "code", CODE_RE, 6);
    valid = await verifyTotp(record.data.secret, code);
  } else {
    const backupCode = requireField(body, "backupCode", /^[0-9A-Za-z]{8}$/, 8);
    const result = await verifyBackupCode(record.data.backup, backupCode);
    valid = result.valid;
    if (valid) updatedData = { ...record.data, backup: result.remainingHashes };
  }

  if (!valid) throw httpError("TOTP_INVALID", 401);

  if (updatedData !== record.data) {
    // Only happens on a backup-code redemption: persist the shrunk list so
    // the same code can't be replayed.
    await updateTotpRecord(env, auth.userId, record.id, updatedData);
  }

  const device = await clearMfaPending(env, auth.userId, auth.sessionId);

  await insertSecurityEvent(env, {
    userId: auth.userId,
    kind: "mfa_verified",
    deviceId: device?.id,
    metadata: { method: hasCode ? "totp" : "backup_code" }
  });

  return { data: { verified: true } };
}
