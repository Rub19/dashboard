import { httpError } from "../middleware/errors.js";
import { requestExternal } from "../utils/external-request.js";
import { safeNumber, safePublicUrl, safeText } from "../utils/normalize.js";
import { getUserProviderCredential } from "./supabase-client.js";

const USER_AGENT = "ETHONE-Worker";

async function credentialForProvider(env, userId, provider) {
  const row = await getUserProviderCredential(env, userId, provider);
  const credential = row && typeof row === "object" ? row.credential || row : null;
  if (!credential || typeof credential !== "object") throw httpError("AUTH_REQUIRED", 401, { retryable: false });
  return credential;
}

function safeAnyUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    url.username = "";
    url.password = "";
    return url.href.slice(0, 1200);
  } catch {
    return "";
  }
}

function requireUrl(credential, fallback = "") {
  const url = safeAnyUrl(credential.url || fallback);
  if (!url) throw httpError("INVALID_PARAMETER", 400, { detail: "url" });
  return url;
}

function safeOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

async function getPlexProfile(env, userId) {
  const credential = await credentialForProvider(env, userId, "plex");
  const token = safeText(credential.apiKey, 4000);
  if (!token) throw httpError("AUTH_REQUIRED", 401, { retryable: false });

  const response = await requestExternal(new URL("https://plex.tv/api/v2/user"), {
    env,
    expectedOrigin: "https://plex.tv",
    service: "plex",
    headers: {
      accept: "application/json",
      "X-Plex-Token": token,
      "X-Plex-Client-Identifier": "ethone-dashboard",
      "user-agent": USER_AGENT,
    },
    retries: 0,
    maxBytes: 65536,
  });
  const data = response.data || {};
  return Object.freeze({
    id: safeText(data.id, 80),
    username: safeText(data.username || data.title, 120),
    email: safeText(data.email, 120),
    thumb: safePublicUrl(data.thumb, ["plex.tv"]),
  });
}

async function getJellyfinProfile(env, userId) {
  const credential = await credentialForProvider(env, userId, "jellyfin");
  const token = safeText(credential.apiKey, 4000);
  const baseUrl = requireUrl(credential);
  const response = await requestExternal(new URL("/Users", baseUrl), {
    env,
    expectedOrigin: safeOrigin(baseUrl),
    service: "jellyfin",
    headers: {
      accept: "application/json",
      "X-Emby-Token": token,
    },
    retries: 0,
    maxBytes: 256 * 1024,
  });
  const users = Array.isArray(response.data) ? response.data : [];
  const first = users[0] || {};
  return Object.freeze({
    id: safeText(first.Id, 80),
    name: safeText(first.Name, 120),
    serverName: safeText(first.ServerName, 120),
    userCount: safeNumber(users.length, 0, 1000),
  });
}

async function getEmbyProfile(env, userId) {
  const credential = await credentialForProvider(env, userId, "emby");
  const token = safeText(credential.apiKey, 4000);
  const baseUrl = requireUrl(credential);
  const response = await requestExternal(new URL("/emby/Users", baseUrl), {
    env,
    expectedOrigin: safeOrigin(baseUrl),
    service: "emby",
    headers: {
      accept: "application/json",
      "X-Emby-Token": token,
    },
    retries: 0,
    maxBytes: 256 * 1024,
  });
  const users = Array.isArray(response.data) ? response.data : [];
  const first = users[0] || {};
  return Object.freeze({
    id: safeText(first.Id, 80),
    name: safeText(first.Name, 120),
    serverName: safeText(first.ServerName, 120),
    userCount: safeNumber(users.length, 0, 1000),
  });
}

async function getLinearProfile(env, userId) {
  const credential = await credentialForProvider(env, userId, "linear");
  const token = safeText(credential.apiKey, 4000);
  const response = await requestExternal(new URL("https://api.linear.app/graphql"), {
    env,
    expectedOrigin: "https://api.linear.app",
    service: "linear",
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: token,
      "user-agent": USER_AGENT,
    },
    body: JSON.stringify({ query: "{ viewer { id name email } }" }),
    retries: 0,
    maxBytes: 65536,
  });
  const data = response.data?.data?.viewer || {};
  return Object.freeze({
    id: safeText(data.id, 80),
    name: safeText(data.name, 120),
    email: safeText(data.email, 120),
  });
}

async function getClickupProfile(env, userId) {
  const credential = await credentialForProvider(env, userId, "clickup");
  const token = safeText(credential.apiKey, 4000);
  const response = await requestExternal(new URL("https://api.clickup.com/api/v2/user"), {
    env,
    expectedOrigin: "https://api.clickup.com",
    service: "clickup",
    headers: {
      accept: "application/json",
      authorization: token,
      "user-agent": USER_AGENT,
    },
    retries: 0,
    maxBytes: 65536,
  });
  const data = response.data?.user || {};
  return Object.freeze({
    id: safeText(data.id, 80),
    username: safeText(data.username, 120),
    email: safeText(data.email, 120),
  });
}

