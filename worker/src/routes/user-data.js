import { httpError } from "../middleware/errors.js";
import { requestExternal } from "../utils/external-request.js";
import { safeText } from "../utils/normalize.js";

const KINDS = new Set(["space", "flow", "interaction", "macro", "persona", "bill", "plugin"]);

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

async function getActiveProfile(env, userId) {
  const data = await supabaseRequest(
    env,
    `/rest/v1/ethone_profiles?user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&limit=1&select=id,workspace_id`
  );
  const row = Array.isArray(data) ? data[0] : null;
  if (!row || !row.id) return null;
  return { id: row.id, workspace: String(row.workspace_id || "") };
}

function appendProfileFilter(path, active) {
  if (!active?.id) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}profile_id=eq.${encodeURIComponent(active.id)}`;
}

export async function userDataRoute({ request, env, auth, route }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const kind = route?.action;
  if (!KINDS.has(kind)) throw httpError("INVALID_PARAMETER", 400);

  const method = String(request.method || "GET").toUpperCase();

  if (method === "GET") {
    const active = await getActiveProfile(env, auth.userId);
    let path = `/rest/v1/ethone_user_data?user_id=eq.${encodeURIComponent(auth.userId)}&kind=eq.${encodeURIComponent(kind)}&order=created_at.desc`;
    path = appendProfileFilter(path, active);
    const data = await supabaseRequest(env, path);
    return { data: Array.isArray(data) ? data : [] };
  }

  if (method === "POST") {
    const body = await request.json().catch(() => ({}));
    const slug = safeText(body.slug, 64);
    const label = safeText(body.label, 120);
    if (!label) throw httpError("INVALID_PARAMETER", 400, { detail: "label" });

    let profileId = safeText(body.profile_id, 64) || "";
    let workspaceId = safeText(body.workspace_id, 32) || "";

    if (!profileId) {
      const active = await getActiveProfile(env, auth.userId);
      if (active) {
        profileId = active.id;
        workspaceId = active.workspace;
      }
    }

    const insert = await supabaseRequest(env, "/rest/v1/ethone_user_data", {
      method: "POST",
      body: JSON.stringify({
        user_id: auth.userId,
        kind,
        slug,
        label,
        data: body.data || {},
        count: Number(body.count) || 0,
        profile_id: profileId || null,
        workspace_id: workspaceId || ""
      })
    });
    return { data: insert?.[0] || insert };
  }

  if (method === "PATCH") {
    const body = await request.json().catch(() => ({}));
    const id = safeText(body.id, 64);
    if (!id) throw httpError("INVALID_PARAMETER", 400);

    const active = await getActiveProfile(env, auth.userId);
    const updates = {};
    if (body.label !== undefined) updates.label = safeText(body.label, 120);
    if (body.data !== undefined) updates.data = body.data;
    if (body.count !== undefined) updates.count = Number(body.count) || 0;
    if (body.profile_id !== undefined) updates.profile_id = safeText(body.profile_id, 64) || null;
    if (body.workspace_id !== undefined) updates.workspace_id = safeText(body.workspace_id, 32) || "";
    updates.updated_at = new Date().toISOString();

    let path = `/rest/v1/ethone_user_data?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(auth.userId)}&kind=eq.${encodeURIComponent(kind)}`;
    path = appendProfileFilter(path, active);
    const update = await supabaseRequest(env, path, {
      method: "PATCH",
      body: JSON.stringify(updates)
    });
    return { data: update?.[0] || update };
  }

  if (method === "DELETE") {
    const body = await request.json().catch(() => ({}));
    const id = safeText(body.id, 64);
    if (!id) throw httpError("INVALID_PARAMETER", 400);

    const active = await getActiveProfile(env, auth.userId);
    let path = `/rest/v1/ethone_user_data?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(auth.userId)}&kind=eq.${encodeURIComponent(kind)}`;
    path = appendProfileFilter(path, active);
    await supabaseRequest(env, path, { method: "DELETE", maxBytes: 2048 });
    return { data: { deleted: true } };
  }

  throw httpError("METHOD_NOT_ALLOWED", 405);
}
