import { httpError } from "../middleware/errors.js";
import { requestExternal } from "../utils/external-request.js";
import { safePublicUrl, safeText } from "../utils/normalize.js";

function projectOrigin(env) {
  try {
    const url = new URL(String(env.SUPABASE_URL || ""));
    return url.protocol === "https:" ? url.origin : "";
  } catch {
    return "";
  }
}

function supabaseHeaders(secret, prefer) {
  const headers = { apikey: secret, "content-type": "application/json", Authorization: `Bearer ${secret}` };
  if (prefer) headers.Prefer = prefer;
  return headers;
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
    headers: supabaseHeaders(secret, options.prefer),
    body: options.body,
    maxBytes: options.maxBytes || 4096
  });
  return response.data;
}

function safeUsername(value) {
  const raw = safeText(value, 32).toLowerCase().trim();
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(raw)) return "";
  return raw;
}

export async function profileRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const method = String(request.method || "GET").toUpperCase();

  if (method === "GET") {
    try {
      const data = await supabaseRequest(env, `/rest/v1/ethone_public_profiles?user_id=eq.${encodeURIComponent(auth.userId)}&limit=1`);
      return { data: Array.isArray(data) && data[0] ? data[0] : null };
    } catch {
      return { data: null };
    }
  }

  if (method === "POST" || method === "PATCH") {
    const body = await request.json().catch(() => ({}));
    const displayName = safeText(body.display_name, 80);
    const avatarUrl = safePublicUrl(body.avatar_url, 1200) || "";
    const username = safeUsername(body.username);

    const existing = await supabaseRequest(env, `/rest/v1/ethone_public_profiles?user_id=eq.${encodeURIComponent(auth.userId)}&limit=1`);

    if (Array.isArray(existing) && existing[0]) {
      const updates = {};
      if (displayName !== undefined) updates.display_name = displayName;
      if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
      if (username) updates.username = username;
      updates.updated_at = new Date().toISOString();
      const updated = await supabaseRequest(env, `/rest/v1/ethone_public_profiles?user_id=eq.${encodeURIComponent(auth.userId)}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
        prefer: "return=representation",
      });
      return { data: Array.isArray(updated) && updated[0] ? updated[0] : null };
    }

    if (!username) throw httpError("INVALID_PARAMETER", 400, { detail: "username" });
    const insert = await supabaseRequest(env, "/rest/v1/ethone_public_profiles", {
      method: "POST",
      body: JSON.stringify({
        user_id: auth.userId,
        username,
        display_name: displayName,
        avatar_url: avatarUrl
      }),
      prefer: "return=representation",
    });
    return { data: Array.isArray(insert) && insert[0] ? insert[0] : null };
  }

  throw httpError("METHOD_NOT_ALLOWED", 405);
}
