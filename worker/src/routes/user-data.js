import { httpError } from "../middleware/errors.js";
import { requestExternal } from "../utils/external-request.js";
import { safeText } from "../utils/normalize.js";

const KINDS = new Set(["space", "flow", "interaction", "macro", "persona", "bill"]);

function projectOrigin(env) {
  try {
    const url = new URL(String(env.SUPABASE_URL || ""));
    return url.protocol === "https:" ? url.origin : "";
  } catch {
    return "";
  }
}

function supabaseHeaders(secret) {
  return { apikey: secret, "content-type": "application/json", Authorization: `Bearer ${secret}` };
}

async function supabaseRequest(env, path, options = {}) {
  const origin = projectOrigin(env);
  const secret = env.SUPABASE_SECRET_KEY;
  if (!origin || !secret) throw httpError("SERVICE_UNAVAILABLE", 503);
  const url = new URL(path, `${origin}/`);
  const response = await requestExternal(url, {
    env,
    expectedOrigin: origin,
    service: "supabase",
    method: options.method || "GET",
    headers: supabaseHeaders(secret),
    body: options.body,
    maxBytes: options.maxBytes || 8192
  });
  return response.data;
}

export async function userDataRoute({ request, env, auth, route }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const kind = route?.action;
  if (!KINDS.has(kind)) throw httpError("INVALID_PARAMETER", 400);

  const method = String(request.method || "GET").toUpperCase();

  if (method === "GET") {
    const data = await supabaseRequest(env, `/rest/v1/ethone_user_data?user_id=eq.${encodeURIComponent(auth.userId)}&kind=eq.${encodeURIComponent(kind)}&order=created_at.desc`);
    return { data: Array.isArray(data) ? data : [] };
  }

  if (method === "POST") {
    const body = await request.json().catch(() => ({}));
    const slug = safeText(body.slug, 64);
    const label = safeText(body.label, 120);
    if (!label) throw httpError("INVALID_PARAMETER", 400, { detail: "label" });
    const insert = await supabaseRequest(env, "/rest/v1/ethone_user_data", {
      method: "POST",
      body: JSON.stringify({
        user_id: auth.userId,
        kind,
        slug,
        label,
        data: body.data || {},
        count: Number(body.count) || 0
      })
    });
    return { data: insert?.[0] || insert };
  }

  if (method === "PATCH") {
    const body = await request.json().catch(() => ({}));
    const id = safeText(body.id, 64);
    if (!id) throw httpError("INVALID_PARAMETER", 400);
    const updates = {};
    if (body.label !== undefined) updates.label = safeText(body.label, 120);
    if (body.data !== undefined) updates.data = body.data;
    if (body.count !== undefined) updates.count = Number(body.count) || 0;
    updates.updated_at = new Date().toISOString();
    const update = await supabaseRequest(env, `/rest/v1/ethone_user_data?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(auth.userId)}&kind=eq.${encodeURIComponent(kind)}`, {
      method: "PATCH",
      body: JSON.stringify(updates)
    });
    return { data: update?.[0] || update };
  }

  if (method === "DELETE") {
    const body = await request.json().catch(() => ({}));
    const id = safeText(body.id, 64);
    if (!id) throw httpError("INVALID_PARAMETER", 400);
    await supabaseRequest(env, `/rest/v1/ethone_user_data?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(auth.userId)}&kind=eq.${encodeURIComponent(kind)}`, { method: "DELETE", maxBytes: 2048 });
    return { data: { deleted: true } };
  }

  throw httpError("METHOD_NOT_ALLOWED", 405);
}
