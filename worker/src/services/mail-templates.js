import { requestExternal } from "../utils/external-request.js";

function safeText(value, limit = 320) {
  const raw = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return raw.slice(0, limit);
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

export function listTemplates(env, userId, { limit = 100, offset = 0 } = {}) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return Promise.resolve([]);
  return supabaseRequest(env, `/rest/v1/ethone_mail_templates?user_id=eq.${userId}&order=is_default.desc,created_at.desc&limit=${limit}&offset=${offset}`, {
    method: "GET",
    maxBytes: 8192
  }).then((res) => Array.isArray(res?.data) ? res.data : []);
}

export function getTemplate(env, userId, id) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !id) return Promise.resolve(null);
  return supabaseRequest(env, `/rest/v1/ethone_mail_templates?id=eq.${id}&user_id=eq.${userId}&limit=1`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 4096
  }).then(firstRow);
}

export function createTemplate(env, userId, { name, subject, content, is_default }) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return Promise.resolve(null);
  return supabaseRequest(env, "/rest/v1/ethone_mail_templates", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: {
      user_id: userId,
      name: safeText(name, 80),
      subject: safeText(subject, 998),
      content: safeText(content, 20000),
      is_default: is_default === true
    },
    maxBytes: 8192
  }).then(firstRow);
}

export function updateTemplate(env, userId, id, patch) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !id || !patch || typeof patch !== "object") return Promise.resolve(null);
  const body = {};
  if (patch.name !== undefined) body.name = safeText(patch.name, 80);
  if (patch.subject !== undefined) body.subject = safeText(patch.subject, 998);
  if (patch.content !== undefined) body.content = safeText(patch.content, 20000);
  if (patch.is_default !== undefined) body.is_default = patch.is_default === true;
  if (!Object.keys(body).length) return Promise.resolve(null);
  return supabaseRequest(env, `/rest/v1/ethone_mail_templates?id=eq.${id}&user_id=eq.${userId}`, {
    method: "PATCH",
    headers: { "Prefer": "return=minimal" },
    body,
    maxBytes: 4096
  }).then((res) => res?.status === 204 || res?.data !== undefined ? { updated: true } : null);
}

export function deleteTemplate(env, userId, id) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !id) return Promise.resolve(false);
  return supabaseRequest(env, `/rest/v1/ethone_mail_templates?id=eq.${id}&user_id=eq.${userId}`, {
    method: "DELETE",
    maxBytes: 2048
  }).then((res) => res?.status === 204 || res?.data !== undefined);
}

export async function setDefaultTemplate(env, userId, id) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !id) return null;
  await supabaseRequest(env, `/rest/v1/ethone_mail_templates?user_id=eq.${userId}&id=neq.${id}&is_default=eq.true`, {
    method: "PATCH",
    headers: { "Prefer": "return=minimal" },
    body: { is_default: false },
    maxBytes: 2048
  }).catch(() => null);
  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_templates?id=eq.${id}&user_id=eq.${userId}`, {
    method: "PATCH",
    headers: { "Prefer": "return=representation" },
    body: { is_default: true },
    maxBytes: 4096
  });
  return firstRow(response);
}
