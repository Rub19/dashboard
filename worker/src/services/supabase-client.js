import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safePublicUrl, safeText } from "../utils/normalize.js";

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
  const headers = {
    apikey: secret,
    "content-type": "application/json"
  };
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret)) {
    headers.Authorization = `Bearer ${secret}`;
  }
  return headers;
}

export async function getUserProviderCredential(env, userId, provider) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return null;
  try {
    const secret = requireSecret(env, "SUPABASE_SECRET_KEY");
    // Query direct table first
    const tablePath = `/rest/v1/user_provider_credentials?owner_id=eq.${encodeURIComponent(userId)}&provider=eq.${encodeURIComponent(provider)}&select=credential`;
    const response = await requestExternal(new URL(tablePath, origin), {
      env,
      expectedOrigin: origin,
      service: "supabase",
      dedupeKey: `cred:table:${userId}:${provider}`,
      headers: serviceHeaders(secret),
      retries: 1,
      maxBytes: 8192
    });
    const rows = Array.isArray(response.data) ? response.data : [];
    if (rows.length > 0 && rows[0]?.credential && typeof rows[0].credential === "object") {
      return rows[0].credential;
    }
  } catch {}

  try {
    const secret = requireSecret(env, "SUPABASE_SECRET_KEY");
    const response = await requestExternal(new URL("/rest/v1/rpc/get_provider_credential", origin), {
      env,
      expectedOrigin: origin,
      service: "supabase",
      dedupeKey: `credential:${userId}:${provider}`,
      method: "POST",
      headers: serviceHeaders(secret),
      body: JSON.stringify({ requested_user_id: userId, requested_provider: provider }),
      retries: 0,
      maxBytes: 4096
    });
    return response.data && typeof response.data === "object" ? response.data : null;
  } catch {
    return null;
  }
}

export async function getOAuthToken(env, userId, provider) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return null;
  const secret = requireSecret(env, "SUPABASE_SECRET_KEY");
  const response = await requestExternal(new URL("/rest/v1/rpc/get_oauth_token", origin), {
    env,
    expectedOrigin: origin,
    service: "supabase",
    dedupeKey: `oauth-token:${userId}:${provider}`,
    method: "POST",
    headers: serviceHeaders(secret),
    body: JSON.stringify({ requested_user_id: userId, requested_provider: provider }),
    retries: 0,
    maxBytes: 8192
  });
  const row = Array.isArray(response.data) ? response.data[0] : response.data;
  if (!row) return null;
  return Object.freeze({
    accessToken: safeText(row.access_token, 4000),
    refreshToken: safeText(row.refresh_token, 4000),
    scope: safeText(row.scope, 500),
    expiresAt: safeText(row.expires_at, 40)
  });
}

export async function setOAuthToken(env, userId, provider, token) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return false;
  const secret = requireSecret(env, "SUPABASE_SECRET_KEY");
  await requestExternal(new URL("/rest/v1/rpc/set_oauth_token", origin), {
    env,
    expectedOrigin: origin,
    service: "supabase",
    method: "POST",
    headers: serviceHeaders(secret),
    body: JSON.stringify({
      requested_user_id: userId,
      requested_provider: provider,
      next_access_token: token.accessToken,
      next_refresh_token: token.refreshToken,
      next_scope: token.scope || "",
      next_expires_at: token.expiresAt
    }),
    retries: 0,
    maxBytes: 4096
  });
  return true;
}

export async function deleteOAuthToken(env, userId, provider) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return false;
  const secret = requireSecret(env, "SUPABASE_SECRET_KEY");
  await requestExternal(new URL("/rest/v1/rpc/delete_oauth_token", origin), {
    env,
    expectedOrigin: origin,
    service: "supabase",
    method: "POST",
    headers: serviceHeaders(secret),
    body: JSON.stringify({ requested_user_id: userId, requested_provider: provider }),
    retries: 0,
    maxBytes: 4096
  });
  return true;
}

export async function findPublicProfile(env, username) {
  const origin = projectOrigin(env);
  const secret = requireSecret(env, "SUPABASE_SECRET_KEY");
  if (!origin) throw new Error("Invalid Supabase project URL");
  const response = await requestExternal(new URL("/rest/v1/rpc/find_ethone_public_profile", origin), {
    env,
    expectedOrigin: origin,
    service: "supabase",
    dedupeKey: `public-profile:${username.toLowerCase()}`,
    method: "POST",
    headers: serviceHeaders(secret),
    body: JSON.stringify({ requested_username: username }),
    retries: 0,
    maxBytes: 128 * 1024
  });
  const source = Array.isArray(response.data) ? response.data[0] : response.data;
  if (!source) return null;
  return Object.freeze({
    publicId: safeText(source.public_id, 80),
    username: safeText(source.username, 32),
    displayName: safeText(source.display_name, 80),
    avatarUrl: safePublicUrl(source.avatar_url, [new URL(origin).hostname])
  });
}
