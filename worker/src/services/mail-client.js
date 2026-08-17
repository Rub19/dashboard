import { requestExternal } from "../utils/external-request.js";

function safeText(value, limit = 320) {
  const raw = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return raw.slice(0, limit);
}

function randomBase(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const webCrypto = typeof globalThis !== "undefined" && globalThis.crypto ? globalThis.crypto : crypto;
  const bytes = webCrypto.getRandomValues(new Uint8Array(length));
  let result = "";
  for (let i = 0; i < length; i += 1) result += chars[bytes[i] % chars.length];
  return result;
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

function firstRow(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

export function resolveAliasByEmail(env, email) {
  const origin = projectOrigin(env);
  if (!origin || !email) return Promise.resolve(null);
  const safe = safeEmail(email);
  if (!safe) return Promise.resolve(null);
  return supabaseRequest(env, `/rest/v1/ethone_mail_aliases?alias=eq.${encodeURIComponent(safe)}&limit=1`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 4096
  }).then(firstRow);
}

export function getOrCreatePrimaryAlias(env, userId, displayName) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return Promise.resolve(null);

  return supabaseRequest(env, `/rest/v1/ethone_mail_aliases?user_id=eq.${userId}&is_primary=eq.true`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 4096
  }).then(firstRow).then(async (existing) => {
    if (existing) return existing;

    let base = safeText(displayName, 32)
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .replace(/[._-]+/g, ".")
      .replace(/^\.|\.$/g, "")
      .slice(0, 32);
    if (!base) base = "user";
    if (!/^[a-z0-9]/.test(base)) base = `u${base}`;
    if (!base) base = "user";

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const suffix = attempt > 0 ? `.${randomBase(4)}` : "";
      const local = `${base.slice(0, Math.max(1, 32 - suffix.length))}${suffix}`;
      const alias = `${local}@ethone.dev`;

      const taken = await resolveAliasByEmail(env, alias);
      if (!taken) {
        return supabaseRequest(env, "/rest/v1/ethone_mail_aliases", {
          method: "POST",
          headers: { "Prefer": "return=representation" },
          body: { user_id: userId, alias, display_name: safeText(displayName, 80), is_primary: true },
          maxBytes: 4096
        }).then(firstRow);
      }
    }

    return null;
  });
}

export function getUserIdByAlias(env, alias) {
  return resolveAliasByEmail(env, alias).then((row) => row?.user_id || null);
}

export async function createAlias(env, userId, alias, displayName) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return null;

  const safeAlias = safeEmail(alias);
  if (!safeAlias || !safeAlias.endsWith("@ethone.dev")) return null;

  const existing = await resolveAliasByEmail(env, safeAlias);
  if (existing) return null;

  const hasPrimary = await supabaseRequest(env, `/rest/v1/ethone_mail_aliases?user_id=eq.${userId}&is_primary=eq.true&select=id`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 4096
  }).then(firstRow);

  return supabaseRequest(env, "/rest/v1/ethone_mail_aliases", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: { user_id: userId, alias: safeAlias, display_name: safeText(displayName, 80), is_primary: !hasPrimary },
    maxBytes: 4096
  }).then(firstRow);
}

export async function createRandomAlias(env, userId, displayName) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return null;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const local = `u-${randomBase(8)}`;
    const alias = `${local}@ethone.dev`;
    const existing = await resolveAliasByEmail(env, alias);
    if (!existing) {
      const hasPrimary = await supabaseRequest(env, `/rest/v1/ethone_mail_aliases?user_id=eq.${userId}&is_primary=eq.true&select=id`, {
        method: "GET",
        headers: { "Accept": "application/vnd.pgrst.object+json" },
        maxBytes: 4096
      }).then(firstRow);

      const created = await supabaseRequest(env, "/rest/v1/ethone_mail_aliases", {
        method: "POST",
        headers: { "Prefer": "return=representation" },
        body: { user_id: userId, alias, display_name: safeText(displayName, 80), is_primary: !hasPrimary },
        maxBytes: 4096
      }).then(firstRow);
      if (created) return created;
    }
  }

  return null;
}

