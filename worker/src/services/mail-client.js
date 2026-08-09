import { requestExternal } from "../utils/external-request.js";

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
  }).then(firstRow).then((existing) => {
    if (existing) return existing;

    const base = safeText(displayName || "user", 32)
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .replace(/[._-]+/g, ".")
      .replace(/^\.|\.$/g, "")
      .slice(0, 32);
    const alias = `${base || "user"}@ethone.dev`;

    return supabaseRequest(env, "/rest/v1/ethone_mail_aliases", {
      method: "POST",
      headers: { "Prefer": "return=representation" },
      body: { user_id: userId, alias, display_name: safeText(displayName, 80), is_primary: true },
      maxBytes: 4096
    }).then(firstRow);
  });
}

export function getUserIdByAlias(env, alias) {
  return resolveAliasByEmail(env, alias).then((row) => row?.user_id || null);
}

export function storeMailMessage(env, message) {
  const origin = projectOrigin(env);
  if (!origin) return Promise.resolve(null);
  return supabaseRequest(env, "/rest/v1/ethone_mail_messages", {
    method: "POST",
    headers: { "Prefer": "return=minimal" },
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

function folderQueryParams(folder) {
  const params = new URLSearchParams();
  if (!folder) return { params, deletedFilter: "deleted_at=is.null" };

  if (folder === "starred") {
    params.append("is_starred", "eq.true");
    return { params, deletedFilter: "deleted_at=is.null" };
  }

  if (folder === "trash") {
    params.append("folder", `eq.${encodeURIComponent(folder)}`);
    return { params, deletedFilter: "" };
  }

  params.append("folder", `eq.${encodeURIComponent(folder)}`);
  return { params, deletedFilter: "deleted_at=is.null" };
}

export async function listMessages(env, userId, { folder, label, search, direction, limit = 50, offset = 0 } = {}) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return [];

  const { params, deletedFilter } = folderQueryParams(folder);
  params.append("user_id", `eq.${userId}`);
  if (direction) params.append("direction", `eq.${encodeURIComponent(direction)}`);
  if (label) params.append("labels", `cs.{${encodeURIComponent(label)}}`);
  if (search) params.append("search_vector", `wfts.${encodeURIComponent(buildSearchQuery(search))}`);

  const filters = [deletedFilter].filter(Boolean).join("&");
  const separator = filters ? `&${filters}` : "";

  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_messages?${params.toString()}${separator}&order=received_at.desc&limit=${limit}&offset=${offset}`, {
    method: "GET",
    maxBytes: 65536
  });
  return Array.isArray(response?.data) ? response.data : [];
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
