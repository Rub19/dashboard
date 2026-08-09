import { requestExternal } from "../utils/external-request.js";
import { httpError } from "../middleware/errors.js";
import {
  countMessages,
  countUnreadInFolder,
  createOrUpdateThread,
  getContacts,
  getDefaultSignature,
  getLabels,
  getOrCreatePrimaryAlias,
  getSignatures,
  getUserIdByAlias,
  listMessages,
  resolveAliasByEmail,
  sendMailViaResend,
  snoozeMessage,
  storeMailMessage,
  updateMailMessage,
  upsertContact
} from "../services/mail-client.js";
import { applyRules, createNotification, detectImportance, getRules } from "../services/mail-brain.js";

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

function allowedFolder(value) {
  const folders = new Set(["inbox", "starred", "sent", "drafts", "archive", "spam", "trash"]);
  return folders.has(value) ? value : "inbox";
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

async function requireMailAlias(env, userId, displayName) {
  const alias = await getOrCreatePrimaryAlias(env, userId, displayName);
  if (!alias) throw httpError("SERVICE_ERROR", 500, { detail: "alias" });
  return alias;
}

async function resolveThreadForOutbound(env, userId, { inReplyTo, references, subject, to, cc = [] }) {
  const refs = [inReplyTo, ...(Array.isArray(references) ? references : [references])].filter(Boolean);
  if (refs.length) {
    const match = await supabaseRequest(env, `/rest/v1/ethone_mail_messages?user_id=eq.${userId}&headers->>%27Message-ID%27=in.(${refs.map(encodeURIComponent).join(",")})&limit=1`, {
      method: "GET",
      headers: { "Accept": "application/vnd.pgrst.object+json" },
      maxBytes: 4096
    }).then(firstRow);
    if (match?.thread_id) return match.thread_id;
  }

  const normalizedSubject = String(subject || "")
    .replace(/^\s*(re|fwd|fw|aw|tr|transfert)\s*[:;]\s*/i, "")
    .trim();
  if (!normalizedSubject) return null;

  const thread = await supabaseRequest(env, `/rest/v1/ethone_mail_threads?user_id=eq.${userId}&subject=eq.${encodeURIComponent(normalizedSubject)}&limit=1`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 4096
  }).then(firstRow);
  if (thread) return thread.id;

  const participants = new Set([...to, ...cc].filter(Boolean));
  const create = await supabaseRequest(env, "/rest/v1/ethone_mail_threads", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: {
      user_id: userId,
      subject: normalizedSubject,
      participants: Array.from(participants),
      message_count: 0,
      last_message_at: new Date().toISOString()
    },
    maxBytes: 4096
  });
  return firstRow(create)?.id || null;
}