export function storeMailMessage(env, message) {
  const origin = projectOrigin(env);
  if (!origin) return Promise.resolve(null);
  return supabaseRequest(env, "/rest/v1/ethone_mail_messages?select=id", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: message,
    maxBytes: 8192
  });
}

export function updateMailMessage(env, messageId, userId, patch) {
  const origin = projectOrigin(env);
  if (!origin || !messageId || !userId) return Promise.resolve(null);
  return supabaseRequest(env, `/rest/v1/ethone_mail_messages?id=eq.${messageId}&user_id=eq.${userId}`, {
    method: "PATCH",
    headers: { "Prefer": "return=minimal" },
    body: patch,
    maxBytes: 4096
  });
}

export function resolveThreadForMessage(env, userId, { subject, fromAddress, inReplyTo, references = [] }) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return Promise.resolve(null);

  // 1. Try to match an existing thread by Message-ID references.
  const refs = [inReplyTo, ...references].filter(Boolean);
  if (refs.length) {
    return supabaseRequest(env, `/rest/v1/ethone_mail_messages?user_id=eq.${userId}&headers->>%27Message-ID%27=in.(${refs.map(encodeURIComponent).join(",")})&limit=1`, {
      method: "GET",
      headers: { "Accept": "application/vnd.pgrst.object+json" },
      maxBytes: 4096
    })
      .then(firstRow)
      .then((match) => match?.thread_id || null);
  }

  // 2. Try to match by normalized subject + participants.
  const normalizedSubject = String(subject || "")
    .replace(/^\s*(re|fwd|fw|aw|tr|transfert)\s*[:;]\s*/i, "")
    .trim();
  if (!normalizedSubject) return Promise.resolve(null);

  return supabaseRequest(env, `/rest/v1/ethone_mail_threads?user_id=eq.${userId}&subject=eq.${encodeURIComponent(normalizedSubject)}&limit=1`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 4096
  }).then(firstRow).then((thread) => thread?.id || null);
}

export async function createOrUpdateThread(env, userId, message) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return null;

  const normalizedSubject = String(message.subject || "")
    .replace(/^\s*(re|fwd|fw|aw|tr|transfert)\s*[:;]\s*/i, "")
    .trim();
  if (!normalizedSubject) return null;

  const participants = new Set([
    message.from_address,
    ...(Array.isArray(message.to_addresses) ? message.to_addresses : [message.to_addresses]),
    ...(Array.isArray(message.cc_addresses) ? message.cc_addresses : [message.cc_addresses])
  ].map((e) => safeEmail(e)).filter(Boolean));

  // Try to find an existing thread.
  const existing = await resolveThreadForMessage(env, userId, {
    subject: normalizedSubject,
    fromAddress: message.from_address,
    inReplyTo: message.in_reply_to,
    references: message.references
  });

  if (existing) {
    // Update participants and counters.
    await supabaseRequest(env, `/rest/v1/ethone_mail_threads?id=eq.${existing}&user_id=eq.${userId}`, {
      method: "PATCH",
      headers: { "Prefer": "return=minimal" },
      body: {
        message_count: 1,
        last_message_at: message.received_at || new Date().toISOString(),
        participants: Array.from(participants)
      },
      maxBytes: 4096
    });
    return existing;
  }

  // Create a new thread.
  const create = await supabaseRequest(env, "/rest/v1/ethone_mail_threads", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: {
      user_id: userId,
      subject: normalizedSubject,
      participants: Array.from(participants),
      message_count: 1,
      last_message_at: message.received_at || new Date().toISOString()
    },
    maxBytes: 4096
  });
  return firstRow(create)?.id || null;
}

export function getDefaultSignature(env, userId) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return Promise.resolve(null);
  return supabaseRequest(env, `/rest/v1/ethone_mail_signatures?user_id=eq.${userId}&is_default=eq.true&limit=1`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 4096
  }).then(firstRow);
}

