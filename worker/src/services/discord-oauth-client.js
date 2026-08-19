import { httpError } from "../middleware/errors.js";
import { requestExternal } from "../utils/external-request.js";
import { safeNumber, safePublicUrl, safeText } from "../utils/normalize.js";
import { signOAuthState, verifyOAuthState } from "../utils/oauth-state.js";
import { deleteOAuthToken, getOAuthToken, setOAuthToken } from "./supabase-client.js";

const DISCORD_ORIGIN = "https://discord.com";
const DISCORD_API_ORIGIN = "https://discord.com";
const CDN_ORIGIN = "https://cdn.discordapp.com";
const DEFAULT_SCOPES = ["identify", "email", "connections", "guilds"];

function requireSecret(env, key) {
  const value = env[key];
  if (!value) throw httpError("CONFIGURATION_ERROR", 503, { detail: `missing ${key}` });
  return String(value);
}

function discordCdnUrl(path) {
  try {
    const url = new URL(path, CDN_ORIGIN);
    return url.href;
  } catch {
    return "";
  }
}

function avatarUrl(userId, avatarHash, size = 128) {
  if (!userId || !avatarHash) return "";
  const isAnimated = String(avatarHash).startsWith("a_");
  const ext = isAnimated ? "gif" : "png";
  return discordCdnUrl(`/avatars/${encodeURIComponent(userId)}/${encodeURIComponent(avatarHash)}.${ext}?size=${size}`);
}

function bannerUrl(userId, bannerHash, size = 1024) {
  if (!userId || !bannerHash) return "";
  const isAnimated = String(bannerHash).startsWith("a_");
  const ext = isAnimated ? "gif" : "png";
  return discordCdnUrl(`/banners/${encodeURIComponent(userId)}/${encodeURIComponent(bannerHash)}.${ext}?size=${size}`);
}

export async function buildDiscordAuthUrl(env, { userId, redirectUri, returnTo, scopes = DEFAULT_SCOPES }) {
  const clientId = requireSecret(env, "DISCORD_CLIENT_ID");
  const finalRedirectUri = redirectUri || "http://localhost:3000/api/auth/callback/discord";
  const state = await signOAuthState(env, {
    userId,
    redirectUri: finalRedirectUri,
    returnTo: returnTo || "http://localhost:3000/settings?discord=connected",
  });
  const url = new URL("/oauth2/authorize", DISCORD_ORIGIN);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", finalRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.href;
}

export async function exchangeDiscordCallback(env, { code, state }) {
  const { userId, redirectUri, returnTo } = await verifyOAuthState(env, state);
  const profile = await exchangeDiscordCode(env, userId, { code, redirectUri });
  return { profile, returnTo };
}

async function discordTokenRequest(env, body) {
  const response = await requestExternal(new URL("/api/v10/oauth2/token", DISCORD_API_ORIGIN), {
    env,
    expectedOrigin: DISCORD_API_ORIGIN,
    service: "discord",
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
    retries: 0,
    maxBytes: 8192,
  });
  const data = response.data || {};
  if (data.error || !data.access_token) {
    throw httpError("PROVIDER_REQUEST_REJECTED", 502, { retryable: false, detail: data });
  }
  return data;
}

async function discordApiRequest(env, path, token, { maxBytes = 256 * 1024 } = {}) {
  return requestExternal(new URL(`/api/v10${path}`, DISCORD_API_ORIGIN), {
    env,
    expectedOrigin: DISCORD_API_ORIGIN,
    service: "discord",
    headers: { authorization: `Bearer ${token}` },
    retries: 0,
    maxBytes,
  });
}

function safeConnection(connection) {
  return Object.freeze({
    type: safeText(connection?.type, 32),
    id: safeText(connection?.id, 64),
    name: safeText(connection?.name, 120),
    verified: Boolean(connection?.verified),
    friendSync: Boolean(connection?.friend_sync),
    showActivity: Boolean(connection?.show_activity),
    visibility: safeNumber(connection?.visibility, 0, 2),
    revoked: Boolean(connection?.revoked),
  });
}

function safeGuild(guild) {
  return Object.freeze({
    id: safeText(guild?.id, 32),
    name: safeText(guild?.name, 120),
    owner: Boolean(guild?.owner),
    permissions: safeText(guild?.permissions, 64),
    icon: safeText(guild?.icon, 64),
    iconUrl: guild?.icon ? discordCdnUrl(`/icons/${encodeURIComponent(guild.id)}/${encodeURIComponent(guild.icon)}.png?size=128`) : "",
  });
}

function normalizeDiscordUser(user) {
  const id = safeText(user?.id, 32);
  const avatar = safeText(user?.avatar, 128);
  const banner = safeText(user?.banner, 128);
  return Object.freeze({
    id,
    username: safeText(user?.username, 80),
    globalName: safeText(user?.global_name, 80),
    displayName: safeText(user?.display_name, 80),
    discriminator: safeText(user?.discriminator, 8),
    avatar,
    avatarUrl: avatarUrl(id, avatar, 256),
    avatarUrlSmall: avatarUrl(id, avatar, 64),
    banner,
    bannerUrl: bannerUrl(id, banner, 1024),
    email: safeText(user?.email, 120),
    verified: Boolean(user?.verified),
    mfaEnabled: Boolean(user?.mfa_enabled),
    locale: safeText(user?.locale, 16),
    premiumType: safeNumber(user?.premium_type, 0, 3),
    publicFlags: safeNumber(user?.public_flags, 0, Number.MAX_SAFE_INTEGER),
    flags: safeNumber(user?.flags, 0, Number.MAX_SAFE_INTEGER),
  });
}

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
    maxBytes: options.maxBytes || 8192,
  });
  return response.data;
}

