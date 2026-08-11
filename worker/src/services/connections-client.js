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
  "youtube",
  "twitch",
  "discord",
  "reddit",
  "minecraft",
  "google-calendar",
  "google-drive",
  "notion",
  "todoist",
  "linear",
  "clickup",
  "jira",
  "email",
  "github",
  "gitlab",
  "fitbit",
  "plex",
  "jellyfin",
  "emby",
  "bluesky",
  "obsidian",
  "vscode",
];

export async function listConnections(env, userId) {
  if (!userId) return [];

  const [oauthRows, credentialRows] = await Promise.all([
    supabaseRequest(env, `/rest/v1/user_oauth_tokens?owner_id=eq.${encodeURIComponent(userId)}&select=provider`),
    supabaseRequest(env, `/rest/v1/user_provider_credentials?owner_id=eq.${encodeURIComponent(userId)}&select=provider`),
  ]);

  const connected = new Set();
  if (Array.isArray(oauthRows)) oauthRows.forEach((row) => connected.add(row.provider));
  if (Array.isArray(credentialRows)) credentialRows.forEach((row) => connected.add(row.provider));

  const providers = [...new Set([...PROVIDERS, ...connected])];
  return providers.map((provider) => ({
    provider,
    connected: connected.has(provider),
  }));
}
