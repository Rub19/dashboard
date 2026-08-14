import { httpError } from "../middleware/errors.js";
import { requestExternal } from "../utils/external-request.js";

const ENCODED_PREFIX = "enc:";
const TEXT_ENCODER = new TextEncoder();

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
  const headers = { apikey: secret, "content-type": "application/json" };
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret)) {
    headers.Authorization = `Bearer ${secret}`;
  }
  return headers;
}

async function supabaseRequest(env, path, options = {}) {
  const origin = projectOrigin(env);
  if (!origin || !env.SUPABASE_SECRET_KEY) throw httpError("SERVICE_NOT_CONFIGURED", 503);
  const response = await requestExternal(new URL(path, origin), {
    env,
    expectedOrigin: origin,
    service: "supabase",
    method: options.method || "GET",
    headers: { ...serviceHeaders(env.SUPABASE_SECRET_KEY), ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
    retries: options.retries ?? 0,
    maxBytes: options.maxBytes ?? 65536,
  });
  return response.data;
}

export async function getUserCredential(env, userId, provider) {
  const rows = await supabaseRequest(
    env,
    `/rest/v1/user_provider_credentials?owner_id=eq.${encodeURIComponent(userId)}&provider=eq.${encodeURIComponent(provider)}&select=credential`,
    { maxBytes: 8192 }
  );
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row?.credential) return null;
  return decryptCredential(env, row.credential);
}

export async function saveUserCredential(env, userId, provider, credential) {
  const encrypted = await encryptCredential(env, credential);
  await supabaseRequest(
    env,
    "/rest/v1/user_provider_credentials",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: { owner_id: userId, provider, credential: encrypted },
      maxBytes: 8192,
    }
  );
  return { provider, connected: true };
}

function getMasterKey(env) {
  const key = env.AI_CREDENTIAL_MASTER_KEY;
  if (!key || typeof key !== "string" || key.length < 32) {
    throw httpError("SERVICE_NOT_CONFIGURED", 501, { detail: "AI_CREDENTIAL_MASTER_KEY missing" });
  }
  return TEXT_ENCODER.encode(key);
}

async function deriveKey(env, salt) {
  const master = getMasterKey(env);
  const baseKey = await crypto.subtle.importKey("raw", master, "PBKDF2", false, ["deriveBits", "deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function toUrlSafeBase64(bytes) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromUrlSafeBase64(input) {
  const source = String(input).replace(/-/g, "+").replace(/_/g, "/");
  const padded = source.padEnd(Math.ceil(source.length / 4) * 4, "=");
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export function encryptCredential(env, credential) {
  if (!credential || typeof credential !== "object") {
    throw httpError("INVALID_PARAMETER", 400, { detail: "credential" });
  }
  const plaintext = TEXT_ENCODER.encode(JSON.stringify(credential));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return Promise.resolve().then(async () => {
    const key = await deriveKey(env, salt);
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
    return {
      encrypted: true,
      salt: toUrlSafeBase64(salt),
      iv: toUrlSafeBase64(iv),
      ciphertext: toUrlSafeBase64(ciphertext),
    };
  });
}

export function decryptCredential(env, credential) {
  if (!credential || typeof credential !== "object") return null;
  if (credential.apiKey && typeof credential.apiKey === "string") {
    // Legacy plain credential: return as-is but warn
    return credential;
  }
  if (!credential.encrypted || !credential.salt || !credential.iv || !credential.ciphertext) {
    return null;
  }
  const salt = fromUrlSafeBase64(credential.salt);
  const iv = fromUrlSafeBase64(credential.iv);
  const ciphertext = fromUrlSafeBase64(credential.ciphertext);
  return Promise.resolve().then(async () => {
    const key = await deriveKey(env, salt);
    try {
      const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
      const decoded = new TextDecoder().decode(plaintext);
      return JSON.parse(decoded);
    } catch (error) {
      throw httpError("SERVICE_NOT_CONFIGURED", 500, { detail: "Failed to decrypt AI credential" });
    }
  });
}