async function getDiscordDataRow(env, userId) {
  const data = await supabaseRequest(
    env,
    `/rest/v1/ethone_user_data?user_id=eq.${encodeURIComponent(userId)}&kind=eq.discord&limit=1`,
    { maxBytes: 256 * 1024 }
  );
  return Array.isArray(data) && data[0] ? data[0] : null;
}

async function setDiscordDataRow(env, userId, payload) {
  const existing = await getDiscordDataRow(env, userId);
  const row = {
    user_id: userId,
    kind: "discord",
    slug: "discord-oauth",
    label: "Discord",
    data: payload,
  };
  if (existing?.id) {
    await supabaseRequest(env, `/rest/v1/ethone_user_data?id=eq.${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ data: payload, updated_at: new Date().toISOString() }),
      maxBytes: 256 * 1024,
    });
  } else {
    await supabaseRequest(env, "/rest/v1/ethone_user_data", {
      method: "POST",
      body: JSON.stringify(row),
      maxBytes: 256 * 1024,
    });
  }
}

async function deleteDiscordDataRow(env, userId) {
  await supabaseRequest(
    env,
    `/rest/v1/ethone_user_data?user_id=eq.${encodeURIComponent(userId)}&kind=eq.discord`,
    { method: "DELETE", maxBytes: 2048 }
  );
}

export async function exchangeDiscordCode(env, userId, { code, redirectUri }) {
  const clientId = requireSecret(env, "DISCORD_CLIENT_ID");
  const clientSecret = requireSecret(env, "DISCORD_CLIENT_SECRET");

  const tokenData = await discordTokenRequest(env, {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code: safeText(code, 256),
    redirect_uri: redirectUri || "http://localhost:3000/api/auth/callback/discord",
  });

  const accessToken = safeText(tokenData.access_token, 4000);
  const refreshToken = safeText(tokenData.refresh_token, 4000);
  const scope = safeText(tokenData.scope, 500);
  const expiresIn = safeNumber(tokenData.expires_in, 0, 86400);
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

  try {
    await setOAuthToken(env, userId, "discord", {
      accessToken,
      refreshToken,
      scope,
      expiresAt,
    });
  } catch (err) {
    console.warn("Discord OAuth token storage failed, continuing without persistence:", err?.message || err);
  }

  const [userResponse, connectionsResponse, guildsResponse] = await Promise.all([
    discordApiRequest(env, "/users/@me", accessToken).catch(() => ({ data: null })),
    discordApiRequest(env, "/users/@me/connections", accessToken).catch(() => ({ data: null })),
    discordApiRequest(env, "/users/@me/guilds", accessToken).catch(() => ({ data: null })),
  ]);

  const user = normalizeDiscordUser(userResponse.data);
  const connections = Array.isArray(connectionsResponse.data)
    ? connectionsResponse.data.map(safeConnection)
    : [];
  const guilds = Array.isArray(guildsResponse.data)
    ? guildsResponse.data.map(safeGuild)
    : [];

  const profile = Object.freeze({
    user,
    connections,
    guilds,
    connected: true,
    mode: "oauth2",
    syncedAt: new Date().toISOString(),
  });

  await setDiscordDataRow(env, userId, profile);
  return profile;
}

export async function getDiscordProfile(env, userId) {
  const token = await getOAuthToken(env, userId, "discord");
  if (!token?.accessToken) {
    const row = await getDiscordDataRow(env, userId);
    return row?.data ? Object.freeze({ ...row.data, connected: Boolean(row.data.connected) }) : Object.freeze({ connected: false });
  }

  const row = await getDiscordDataRow(env, userId);
  if (row?.data) {
    return Object.freeze({ ...row.data, connected: true, mode: "oauth2" });
  }

  return Object.freeze({ connected: false });
}

export async function refreshDiscordProfile(env, userId) {
  const token = await getOAuthToken(env, userId, "discord");
  if (!token?.accessToken) throw httpError("AUTH_REQUIRED", 401, { retryable: false });

  const [userResponse, connectionsResponse, guildsResponse] = await Promise.all([
    discordApiRequest(env, "/users/@me", token.accessToken).catch(() => ({ data: null })),
    discordApiRequest(env, "/users/@me/connections", token.accessToken).catch(() => ({ data: null })),
    discordApiRequest(env, "/users/@me/guilds", token.accessToken).catch(() => ({ data: null })),
  ]);

  const user = normalizeDiscordUser(userResponse.data);
  const connections = Array.isArray(connectionsResponse.data)
    ? connectionsResponse.data.map(safeConnection)
    : [];
  const guilds = Array.isArray(guildsResponse.data)
    ? guildsResponse.data.map(safeGuild)
    : [];

  const profile = Object.freeze({
    user,
    connections,
    guilds,
    connected: true,
    mode: "oauth2",
    syncedAt: new Date().toISOString(),
  });

  await setDiscordDataRow(env, userId, profile);
  return profile;
}

export async function disconnectDiscord(env, userId) {
  await deleteOAuthToken(env, userId, "discord");
  await deleteDiscordDataRow(env, userId);
  return Object.freeze({ connected: false });
}
