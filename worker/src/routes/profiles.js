import { httpError } from "../middleware/errors.js";
import { requestExternal } from "../utils/external-request.js";
import { safeText } from "../utils/normalize.js";


const TYPES = new Set(["personal", "work", "development", "study", "gaming", "streaming", "creative"]);
const WORKSPACES = new Set(["personal", "focus", "studio"]);

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

function normalizeProfile(body, strict = true) {
  const name = safeText(body.name, 120);
  const type = safeText(body.type, 32);
  const accent = safeText(body.accent, 32) || "violet";
  const workspace = safeText(body.workspace_id || body.workspace, 32) || "personal";
  const rawWidgets = body.widgets;
  const rawIntegrations = body.integrations;
  const widgets = Array.isArray(rawWidgets) ? rawWidgets.filter((x) => typeof x === "string") : (strict ? [] : undefined);
  const integrations = Array.isArray(rawIntegrations) ? rawIntegrations.filter((x) => typeof x === "string") : (strict ? [] : undefined);
  if (strict && !name) throw httpError("INVALID_PARAMETER", 400, { detail: "name" });
  if (type && !TYPES.has(type)) throw httpError("INVALID_PARAMETER", 400, { detail: "type" });
  if (workspace && !WORKSPACES.has(workspace)) throw httpError("INVALID_PARAMETER", 400, { detail: "workspace" });
  const result = {};
  if (name) result.name = name;
  if (type) result.type = type;
  if (body.accent !== undefined || strict) result.accent = accent;
  if (body.workspace_id !== undefined || body.workspace !== undefined || strict) result.workspace = workspace;
  if (widgets !== undefined) result.widgets = widgets;
  if (integrations !== undefined) result.integrations = integrations;
  return result;
}

function profileView(profile) {
  return {
    id: profile.id,
    name: profile.name,
    type: profile.type,
    accent: profile.accent,
    workspace_id: profile.workspace_id,
    widgets: profile.widgets,
    integrations: profile.integrations,
    is_active: profile.is_active,
    created_at: profile.created_at,
    updated_at: profile.updated_at
  };
}

export async function profilesRoute({ request, env, auth, route }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const method = String(request.method || "GET").toUpperCase();
  const action = route?.action || "";

  if (method === "GET") {
    const data = await supabaseRequest(env, `/rest/v1/ethone_profiles?user_id=eq.${encodeURIComponent(auth.userId)}&order=created_at.asc`);
    const list = Array.isArray(data) ? data : [];
    const active = list.find((p) => p.is_active) || list[0] || null;
    return {
      data: {
        list: list.map(profileView),
        active: active ? profileView(active) : null
      }
    };
  }

  if (method === "POST" && action === "") {
    const body = await request.json().catch(() => ({}));
    const { name, type, accent, workspace, widgets, integrations } = normalizeProfile(body, true);
    const existing = await supabaseRequest(env, `/rest/v1/ethone_profiles?user_id=eq.${encodeURIComponent(auth.userId)}&select=id&limit=1`);
    const isFirst = !Array.isArray(existing) || existing.length === 0;
    const now = new Date().toISOString();
    const insert = await supabaseRequest(env, "/rest/v1/ethone_profiles", {
      method: "POST",
      body: JSON.stringify({
        user_id: auth.userId,
        name,
        type,
        accent,
        workspace_id: workspace,
        widgets,
        integrations,
        is_active: isFirst,
        created_at: now,
        updated_at: now
      })
    });
    const created = Array.isArray(insert) ? insert[0] : insert;
    return { data: profileView(created) };
  }

  if (method === "POST" && action === "activate") {
    const body = await request.json().catch(() => ({}));
    const profileId = safeText(body.id, 64);
    if (!profileId) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });
    const now = new Date().toISOString();
    await supabaseRequest(env, `/rest/v1/ethone_profiles?user_id=eq.${encodeURIComponent(auth.userId)}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: false, updated_at: now })
    });
    const result = await supabaseRequest(env, `/rest/v1/ethone_profiles?id=eq.${encodeURIComponent(profileId)}&user_id=eq.${encodeURIComponent(auth.userId)}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: true, updated_at: now })
    });
    const activated = Array.isArray(result) ? result[0] : result;
    return { data: activated ? profileView(activated) : null };
  }

  if (method === "PATCH") {
    const body = await request.json().catch(() => ({}));
    const profileId = safeText(body.id, 64);
    if (!profileId) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });
    const patch = normalizeProfile(body, false);
    const updates = { ...patch, updated_at: new Date().toISOString() };
    if (updates.workspace !== undefined) {
      updates.workspace_id = updates.workspace;
      delete updates.workspace;
    }
    const update = await supabaseRequest(env, `/rest/v1/ethone_profiles?id=eq.${encodeURIComponent(profileId)}&user_id=eq.${encodeURIComponent(auth.userId)}`, {
      method: "PATCH",
      body: JSON.stringify(updates)
    });
    const updated = Array.isArray(update) ? update[0] : update;
    return { data: updated ? profileView(updated) : null };
  }

  if (method === "DELETE") {
    const body = await request.json().catch(() => ({}));
    const profileId = safeText(body.id, 64);
    if (!profileId) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });
    const before = await supabaseRequest(env, `/rest/v1/ethone_profiles?id=eq.${encodeURIComponent(profileId)}&user_id=eq.${encodeURIComponent(auth.userId)}&is_active=eq.true&limit=1`);
    const wasActive = Array.isArray(before) && before.length > 0;
    await supabaseRequest(env, `/rest/v1/ethone_profiles?id=eq.${encodeURIComponent(profileId)}&user_id=eq.${encodeURIComponent(auth.userId)}`, { method: "DELETE", maxBytes: 2048 });
    if (wasActive) {
      const remaining = await supabaseRequest(env, `/rest/v1/ethone_profiles?user_id=eq.${encodeURIComponent(auth.userId)}&order=created_at.asc&limit=1`);
      if (Array.isArray(remaining) && remaining[0]) {
        const now = new Date().toISOString();
        await supabaseRequest(env, `/rest/v1/ethone_profiles?id=eq.${encodeURIComponent(remaining[0].id)}&user_id=eq.${encodeURIComponent(auth.userId)}`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: true, updated_at: now })
        });
      }
    }
    return { data: { deleted: true } };
  }

  throw httpError("METHOD_NOT_ALLOWED", 405);
}
