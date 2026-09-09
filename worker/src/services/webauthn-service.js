import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from "@simplewebauthn/server";
import {
  createChallenge,
  getActiveChallenge,
  markChallengeUsed,
  insertPasskey,
  updatePasskey,
  updateDevice,
  listPasskeys,
  getPasskeyByCredential,
  getPasskeyById,
  insertSecurityEvent,
  getPasskeyByCredential as getPasskeyByCredentialGlobal,
  getUserEmailById,
  generateMagicLinkToken
} from "./security-identity-client.js";

const RP_NAME = "ETHONE";
const CHALLENGE_TTL_MS = 120_000;

function base64UrlToBuffer(value) {
  const base64 = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function parseOrigin(origin) {
  try {
    const url = new URL(origin);
    return { origin: url.origin, rpId: url.hostname };
  } catch {
    return null;
  }
}

function allowedOrigins(env) {
  const raw = String(env.ALLOWED_ORIGINS || "");
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

export function resolveWebAuthnConfig(env, requestOrigin) {
  const origins = allowedOrigins(env);
  if (requestOrigin && origins.includes(requestOrigin)) return parseOrigin(requestOrigin);
  if (origins.length > 0) return parseOrigin(origins[0]);
  return { origin: "https://ethone.dev", rpId: "ethone.dev" };
}

export async function createRegistrationOptions(env, requestOrigin, userId, email, name, deviceName) {
  // Resolve against the actual request origin, the same way verifyRegistration
  // does — resolving against origins[0] unconditionally meant registration
  // options and verification disagreed on rpId for any origin other than the
  // primary one (a preview deploy, localhost in dev), breaking registration.
  const config = resolveWebAuthnConfig(env, requestOrigin);
  if (!config) throw new Error("Invalid WebAuthn configuration");

  const userDisplayName = name || email;
  const userID = new TextEncoder().encode(userId);

  // Exclude the user's existing (non-revoked) passkeys so the authenticator
  // itself refuses a duplicate registration, instead of only catching it
  // after the fact in verifyRegistration's getPasskeyByCredential check.
  const existingPasskeys = await listPasskeys(env, userId);
  const excludeCredentials = existingPasskeys.map((p) => ({
    id: p.credential_id,
    transports: Array.isArray(p.metadata?.transports) ? p.metadata.transports : []
  }));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: config.rpId,
    userName: email,
    userDisplayName,
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform"
    }
  });

  const challengeBase64Url = options.challenge;
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  await createChallenge(env, {
    userId,
    purpose: "registration",
    challenge: challengeBase64Url,
    expiresAt
  });

  return { ...options, deviceName: deviceName || userDisplayName };
}

export async function verifyRegistration(env, requestOrigin, userId, deviceId, response) {
  const config = resolveWebAuthnConfig(env, requestOrigin);
  if (!config) throw new Error("Invalid WebAuthn configuration");

  const challengeRow = await getActiveChallenge(env, userId, "registration");
  if (!challengeRow) throw new Error("Challenge expired or not found");

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpId,
      requireUserVerification: false
    });
  } catch (error) {
    throw new Error(`WebAuthn registration verification failed: ${error.message}`);
  }

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("WebAuthn registration not verified");
  }

  const { credential } = verification.registrationInfo;
  const credentialId = bufferToBase64Url(credential.id);
  const publicKey = bufferToBase64Url(credential.publicKey);

  await markChallengeUsed(env, userId, challengeRow.id, new Date().toISOString());

  const existing = await getPasskeyByCredential(env, userId, credentialId);
  if (existing) throw new Error("Passkey already registered");

  const passkey = await insertPasskey(env, {
    userId,
    deviceId,
    credentialId,
    publicKey,
    signCount: credential.counter || 0,
    name: response.clientExtensionResults?.credProps?.rk ? "Synced passkey" : "Device passkey",
    metadata: { transports: credential.transports || [] }
  });

  if (deviceId) {
    await updateDevice(env, userId, deviceId, { passkeyEnabled: true });
  }

  await insertSecurityEvent(env, {
    userId,
    kind: "passkey_created",
    deviceId,
    passkeyId: passkey?.id,
    metadata: { credential_id: credentialId.slice(0, 8) + "...", name: passkey?.name }
  });

  return { passkeyId: passkey?.id, credentialId };
}

