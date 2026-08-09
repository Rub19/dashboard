import { createOrUpdateThread, getUserIdByAlias, resolveAliasByEmail, storeMailMessage } from "./mail-client.js";
import { requestExternal } from "../utils/external-request.js";
import { base64UrlBytes, timingSafeEqual } from "../utils/crypto.js";

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

function fetcher(env) {
  return typeof env?.__TEST_FETCH__ === "function" ? env.__TEST_FETCH__ : fetch;
}

function stringToU8(value) {
  return new TextEncoder().encode(value);
}

function u8ToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToU8(value) {
  return base64UrlBytes(value);
}

function base64Url(input) {
  return u8ToBase64Url(stringToU8(input));
}

async function signVapidJwt(env, endpoint) {
  const privateKeyBytes = base64UrlToU8(env.VAPID_PRIVATE_KEY);
  if (!privateKeyBytes) throw new Error("Invalid VAPID private key.");

  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const origin = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud: origin, exp: now + 3600, sub: "mailto:admin@ethone.dev" };
  const toSign = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, stringToU8(toSign));
  return `${toSign}.${u8ToBase64Url(signature)}`;
}

async function tryEncryptPayload(subscription, payload) {
  // Structured attempt to implement RFC 8291/8188 Web Push encryption.
  // Falls back to null if anything is missing or unsupported.
  try {
    const p256dh = base64UrlToU8(subscription.p256dh);
    const auth = base64UrlToU8(subscription.auth);
    if (!p256dh || p256dh.byteLength !== 65 || !auth || auth.byteLength !== 16) return null;

    // Ephemeral P-256 ECDH key pair.
    const ephemeral = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"]
    );

    const clientPublic = await crypto.subtle.importKey(
      "raw",
      p256dh,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      []
    );

    const shared = await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientPublic },
      ephemeral.privateKey,
      256
    );

    // PRK = HKDF-Extract(salt=auth, IKM=shared_secret)
    const ikmKey = await crypto.subtle.importKey("raw", new Uint8Array(shared), "HKDF", false, ["deriveBits"]);
    const prk = await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: auth, info: new Uint8Array(0) },
      ikmKey,
      256
    );

    // CEK and nonce for the "aes128gcm" content encoding are derived from
    // a random salt and the Web Push keying material.
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltKey = await crypto.subtle.importKey("raw", new Uint8Array(prk), "HKDF", false, ["deriveBits"]);

    const cek = await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: stringToU8("Content-Encoding: aes128gcm\x00\x01") },
      saltKey,
      128
    );

    const nonce = await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: stringToU8("Content-Encoding: nonce\x00\x01") },
      saltKey,
      96
    );

    const cekKey = await crypto.subtle.importKey("raw", new Uint8Array(cek), { name: "AES-GCM", length: 128 }, false, ["encrypt"]);
    const plain = stringToU8(payload);
    const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: new Uint8Array(nonce) }, cekKey, plain);

    const serverPublic = await crypto.subtle.exportKey("raw", ephemeral.publicKey);
    const recordSize = new Uint8Array(4);
    new DataView(recordSize.buffer).setUint32(0, 4096, false);
    const keyIdLen = new Uint8Array([65]);

    return concatenate(salt, recordSize, keyIdLen, new Uint8Array(serverPublic), new Uint8Array(cipher));
  } catch {
    return null;
  }
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

export async function subscribe(env, userId, { endpoint, p256dh, auth, user_agent }) {
  const origin = projectOrigin(env);
  if (!origin || !userId) throw new Error("Invalid context.");
  if (!endpoint || !/^https?:\/\//.test(endpoint)) throw new Error("Invalid endpoint.");

  await supabaseRequest(env, `/rest/v1/ethone_mail_push_subscriptions?user_id=eq.${userId}&endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: "DELETE",
    maxBytes: 2048
  }).catch(() => null);

  const response = await supabaseRequest(env, "/rest/v1/ethone_mail_push_subscriptions", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: {
      user_id: userId,
      endpoint: safeText(endpoint, 2048),
      p256dh: safeText(p256dh, 256),
      auth: safeText(auth, 256),
      user_agent: safeText(user_agent, 512)
    },
    maxBytes: 4096
  });
  return firstRow(response);
}

export async function unsubscribe(env, userId, { endpoint }) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !endpoint) throw new Error("Invalid context.");
  await supabaseRequest(env, `/rest/v1/ethone_mail_push_subscriptions?user_id=eq.${userId}&endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: "DELETE",
    maxBytes: 2048
  });
  return { deleted: true };
}