export async function mailSendRoute({ request, env, auth }) {
  if (request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);


  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const body = await request.json().catch(() => ({}));
  const to = safeEmailList(body.to);
  const cc = safeEmailList(body.cc);
  const bcc = safeEmailList(body.bcc);
  const subject = safeText(body.subject, 998);
  const text = safeText(body.text, 10000);
  const html = safeText(body.html, 50000);
  const replyTo = safeEmail(body.reply_to || body.replyTo);
  const fromName = safeText(body.from_name, 80);
  const draftId = safeText(body.draft_id, 64);
  const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 10) : [];

  if (!to.length && !cc.length && !bcc.length) throw httpError("INVALID_PARAMETER", 400, { detail: "to" });
  if (!subject && !text && !html) throw httpError("INVALID_PARAMETER", 400, { detail: "subject or body" });

  const alias = await requireMailAlias(env, auth.userId, auth.displayName || auth.email);
  const from = `${fromName || alias.display_name || "ETHONE"} <${alias.alias}>`;

  // Resolve the thread before sending.
  const inReplyTo = safeText(body.in_reply_to, 320);
  const references = Array.isArray(body.references) ? body.references.map((r) => safeText(r, 320)).filter(Boolean) : [];
  const threadId = await resolveThreadForOutbound(env, auth.userId, {
    inReplyTo, references, subject, to, cc
  });

  // Send via Resend.
  const result = await sendMailViaResend(env, {
    from,
    to,
    cc,
    bcc,
    subject,
    text,
    html,
    replyTo,
    attachments,
    inReplyTo,
    references
  });

  const now = new Date().toISOString();
  const message = {
    user_id: auth.userId,
    alias_id: alias.id,
    thread_id: threadId,
    direction: "outbound",
    folder: "sent",
    status: "sent",
    from_address: alias.alias,
    from_name: fromName || alias.display_name || "ETHONE",
    to_addresses: to,
    cc_addresses: cc,
    bcc_addresses: bcc,
    reply_to: replyTo,
    subject,
    body_text: text,
    body_html: html,
    headers: {
      "Message-ID": result?.data?.id ? `<${result.data.id}>` : null,
      "In-Reply-To": inReplyTo || null,
      "References": references.length ? references.join(" ") : null
    },
    is_read: true,
    attachments: attachments.map((a) => ({ filename: a.filename, size: a.size, mime_type: a.mime_type || "application/octet-stream" })),
    sent_at: now,
    received_at: now
  };

  // Delete the draft if it was sent.
  if (draftId) {
    await supabaseRequest(env, `/rest/v1/ethone_mail_messages?id=eq.${draftId}&user_id=eq.${auth.userId}&folder=eq.drafts`, {
      method: "DELETE",
      maxBytes: 2048
    }).catch(() => null);
  }

  await storeMailMessage(env, message);

  // Update thread counters.
  if (threadId) {
    await supabaseRequest(env, `/rest/v1/ethone_mail_threads?id=eq.${threadId}&user_id=eq.${auth.userId}`, {
      method: "PATCH",
      headers: { "Prefer": "return=minimal" },
      body: {
        message_count: 1,
        last_message_at: now
      },
      maxBytes: 2048
    }).catch(() => null);
  }

  // Upsert contacts.
  for (const email of [...to, ...cc, ...bcc]) {
    await upsertContact(env, auth.userId, { email, name: "", direction: "outbound" }).catch(() => null);
  }

  return { data: { sent: true, id: result?.data?.id, from: alias.alias, to } };
}

export async function mailInboxRoute({ request, env, auth }) {
  if (request.method !== "GET") throw httpError("METHOD_NOT_ALLOWED", 405);

  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const folder = allowedFolder(request.url.searchParams.get("folder"));
  const label = safeText(request.url.searchParams.get("label"), 40) || undefined;
  const search = safeText(request.url.searchParams.get("search"), 120) || undefined;
  const direction = request.url.searchParams.get("direction") || undefined;
  const limit = Math.min(100, Math.max(1, Number(request.url.searchParams.get("limit")) || 50));
  const offset = Math.max(0, Number(request.url.searchParams.get("offset")) || 0);

  const [messages, unread] = await Promise.all([
    listMessages(env, auth.userId, { folder, label, search, direction, limit, offset }),
    countUnreadInFolder(env, auth.userId, folder)
  ]);

  return { data: messages, meta: { folder, unread, limit, offset } };
}

