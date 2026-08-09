import { requestExternal } from "../utils/external-request.js";
import { httpError } from "../middleware/errors.js";
import { sendMailViaResend, getUserIdByAlias, storeMailMessage, getOrCreatePrimaryAlias, resolveAliasByEmail } from "../services/mail-client.js";

function safeText(value, limit = 320) {
  const raw = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return raw.slice(0, limit);
}

function safeEmail(value) {
  const email = safeText(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function isServiceConfigured(env) {
  return Boolean(env.RESEND_API_KEY && (env.RESEND_FROM || env.SMTP_FROM));
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

export async function mailSendRoute(request, env, context) {
  if (request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);
  if (!isServiceConfigured(env)) {
    return { ok: false, status: "failed", message: "Service d'e-mail non configuré." };
  }

  const auth = context?.user;
  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const body = await request.json().catch(() => ({}));
  const to = Array.isArray(body.to) ? body.to.map(safeEmail).filter(Boolean) : [safeEmail(body.to)].filter(Boolean);
  const subject = safeText(body.subject, 998);
  const text = safeText(body.text, 10000);
  const html = safeText(body.html, 50000);
  const replyTo = safeEmail(body.reply_to || body.replyTo);

  if (!to.length) throw httpError("INVALID_PARAMETER", 400, { detail: "to" });
  if (!subject && !text && !html) throw httpError("INVALID_PARAMETER", 400, { detail: "subject or body" });

  const alias = await getOrCreatePrimaryAlias(env, auth.userId, auth.displayName || auth.email);
  if (!alias) throw httpError("SERVICE_ERROR", 500, { detail: "alias" });

  const fromName = safeText(body.from_name, 80) || alias.display_name || "ETHONE";
  const from = `${fromName} <${alias.alias}>`;

  const result = await sendMailViaResend(env, { from, to, subject, text, html, replyTo });

  await storeMailMessage(env, {
    user_id: auth.userId,
    alias_id: alias.id,
    direction: "outbound",
    from_address: alias.alias,
    from_name: fromName,
    to_addresses: to,
    subject,
    body_text: text,
    body_html: html,
    sent_at: new Date().toISOString(),
    received_at: new Date().toISOString()
  }).catch(() => null);

  return { data: { sent: true, id: result?.data?.id, from: alias.alias, to } };
}

export async function mailInboxRoute(request, env, context) {
  if (request.method !== "GET") throw httpError("METHOD_NOT_ALLOWED", 405);
  const auth = context?.user;
  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const origin = projectOrigin(env);
  if (!origin) throw httpError("SERVICE_ERROR", 500);

  const direction = request.url.searchParams.get("direction") || "inbound";
  const limit = Math.min(100, Math.max(1, Number(request.url.searchParams.get("limit")) || 50));
  const offset = Math.max(0, Number(request.url.searchParams.get("offset")) || 0);

  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_messages?user_id=eq.${auth.userId}&direction=eq.${direction}&order=received_at.desc&limit=${limit}&offset=${offset}`, {
    method: "GET",
    maxBytes: 65536
  });

  return { data: Array.isArray(response.data) ? response.data : [] };
}

export async function mailThreadRoute(request, env, context) {
  if (request.method !== "GET") throw httpError("METHOD_NOT_ALLOWED", 405);
  const auth = context?.user;
  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const threadId = request.url.searchParams.get("thread_id");
  if (!threadId) throw httpError("INVALID_PARAMETER", 400, { detail: "thread_id" });

  const origin = projectOrigin(env);
  if (!origin) throw httpError("SERVICE_ERROR", 500);

  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_messages?user_id=eq.${auth.userId}&thread_id=eq.${threadId}&order=received_at.desc`, {
    method: "GET",
    maxBytes: 65536
  });

  return { data: Array.isArray(response.data) ? response.data : [] };
}

export async function mailReadRoute(request, env, context) {
  if (request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);
  const auth = context?.user;
  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const body = await request.json().catch(() => ({}));
  const id = safeText(body.id, 64);
  const isRead = body.is_read === true;
  if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });

  await supabaseRequest(env, `/rest/v1/ethone_mail_messages?id=eq.${id}&user_id=eq.${auth.userId}`, {
    method: "PATCH",
    headers: { "Prefer": "return=minimal" },
    body: { is_read: isRead },
    maxBytes: 2048
  });

  return { data: { updated: true } };
}

export async function mailAliasRoute(request, env, context) {
  if (request.method !== "GET" && request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);
  const auth = context?.user;
  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const origin = projectOrigin(env);
  if (!origin) throw httpError("SERVICE_ERROR", 500);

  if (request.method === "GET") {
    const response = await supabaseRequest(env, `/rest/v1/ethone_mail_aliases?user_id=eq.${auth.userId}&order=created_at.desc`, {
      method: "GET",
      maxBytes: 8192
    });
    return { data: Array.isArray(response.data) ? response.data : [] };
  }

  const body = await request.json().catch(() => ({}));
  const displayName = safeText(body.display_name || body.displayName, 80);
  const alias = await getOrCreatePrimaryAlias(env, auth.userId, displayName || auth.displayName || auth.email);
  return { data: alias };
}

export async function mailReceiveHandler(message, env, context) {
  const to = message.to || "";
  const from = message.from || "";
  const subject = message.headers.get("subject") || "";
  const replyTo = message.headers.get("reply-to") || null;

  if (!to || !from) return null;

  const userId = await getUserIdByAlias(env, to);
  if (!userId) {
    // Unknown recipient: bounce or drop silently.
    return null;
  }

  const alias = await resolveAliasByEmail(env, to);

  const text = await message.text().catch(() => "");
  const html = await message.html().catch(() => "");

  await storeMailMessage(env, {
    user_id: userId,
    alias_id: alias?.id || null,
    direction: "inbound",
    from_address: from,
    from_name: message.headers.get("from")?.replace(/<[^>]+>/, "").trim() || from,
    to_addresses: [to],
    cc_addresses: message.headers.get("cc")?.split(",").map((e) => e.trim()).filter(Boolean) || [],
    bcc_addresses: message.headers.get("bcc")?.split(",").map((e) => e.trim()).filter(Boolean) || [],
    reply_to: replyTo,
    subject,
    body_text: text,
    body_html: html,
    headers: Object.fromEntries(message.headers.entries()),
    received_at: new Date().toISOString()
  });

  return null;
}


