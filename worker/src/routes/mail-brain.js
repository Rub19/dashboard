import { httpError } from "../middleware/errors.js";
import { requestExternal } from "../utils/external-request.js";
import {
  analyzeMessage,
  extractEntities,
  getMailMessage,
  getNotifications,
  markNotificationRead,
  suggestReplies
} from "../services/mail-brain.js";

const ALLOWED_FOLDERS = new Set(["inbox", "starred", "sent", "drafts", "archive", "spam", "trash"]);

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

function allowedFolder(value) {
  return ALLOWED_FOLDERS.has(value) ? value : "inbox";
}

function resolveContext(request, env, context) {
  if (env === undefined && context === undefined && request?.request && request?.env) {
    context = request;
    env = context.env;
    request = context.request;
  }
  return { request, env, context };
}

function getAuth(context) {
  return context?.user || context?.auth;
}

function urlFrom(ctx, request) {
  return ctx?.url || (request ? new URL(request.url) : null) || new URL("/", "http://localhost");
}

async function readJsonBody(request, maxFields = 20) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) return {};
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length > maxFields) return {};
    return body;
  } catch {
    return {};
  }
}

function buildRule(body, userId) {
  const moveTo = safeText(body.action_move_to, 20);
  return {
    user_id: userId,
    name: safeText(body.name, 80),
    is_active: body.is_active !== false,
    priority: Number(body.priority) || 0,
    condition_from: safeText(body.condition_from, 120) || null,
    condition_domain: safeText(body.condition_domain, 120) || null,
    condition_subject: safeText(body.condition_subject, 120) || null,
    condition_body: safeText(body.condition_body, 120) || null,
    condition_has_attachments: typeof body.condition_has_attachments === "boolean" ? body.condition_has_attachments : null,
    action_mark_read: body.action_mark_read === true,
    action_mark_important: body.action_mark_important === true,
    action_mark_spam: body.action_mark_spam === true,
    action_archive: body.action_archive === true,
    action_move_to: moveTo ? allowedFolder(moveTo) : null,
    action_label: safeText(body.action_label, 40) || null,
    action_forward_to: safeEmail(body.action_forward_to) || null
  };
}

function buildRulePatch(body) {
  const patch = {};
  if (body.name !== undefined) {
    const name = safeText(body.name, 80);
    if (name) patch.name = name;
  }
  if (body.is_active !== undefined) patch.is_active = body.is_active === true;
  if (body.priority !== undefined) patch.priority = Number(body.priority) || 0;
  if (body.condition_from !== undefined) patch.condition_from = safeText(body.condition_from, 120) || null;
  if (body.condition_domain !== undefined) patch.condition_domain = safeText(body.condition_domain, 120) || null;
  if (body.condition_subject !== undefined) patch.condition_subject = safeText(body.condition_subject, 120) || null;
  if (body.condition_body !== undefined) patch.condition_body = safeText(body.condition_body, 120) || null;
  if (body.condition_has_attachments !== undefined) patch.condition_has_attachments = typeof body.condition_has_attachments === "boolean" ? body.condition_has_attachments : null;
  if (body.action_mark_read !== undefined) patch.action_mark_read = body.action_mark_read === true;
  if (body.action_mark_important !== undefined) patch.action_mark_important = body.action_mark_important === true;
  if (body.action_mark_spam !== undefined) patch.action_mark_spam = body.action_mark_spam === true;
  if (body.action_archive !== undefined) patch.action_archive = body.action_archive === true;
  if (body.action_move_to !== undefined) {
    const moveTo = safeText(body.action_move_to, 20);
    patch.action_move_to = moveTo ? allowedFolder(moveTo) : null;
  }
  if (body.action_label !== undefined) patch.action_label = safeText(body.action_label, 40) || null;
  if (body.action_forward_to !== undefined) patch.action_forward_to = safeEmail(body.action_forward_to) || null;
  return patch;
}

export async function mailAnalyzeRoute(request, env, context) {
  const ctx = resolveContext(request, env, context);
  const auth = getAuth(ctx.context);
  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);
  if (ctx.request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);

  const body = await readJsonBody(ctx.request, 2);
  const id = safeText(body.id, 64);
  if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });

  const message = await getMailMessage(ctx.env, auth.userId, id);
  if (!message) throw httpError("NOT_FOUND", 404);

  const result = await analyzeMessage(ctx.env, auth.userId, message);
  return { data: result };
}

