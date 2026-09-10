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

  try {
    // Discord persiste son profil dans ethone_user_data (kind='discord') en plus
    // du token dans user_oauth_tokens (voir setDiscordDataRow / discord-oauth-client.js).
    // Si l'écriture dans user_oauth_tokens échoue silencieusement pour une raison
    // quelconque (ex. contrainte CHECK désynchronisée entre migrations, comme ce fut
    // le cas jusqu'au 09/09/2026 — voir 202609090001_ethone_user_data_kinds_restore_discord.sql)
    // alors que ethone_user_data a bien été écrit, cette double lecture évite que la
    // page Connexions affiche "Non connecté" alors que l'utilisateur a bel et bien
    // autorisé l'app côté Discord.
    const [oauthRows, credentialRows, discordProfileRows] = await Promise.all([
      supabaseRequest(env, `/rest/v1/user_oauth_tokens?owner_id=eq.${encodeURIComponent(userId)}&select=provider`).catch(() => []),
      supabaseRequest(env, `/rest/v1/user_provider_credentials?owner_id=eq.${encodeURIComponent(userId)}&select=provider`).catch(() => []),
      supabaseRequest(env, `/rest/v1/ethone_user_data?user_id=eq.${encodeURIComponent(userId)}&kind=eq.discord&select=id&limit=1`).catch(() => []),
    ]);

    const connected = new Set();
    if (Array.isArray(oauthRows)) oauthRows.forEach((row) => connected.add(row.provider));
    if (Array.isArray(credentialRows)) credentialRows.forEach((row) => connected.add(row.provider));
    if (Array.isArray(discordProfileRows) && discordProfileRows.length > 0) connected.add("discord");

    const providers = [...new Set([...PROVIDERS, ...connected])];
    return providers.map((provider) => ({
      provider,
      connected: connected.has(provider),
    }));
  } catch {
    return PROVIDERS.map((provider) => ({
      provider,
      connected: false,
    }));
  }
}

export async function disconnectProvider(env, userId, provider) {
  try {
    if (userId && provider) {
      await Promise.allSettled([
        supabaseRequest(env, `/rest/v1/user_oauth_tokens?owner_id=eq.${encodeURIComponent(userId)}&provider=eq.${encodeURIComponent(provider)}`, { method: "DELETE" }),
        supabaseRequest(env, `/rest/v1/user_provider_credentials?owner_id=eq.${encodeURIComponent(userId)}&provider=eq.${encodeURIComponent(provider)}`, { method: "DELETE" }),
        // Discord's cached profile snapshot lives in ethone_user_data (kind='discord',
        // written by setDiscordDataRow in discord-oauth-client.js) — not in a `user_data`
        // table keyed by `key`, which doesn't exist. The old target here always matched
        // zero rows, so the snapshot survived disconnect and listConnections' fallback
        // check (see its comment) kept reporting Discord as connected afterwards.
        provider === "discord"
          ? supabaseRequest(env, `/rest/v1/ethone_user_data?user_id=eq.${encodeURIComponent(userId)}&kind=eq.discord`, { method: "DELETE" })
          : null,
      ]);
    }
    return { success: true };
  } catch (err) {
    console.warn("disconnectProvider error:", err);
    return { success: false, error: String(err) };
  }
}