async function getJiraProfile(env, userId) {
  const credential = await credentialForProvider(env, userId, "jira");
  const token = safeText(credential.apiKey, 4000);
  const domain = safeText(credential.domain, 120).replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!domain) throw httpError("INVALID_PARAMETER", 400, { detail: "domain" });
  const response = await requestExternal(new URL(`https://${domain}/rest/api/2/myself`), {
    env,
    expectedOrigin: `https://${domain}`,
    service: "jira",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      "user-agent": USER_AGENT,
    },
    retries: 0,
    maxBytes: 65536,
  });
  const data = response.data || {};
  return Object.freeze({
    accountId: safeText(data.accountId, 80),
    displayName: safeText(data.displayName, 120),
    email: safeText(data.emailAddress, 120),
    timeZone: safeText(data.timeZone, 80),
  });
}

async function getGitlabProfile(env, userId) {
  const credential = await credentialForProvider(env, userId, "gitlab");
  const token = safeText(credential.apiKey, 4000);
  const response = await requestExternal(new URL("https://gitlab.com/api/v4/user"), {
    env,
    expectedOrigin: "https://gitlab.com",
    service: "gitlab",
    headers: {
      accept: "application/json",
      "PRIVATE-TOKEN": token,
      "user-agent": USER_AGENT,
    },
    retries: 0,
    maxBytes: 65536,
  });
  const data = response.data || {};
  return Object.freeze({
    id: safeNumber(data.id, 0, 1_000_000_000),
    username: safeText(data.username, 120),
    name: safeText(data.name, 120),
    email: safeText(data.email, 120),
    avatarUrl: safePublicUrl(data.avatar_url, ["gitlab.com", "secure.gravatar.com"]),
    webUrl: safePublicUrl(data.web_url, ["gitlab.com"]),
  });
}

async function getObsidianProfile(env, userId) {
  const credential = await credentialForProvider(env, userId, "obsidian");
  const baseUrl = requireUrl(credential);
  const token = safeText(credential.apiKey, 4000);
  try {
    await requestExternal(new URL("/", baseUrl), {
      env,
      expectedOrigin: safeOrigin(baseUrl),
      service: "obsidian",
      headers: token ? { authorization: `Bearer ${token}` } : {},
      retries: 0,
      maxBytes: 8192,
      timeoutMs: 5000,
    });
    return Object.freeze({ reachable: true, url: baseUrl });
  } catch {
    return Object.freeze({ reachable: false, url: baseUrl });
  }
}

async function getVscodeProfile(env, userId) {
  const credential = await credentialForProvider(env, userId, "vscode");
  const baseUrl = requireUrl(credential);
  const token = safeText(credential.apiKey, 4000);
  try {
    await requestExternal(new URL("/", baseUrl), {
      env,
      expectedOrigin: safeOrigin(baseUrl),
      service: "vscode",
      headers: token ? { authorization: `Bearer ${token}` } : {},
      retries: 0,
      maxBytes: 8192,
      timeoutMs: 5000,
    });
    return Object.freeze({ reachable: true, url: baseUrl });
  } catch {
    return Object.freeze({ reachable: false, url: baseUrl });
  }
}

async function getFitbitProfile(env, userId) {
  const credential = await credentialForProvider(env, userId, "fitbit");
  const token = safeText(credential.apiKey, 4000);
  const response = await requestExternal(new URL("https://api.fitbit.com/1/user/-/profile.json"), {
    env,
    expectedOrigin: "https://api.fitbit.com",
    service: "fitbit",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      "user-agent": USER_AGENT,
    },
    retries: 0,
    maxBytes: 65536,
  });
  const data = response.data?.user || {};
  return Object.freeze({
    encodedId: safeText(data.encodedId, 80),
    displayName: safeText(data.displayName, 120),
    fullName: safeText(data.fullName, 120),
    avatarUrl: safePublicUrl(data.avatar, ["api.fitbit.com", "fitbit.com", "static0.fitbit.com"]),
  });
}

const HANDLERS = {
  plex: getPlexProfile,
  jellyfin: getJellyfinProfile,
  emby: getEmbyProfile,
  linear: getLinearProfile,
  clickup: getClickupProfile,
  jira: getJiraProfile,
  gitlab: getGitlabProfile,
  obsidian: getObsidianProfile,
  vscode: getVscodeProfile,
  fitbit: getFitbitProfile,
};

export async function getCatalogProfile(env, userId, provider) {
  const handler = HANDLERS[provider];
  if (!handler) throw httpError("INVALID_PARAMETER", 400, { detail: "provider" });
  return handler(env, userId);
}

export const CATALOG_PROVIDERS = Object.keys(HANDLERS);
