import { requestExternal } from "../utils/external-request.js";
import { sendMailViaResend, updateMailMessage, resolveAliasByEmail, getOrCreatePrimaryAlias, getMessageById } from "./mail-client.js";

function safeText(value, limit = 320) {
  const raw = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return raw.slice(0, limit);
}

function safeEmail(value) {
  const email = safeText(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function safeEmailList(values = []) {
  const list = Array.isArray(values) ? values : [values];
  return list.map(safeEmail).filter(Boolean);
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

function normalizeMessageId(value) {
  return String(value || "").replace(/[<>\s]/g, "").trim();
}

export async function getPendingOutbox(env, limit = 10) {
  const origin = projectOrigin(env);
  if (!origin) return [];
  const now = new Date().toISOString();
  const safeLimit = Math.min(100, Math.max(1, limit));
  const path = `/rest/v1/ethone_mail_outbox?sent_at=is.null&or=(scheduled_at.is.null,scheduled_at.lte.${encodeURIComponent(now)})&order=created_at.asc&limit=${safeLimit}`;
  const response = await supabaseRequest(env, path, { method: "GET", maxBytes: 65536 });
  return Array.isArray(response?.data) ? response.data : [];
}

export function markOutboxSent(env, id) {
  const origin = projectOrigin(env);
  if (!origin || !id) return Promise.resolve(false);
  return supabaseRequest(env, `/rest/v1/ethone_mail_outbox?id=eq.${id}`, {
    method: "PATCH",
    headers: { "Prefer": "return=minimal" },
    body: { sent_at: new Date().toISOString() },
    maxBytes: 2048
  }).then(() => true).catch(() => false);
}

export function createAutoReplyOutbox(env, userId, messageId, replyText) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !messageId || !replyText) return Promise.resolve(null);
  return supabaseRequest(env, "/rest/v1/ethone_mail_outbox", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: {
      user_id: userId,
      message_id: messageId,
      kind: "auto_reply",
      payload: { original_message_id: messageId, reply_text: safeText(replyText, 2000) },
      scheduled_at: null
    },
    maxBytes: 4096
  });
}

async function sendScheduledOutbox(env, row) {
  const payload = row.payload || {};
  await sendMailViaResend(env, {
    from: payload.from,
    to: Array.isArray(payload.to) ? payload.to : [payload.to].filter(Boolean),
    cc: Array.isArray(payload.cc) ? payload.cc : [],
    bcc: Array.isArray(payload.bcc) ? payload.bcc : [],
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    replyTo: payload.replyTo || null,
    attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
    inReplyTo: payload.inReplyTo || null,
    references: Array.isArray(payload.references) ? payload.references : []
  });
  await markOutboxSent(env, row.id);
  if (row.message_id && row.user_id) {
    await updateMailMessage(env, row.message_id, row.user_id, {
      folder: "sent",
      status: "sent",
      scheduled_at: null,
      sent_at: new Date().toISOString()
    }).catch(() => null);
  }
}

async function sendAutoReplyOutbox(env, row) {
  const original = await getMessageById(
    env,
    row.user_id,
    row.message_id,
    "id,from_address,from_name,to_addresses,subject,headers,auto_reply_sent"
  );
  if (!original) return;
  if (original.auto_reply_sent) {
    await markOutboxSent(env, row.id);
    return;
  }

  const toEmail = safeEmail(Array.isArray(original.to_addresses) ? original.to_addresses[0] : original.to_addresses);
  let alias = null;
  if (toEmail) {
    alias = await resolveAliasByEmail(env, toEmail).catch(() => null);
  }
  if (!alias) {
    alias = await getOrCreatePrimaryAlias(env, row.user_id, "").catch(() => null);
  }
  if (!alias) return;

  const from = `${alias.display_name || "ETHONE"} <${alias.alias}>`;
  const to = safeEmailList([original.from_address]);
  if (!to.length) return;

  const originalSubject = safeText(original.subject, 998);
  const subject = /^re:\s*/i.test(originalSubject) ? originalSubject : (originalSubject ? `Re: ${originalSubject}` : "Re:");

  const payload = row.payload || {};
  const replyText = safeText(payload.reply_text || (typeof payload === "string" ? payload : ""), 10000);

  const originalMessageId =
    original.headers?.["message-id"] ||
    original.headers?.["Message-ID"] ||
    original.headers?.["Message-Id"] ||
    null;
  const inReplyTo = originalMessageId ? `<${normalizeMessageId(originalMessageId)}>` : `<${original.id}@ethone.dev>`;

  const references = [inReplyTo];
  const referencesHeader = original.headers?.["references"] || original.headers?.["References"];
  if (referencesHeader) {
    for (const ref of String(referencesHeader).split(/\s+/).filter(Boolean)) {
      const clean = normalizeMessageId(ref);
      if (clean && !references.some((r) => normalizeMessageId(r) === clean)) references.push(ref);
    }
  }

  await sendMailViaResend(env, { from, to, subject, text: replyText, inReplyTo, references });
  await markOutboxSent(env, row.id);
  await updateMailMessage(env, original.id, row.user_id, { auto_reply_sent: true }).catch(() => null);
}

export async function processOutbox(env, limit = 10) {
  const rows = await getPendingOutbox(env, limit);
  for (const row of rows) {
    try {
      if (row.kind === "scheduled") {
        await sendScheduledOutbox(env, row);
      } else if (row.kind === "auto_reply") {
        await sendAutoReplyOutbox(env, row);
      }
    } catch (error) {
      if (env.ENVIRONMENT !== "production") {
        console.error("Outbox processing error:", error);
      }
    }
  }
}
