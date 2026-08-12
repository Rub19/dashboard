import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeText } from "../utils/normalize.js";

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
  const secret = requireSecret(env, "SUPABASE_SECRET_KEY");
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

function normalizeActivity(row) {
  return Object.freeze({
    id: safeText(row?.id, 128),
    fileId: safeText(row?.file_id, 128),
    shareId: safeText(row?.share_id, 128),
    dropId: safeText(row?.drop_id, 128),
    eventType: safeText(row?.event_type, 32),
    details: row?.details && typeof row.details === "object" ? Object.freeze(row.details) : Object.freeze({}),
    createdAt: safeText(row?.created_at, 40)
  });
}

function normalizeEvent(event) {
  return {
    event_type: safeText(event?.eventType || event?.event_type || "activity", 32),
    details: event?.details && typeof event.details === "object" ? event.details : {},
    created_at: safeText(event?.createdAt || event?.created_at, 40),
  };
}

export async function listActivity(env, userId, { limit = 100, since = "" } = {}) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return [];
  const params = new URLSearchParams();
  params.set("user_id", `eq.${userId}`);
  if (since) params.set("created_at", `gte.${encodeURIComponent(safeText(since, 40))}`);
  params.set("order", "created_at.desc");
  params.set("limit", String(Math.max(1, Math.min(500, Number(limit) || 100))));
  const response = await supabaseRequest(env, `/rest/v1/ethone_file_activity?${params.toString()}`, { maxBytes: 1024 * 1024 });
  return Array.isArray(response.data) ? response.data.map(normalizeActivity) : [];
}

export async function getActivitySummary(env, userId) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return Object.freeze({ count: 0, unread: 0, latest: null });
  const response = await supabaseRequest(env, `/rest/v1/ethone_file_activity?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=1&select=*`, { maxBytes: 64 * 1024 });
  const rows = Array.isArray(response.data) ? response.data : [];
  return Object.freeze({
    count: rows.length ? 1 : 0,
    unread: 0,
    latest: rows.length ? normalizeActivity(rows[0]) : null
  });
}

export async function recordActivities(env, userId, events = []) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !Array.isArray(events) || events.length === 0) return 0;
  const body = events.slice(0, 100).map((event) => ({
    user_id: userId,
    file_id: null,
    share_id: null,
    drop_id: null,
    ...normalizeEvent(event),
    ip_hash: ""
  }));
  await supabaseRequest(env, "/rest/v1/ethone_file_activity", { method: "POST", body, maxBytes: 64 * 1024 });
  return body.length;
}
