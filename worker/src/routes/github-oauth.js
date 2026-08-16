import { httpError } from "../middleware/errors.js";
import { PATTERNS } from "../middleware/validation.js";
import { disconnectGithub, exchangeGithubCode, getGithubProfile } from "../services/github-oauth-client.js";

const CODE_RE = /^[A-Za-z0-9_-]{10,255}$/;

async function readJsonBody(request, maxFields) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw httpError("INVALID_REQUEST", 400);
  let body;
  try {
    body = await request.json();
  } catch {
    throw httpError("INVALID_REQUEST", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length > maxFields) throw httpError("INVALID_REQUEST", 400);
  return body;
}

function requireField(body, key, pattern) {
  const value = String(body[key] || "");
  if (!pattern.test(value)) throw httpError("INVALID_PARAMETER", 400);
  return value;
}

export async function githubOAuthExchangeRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 3);
  const code = requireField(body, "code", CODE_RE);
  const clientId = requireField(body, "clientId", PATTERNS.githubClientId);
  const clientSecret = body.clientSecret ? String(body.clientSecret) : undefined;
  await exchangeGithubCode(env, auth.userId, { code, clientId, clientSecret });
  return { data: { connected: true } };
}

export async function githubProfileRoute({ env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const profile = await getGithubProfile(env, auth.userId);
  return { data: profile };
}

export async function githubOAuthDisconnectRoute({ env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  await disconnectGithub(env, auth.userId);
  return { data: { connected: false } };
}
