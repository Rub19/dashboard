import { httpError } from "../middleware/errors.js";
import { assertAllowedQuery } from "../middleware/validation.js";
import { getActivitySummary, listActivity, recordActivities } from "../services/cloud-activity-client.js";

function readJsonBody(request, maxFields = 2) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw httpError("INVALID_REQUEST", 400);
  return request.json().then((body) => {
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length > maxFields) throw httpError("INVALID_REQUEST", 400);
    return body;
  }).catch(() => {
    throw httpError("INVALID_REQUEST", 400);
  });
}

export async function cloudActivityListRoute({ url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, ["limit", "since"]);
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit")) || 100));
  const since = String(url.searchParams.get("since") || "").trim();
  const events = await listActivity(env, auth.userId, { limit, since });
  return { data: { events } };
}

export async function cloudActivitySummaryRoute({ url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, []);
  const summary = await getActivitySummary(env, auth.userId);
  return { data: summary };
}

export async function cloudActivityCreateRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 2);
  const events = Array.isArray(body.events) ? body.events : [];
  const count = await recordActivities(env, auth.userId, events);
  return { data: { count } };
}
