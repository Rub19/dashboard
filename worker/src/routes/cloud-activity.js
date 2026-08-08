import { httpError } from "../middleware/errors.js";
import { assertAllowedQuery } from "../middleware/validation.js";
import { getActivitySummary, listActivity } from "../services/cloud-activity-client.js";

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
