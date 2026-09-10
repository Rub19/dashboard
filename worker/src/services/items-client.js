import { httpError } from "../middleware/errors.js";
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
    maxBytes: options.maxBytes ?? 65536
  });
}

export async function listItems(env, userId, kind) {
  if (!userId) throw httpError("AUTH_REQUIRED", 401);
  const path = `/rest/v1/ethone_items?user_id=eq.${encodeURIComponent(userId)}&kind=eq.${encodeURIComponent(kind)}&order=updated_at.desc`;
  const response = await supabaseRequest(env, path);
  const rows = Array.isArray(response.data) ? response.data : [];
  // safeText(value, maximum) has no "fallback" parameter — passing a string
  // like "Sans titre" here made it the `maximum` argument. Number("Sans
  // titre") is NaN, which coerces to 0, so `.slice(0, 0)` returned "" for
  // every title and body on every item, no matter what was actually stored.
  return rows.map((row) => ({
    id: row.id,
    title: safeText(row.title, 200) || "Sans titre",
    body: safeText(row.body, 10000),
    done: row.done === true,
    startAt: row.start_at,
    endAt: row.end_at,
    data: row.data || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function createItem(env, userId, kind, input) {
  if (!userId) throw httpError("AUTH_REQUIRED", 401);
  const body = {
    user_id: userId,
    kind,
    // See the comment in listItems above — safeText's second argument is a
    // character cap, not a fallback; this used to store "" for every title
    // and body regardless of input.
    title: safeText(input.title, 200) || "Sans titre",
    body: safeText(input.body, 10000),
    done: input.done === true,
    start_at: input.startAt || null,
    end_at: input.endAt || null,
    data: typeof input.data === "object" && input.data ? input.data : {}
  };
  // Prefer: return=representation is required here — PostgREST's default for a
  // POST is an empty body, which would make `row` (and the returned id) null
  // even though the insert succeeded.
  const response = await supabaseRequest(env, "/rest/v1/ethone_items", { method: "POST", body, headers: { Prefer: "return=representation" } });
  const row = Array.isArray(response.data) ? response.data[0] : null;
  return { id: row?.id };
}

export async function updateItem(env, userId, id, input) {
  if (!userId || !id) throw httpError("AUTH_REQUIRED", 401);
  const set = {};
  if (input.title !== undefined) set.title = safeText(input.title, 200) || "Sans titre";
  if (input.body !== undefined) set.body = safeText(input.body, 10000);
  if (input.done !== undefined) set.done = input.done === true;
  if (input.startAt !== undefined) set.start_at = input.startAt || null;
  if (input.endAt !== undefined) set.end_at = input.endAt || null;
  if (input.data !== undefined) set.data = typeof input.data === "object" && input.data ? input.data : {};
  if (Object.keys(set).length === 0) throw httpError("INVALID_REQUEST", 400);
  const path = `/rest/v1/ethone_items?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`;
  await supabaseRequest(env, path, { method: "PATCH", body: set });
  return { ok: true };
}

export async function deleteItem(env, userId, id) {
  if (!userId || !id) throw httpError("AUTH_REQUIRED", 401);
  const path = `/rest/v1/ethone_items?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`;
  await supabaseRequest(env, path, { method: "DELETE" });
  return { ok: true };
}