export async function mailSuggestRoute(request, env, context) {
  const ctx = resolveContext(request, env, context);
  const auth = getAuth(ctx.context);
  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);
  if (ctx.request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);

  const body = await readJsonBody(ctx.request, 2);
  const id = safeText(body.id, 64);
  if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });

  const message = await getMailMessage(ctx.env, auth.userId, id);
  if (!message) throw httpError("NOT_FOUND", 404);

  const result = await suggestReplies(ctx.env, auth.userId, message);
  return { data: result };
}

export async function mailExtractRoute(request, env, context) {
  const ctx = resolveContext(request, env, context);
  const auth = getAuth(ctx.context);
  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);
  if (ctx.request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);

  const body = await readJsonBody(ctx.request, 2);
  const id = safeText(body.id, 64);
  if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });

  const message = await getMailMessage(ctx.env, auth.userId, id);
  if (!message) throw httpError("NOT_FOUND", 404);

  const result = await extractEntities(ctx.env, auth.userId, message);
  return { data: result };
}

export async function mailRulesRoute(request, env, context) {
  const ctx = resolveContext(request, env, context);
  const auth = getAuth(ctx.context);
  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const method = ctx.request.method;
  if (!["GET", "POST", "PATCH", "DELETE"].includes(method)) {
    throw httpError("METHOD_NOT_ALLOWED", 405);
  }

  if (method === "GET") {
    const url = urlFrom(ctx.context, ctx.request);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    const response = await supabaseRequest(ctx.env, `/rest/v1/ethone_mail_rules?user_id=eq.${auth.userId}&order=priority.desc,created_at.asc&limit=${limit}&offset=${offset}`, {
      method: "GET",
      maxBytes: 8192
    });
    return { data: Array.isArray(response?.data) ? response.data : [], meta: { limit, offset } };
  }

  if (method === "DELETE") {
    const body = await readJsonBody(ctx.request, 2);
    const id = safeText(body.id, 64);
    if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });
    await supabaseRequest(ctx.env, `/rest/v1/ethone_mail_rules?id=eq.${id}&user_id=eq.${auth.userId}`, {
      method: "DELETE",
      maxBytes: 2048
    });
    return { data: { deleted: true } };
  }

  const body = await readJsonBody(ctx.request, 20);

  if (method === "POST") {
    if (!safeText(body.name, 80)) throw httpError("INVALID_PARAMETER", 400, { detail: "name" });
    const rule = buildRule(body, auth.userId);
    const response = await supabaseRequest(ctx.env, "/rest/v1/ethone_mail_rules", {
      method: "POST",
      headers: { "Prefer": "return=representation" },
      body: rule,
      maxBytes: 4096
    });
    return { data: firstRow(response) };
  }

  // PATCH
  const id = safeText(body.id, 64);
  if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });
  const patch = buildRulePatch(body);
  if (!Object.keys(patch).length) throw httpError("INVALID_PARAMETER", 400, { detail: "fields" });
  const response = await supabaseRequest(ctx.env, `/rest/v1/ethone_mail_rules?id=eq.${id}&user_id=eq.${auth.userId}`, {
    method: "PATCH",
    headers: { "Prefer": "return=representation" },
    body: patch,
    maxBytes: 4096
  });
  return { data: firstRow(response) || { id, updated: true } };
}

export async function mailNotificationsRoute(request, env, context) {
  const ctx = resolveContext(request, env, context);
  const auth = getAuth(ctx.context);
  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  if (ctx.request.method === "GET") {
    const url = urlFrom(ctx.context, ctx.request);
    const unreadOnly = url.searchParams.get("unread") === "true";
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
    const notifications = await getNotifications(ctx.env, auth.userId, { limit, unreadOnly });
    return { data: notifications, meta: { limit, unread: unreadOnly } };
  }

  if (ctx.request.method === "PATCH") {
    const body = await readJsonBody(ctx.request, 3);
    const id = safeText(body.id, 64);
    if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });
    const isRead = body.is_read !== false;
    await markNotificationRead(ctx.env, auth.userId, id, isRead);
    return { data: { updated: true } };
  }

  throw httpError("METHOD_NOT_ALLOWED", 405);
}
