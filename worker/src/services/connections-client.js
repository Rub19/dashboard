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

const PROVIDERS = [
  "spotify",
  "github",
  "google-calendar",
  "notion",
  "todoist",
  "google-drive",
  "youtube",
  "reddit",
];

export async function listConnections(env, userId) {
  if (!userId) return [];
  const path = `/rest/v1/user_oauth_tokens?owner_id=eq.${encodeURIComponent(userId)}&select=provider`;
  const data = await supabaseRequest(env, path);
  const connected = new Set(Array.isArray(data) ? data.map((row) => row.provider) : []);
  return PROVIDERS.map((provider) => ({
    provider,
    connected: connected.has(provider),
  }));
}