export async function createAuthenticationOptions(env, requestOrigin, userId) {
  const config = resolveWebAuthnConfig(env, requestOrigin);
  if (!config) throw new Error("Invalid WebAuthn configuration");

  let allowCredentials = [];
  if (userId) {
    const passkeys = await listPasskeys(env, userId);
    // id must be the base64url credential id string, not a decoded buffer —
    // generateAuthenticationOptions validates it with isoBase64URL.isBase64URL
    // and throws on anything else (@simplewebauthn/server v13's WebAuthnCredential
    // shape), which is what credential_id already is (bufferToBase64Url's output).
    allowCredentials = passkeys.map((p) => ({
      id: p.credential_id,
      transports: Array.isArray(p.metadata?.transports) ? p.metadata.transports : []
    }));
  }

  const challengeBytes = crypto.getRandomValues(new Uint8Array(32));
  const options = await generateAuthenticationOptions({
    rpID: config.rpId,
    allowCredentials,
    userVerification: "preferred",
    challenge: challengeBytes
  });

  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  if (userId) {
    await createChallenge(env, {
      userId,
      purpose: "authentication",
      challenge: options.challenge,
      expiresAt
    });
  }

  return options;
}

export async function verifyAuthentication(env, requestOrigin, response) {
  const config = resolveWebAuthnConfig(env, requestOrigin);
  if (!config) throw new Error("Invalid WebAuthn configuration");

  const credentialId = response.id;
  if (!credentialId) throw new Error("Missing credential id");

  const passkey = await getPasskeyByCredentialGlobal(env, null, credentialId);
  if (!passkey) throw new Error("Passkey not found");
  const userId = passkey.user_id;

  const challengeRow = await getActiveChallenge(env, userId, "authentication");
  if (!challengeRow) throw new Error("Challenge expired or not found");

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpId,
      // Modern @simplewebauthn/server (v13, pinned in package.json) expects a
      // top-level `credential: { id, publicKey, counter, transports }`, not
      // the legacy nested `authenticator: {...}` shape — the same shape
      // verifyRegistration already reads back out of registrationInfo.credential.
      // The old shape here silently didn't match this version's API surface,
      // which is why authentication has been broken.
      credential: {
        id: passkey.credential_id,
        publicKey: base64UrlToBuffer(passkey.public_key),
        counter: Number(passkey.sign_count) || 0,
        transports: Array.isArray(passkey.metadata?.transports) ? passkey.metadata.transports : []
      },
      requireUserVerification: false
    });
  } catch (error) {
    throw new Error(`WebAuthn authentication verification failed: ${error.message}`);
  }

  if (!verification.verified) throw new Error("WebAuthn authentication not verified");

  const previousCounter = Number(passkey.sign_count) || 0;
  const newCounter = Number(verification.authenticationInfo?.newCounter) || 0;
  // Anti-cloning signal: a legitimate authenticator's counter should strictly
  // increase on every use. Some authenticators (notably many platform/synced
  // passkeys, which this app's authenticatorSelection.authenticatorAttachment
  // = "platform" specifically favors) always report 0 and never regress in a
  // meaningful way, so we only flag when BOTH sides are non-zero — a real
  // regression from a non-zero value is a much stronger signal than "still 0".
  // We log-and-allow rather than reject-and-break-real-users: we can't fully
  // rule out some authenticators legitimately plateauing or resetting their
  // counter (e.g. after a backup/restore), and rejecting outright on a signal
  // we're not 100% sure about risks locking a genuine user out of their own
  // account, which is worse than a missed detection here.
  if (previousCounter > 0 && newCounter > 0 && newCounter <= previousCounter) {
    await insertSecurityEvent(env, {
      userId,
      kind: "passkey_counter_anomaly",
      passkeyId: passkey.id,
      metadata: { previousCounter, newCounter, credential_id: passkey.credential_id.slice(0, 8) + "..." }
    });
  }

  await markChallengeUsed(env, userId, challengeRow.id, new Date().toISOString());
  await updatePasskey(env, userId, passkey.id, {
    signCount: newCounter || passkey.sign_count,
    lastUsedAt: new Date().toISOString()
  });

  await insertSecurityEvent(env, {
    userId,
    kind: "passkey_used",
    passkeyId: passkey.id,
    metadata: { credential_id: passkey.credential_id.slice(0, 8) + "..." }
  });

  const email = await getUserEmailById(env, userId);
  if (!email) throw new Error("User email not found");
  const tokenHash = await generateMagicLinkToken(env, email);
  return { userId, passkeyId: passkey.id, email, token_hash: tokenHash };
}

export async function renamePasskey(env, userId, passkeyId, name) {
  const passkey = await getPasskeyById(env, userId, passkeyId);
  if (!passkey) throw new Error("Passkey not found");
  const updated = await updatePasskey(env, userId, passkeyId, { name });
  await insertSecurityEvent(env, { userId, kind: "passkey_renamed", passkeyId, metadata: { name } });
  return updated;
}

export async function revokePasskey(env, userId, passkeyId) {
  const passkey = await getPasskeyById(env, userId, passkeyId);
  if (!passkey) throw new Error("Passkey not found");
  const updated = await updatePasskey(env, userId, passkeyId, { revokedAt: new Date().toISOString() });
  await insertSecurityEvent(env, { userId, kind: "passkey_removed", passkeyId, metadata: { credential_id: passkey.credential_id.slice(0, 8) + "..." } });
  return updated;
}
