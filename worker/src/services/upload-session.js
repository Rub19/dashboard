import { httpError } from "../middleware/errors.js";

const AES_GCM = Object.freeze({ name: "AES-GCM", length: 256 });

export async function deriveSessionKey(env) {
  const secret = String(env.SESSION_SECRET || env.SUPABASE_JWT_SECRET || "");
  if (secret.length < 8) throw httpError("SERVICE_NOT_CONFIGURED", 503, { retryable: false });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, AES_GCM, false, ["encrypt", "decrypt"]);
}

function u8ToBase64(bytes) {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
}

function base64ToU8(value) {
  try {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

export async function encryptSessionUrl(env, sessionUrl) {
  const key = await deriveSessionKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(String(sessionUrl));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return u8ToBase64(combined);
}

export async function decryptSessionUrl(env, token) {
  const key = await deriveSessionKey(env);
  const bytes = base64ToU8(String(token));
  if (!bytes || bytes.length <= 16) throw httpError("INVALID_PARAMETER", 400);
  const iv = bytes.slice(0, 12);
  const cipher = bytes.slice(12);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
    return new TextDecoder().decode(plain);
  } catch {
    throw httpError("INVALID_PARAMETER", 400);
  }
}
