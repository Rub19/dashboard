import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeText } from "../utils/normalize.js";

function projectOrigin(env) {
  let url;
  try {
    url = new URL(String(env.SUPABASE_URL || ""));
  } catch {
    return "";
  }
  return url.protocol === "https:" ? url.origin : "";
}

function serviceHeaders(secret) {
  const headers = {
    apikey: secret,
    "content-type": "application/json"
  };
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret)) {
    headers.Authorization = `Bearer ${secret}`;
  }
  return headers;
}

function supabaseRequest(env, path, options = {}) {
  const origin = projectOrigin(env);
  const secret = requireSecret(env, "SUPABASE_SECRET_KEY");
  return requestExternal(new URL(path, origin), {
    env,
    expectedOrigin: origin,
    service: "supabase",
    method: options.method || "GET",
    headers: { ...serviceHeaders(secret), ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
    retries: options.retries ?? 0,
    maxBytes: options.maxBytes ?? 8192
  });
}

function firstRow(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

export async function listDevices(env, userId) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_devices?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&select=*`);
  return Array.isArray(response.data) ? response.data : [];
}

export async function getDeviceById(env, userId, deviceId) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_devices?id=eq.${encodeURIComponent(deviceId)}&user_id=eq.${encodeURIComponent(userId)}&select=*`);
  return firstRow(response);
}

export async function getDeviceBySession(env, userId, sessionId) {
  if (!sessionId) return null;
  const response = await supabaseRequest(env, `/rest/v1/ethone_devices?user_id=eq.${encodeURIComponent(userId)}&session_id=eq.${encodeURIComponent(sessionId)}&select=*`);
  return firstRow(response);
}

export async function insertDevice(env, device) {
  const response = await supabaseRequest(env, "/rest/v1/ethone_devices", {
    method: "POST",
    body: {
      user_id: device.userId,
      name: safeText(device.name, 120) || "",
      type: safeText(device.type, 40) || "unknown",
      platform: safeText(device.platform, 80) || "",
      browser: safeText(device.browser, 80) || "",
      trusted: Boolean(device.trusted),
      passkey_enabled: Boolean(device.passkeyEnabled),
      session_id: safeText(device.sessionId, 120) || null,
      metadata: device.metadata && typeof device.metadata === "object" ? device.metadata : {}
    },
    headers: { Prefer: "return=representation" }
  });
  return firstRow(response);
}

export async function updateDevice(env, userId, deviceId, patch) {
  const body = {};
  if (patch.name !== undefined) body.name = safeText(patch.name, 120) || "";
  if (patch.type !== undefined) body.type = safeText(patch.type, 40) || "unknown";
  if (patch.platform !== undefined) body.platform = safeText(patch.platform, 80) || "";
  if (patch.browser !== undefined) body.browser = safeText(patch.browser, 80) || "";
  if (patch.lastSeenAt !== undefined) body.last_seen_at = patch.lastSeenAt;
  if (patch.lastVerifiedAt !== undefined) body.last_verified_at = patch.lastVerifiedAt;
  if (patch.trusted !== undefined) body.trusted = Boolean(patch.trusted);
  if (patch.revokedAt !== undefined) body.revoked_at = patch.revokedAt;
  if (patch.passkeyEnabled !== undefined) body.passkey_enabled = Boolean(patch.passkeyEnabled);
  if (patch.metadata !== undefined) body.metadata = patch.metadata;

  const response = await supabaseRequest(env, `/rest/v1/ethone_devices?id=eq.${encodeURIComponent(deviceId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body,
    headers: { Prefer: "return=representation" }
  });
  return firstRow(response);
}

export async function deleteDevice(env, userId, deviceId) {
  await supabaseRequest(env, `/rest/v1/ethone_devices?id=eq.${encodeURIComponent(deviceId)}&user_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" });
  return true;
}

export async function listPasskeys(env, userId) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_passkeys?user_id=eq.${encodeURIComponent(userId)}&revoked_at=is.null&order=last_used_at.desc.nullslast&select=*`);
  return Array.isArray(response.data) ? response.data : [];
}

export async function getPasskeyByCredential(env, userId, credentialId) {
  const userFilter = userId ? `&user_id=eq.${encodeURIComponent(userId)}` : "";
  const response = await supabaseRequest(env, `/rest/v1/ethone_passkeys?credential_id=eq.${encodeURIComponent(credentialId)}&revoked_at=is.null${userFilter}&select=*`);
  return firstRow(response);
}

export async function getPasskeyById(env, userId, passkeyId) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_passkeys?id=eq.${encodeURIComponent(passkeyId)}&user_id=eq.${encodeURIComponent(userId)}&select=*`);
  return firstRow(response);
}

