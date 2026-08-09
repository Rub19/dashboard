import { getOAuthToken, setOAuthToken } from "./supabase-client.js";
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

const ALLOWED_PROVIDERS = new Set(["gmail", "outlook", "imap"]);

function base64UrlToString(value) {
  const source = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = source.padEnd(Math.ceil(source.length / 4) * 4, "=");
  try {
    const binary = atob(padded);
    return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
  } catch {
    return "";
  }
}

function headerValue(headers, name) {
  if (!Array.isArray(headers)) return "";
  const match = headers.find((h) => String(h.name || "").toLowerCase() === name.toLowerCase());
  return safeText(match?.value, 998);
}

function parseAddressList(value) {
  const raw = String(value || "");
  const emails = [];
  for (const part of raw.split(",")) {
    const m = part.match(/<([^>]+)>/);
    const email = m ? m[1] : part.trim();
    if (safeEmail(email)) emails.push(safeEmail(email));
  }
  return emails;
}

function parseNameFromAddress(value) {
  const raw = String(value || "");
  const m = raw.match(/^([^<]+)\s*</);
  return safeText(m ? m[1] : raw, 200);
}

function decodeGmailBody(payload) {
  let text = "";
  let html = "";
  const parts = payload?.parts || [payload];
  for (const part of parts) {
    if (!part) continue;
    const mime = String(part.mimeType || "").toLowerCase();
    if (mime === "text/plain") text = base64UrlToString(part.body?.data);
    if (mime === "text/html") html = base64UrlToString(part.body?.data);
    if (part.parts) {
      for (const sub of part.parts) {
        const subMime = String(sub.mimeType || "").toLowerCase();
        if (subMime === "text/plain") text = base64UrlToString(sub.body?.data);
        if (subMime === "text/html") html = base64UrlToString(sub.body?.data);
      }
    }
  }
  return { text, html };
}

export async function listAccounts(env, userId, limit = 50) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return [];
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_accounts?user_id=eq.${userId}&order=created_at.desc&limit=${safeLimit}`, {
    method: "GET",
    maxBytes: 16384
  });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function createAccount(env, userId, payload) {
  const origin = projectOrigin(env);
  if (!origin || !userId) throw new Error("Invalid context.");

  const provider = safeText(payload?.provider, 40)?.toLowerCase();
  const email = safeEmail(payload?.email);
  if (!ALLOWED_PROVIDERS.has(provider)) throw new Error("Invalid provider.");
  if (!email) throw new Error("Email required.");

  const credentials = {};
  if (provider === "imap") {
    credentials.imap = {
      host: safeText(payload?.imap_host, 120),
      port: Number(payload?.imap_port) || 993,
      username: safeText(payload?.imap_username, 120),
      password: safeText(payload?.imap_password, 120),
      secure: payload?.imap_secure !== false
    };
    credentials.smtp = {
      host: safeText(payload?.smtp_host, 120),
      port: Number(payload?.smtp_port) || 587,
      username: safeText(payload?.smtp_username, 120),
      password: safeText(payload?.smtp_password, 120),
      secure: payload?.smtp_secure !== false
    };
  } else {
    credentials.oauth = {
      access_token: safeText(payload?.access_token, 4000),
      refresh_token: safeText(payload?.refresh_token, 4000),
      expires_at: safeText(payload?.expires_at, 40),
      scope: safeText(payload?.scope, 500)
    };
  }

  const response = await supabaseRequest(env, "/rest/v1/ethone_mail_accounts", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: {
      user_id: userId,
      provider,
      email,
      name: safeText(payload?.name, 80),
      credentials,
      is_enabled: payload?.is_enabled !== false,
      sync_at: null
    },
    maxBytes: 4096
  });
  return firstRow(response);
}

export async function updateAccount(env, userId, id, payload) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !id) throw new Error("Invalid context.");

  const patch = {};
  if (payload?.email !== undefined) {
    const email = safeEmail(payload.email);
    if (email) patch.email = email;
  }
  if (payload?.name !== undefined) patch.name = safeText(payload.name, 80);
  if (payload?.is_enabled !== undefined) patch.is_enabled = payload.is_enabled === true;

  if (payload?.credentials && typeof payload.credentials === "object") {
    patch.credentials = payload.credentials;
  }

  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_accounts?id=eq.${id}&user_id=eq.${userId}`, {
    method: "PATCH",
    headers: { "Prefer": "return=representation" },
    body: patch,
    maxBytes: 4096
  });
  return firstRow(response);
}

export async function deleteAccount(env, userId, id) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !id) throw new Error("Invalid context.");
  await supabaseRequest(env, `/rest/v1/ethone_mail_accounts?id=eq.${id}&user_id=eq.${userId}`, {
    method: "DELETE",
    maxBytes: 2048
  });
  return { deleted: true };
}

async function tokenExpired(token) {
  if (!token?.expiresAt) return false;
  const expiry = new Date(token.expiresAt).getTime();
  return !Number.isFinite(expiry) || expiry < Date.now() + 60_000;
}