export async function mailThreadRoute({ request, env, auth }) {
  if (request.method !== "GET") throw httpError("METHOD_NOT_ALLOWED", 405);

  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const threadId = safeText(request.url.searchParams.get("thread_id"), 64);
  if (!threadId) throw httpError("INVALID_PARAMETER", 400, { detail: "thread_id" });

  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_messages?user_id=eq.${auth.userId}&thread_id=eq.${threadId}&deleted_at=is.null&order=received_at.asc`, {
    method: "GET",
    maxBytes: 65536
  });

  return { data: Array.isArray(response.data) ? response.data : [] };
}

export async function mailReadRoute({ request, env, auth }) {
  if (request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);

  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const body = await request.json().catch(() => ({}));
  const id = safeText(body.id, 64);
  if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });

  const patch = {};
  if (typeof body.is_read === "boolean") patch.is_read = body.is_read;
  if (typeof body.is_starred === "boolean") patch.is_starred = body.is_starred;
  if (typeof body.is_important === "boolean") patch.is_important = body.is_important;

  if (!Object.keys(patch).length) throw httpError("INVALID_PARAMETER", 400, { detail: "flags" });

  await updateMailMessage(env, id, auth.userId, patch);
  return { data: { updated: true } };
}

export async function mailMoveRoute({ request, env, auth }) {
  if (request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);

  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.map((id) => safeText(id, 64)).filter(Boolean) : [];
  const folder = allowedFolder(body.folder);
  if (!ids.length) throw httpError("INVALID_PARAMETER", 400, { detail: "ids" });

  const patch = { folder };
  if (folder === "trash") patch.deleted_at = new Date().toISOString();
  if (folder === "inbox" || folder === "archive" || folder === "spam") patch.deleted_at = null;
  if (folder === "spam") patch.is_spam = true;

  for (const id of ids) {
    await updateMailMessage(env, id, auth.userId, patch).catch(() => null);
  }

  return { data: { moved: ids.length } };
}

export async function mailLabelsRoute({ request, env, auth }) {
  if (request.method !== "GET" && request.method !== "POST" && request.method !== "PATCH" && request.method !== "DELETE") {
    throw httpError("METHOD_NOT_ALLOWED", 405);
  }

  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  if (request.method === "GET") {
    const labels = await getLabels(env, auth.userId);
    return { data: labels };
  }

  if (request.method === "DELETE") {
    const body = await request.json().catch(() => ({}));
    const labelId = safeText(body.id, 64);
    if (!labelId) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });
    await supabaseRequest(env, `/rest/v1/ethone_mail_labels?id=eq.${labelId}&user_id=eq.${auth.userId}`, { method: "DELETE", maxBytes: 2048 });
    return { data: { deleted: true } };
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const name = safeText(body.name, 40);
    if (!name) throw httpError("INVALID_PARAMETER", 400, { detail: "name" });
    const create = await supabaseRequest(env, "/rest/v1/ethone_mail_labels", {
      method: "POST",
      headers: { "Prefer": "return=representation" },
      body: {
        user_id: auth.userId,
        name,
        color: safeText(body.color, 7) || "#7dd3fc"
      },
      maxBytes: 4096
    });
    return { data: firstRow(create) };
  }

  // PATCH: assign/remove label from messages.
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.map((id) => safeText(id, 64)).filter(Boolean) : [];
  const label = safeText(body.label, 40);
  const remove = body.remove === true;
  if (!ids.length || !label) throw httpError("INVALID_PARAMETER", 400, { detail: "ids or label" });

  for (const id of ids) {
    const current = await supabaseRequest(env, `/rest/v1/ethone_mail_messages?id=eq.${id}&user_id=eq.${auth.userId}&select=labels`, {
      method: "GET",
      headers: { "Accept": "application/vnd.pgrst.object+json" },
      maxBytes: 2048
    }).then(firstRow);
    const labels = new Set(Array.isArray(current?.labels) ? current.labels : []);
    if (remove) labels.delete(label);
    else labels.add(label);
    await updateMailMessage(env, id, auth.userId, { labels: Array.from(labels) }).catch(() => null);
  }

  return { data: { updated: ids.length } };
}

export async function mailDraftsRoute({ request, env, auth }) {
  if (request.method !== "GET" && request.method !== "POST" && request.method !== "DELETE") {
    throw httpError("METHOD_NOT_ALLOWED", 405);
  }

  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  if (request.method === "GET") {
    const limit = Math.min(100, Math.max(1, Number(request.url.searchParams.get("limit")) || 50));
    const offset = Math.max(0, Number(request.url.searchParams.get("offset")) || 0);
    const messages = await listMessages(env, auth.userId, { folder: "drafts", limit, offset });
    return { data: messages };
  }

  if (request.method === "DELETE") {
    const body = await request.json().catch(() => ({}));
    const id = safeText(body.id, 64);
    if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });
    await supabaseRequest(env, `/rest/v1/ethone_mail_messages?id=eq.${id}&user_id=eq.${auth.userId}&folder=eq.drafts`, { method: "DELETE", maxBytes: 2048 });
    return { data: { deleted: true } };
  }

  // POST: save or update a draft.
  const body = await request.json().catch(() => ({}));
  const id = safeText(body.id, 64);
  const to = safeEmailList(body.to);
  const cc = safeEmailList(body.cc);
  const bcc = safeEmailList(body.bcc);
  const subject = safeText(body.subject, 998);
  const text = safeText(body.text, 10000);
  const html = safeText(body.html, 50000);

  const alias = await requireMailAlias(env, auth.userId, auth.displayName || auth.email);

  if (id) {
    const existing = await supabaseRequest(env, `/rest/v1/ethone_mail_messages?id=eq.${id}&user_id=eq.${auth.userId}&folder=eq.drafts&limit=1`, {
      method: "GET",
      headers: { "Accept": "application/vnd.pgrst.object+json" },
      maxBytes: 4096
    }).then(firstRow);
    if (!existing) throw httpError("NOT_FOUND", 404);

    const patch = {
      to_addresses: to,
      cc_addresses: cc,
      bcc_addresses: bcc,
      subject,
      body_text: text,
      body_html: html,
      updated_at: new Date().toISOString()
    };
    await updateMailMessage(env, id, auth.userId, patch);
    return { data: { id, saved: true } };
  }

  const now = new Date().toISOString();
  const create = await supabaseRequest(env, "/rest/v1/ethone_mail_messages", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: {
      user_id: auth.userId,
      alias_id: alias.id,
      direction: "outbound",
      folder: "drafts",
      status: "draft",
      from_address: alias.alias,
      from_name: alias.display_name || "ETHONE",
      to_addresses: to,
      cc_addresses: cc,
      bcc_addresses: bcc,
      subject,
      body_text: text,
      body_html: html,
      is_read: true,
      received_at: now,
      created_at: now
    },
    maxBytes: 8192
  });
  return { data: { id: firstRow(create)?.id, saved: true } };
}

export async function mailSearchRoute({ request, env, auth }) {
  if (request.method !== "GET") throw httpError("METHOD_NOT_ALLOWED", 405);

  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const q = safeText(request.url.searchParams.get("q"), 120) || undefined;
  const from = safeText(request.url.searchParams.get("from"), 120) || undefined;
  const subject = safeText(request.url.searchParams.get("subject"), 120) || undefined;
  const body = safeText(request.url.searchParams.get("body"), 200) || undefined;
  const dateFrom = safeText(request.url.searchParams.get("date_from"), 40) || undefined;
  const dateTo = safeText(request.url.searchParams.get("date_to"), 40) || undefined;
  const hasAttachmentsRaw = request.url.searchParams.get("has_attachments");
  const hasAttachments = hasAttachmentsRaw === "true" ? true : hasAttachmentsRaw === "false" ? false : undefined;
  const labels = safeText(request.url.searchParams.get("labels"), 200) || undefined;
  const folderParam = request.url.searchParams.get("folder");
  const folder = folderParam ? allowedFolder(folderParam) : undefined;
  const label = safeText(request.url.searchParams.get("label"), 40) || undefined;
  const direction = request.url.searchParams.get("direction") || undefined;
  const limit = Math.min(100, Math.max(1, Number(request.url.searchParams.get("limit")) || 50));
  const offset = Math.max(0, Number(request.url.searchParams.get("offset")) || 0);

  const filters = {
    folder,
    label,
    labels,
    search: q,
    from,
    subject,
    body,
    dateFrom,
    dateTo,
    hasAttachments,
    direction
  };

  const [messages, total] = await Promise.all([
    listMessages(env, auth.userId, { ...filters, limit, offset }),
    countMessages(env, auth.userId, filters)
  ]);

  return {
    data: messages,
    meta: {
      q,
      from,
      subject,
      body,
      date_from: dateFrom,
      date_to: dateTo,
      has_attachments: hasAttachments,
      labels,
      folder,
      label,
      direction,
      limit,
      offset,
      total
    }
  };
}

export async function mailContactsRoute({ request, env, auth }) {
  if (request.method !== "GET") throw httpError("METHOD_NOT_ALLOWED", 405);

  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const limit = Math.min(200, Math.max(1, Number(request.url.searchParams.get("limit")) || 50));
  const contacts = await getContacts(env, auth.userId, { limit });
  return { data: contacts };
}

export async function mailSignaturesRoute({ request, env, auth }) {
  if (request.method !== "GET" && request.method !== "POST" && request.method !== "PATCH" && request.method !== "DELETE") {
    throw httpError("METHOD_NOT_ALLOWED", 405);
  }

  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  if (request.method === "GET") {
    const signatures = await getSignatures(env, auth.userId);
    return { data: signatures };
  }

  if (request.method === "DELETE") {
    const body = await request.json().catch(() => ({}));
    const id = safeText(body.id, 64);
    if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });
    await supabaseRequest(env, `/rest/v1/ethone_mail_signatures?id=eq.${id}&user_id=eq.${auth.userId}`, { method: "DELETE", maxBytes: 2048 });
    return { data: { deleted: true } };
  }

  const body = await request.json().catch(() => ({}));
  const name = safeText(body.name, 40);
  const content = safeText(body.content, 4000);
  if (!name) throw httpError("INVALID_PARAMETER", 400, { detail: "name" });

  const id = safeText(body.id, 64);
  if (id) {
    await supabaseRequest(env, `/rest/v1/ethone_mail_signatures?id=eq.${id}&user_id=eq.${auth.userId}`, {
      method: "PATCH",
      headers: { "Prefer": "return=minimal" },
      body: { name, content },
      maxBytes: 4096
    });
    if (body.is_default === true) {
      await supabaseRequest(env, `/rest/v1/ethone_mail_signatures?user_id=eq.${auth.userId}&id=neq.${id}&is_default=eq.true`, {
        method: "PATCH",
        headers: { "Prefer": "return=minimal" },
        body: { is_default: false },
        maxBytes: 2048
      }).catch(() => null);
      await supabaseRequest(env, `/rest/v1/ethone_mail_signatures?id=eq.${id}&user_id=eq.${auth.userId}`, {
        method: "PATCH",
        headers: { "Prefer": "return=minimal" },
        body: { is_default: true },
        maxBytes: 2048
      });
    }
    return { data: { id, updated: true } };
  }

  const create = await supabaseRequest(env, "/rest/v1/ethone_mail_signatures", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: {
      user_id: auth.userId,
      name,
      content,
      is_default: body.is_default === true
    },
    maxBytes: 4096
  });
  return { data: firstRow(create) };
}

export async function mailAliasRoute({ request, env, auth }) {
  if (request.method !== "GET" && request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);

  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

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
  const messageId = message.headers.get("message-id") || null;
  const inReplyTo = message.headers.get("in-reply-to") || null;
  const referencesHeader = message.headers.get("references") || "";

  if (!to || !from) return null;

  const userId = await getUserIdByAlias(env, to);
  if (!userId) return null;

  const alias = await resolveAliasByEmail(env, to);

  const text = await message.text().catch(() => "");
  const html = await message.html().catch(() => "");

  const references = referencesHeader
    .split(/\s+/)
    .map((r) => r.trim())
    .filter(Boolean);

  const threadId = await createOrUpdateThread(env, userId, {
    subject,
    fromAddress: from,
    inReplyTo,
    references,
    received_at: new Date().toISOString(),
    to: [to]
  });

  const now = new Date().toISOString();
  const fromName = message.headers.get("from")?.replace(/<[^>]+>/, "").trim() || from;
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];

  const dbMessage = {
    user_id: userId,
    alias_id: alias?.id || null,
    thread_id: threadId,
    direction: "inbound",
    folder: "inbox",
    status: "received",
    from_address: from,
    from_name: fromName,
    to_addresses: [to],
    cc_addresses: message.headers.get("cc")?.split(",").map((e) => e.trim()).filter(Boolean) || [],
    bcc_addresses: message.headers.get("bcc")?.split(",").map((e) => e.trim()).filter(Boolean) || [],
    reply_to: replyTo,
    subject,
    body_text: text,
    body_html: html,
    headers: Object.fromEntries(message.headers.entries()),
    raw_size: message.rawSize || 0,
    is_read: false,
    is_important: false,
    is_spam: false,
    labels: [],
    attachments,
    received_at: now,
    created_at: now
  };

  const stored = await storeMailMessage(env, dbMessage);
  const saved = firstRow(stored);
  if (!saved?.id) return null;

  const brainMessage = { ...dbMessage, id: saved.id, in_reply_to: inReplyTo || null };
  const rules = await getRules(env, userId);
  const { ruleIds, message: processed } = await applyRules(env, userId, brainMessage, rules);
  await detectImportance(env, userId, processed);

  const patch = {
    folder: processed.folder,
    is_read: processed.is_read,
    is_important: processed.is_important,
    is_spam: processed.is_spam,
    auto_reply_sent: processed.auto_reply_sent === true,
    labels: Array.isArray(processed.labels) ? processed.labels : []
  };
  await updateMailMessage(env, saved.id, userId, patch).catch(() => null);

  await createNotification(env, userId, processed, ruleIds[0] || null).catch(() => null);
  await upsertContact(env, userId, { email: from, name: fromName, direction: "inbound" }).catch(() => null);

  return saved;
}

export async function mailSnoozeRoute({ request, env, auth }) {
  if (request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);

  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const body = await request.json().catch(() => ({}));
  const id = safeText(body.id, 64);
  if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });

  if (body.snoozed_until === undefined) throw httpError("INVALID_PARAMETER", 400, { detail: "snoozed_until" });
  const snoozedUntil = body.snoozed_until === null ? null : new Date(body.snoozed_until);
  if (body.snoozed_until !== null && !Number.isFinite(snoozedUntil.getTime())) {
    throw httpError("INVALID_PARAMETER", 400, { detail: "snoozed_until" });
  }

  await snoozeMessage(env, id, auth.userId, snoozedUntil);
  return { data: { snoozed: true } };
}

export async function mailBulkActionRoute({ request, env, auth }) {
  if (request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);

  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.map((id) => safeText(id, 64)).filter(Boolean) : [];
  if (!ids.length) throw httpError("INVALID_PARAMETER", 400, { detail: "ids" });

  const action = safeText(body.action, 40)?.toLowerCase();
  const target = safeText(body.target, 40);
  if (!action) throw httpError("INVALID_PARAMETER", 400, { detail: "action" });

  const allowedActions = new Set(["move", "delete", "read", "unread", "star", "unstar", "important", "unimportant", "label", "unlabel"]);
  if (!allowedActions.has(action)) throw httpError("INVALID_PARAMETER", 400, { detail: "action" });

  for (const id of ids) {
    if (action === "move") {
      const folder = allowedFolder(target);
      const patch = { folder, is_spam: folder === "spam" };
      if (folder === "trash") patch.deleted_at = new Date().toISOString();
      else if (["inbox", "archive", "spam"].includes(folder)) patch.deleted_at = null;
      await updateMailMessage(env, id, auth.userId, patch).catch(() => null);
    } else if (action === "delete") {
      await updateMailMessage(env, id, auth.userId, { folder: "trash", deleted_at: new Date().toISOString() }).catch(() => null);
    } else if (action === "read" || action === "unread") {
      await updateMailMessage(env, id, auth.userId, { is_read: action === "read" }).catch(() => null);
    } else if (action === "star" || action === "unstar") {
      await updateMailMessage(env, id, auth.userId, { is_starred: action === "star" }).catch(() => null);
    } else if (action === "important" || action === "unimportant") {
      await updateMailMessage(env, id, auth.userId, { is_important: action === "important" }).catch(() => null);
    } else if (action === "label" || action === "unlabel") {
      if (!target) continue;
      const current = await supabaseRequest(env, `/rest/v1/ethone_mail_messages?id=eq.${id}&user_id=eq.${auth.userId}&select=labels`, {
        method: "GET",
        headers: { "Accept": "application/vnd.pgrst.object+json" },
        maxBytes: 2048
      }).then(firstRow).catch(() => null);
      const labels = new Set(Array.isArray(current?.labels) ? current.labels : []);
      if (action === "label") labels.add(target);
      else labels.delete(target);
      await updateMailMessage(env, id, auth.userId, { labels: Array.from(labels) }).catch(() => null);
    }
  }

  return { data: { updated: ids.length } };
}

export async function mailScheduleRoute({ request, env, auth }) {
  if (request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);

  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const body = await request.json().catch(() => ({}));
  const to = safeEmailList(body.to);
  const cc = safeEmailList(body.cc);
  const bcc = safeEmailList(body.bcc);
  const subject = safeText(body.subject, 998);
  const text = safeText(body.text, 10000);
  const html = safeText(body.html, 50000);
  const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 10) : [];

  if (!to.length && !cc.length && !bcc.length) throw httpError("INVALID_PARAMETER", 400, { detail: "to" });
  if (!subject && !text && !html) throw httpError("INVALID_PARAMETER", 400, { detail: "subject or body" });
  if (!body.scheduled_at) throw httpError("INVALID_PARAMETER", 400, { detail: "scheduled_at" });

  const scheduledAt = new Date(body.scheduled_at);
  if (!Number.isFinite(scheduledAt.getTime())) throw httpError("INVALID_PARAMETER", 400, { detail: "scheduled_at" });
  if (scheduledAt <= new Date()) throw httpError("INVALID_PARAMETER", 400, { detail: "scheduled_at" });

  const alias = await getOrCreatePrimaryAlias(env, auth.userId, auth.displayName || auth.email);
  if (!alias) throw httpError("SERVICE_ERROR", 500, { detail: "alias" });

  const now = new Date().toISOString();
  const create = await supabaseRequest(env, "/rest/v1/ethone_mail_messages?select=id", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: {
      user_id: auth.userId,
      alias_id: alias.id,
      direction: "outbound",
      folder: "drafts",
      status: "scheduled",
      from_address: alias.alias,
      from_name: alias.display_name || "ETHONE",
      to_addresses: to,
      cc_addresses: cc,
      bcc_addresses: bcc,
      subject,
      body_text: text,
      body_html: html,
      is_read: true,
      attachments: attachments.map((a) => ({
        filename: safeText(a.filename, 255),
        mime_type: safeText(a.mime_type, 120) || "application/octet-stream",
        size: Number(a.size) || 0,
        content: String(a.content || "").slice(0, 2 * 1024 * 1024)
      })),
      scheduled_at: scheduledAt.toISOString(),
      received_at: now,
      created_at: now
    },
    maxBytes: 8192
  });

  return { data: { scheduled: true, id: firstRow(create)?.id } };
}