export async function insertPasskey(env, passkey) {
  const response = await supabaseRequest(env, "/rest/v1/ethone_passkeys", {
    method: "POST",
    body: {
      user_id: passkey.userId,
      device_id: passkey.deviceId || null,
      credential_id: passkey.credentialId,
      public_key: passkey.publicKey,
      sign_count: passkey.signCount || 0,
      name: safeText(passkey.name, 120) || "",
      metadata: passkey.metadata && typeof passkey.metadata === "object" ? passkey.metadata : {}
    },
    headers: { Prefer: "return=representation" }
  });
  return firstRow(response);
}

export async function updatePasskey(env, userId, passkeyId, patch) {
  const body = {};
  if (patch.name !== undefined) body.name = safeText(patch.name, 120) || "";
  if (patch.signCount !== undefined) body.sign_count = Math.max(0, Number(patch.signCount) || 0);
  if (patch.lastUsedAt !== undefined) body.last_used_at = patch.lastUsedAt;
  if (patch.revokedAt !== undefined) body.revoked_at = patch.revokedAt;

  const response = await supabaseRequest(env, `/rest/v1/ethone_passkeys?id=eq.${encodeURIComponent(passkeyId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body,
    headers: { Prefer: "return=representation" }
  });
  return firstRow(response);
}

export async function deletePasskey(env, userId, passkeyId) {
  await supabaseRequest(env, `/rest/v1/ethone_passkeys?id=eq.${encodeURIComponent(passkeyId)}&user_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" });
  return true;
}

export async function insertSecurityEvent(env, event) {
  const body = {
    user_id: event.userId,
    kind: safeText(event.kind, 80) || "unknown",
    device_id: event.deviceId || null,
    passkey_id: event.passkeyId || null,
    ip_hash: safeText(event.ipHash, 128) || null,
    metadata: event.metadata && typeof event.metadata === "object" ? event.metadata : {}
  };
  await supabaseRequest(env, "/rest/v1/ethone_security_events", {
    method: "POST",
    body,
    maxBytes: 4096
  });
  return true;
}

export async function listSecurityEvents(env, userId, limit = 100) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));
  const response = await supabaseRequest(env, `/rest/v1/ethone_security_events?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=${safeLimit}&select=*`);
  return Array.isArray(response.data) ? response.data : [];
}

export async function createChallenge(env, challenge) {
  const response = await supabaseRequest(env, "/rest/v1/ethone_passkey_challenges", {
    method: "POST",
    body: {
      user_id: challenge.userId,
      purpose: challenge.purpose,
      challenge: challenge.challenge,
      expires_at: challenge.expiresAt
    },
    headers: { Prefer: "return=representation" }
  });
  return firstRow(response);
}

export async function getActiveChallenge(env, userId, purpose) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_passkey_challenges?user_id=eq.${encodeURIComponent(userId)}&purpose=eq.${encodeURIComponent(purpose)}&used_at=is.null&expires_at=gte.${encodeURIComponent(new Date().toISOString())}&order=created_at.desc&limit=1&select=*`);
  return firstRow(response);
}

export async function markChallengeUsed(env, userId, challengeId, usedAt) {
  await supabaseRequest(env, `/rest/v1/ethone_passkey_challenges?id=eq.${encodeURIComponent(challengeId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: { used_at: usedAt }
  });
  return true;
}

export async function deleteExpiredChallenges(env) {
  await supabaseRequest(env, `/rest/v1/ethone_passkey_challenges?expires_at=lt.${encodeURIComponent(new Date().toISOString())}`, { method: "DELETE" });
  return true;
}