export function getSignatures(env, userId) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return Promise.resolve([]);
  return supabaseRequest(env, `/rest/v1/ethone_mail_signatures?user_id=eq.${userId}&order=created_at.asc`, {
    method: "GET",
    maxBytes: 8192
  }).then((res) => Array.isArray(res?.data) ? res.data : []);
}

export function getLabels(env, userId) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return Promise.resolve([]);
  return supabaseRequest(env, `/rest/v1/ethone_mail_labels?user_id=eq.${userId}&order=created_at.asc`, {
    method: "GET",
    maxBytes: 8192
  }).then((res) => Array.isArray(res?.data) ? res.data : []);
}

export function getContacts(env, userId, { limit = 50 } = {}) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return Promise.resolve([]);
  return supabaseRequest(env, `/rest/v1/ethone_mail_contacts?user_id=eq.${userId}&order=frequency.desc,last_contacted_at.desc&limit=${limit}`, {
    method: "GET",
    maxBytes: 8192
  }).then((res) => Array.isArray(res?.data) ? res.data : []);
}

export async function upsertContact(env, userId, { email, name, direction = "inbound" }) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !email) return null;
  const safe = safeEmail(email);
  if (!safe) return null;

  const existing = await supabaseRequest(env, `/rest/v1/ethone_mail_contacts?user_id=eq.${userId}&email=ilike.${encodeURIComponent(safe)}&limit=1`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 4096
  }).then(firstRow);

  const now = new Date().toISOString();
  if (existing) {
    const updatedName = name && String(name).trim() ? safeText(name, 80) : existing.name;
    await supabaseRequest(env, `/rest/v1/ethone_mail_contacts?id=eq.${existing.id}&user_id=eq.${userId}`, {
      method: "PATCH",
      headers: { "Prefer": "return=minimal" },
      body: {
        name: updatedName,
        frequency: (existing.frequency || 0) + 1,
        last_contacted_at: now
      },
      maxBytes: 2048
    });
    return existing.id;
  }

  const create = await supabaseRequest(env, "/rest/v1/ethone_mail_contacts", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: {
      user_id: userId,
      email: safe,
      name: safeText(name, 80),
      frequency: 1,
      last_contacted_at: now
    },
    maxBytes: 4096
  });
  return firstRow(create)?.id || null;
}

export function buildSearchQuery(search) {
  const raw = String(search || "").trim();
  if (!raw) return "";
  // Convert a natural query to a tsquery-ish prefix search.
  // PostgREST accepts wfts with a plain query string.
  return raw
    .replace(/[\s]+/g, " & ")
    .replace(/(\w\b)(?!\s*\|)/g, "$1:*");
}

function quoteFilterValue(value) {
  const escaped = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${encodeURIComponent(escaped)}"`;
}

function encodeIlikePattern(value, limit = 120) {
  const raw = safeText(value, limit);
  if (!raw) return "";
  const term = raw
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  return quoteFilterValue(`*${term}*`);
}

function encodeSearchQuery(search) {
  const built = buildSearchQuery(safeText(search, 120));
  if (!built) return "";
  return quoteFilterValue(built);
}

function parseIsoRange(value, endOfDay = false) {
  const raw = safeText(value, 40);
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(raw)) return null;
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    const parts = endOfDay
      ? [year, month - 1, day, 23, 59, 59, 999]
      : [year, month - 1, day, 0, 0, 0, 0];
    return new Date(Date.UTC(...parts)).toISOString();
  }
  return date.toISOString();
}

function folderDeletedFilter(folder) {
  if (folder === "trash") return "";
  return "deleted_at=is.null";
}

