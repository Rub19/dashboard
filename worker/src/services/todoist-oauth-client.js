import { httpError } from "../middleware/errors.js";
import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeNumber, safeText } from "../utils/normalize.js";
import { deleteOAuthToken, getOAuthToken, setOAuthToken } from "./supabase-client.js";

const TOKEN_ORIGIN = "https://todoist.com";
const API_ORIGIN = "https://api.todoist.com";
const REDIRECT_URI = "https://ethone.dev/";
const PROVIDER = "todoist";

export async function exchangeTodoistCode(env, userId, { code, clientId, clientSecret }) {
  const secret = clientSecret ? clientSecret : requireSecret(env, "TODOIST_CLIENT_SECRET");
  const response = await requestExternal(new URL("/oauth/access_token", TOKEN_ORIGIN), {
    env,
    expectedOrigin: TOKEN_ORIGIN,
    service: "todoist",
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: secret, code, redirect_uri: REDIRECT_URI }).toString(),
    retries: 0,
    maxBytes: 8192
  });
  const data = response.data;
  if (!data?.access_token) throw httpError("PROVIDER_REQUEST_REJECTED", 502, { retryable: false });
  await setOAuthToken(env, userId, PROVIDER, {
    accessToken: safeText(data.access_token, 4000),
    refreshToken: "",
    scope: safeText(data.token_type, 60),
    expiresAt: null
  });
  return true;
}

async function accessToken(env, userId) {
  const stored = await getOAuthToken(env, userId, PROVIDER);
  if (!stored?.accessToken) throw httpError("AUTH_REQUIRED", 401, { retryable: false });
  return stored.accessToken;
}

function normalizeTask(task) {
  return Object.freeze({
    id: safeText(task?.id, 64),
    content: safeText(task?.content, 200) || "(Sans titre)",
    due: safeText(task?.due?.date, 40),
    dueDateTime: safeText(task?.due?.datetime, 40),
    priority: safeNumber(task?.priority, 1, 4)
  });
}

export async function getNextTask(env, userId) {
  const token = await accessToken(env, userId);
  let response;
  try {
    response = await requestExternal(new URL("/rest/v2/tasks", API_ORIGIN), {
      env,
      expectedOrigin: API_ORIGIN,
      service: "todoist",
      dedupeKey: `tasks:${userId}`,
      headers: { authorization: `Bearer ${token}` },
      retries: 1,
      maxBytes: 512 * 1024
    });
  } catch (error) {
    if (error?.status === 502) throw httpError("AUTH_EXPIRED", 401, { retryable: false });
    throw error;
  }
  const items = Array.isArray(response.data) ? response.data : [];
  const withDue = items.filter((task) => task?.due?.date);
  withDue.sort((left, right) => String(left.due?.datetime || left.due?.date).localeCompare(String(right.due?.datetime || right.due?.date)));
  const chosen = withDue[0] || items[0] || null;
  return Object.freeze({
    task: chosen ? normalizeTask(chosen) : null,
    openCount: items.length
  });
}

export async function disconnectTodoist(env, userId) {
  await deleteOAuthToken(env, userId, PROVIDER);
  return true;
}