export async function refreshGmailToken(env, token) {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !token?.refreshToken) throw new Error("Missing Google credentials.");

  const params = new URLSearchParams();
  params.set("grant_type", "refresh_token");
  params.set("client_id", clientId);
  params.set("client_secret", clientSecret);
  params.set("refresh_token", token.refreshToken);

  const response = await requestExternal(new URL("https://oauth2.googleapis.com/token"), {
    env,
    expectedOrigin: "https://oauth2.googleapis.com",
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    maxBytes: 4096
  });

  const data = response?.data || {};
  if (!data.access_token) throw new Error("Gmail token refresh failed.");

  const expiresAt = data.expires_in
    ? new Date(Date.now() + Number(data.expires_in) * 1000).toISOString()
    : token.expiresAt;

  const refreshed = {
    accessToken: safeText(data.access_token, 4000),
    refreshToken: safeText(data.refresh_token, 4000) || token.refreshToken,
    scope: safeText(data.scope, 500) || token.scope,
    expiresAt
  };
  return refreshed;
}

export async function refreshOutlookToken(env, token) {
  const clientId = env.MICROSOFT_CLIENT_ID;
  const clientSecret = env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret || !token?.refreshToken) throw new Error("Missing Microsoft credentials.");

  const params = new URLSearchParams();
  params.set("grant_type", "refresh_token");
  params.set("client_id", clientId);
  params.set("client_secret", clientSecret);
  params.set("refresh_token", token.refreshToken);
  params.set("scope", token.scope || "https://graph.microsoft.com/mail.read");

  const response = await requestExternal(new URL("https://login.microsoftonline.com/common/oauth2/v2.0/token"), {
    env,
    expectedOrigin: "https://login.microsoftonline.com",
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    maxBytes: 8192
  });

  const data = response?.data || {};
  if (!data.access_token) throw new Error("Outlook token refresh failed.");

  const expiresAt = data.expires_in
    ? new Date(Date.now() + Number(data.expires_in) * 1000).toISOString()
    : token.expiresAt;

  const refreshed = {
    accessToken: safeText(data.access_token, 4000),
    refreshToken: safeText(data.refresh_token, 4000) || token.refreshToken,
    scope: safeText(data.scope, 500) || token.scope,
    expiresAt
  };
  return refreshed;
}

async function ensureToken(env, userId, provider) {
  let token = await getOAuthToken(env, userId, provider);
  if (!token) return null;

  if (await tokenExpired(token)) {
    const refreshed = provider === "gmail"
      ? await refreshGmailToken(env, token)
      : await refreshOutlookToken(env, token);
    await setOAuthToken(env, userId, provider, refreshed);
    token = await getOAuthToken(env, userId, provider);
  }
  return token;
}

async function fetchGmailList(env, token) {
  const response = await requestExternal(new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50"), {
    env,
    expectedOrigin: "https://gmail.googleapis.com",
    method: "GET",
    headers: { authorization: `Bearer ${token.accessToken}` },
    maxBytes: 65536
  });
  return Array.isArray(response?.data?.messages) ? response.data.messages : [];
}

