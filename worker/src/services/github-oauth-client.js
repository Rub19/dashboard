import { httpError } from "../middleware/errors.js";
import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeNumber, safePublicUrl, safeText } from "../utils/normalize.js";
import { deleteOAuthToken, getOAuthToken, setOAuthToken } from "./supabase-client.js";

const TOKEN_ORIGIN = "https://github.com";
const API_ORIGIN = "https://api.github.com";
const REDIRECT_URI = "https://ethone.dev/";
const USER_AGENT = "ETHONE-Worker";

export async function exchangeGithubCode(env, userId, { code, clientId, clientSecret }) {
  const secret = clientSecret ? clientSecret : requireSecret(env, "GITHUB_CLIENT_SECRET");
  const response = await requestExternal(new URL("/login/oauth/access_token", TOKEN_ORIGIN), {
    env,
    expectedOrigin: TOKEN_ORIGIN,
    service: "github",
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json", "user-agent": USER_AGENT },
    body: new URLSearchParams({ client_id: clientId, client_secret: secret, code, redirect_uri: REDIRECT_URI }).toString(),
    retries: 0,
    maxBytes: 8192
  });
  const data = response.data;
  if (data?.error || !data?.access_token) throw httpError("PROVIDER_REQUEST_REJECTED", 502, { retryable: false });
  await setOAuthToken(env, userId, "github", {
    accessToken: safeText(data.access_token, 4000),
    refreshToken: "",
    scope: safeText(data.scope, 500),
    expiresAt: null
  });
  return true;
}

async function accessToken(env, userId) {
  const stored = await getOAuthToken(env, userId, "github");
  if (!stored?.accessToken) throw httpError("AUTH_REQUIRED", 401, { retryable: false });
  return stored.accessToken;
}

function githubHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "user-agent": USER_AGENT,
    "x-github-api-version": "2022-11-28"
  };
}

async function githubRequest(env, path, token, dedupeKey, query) {
  const url = new URL(path, API_ORIGIN);
  Object.entries(query || {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  try {
    return await requestExternal(url, {
      env,
      expectedOrigin: API_ORIGIN,
      service: "github",
      dedupeKey,
      headers: githubHeaders(token),
      retries: 1,
      maxBytes: 256 * 1024
    });
  } catch (error) {
    if (error?.status === 502) throw httpError("AUTH_EXPIRED", 401, { retryable: false });
    throw error;
  }
}

function summarizeEvent(event) {
  const type = safeText(event?.type, 60);
  const repo = safeText(event?.repo?.name, 200);
  if (!type || !repo) return null;
  const kind = type.replace(/Event$/, "");
  const labels = Object.freeze({
    Push: "Push",
    PullRequest: "Pull Request",
    Issues: "Issue",
    IssueComment: "Commentaire",
    Create: "Creation",
    Watch: "Star",
    Fork: "Fork",
    Release: "Publication"
  });
  return Object.freeze({
    kind: labels[kind] || kind,
    repo,
    at: safeText(event?.created_at, 40)
  });
}

export async function getGithubProfile(env, userId) {
  const token = await accessToken(env, userId);
  const profileResponse = await githubRequest(env, "/user", token, `github:profile:${userId}`);
  const profile = profileResponse.data || {};
  const login = safeText(profile.login, 80);
  const eventsResponse = login
    ? await githubRequest(env, `/users/${encodeURIComponent(login)}/events/public`, token, `github:events:${userId}`, { per_page: 5 }).catch(() => null)
    : null;
  const events = Array.isArray(eventsResponse?.data) ? eventsResponse.data : [];
  const recentEvent = events.map(summarizeEvent).find(Boolean) || null;
  return Object.freeze({
    login,
    name: safeText(profile.name, 120) || login,
    avatarUrl: safePublicUrl(profile.avatar_url, ["githubusercontent.com"]),
    htmlUrl: safePublicUrl(profile.html_url, ["github.com"]),
    publicRepos: safeNumber(profile.public_repos, 0, 1000000),
    followers: safeNumber(profile.followers, 0, 1000000),
    recentEvent
  });
}

export async function disconnectGithub(env, userId) {
  await deleteOAuthToken(env, userId, "github");
  return true;
}
