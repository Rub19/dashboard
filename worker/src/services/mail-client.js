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

export async function resolveAliasByEmail(env, email) {
  const origin = projectOrigin(env);
  if (!origin || !email) return null;
  const safe = safeEmail(email);
  if (!safe) return null;
  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_aliases?alias=eq.${encodeURIComponent(safe)}&limit=1`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 4096
  });
  return firstRow(response);
}

export async function getOrCreatePrimaryAlias(env, userId, displayName) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return null;

  const existing = await supabaseRequest(env, `/rest/v1/ethone_mail_aliases?user_id=eq.${userId}&is_primary=eq.true`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 4096
  });
  if (existing?.data) return firstRow(existing);

  const base = safeText(displayName || "user", 32)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/[._-]+/g, ".")
    .replace(/^\.|\.$/g, "")
    .slice(0, 32);
  const alias = `${base || "user"}@ethone.dev`;

  const create = await supabaseRequest(env, "/rest/v1/ethone_mail_aliases", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: { user_id: userId, alias, display_name: safeText(displayName, 80), is_primary: true },
    maxBytes: 4096
  });
  return firstRow(create);
}

export async function sendMailViaResend(env, { from, to, subject, text, html, replyTo }) {
  const resendKey = env.RESEND_API_KEY;
  if (!resendKey) throw new Error("Email service not configured");
  if (!from) throw new Error("Sender address not configured");

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!recipients.length) throw new Error("No recipients");

  const payload = { from, to: recipients, subject, text, html };
  if (replyTo) payload.reply_to = replyTo;

  return requestExternal("https://api.resend.com/emails", {
    env,
    method: "POST",
    expectedOrigin: "https://api.resend.com",
    headers: {
      authorization: `Bearer ${resendKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload),
    timeoutMs: 12000,
    maxBytes: 16384
  });
}

export async function storeMailMessage(env, message) {
  const origin = projectOrigin(env);
  if (!origin) return null;
  return supabaseRequest(env, "/rest/v1/ethone_mail_messages", {
    method: "POST",
    headers: { "Prefer": "return=minimal" },
    body: message,
    maxBytes: 8192
  });
}

export async function getUserIdByAlias(env, alias) {
  const row = await resolveAliasByEmail(env, alias);
  return row?.user_id || null;
}
