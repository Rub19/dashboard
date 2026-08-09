import { httpError } from "../middleware/errors.js";
import { getMailStats } from "../services/mail-analytics.js";

const ALLOWED_FOLDERS = new Set(["inbox", "starred", "sent", "drafts", "archive", "spam", "trash"]);

function safeFolder(value) {
  return ALLOWED_FOLDERS.has(value) ? value : undefined;
}

export async function mailAnalyticsRoute({ request, env, auth }) {
  if (request.method !== "GET") throw httpError("METHOD_NOT_ALLOWED", 405);
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);

  const url = new URL(String(request.url));
  const period = Math.max(1, Math.min(365, Number(url.searchParams.get("period")) || 30));
  const folder = safeFolder(url.searchParams.get("folder"));

  const stats = await getMailStats(env, auth.userId, { period, folder });
  return { data: stats };
}