function buildMessageQuery(userId, filters) {
  const parts = [];
  if (filters.folder === "starred") {
    parts.push("is_starred=eq.true");
  } else if (filters.folder) {
    parts.push(`folder=eq.${encodeURIComponent(filters.folder)}`);
  }
  const deletedFilter = folderDeletedFilter(filters.folder);
  if (deletedFilter) parts.push(deletedFilter);
  parts.push(`user_id=eq.${userId}`);
  if (filters.direction) parts.push(`direction=eq.${encodeURIComponent(filters.direction)}`);
  if (filters.label) parts.push(`labels=cs.{${encodeURIComponent(filters.label)}}`);
  if (filters.labels) {
    const labels = String(filters.labels)
      .split(",")
      .map((l) => encodeURIComponent(l.trim()))
      .filter(Boolean);
    if (labels.length) parts.push(`labels=cs.{${labels.join(",")}}`);
  }
  if (filters.search) {
    const q = encodeSearchQuery(filters.search);
    if (q) parts.push(`search_vector=wfts.${q}`);
  }
  if (filters.from) {
    const pattern = encodeIlikePattern(filters.from);
    if (pattern) parts.push(`or=(from_address.ilike.${pattern},from_name.ilike.${pattern})`);
  }
  if (filters.subject) {
    const pattern = encodeIlikePattern(filters.subject);
    if (pattern) parts.push(`subject=ilike.${pattern}`);
  }
  if (filters.body) {
    const pattern = encodeIlikePattern(filters.body, 2000);
    if (pattern) parts.push(`body_text=ilike.${pattern}`);
  }
  const dateFrom = parseIsoRange(filters.dateFrom, false);
  const dateTo = parseIsoRange(filters.dateTo, true);
  if (dateFrom) parts.push(`received_at=gte.${encodeURIComponent(dateFrom)}`);
  if (dateTo) parts.push(`received_at=lte.${encodeURIComponent(dateTo)}`);
  if (filters.hasAttachments === true) parts.push("attachments=neq.[]");
  if (filters.hasAttachments === false) parts.push("attachments=eq.[]");
  return parts.join("&");
}

export async function listMessages(env, userId, { folder, label, labels, search, from, subject, body, dateFrom, dateTo, hasAttachments, direction, limit = 50, offset = 0 } = {}) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return [];
  const filters = { folder, label, labels, search, from, subject, body, dateFrom, dateTo, hasAttachments, direction };
  const query = buildMessageQuery(userId, filters);
  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_messages?${query}&order=received_at.desc&limit=${limit}&offset=${offset}`, {
    method: "GET",
    maxBytes: 65536
  });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function countMessages(env, userId, filters) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return null;
  const query = buildMessageQuery(userId, filters);
  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_messages?${query}&select=count`, {
    method: "GET",
    maxBytes: 4096
  });
  const row = firstRow(response);
  return Number(row?.count) || null;
}

export async function countUnreadInFolder(env, userId, folder) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !folder) return 0;

  if (folder === "starred") {
    const response = await supabaseRequest(env, `/rest/v1/ethone_mail_messages?user_id=eq.${userId}&is_starred=eq.true&is_read=eq.false&deleted_at=is.null&select=id`, {
      method: "GET",
      maxBytes: 8192
    });
    return Array.isArray(response?.data) ? response.data.length : 0;
  }

  if (folder === "trash") return 0;

  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_messages?user_id=eq.${userId}&folder=eq.${encodeURIComponent(folder)}&is_read=eq.false&deleted_at=is.null&select=id`, {
    method: "GET",
    maxBytes: 8192
  });
  return Array.isArray(response?.data) ? response.data.length : 0;
}

export function snoozeMessage(env, messageId, userId, snoozedUntil) {
  const origin = projectOrigin(env);
  if (!origin || !messageId || !userId) return Promise.resolve(null);
  const patch = { snoozed_until: null };
  if (snoozedUntil != null) {
    const date = new Date(snoozedUntil);
    if (!Number.isFinite(date.getTime())) return Promise.resolve(null);
    patch.snoozed_until = date.toISOString();
  }
  return updateMailMessage(env, messageId, userId, patch);
}

export async function getScheduledMessages(env, userId = null) {
  const origin = projectOrigin(env);
  if (!origin) return [];
  const now = new Date().toISOString();
  let path = `/rest/v1/ethone_mail_messages?folder=eq.drafts&scheduled_at=not.is.null&scheduled_at=lte.${encodeURIComponent(now)}`;
  if (userId) path += `&user_id=eq.${userId}`;
  path += `&order=scheduled_at.asc&limit=100`;
  const response = await supabaseRequest(env, path, { method: "GET", maxBytes: 65536 });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function getMessageById(env, userId, messageId, select = "*") {
  const origin = projectOrigin(env);
  if (!origin || !userId || !messageId) return null;
  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_messages?id=eq.${messageId}&user_id=eq.${userId}&select=${encodeURIComponent(select)}&limit=1`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 65536
  });
  return firstRow(response);
}