async function fetchGmailMessage(env, token, messageId) {
  const response = await requestExternal(new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`), {
    env,
    expectedOrigin: "https://gmail.googleapis.com",
    method: "GET",
    headers: { authorization: `Bearer ${token.accessToken}` },
    maxBytes: 262144
  });
  return response?.data || null;
}

function messageFromGmail(accountId, userId, raw) {
  const headers = raw?.payload?.headers || [];
  const from = safeEmail(parseAddressList(headerValue(headers, "From"))[0]);
  const fromName = parseNameFromAddress(headerValue(headers, "From"));
  const to = parseAddressList(headerValue(headers, "To"));
  const cc = parseAddressList(headerValue(headers, "Cc"));
  const bcc = parseAddressList(headerValue(headers, "Bcc"));
  const subject = headerValue(headers, "Subject");
  const date = headerValue(headers, "Date");
  const messageId = headerValue(headers, "Message-ID");
  const inReplyTo = headerValue(headers, "In-Reply-To");
  const references = headerValue(headers, "References").split(/\s+/).filter(Boolean);

  const { text, html } = decodeGmailBody(raw?.payload);
  const receivedAt = date ? new Date(date).toISOString() : new Date().toISOString();

  return {
    user_id: userId,
    account_id: accountId,
    direction: "inbound",
    folder: "inbox",
    status: "synced",
    from_address: from,
    from_name: fromName,
    to_addresses: to,
    cc_addresses: cc,
    bcc_addresses: bcc,
    reply_to: safeEmail(parseAddressList(headerValue(headers, "Reply-To"))[0]) || null,
    subject,
    body_text: text,
    body_html: html,
    headers: {
      "Message-ID": messageId || null,
      "In-Reply-To": inReplyTo || null,
      "References": references.length ? references.join(" ") : null,
      ...Object.fromEntries(headers.map((h) => [h.name, h.value]))
    },
    is_read: false,
    is_important: false,
    is_spam: false,
    labels: raw?.labelIds || [],
    attachments: [],
    raw_size: Number(raw?.sizeEstimate) || 0,
    message_size: Number(raw?.sizeEstimate) || 0,
    received_at: receivedAt,
    created_at: new Date().toISOString()
  };
}

async function fetchOutlookList(env, token) {
  const response = await requestExternal(new URL("https://graph.microsoft.com/v1.0/me/messages?$top=50"), {
    env,
    expectedOrigin: "https://graph.microsoft.com",
    method: "GET",
    headers: { authorization: `Bearer ${token.accessToken}` },
    maxBytes: 262144
  });
  return Array.isArray(response?.data?.value) ? response.data.value : [];
}

function messageFromOutlook(accountId, userId, raw) {
  const fromAddress = safeEmail(raw?.from?.emailAddress?.address);
  const fromName = safeText(raw?.from?.emailAddress?.name, 200);
  const to = (raw?.toRecipients || []).map((r) => safeEmail(r?.emailAddress?.address)).filter(Boolean);
  const cc = (raw?.ccRecipients || []).map((r) => safeEmail(r?.emailAddress?.address)).filter(Boolean);
  const bcc = (raw?.bccRecipients || []).map((r) => safeEmail(r?.emailAddress?.address)).filter(Boolean);
  const subject = safeText(raw?.subject, 998);
  const body = raw?.body || { contentType: "text", content: "" };
  const isHtml = String(body.contentType || "").toLowerCase() === "html";
  const text = isHtml ? "" : safeText(body.content, 50000);
  const html = isHtml ? safeText(body.content, 50000) : "";

  const internetMessageId = raw?.internetMessageId || "";
  const references = String(raw?.conversationId || "").split(/\s+/).filter(Boolean);

  return {
    user_id: userId,
    account_id: accountId,
    direction: "inbound",
    folder: "inbox",
    status: "synced",
    from_address: fromAddress,
    from_name: fromName,
    to_addresses: to,
    cc_addresses: cc,
    bcc_addresses: bcc,
    reply_to: null,
    subject,
    body_text: text,
    body_html: html,
    headers: {
      "Message-ID": internetMessageId ? `<${internetMessageId}>` : null,
      "In-Reply-To": null,
      "References": references.length ? references.join(" ") : null
    },
    is_read: raw?.isRead === true,
    is_important: raw?.importance === "high",
    is_spam: false,
    labels: [],
    attachments: (raw?.attachments || []).map((a) => ({
      filename: safeText(a?.name, 255),
      mime_type: safeText(a?.contentType, 120) || "application/octet-stream",
      size: Number(a?.size) || 0
    })),
    raw_size: 0,
    message_size: 0,
    received_at: raw?.receivedDateTime ? new Date(raw.receivedDateTime).toISOString() : new Date().toISOString(),
    created_at: new Date().toISOString()
  };
}

export async function syncAccount(env, userId, id) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !id) return { ok: false, error: "Invalid context." };

  const account = await supabaseRequest(env, `/rest/v1/ethone_mail_accounts?id=eq.${id}&user_id=eq.${userId}&limit=1`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 4096
  }).then(firstRow);

  if (!account) return { ok: false, error: "Account not found." };
  if (account.provider === "imap") return { ok: false, error: "IMAP not supported in worker" };

  const token = await ensureToken(env, userId, account.provider);
  if (!token) return { ok: false, error: `No ${account.provider} token found.` };

  const messages = account.provider === "gmail"
    ? await fetchGmailList(env, token)
    : await fetchOutlookList(env, token);

  const inserted = [];
  for (const message of messages.slice(0, 50)) {
    try {
      const raw = account.provider === "gmail"
        ? await fetchGmailMessage(env, token, message.id)
        : message;
      if (!raw) continue;
      const parsed = account.provider === "gmail"
        ? messageFromGmail(account.id, userId, raw)
        : messageFromOutlook(account.id, userId, raw);
      const create = await supabaseRequest(env, "/rest/v1/ethone_mail_messages", {
        method: "POST",
        headers: { "Prefer": "return=representation" },
        body: parsed,
        maxBytes: 65536
      });
      const row = firstRow(create);
      if (row?.id) inserted.push(row.id);
    } catch (error) {
      if (env.ENVIRONMENT !== "production") {
        console.error("External sync message error:", error);
      }
    }
  }

  await supabaseRequest(env, `/rest/v1/ethone_mail_accounts?id=eq.${account.id}&user_id=eq.${userId}`, {
    method: "PATCH",
    headers: { "Prefer": "return=minimal" },
    body: { sync_at: new Date().toISOString() },
    maxBytes: 2048
  }).catch(() => null);

  return { ok: true, provider: account.provider, inserted: inserted.length, ids: inserted };
}
