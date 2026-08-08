import { httpError } from "../middleware/errors.js";
import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";

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

export async function cleanupExpiredSharesAndDrops(env, userId) {
  const origin = projectOrigin(env);
  if (!origin || !userId) throw httpError("AUTH_REQUIRED", 401);
  const now = new Date().toISOString();
  const sharesResponse = await supabaseRequest(env, `/rest/v1/ethone_file_shares?user_id=eq.${encodeURIComponent(userId)}&revoked=eq.false&expires_at=lte.${encodeURIComponent(now)}&select=slug`, { maxBytes: 256 * 1024 });
  const shares = Array.isArray(sharesResponse.data) ? sharesResponse.data : [];
  let revoked = 0;
  for (const share of shares) {
    await supabaseRequest(env, `/rest/v1/ethone_file_shares?user_id=eq.${encodeURIComponent(userId)}&slug=eq.${encodeURIComponent(share.slug)}`, {
      method: "PATCH",
      body: { revoked: true },
      maxBytes: 8 * 1024
    });
    revoked += 1;
  }
  const dropsResponse = await supabaseRequest(env, `/rest/v1/ethone_file_drops?user_id=eq.${encodeURIComponent(userId)}&expires_at=lte.${encodeURIComponent(now)}&select=slug`, { maxBytes: 256 * 1024 });
  const drops = Array.isArray(dropsResponse.data) ? dropsResponse.data : [];
  let deleted = 0;
  for (const drop of drops) {
    await supabaseRequest(env, `/rest/v1/ethone_file_drops?user_id=eq.${encodeURIComponent(userId)}&slug=eq.${encodeURIComponent(drop.slug)}`, {
      method: "DELETE",
      maxBytes: 8 * 1024
    });
    deleted += 1;
  }
  return Object.freeze({ revoked, deleted });
}