async function sendOneScheduledMessage(env, message) {
  const now = new Date().toISOString();
  const from = message.from_name
    ? `${safeText(message.from_name, 200)} <${safeText(message.from_address, 320)}>`
    : safeText(message.from_address, 320);
  const to = Array.isArray(message.to_addresses) ? message.to_addresses : [message.to_addresses].filter(Boolean);
  const cc = Array.isArray(message.cc_addresses) ? message.cc_addresses : [message.cc_addresses].filter(Boolean);
  const bcc = Array.isArray(message.bcc_addresses) ? message.bcc_addresses : [message.bcc_addresses].filter(Boolean);
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const result = await sendMailViaResend(env, {
    from,
    to,
    cc,
    bcc,
    subject: message.subject,
    text: message.body_text,
    html: message.body_html,
    replyTo: message.reply_to || null,
    attachments,
    inReplyTo: message.in_reply_to || null,
    references: Array.isArray(message.references) ? message.references : []
  });
  const headers = typeof message.headers === "object" && message.headers ? { ...message.headers } : {};
  if (result?.data?.id) headers["Message-ID"] = `<${result.data.id}>`;
  await updateMailMessage(env, message.id, message.user_id, {
    folder: "sent",
    status: "sent",
    scheduled_at: null,
    sent_at: now,
    headers
  });
  if (message.thread_id) {
    await supabaseRequest(env, `/rest/v1/ethone_mail_threads?id=eq.${message.thread_id}&user_id=eq.${message.user_id}`, {
      method: "PATCH",
      headers: { "Prefer": "return=minimal" },
      body: { message_count: 1, last_message_at: now },
      maxBytes: 2048
    }).catch(() => null);
  }
  return result;
}

export async function sendScheduledMessages(env) {
  const messages = await getScheduledMessages(env);
  for (const message of messages) {
    await sendOneScheduledMessage(env, message).catch(() => null);
  }
}

export async function sendMailViaResend(env, { from, to, cc = [], bcc = [], subject, text, html, replyTo, attachments = [], inReplyTo, references = [] }) {
  const resendKey = env.RESEND_API_KEY;
  if (!resendKey) throw new Error("Email service not configured");
  if (!from) throw new Error("Sender address not configured");

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  const ccRecipients = Array.isArray(cc) ? cc.filter(Boolean) : [cc].filter(Boolean);
  const bccRecipients = Array.isArray(bcc) ? bcc.filter(Boolean) : [bcc].filter(Boolean);
  if (!recipients.length) throw new Error("No recipients");

  const payload = { from, to: recipients, subject, text, html };
  if (ccRecipients.length) payload.cc = ccRecipients;
  if (bccRecipients.length) payload.bcc = bccRecipients;
  if (replyTo) payload.reply_to = replyTo;
  if (attachments.length) {
    payload.attachments = attachments.map((a) => ({
      filename: safeText(a.filename, 255) || "piece-jointe",
      content: String(a.content || "").slice(0, 2 * 1024 * 1024) // cap base64 payload ~2MB
    })).filter((a) => a.content);
  }

  if (inReplyTo) {
    payload.headers = {
      "In-Reply-To": inReplyTo,
      ...(references.length ? { "References": references.join(" ") } : {})
    };
  }

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