export async function createVerificationRequest(env, request) {
  const response = await supabaseRequest(env, "/rest/v1/ethone_device_verification_requests", {
    method: "POST",
    body: {
      user_id: request.userId,
      requesting_device_id: request.requestingDeviceId || null,
      approving_device_id: request.approvingDeviceId || null,
      code: request.code,
      expires_at: request.expiresAt,
      status: request.status || "pending"
    },
    headers: { Prefer: "return=representation" }
  });
  return firstRow(response);
}

export async function getVerificationRequest(env, userId, code) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_device_verification_requests?user_id=eq.${encodeURIComponent(userId)}&code=eq.${encodeURIComponent(code)}&status=eq.pending&select=*`);
  return firstRow(response);
}

export async function updateVerificationRequest(env, userId, requestId, patch) {
  const body = {};
  if (patch.approvingDeviceId !== undefined) body.approving_device_id = patch.approvingDeviceId || null;
  if (patch.usedAt !== undefined) body.used_at = patch.usedAt;
  if (patch.status !== undefined) body.status = safeText(patch.status, 20) || "pending";

  const response = await supabaseRequest(env, `/rest/v1/ethone_device_verification_requests?id=eq.${encodeURIComponent(requestId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body,
    headers: { Prefer: "return=representation" }
  });
  return firstRow(response);
}

export async function deleteExpiredVerificationRequests(env) {
  await supabaseRequest(env, `/rest/v1/ethone_device_verification_requests?expires_at=lt.${encodeURIComponent(new Date().toISOString())}`, { method: "DELETE" });
  return true;
}

export async function createOtpCode(env, otp) {
  const response = await supabaseRequest(env, "/rest/v1/ethone_otp_codes", {
    method: "POST",
    body: {
      user_id: otp.userId,
      contact: safeText(otp.contact, 320) || "",
      code_hash: otp.codeHash,
      attempts: 0,
      expires_at: otp.expiresAt,
      rate_limited_until: otp.rateLimitedUntil || null
    },
    headers: { Prefer: "return=representation" }
  });
  return firstRow(response);
}

export async function getActiveOtpCode(env, userId, contact) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_otp_codes?user_id=eq.${encodeURIComponent(userId)}&contact=eq.${encodeURIComponent(contact)}&used_at=is.null&order=created_at.desc&limit=1&select=*`);
  return firstRow(response);
}

export async function consumeOtpCode(env, userId, contact, patch) {
  const body = {};
  if (patch.attempts !== undefined) body.attempts = Math.max(0, Number(patch.attempts) || 0);
  if (patch.usedAt !== undefined) body.used_at = patch.usedAt;
  if (patch.rateLimitedUntil !== undefined) body.rate_limited_until = patch.rateLimitedUntil;

  const response = await supabaseRequest(env, `/rest/v1/ethone_otp_codes?user_id=eq.${encodeURIComponent(userId)}&contact=eq.${encodeURIComponent(contact)}&used_at=is.null&order=created_at.desc&limit=1`, {
    method: "PATCH",
    body,
    headers: { Prefer: "return=representation" }
  });
  return firstRow(response);
}

export async function getUserIdByEmail(env, email) {
  const origin = projectOrigin(env);
  const secret = requireSecret(env, "SUPABASE_SECRET_KEY");
  const response = await requestExternal(new URL(`/auth/v1/admin/users?email=${encodeURIComponent(email)}`, origin), {
    env,
    expectedOrigin: origin,
    service: "supabase",
    method: "GET",
    headers: serviceHeaders(secret),
    retries: 0,
    maxBytes: 65536
  });
  const users = Array.isArray(response.data?.users) ? response.data.users : [];
  const user = users.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
  return user ? safeText(user.id, 120) : null;
}

export async function deleteExpiredOtpCodes(env) {
  await supabaseRequest(env, `/rest/v1/ethone_otp_codes?expires_at=lt.${encodeURIComponent(new Date().toISOString())}`, { method: "DELETE" });
  return true;
}
