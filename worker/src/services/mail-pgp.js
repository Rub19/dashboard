import { requestExternal } from "../utils/external-request.js";

function safeText(value, limit = 320) {
  const raw = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return raw.slice(0, limit);
}

function safeEmail(value) {
  const email = safeText(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

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

function supabaseRequest(env, path, options = {}) {
  const origin = projectOrigin(env);
  const secret = env.SUPABASE_SECRET_KEY;
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

function u8ToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToU8(value) {
  try {
    const binary = atob(String(value).replace(/\s/g, ""));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function stringToU8(value) {
  return new TextEncoder().encode(value);
}

function u8ToString(buffer) {
  return new TextDecoder().decode(buffer);
}

function concatenate(...parts) {
  let length = 0;
  for (const part of parts) length += part.byteLength;
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(new Uint8Array(part), offset);
    offset += part.byteLength;
  }
  return result;
}

async function deriveAesKey(passphrase, salt) {
  const keyMaterial = await crypto.subtle.importKey("raw", stringToU8(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function digestFingerprint(value) {
  const buffer = await crypto.subtle.digest("SHA-256", stringToU8(value));
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

export async function generateKeyPair(passphrase) {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );

  const publicKeySpki = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKeyPkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  const publicKey = u8ToBase64(publicKeySpki);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const aesKey = await deriveAesKey(passphrase, salt);
  const encryptedPrivate = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, privateKeyPkcs8);

  const privateKeyEncrypted = u8ToBase64(concatenate(salt, iv, encryptedPrivate));
  const fingerprint = await digestFingerprint(publicKey);

  return { publicKey, privateKeyEncrypted, fingerprint };
}

export async function listKeys(env, userId, limit = 50) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return [];
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_pgp_keys?user_id=eq.${userId}&order=created_at.desc&limit=${safeLimit}`, {
    method: "GET",
    maxBytes: 16384
  });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function createKey(env, userId, payload) {
  const origin = projectOrigin(env);
  if (!origin || !userId) throw new Error("Invalid context.");

  const email = safeEmail(payload?.email);
  if (!email) throw new Error("Email required.");

  const publicKey = safeText(payload?.public_key, 8192);
  const privateKeyEncrypted = safeText(payload?.private_key_encrypted, 16384);

  if (publicKey) {
    const bytes = base64ToU8(publicKey);
    if (!bytes) throw new Error("Invalid public key.");
    try {
      await crypto.subtle.importKey("spki", bytes, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["wrapKey"]);
    } catch {
      throw new Error("Invalid public key.");
    }
  }

  if (!publicKey && !privateKeyEncrypted) throw new Error("Public or private key required.");

  const fingerprint = publicKey ? await digestFingerprint(publicKey) : safeText(payload?.fingerprint, 16);

  const response = await supabaseRequest(env, "/rest/v1/ethone_mail_pgp_keys", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: {
      user_id: userId,
      email,
      public_key: publicKey,
      private_key_encrypted: privateKeyEncrypted,
      passphrase_hash: safeText(payload?.passphrase_hash, 256),
      fingerprint,
      is_active: payload?.is_active !== false
    },
    maxBytes: 4096
  });
  return firstRow(response);
}

export async function deleteKey(env, userId, id) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !id) throw new Error("Invalid context.");
  await supabaseRequest(env, `/rest/v1/ethone_mail_pgp_keys?id=eq.${id}&user_id=eq.${userId}`, {
    method: "DELETE",
    maxBytes: 2048
  });
  return { deleted: true };
}

export async function encryptBody(body, publicKeyBase64) {
  const publicBytes = base64ToU8(publicKeyBase64);
  if (!publicBytes) throw new Error("Invalid public key.");

  const publicKey = await crypto.subtle.importKey("spki", publicBytes, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["wrapKey"]);
  const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const wrappedKey = await crypto.subtle.wrapKey("raw", aesKey, publicKey, { name: "RSA-OAEP" });
  const encryptedBody = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, stringToU8(body));

  return {
    encryptedBody: u8ToBase64(encryptedBody),
    wrappedKey: u8ToBase64(wrappedKey),
    iv: u8ToBase64(iv)
  };
}

export async function decryptBody(encryptedBody, wrappedKey, iv, privateKeyBase64, passphrase) {
  const privateBytes = base64ToU8(privateKeyBase64);
  if (!privateBytes || privateBytes.byteLength < 28) throw new Error("Invalid private key.");

  const salt = privateBytes.slice(0, 16);
  const ivPrivate = privateBytes.slice(16, 28);
  const cipherPrivate = privateBytes.slice(28);

  const aesKey = await deriveAesKey(passphrase, salt);
  let privateKeyPkcs8;
  try {
    privateKeyPkcs8 = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivPrivate }, aesKey, cipherPrivate);
  } catch {
    throw new Error("Unable to decrypt private key.");
  }

  const privateKey = await crypto.subtle.importKey("pkcs8", privateKeyPkcs8, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["unwrapKey"]);

  const wrappedBytes = base64ToU8(wrappedKey);
  const ivBytes = base64ToU8(iv);
  if (!wrappedBytes || !ivBytes) throw new Error("Invalid encrypted payload.");

  const sessionKey = await crypto.subtle.unwrapKey(
    "raw",
    wrappedBytes,
    privateKey,
    { name: "RSA-OAEP" },
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const bodyBytes = base64ToU8(encryptedBody);
  if (!bodyBytes) throw new Error("Invalid encrypted body.");

  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, sessionKey, bodyBytes);
  return u8ToString(decrypted);
}
