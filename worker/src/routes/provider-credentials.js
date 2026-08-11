import { httpError } from "../middleware/errors.js";
import { safeText } from "../utils/normalize.js";
import { requestExternal } from "../utils/external-request.js";
import { requireSecret } from "../middleware/validation.js";

const ALLOWED = new Set(["steam", "twitch", "lastfm", "henrik", "tracker", "riot", "openai", "anthropic", "gemini", "groq", "plex"]);

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

async function supabaseRequest(env, path, options = {}) {
  const origin = projectOrigin(env);
  const secret = requireSecret(env, "SUPABASE_SECRET_KEY");
  const response = await requestExternal(new URL(path, origin), {
    env,
    expectedOrigin: origin,
    service: "supabase",
    method: options.method || "GET",
    headers: { ...serviceHeaders(secret), ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
    retries: options.retries ?? 0,
    maxBytes: options.maxBytes ?? 65536,
  });
  return response.data;
}

export async function providerCredentialsRoute({ request, env, auth, url }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const method = String(request.method || "GET").toUpperCase();
  const provider = safeText(url.searchParams.get("provider"), 32);

  if (method === "GET") {
    if (provider) {
      if (!ALLOWED.has(provider)) throw httpError("INVALID_PARAMETER", 400, { detail: "provider" });
      const rows = await supabaseRequest(env, `/rest/v1/user_provider_credentials?owner_id=eq.${encodeURIComponent(auth.userId)}&provider=eq.${encodeURIComponent(provider)}&select=provider`);
      return { data: { provider, connected: Array.isArray(rows) && rows.length > 0 } };
    }
    const rows = await supabaseRequest(env, `/rest/v1/user_provider_credentials?owner_id=eq.${encodeURIComponent(auth.userId)}&select=provider`);
    return { data: { providers: Array.isArray(rows) ? rows.map((r) => r.provider) : [] } };
  }

  if (method === "POST") {
    if (!provider || !ALLOWED.has(provider)) throw httpError("INVALID_PARAMETER", 400, { detail: "provider" });
    const body = await request.json().catch(() => ({}));
    const credential = body && typeof body.credential === "object" ? body.credential : null;
    if (!credential) throw httpError("INVALID_PARAMETER", 400, { detail: "credential" });

    await supabaseRequest(env, "/rest/v1/user_provider_credentials", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: {
        owner_id: auth.userId,
        provider,
        credential,
      },
      maxBytes: 8192,
    });
    return { data: { provider, connected: true } };
  }

  if (method === "DELETE") {
    if (!provider || !ALLOWED.has(provider)) throw httpError("INVALID_PARAMETER", 400, { detail: "provider" });
    await supabaseRequest(env, `/rest/v1/user_provider_credentials?owner_id=eq.${encodeURIComponent(auth.userId)}&provider=eq.${encodeURIComponent(provider)}`, { method: "DELETE", maxBytes: 2048 });
    return { data: { provider, connected: false } };
  }

  throw httpError("METHOD_NOT_ALLOWED", 405);
}