export async function listSubscriptions(env, userId, limit = 50) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return [];
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_push_subscriptions?user_id=eq.${userId}&order=created_at.desc&limit=${safeLimit}`, {
    method: "GET",
    maxBytes: 16384
  });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function sendPush(env, subscription, payload) {
  if (!subscription?.endpoint) return { sent: false, error: "Missing endpoint." };

  const jwt = await signVapidJwt(env, subscription.endpoint).catch(() => null);
  if (!jwt) return { sent: false, error: "VAPID signing failed." };

  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  const encrypted = env.PUSH_ENCRYPTION_ENABLED === "true"
    ? await tryEncryptPayload(subscription, body)
    : null;

  const headers = {
    Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY || ""}`,
    TTL: "60",
    "Content-Type": encrypted ? "application/octet-stream" : "application/json",
    "Content-Encoding": "aes128gcm"
  };

  const response = await fetcher(env)(subscription.endpoint, {
    method: "POST",
    headers,
    body: encrypted ? encrypted : body
  });

  return { sent: response.ok || response.status === 201, status: response.status };
}

export async function notifyUser(env, userId, message) {
  const subscriptions = await listSubscriptions(env, userId);
  if (!subscriptions.length) return { notified: 0 };

  const payload = {
    title: safeText(message?.subject, 200) || "New mail",
    body: safeText(message?.from_name, 120) || safeText(message?.from_address, 320) || "",
    message_id: message?.id || null,
    tag: message?.id || "ethone-mail"
  };

  const results = [];
  for (const subscription of subscriptions) {
    try {
      const result = await sendPush(env, subscription, payload);
      results.push(result);
      if (!result.sent) {
        await unsubscribe(env, userId, { endpoint: subscription.endpoint }).catch(() => null);
      }
    } catch (error) {
      if (env.ENVIRONMENT !== "production") {
        console.error("Push notification error:", error);
      }
    }
  }

  return { notified: results.filter((r) => r?.sent).length, results };
}

export async function processWebhookMail(env, rawBody, signature) {
  const secret = env.WEBHOOK_SECRET;
  if (secret) {
    const expected = base64UrlBytes(signature || "");
    const key = await crypto.subtle.importKey("raw", stringToU8(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const actual = new Uint8Array(await crypto.subtle.sign("HMAC", key, new Uint8Array(rawBody)));
    if (!expected || !timingSafeEqual(expected, actual)) throw new Error("Invalid webhook signature.");
  }

  let body;
  try {
    body = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    throw new Error("Invalid JSON body.");
  }

  const to = safeEmail(body?.to);
  const from = safeEmail(body?.from);
  const subject = safeText(body?.subject, 998);
  const text = safeText(body?.text, 50000);
  const html = safeText(body?.html, 50000);

  if (!to || !from) throw new Error("Missing to or from.");

  const userId = await getUserIdByAlias(env, to);
  if (!userId) return { accepted: false, reason: "Alias not found." };

  const alias = await resolveAliasByEmail(env, to);
  const now = new Date().toISOString();
  const threadId = await createOrUpdateThread(env, userId, {
    subject,
    fromAddress: from,
    received_at: now
  });

  const message = {
    user_id: userId,
    alias_id: alias?.id || null,
    thread_id: threadId,
    direction: "inbound",
    folder: "inbox",
    status: "received",
    from_address: from,
    from_name: safeText(body?.from_name, 200) || from,
    to_addresses: [to],
    cc_addresses: safeEmailList(body?.cc),
    bcc_addresses: safeEmailList(body?.bcc),
    reply_to: safeEmail(body?.reply_to),
    subject,
    body_text: text,
    body_html: html,
    headers: { "Message-ID": null, "In-Reply-To": null, "References": null },
    raw_size: rawBody.byteLength,
    message_size: rawBody.byteLength,
    source_ip: "",
    auth_results: { spf: "none", dkim: "none", dmarc: "none" },
    is_read: false,
    is_important: false,
    is_spam: false,
    labels: [],
    attachments: [],
    received_at: now,
    created_at: now
  };

  const stored = await storeMailMessage(env, message);
  const saved = firstRow(stored);
  if (!saved?.id) throw new Error("Failed to store message.");

  await notifyUser(env, userId, { ...message, id: saved.id }).catch(() => null);

  return { accepted: true, id: saved.id };
}

function safeEmailList(values = []) {
  const list = Array.isArray(values) ? values : [values];
  return list.map(safeEmail).filter(Boolean);
}
