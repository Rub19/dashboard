import { httpError } from "./errors.js";

function invalid() {
  throw httpError("INVALID_PARAMETER", 400);
}

export function assertAllowedQuery(url, allowed) {
  const permitted = new Set(allowed);
  for (const key of url.searchParams.keys()) {
    if (!permitted.has(key) || url.searchParams.getAll(key).length !== 1) invalid();
  }
}

export function queryText(url, key, options = {}) {
  const value = String(url.searchParams.get(key) || "").trim();
  const minimum = Number(options.min) || 1;
  const maximum = Number(options.max) || 80;
  if (!value && options.required === false) return String(options.fallback || "");
  if ((!value && options.required !== false) || value.length < minimum || value.length > maximum) invalid();
  if (options.pattern && !options.pattern.test(value)) invalid();
  if (options.values && !options.values.includes(value)) invalid();
  return value;
}

export function queryInteger(url, key, options = {}) {
  const raw = url.searchParams.get(key);
  if ((raw === null || raw === "") && options.required === false) return Number(options.fallback) || 0;
  if (!/^\d+$/.test(String(raw || ""))) invalid();
  const value = Number(raw);
  const minimum = Number.isFinite(options.min) ? options.min : 0;
  const maximum = Number.isFinite(options.max) ? options.max : Number.MAX_SAFE_INTEGER;
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) invalid();
  return value;
}

export const PATTERNS = Object.freeze({
  steamId: /^\d{17}$/,
  steamIdentifier: /^(?:\d{17}|[A-Za-z0-9_-]{2,32}|https:\/\/steamcommunity\.com\/(?:id|profiles)\/[A-Za-z0-9_-]{2,64}\/?)$/,
  username: /^[A-Za-z0-9_.-]{2,32}$/,
  twitchLogin: /^[a-zA-Z0-9_]{3,25}$/,
  discordId: /^\d{17,20}$/,
  playerName: /^[\p{L}\p{N} _.-]{1,32}$/u,
  playerTag: /^[A-Za-z0-9]{1,8}$/,
  trackerIdentifier: /^[A-Za-z0-9 _#.-]{2,64}$/,
  cityQuery: /^[\p{L}\p{N} ,.'-]{2,80}$/u,
  minecraftUsername: /^[A-Za-z0-9_]{3,16}$/,
  spotifyClientId: /^[A-Za-z0-9]{10,64}$/,
  githubClientId: /^[A-Za-z0-9._-]{10,64}$/,
  googleClientId: /^[A-Za-z0-9-]{10,100}\.apps\.googleusercontent\.com$/,
  notionClientId: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  todoistClientId: /^[A-Za-z0-9]{10,64}$/,
  redditClientId: /^[A-Za-z0-9_-]{10,64}$/
});

export function requireSecret(env, name) {
  const value = env?.[name];
  if (typeof value !== "string" || value.length < 8) throw httpError("SERVICE_NOT_CONFIGURED", 503, { retryable: false });
  return value;
}
