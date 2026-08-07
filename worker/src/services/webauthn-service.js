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
  getPasskeyByCredential as getPasskeyByCredentialGlobal
} from "./security-identity-client.js";
import { signServiceToken } from "../utils/jwt.js";

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

export async function createRegistrationOptions(env, userId, email, name, deviceName) {
  const config = resolveWebAuthnConfig(env);
  if (!config) throw new Error("Invalid WebAuthn configuration");

  const userDisplayName = name || email;
  const userID = new TextEncoder().encode(userId);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: config.rpId,
    userName: email,
    userDisplayName,
    attestationType: "none",
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
    allowCredentials = passkeys.map((p) => ({
      id: base64UrlToBuffer(p.credential_id),
      type: "public-key",
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
      authenticator: {
        credentialID: base64UrlToBuffer(passkey.credential_id),
        credentialPublicKey: base64UrlToBuffer(passkey.public_key),
        counter: Number(passkey.sign_count) || 0,
        transports: Array.isArray(passkey.metadata?.transports) ? passkey.metadata.transports : []
      },
      requireUserVerification: false
    });
  } catch (error) {
    throw new Error(`WebAuthn authentication verification failed: ${error.message}`);
  }

  if (!verification.verified) throw new Error("WebAuthn authentication not verified");

  await markChallengeUsed(env, userId, challengeRow.id, new Date().toISOString());
  await updatePasskey(env, userId, passkey.id, {
    signCount: verification.authenticationInfo?.newCounter || passkey.sign_count,
    lastUsedAt: new Date().toISOString()
  });

  await insertSecurityEvent(env, {
    userId,
    kind: "passkey_used",
    passkeyId: passkey.id,
    metadata: { credential_id: passkey.credential_id.slice(0, 8) + "..." }
  });

  const token = await signServiceToken(env, userId, null, 3600);
  return { userId, passkeyId: passkey.id, token };
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
