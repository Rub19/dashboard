import { httpError } from "../middleware/errors.js";
import { PATTERNS } from "../middleware/validation.js";
import { disconnectTodoist, exchangeTodoistCode, getNextTask } from "../services/todoist-oauth-client.js";

const CODE_RE = /^[A-Za-z0-9_-]{10,512}$/;

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

export async function todoistOAuthExchangeRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 2);
  const code = requireField(body, "code", CODE_RE);
  const clientId = requireField(body, "clientId", PATTERNS.todoistClientId);
  await exchangeTodoistCode(env, auth.userId, { code, clientId });
  return { data: { connected: true } };
}

export async function todoistTasksRoute({ env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const result = await getNextTask(env, auth.userId);
  return { data: result };
}

export async function todoistOAuthDisconnectRoute({ env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  await disconnectTodoist(env, auth.userId);
  return { data: { connected: false } };
}
