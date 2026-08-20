import { httpError } from "../middleware/errors.js";
import { requestExternal } from "../utils/external-request.js";
import { safeText } from "../utils/normalize.js";

const ADMIN_EMAILS = new Set(["rub19.mailpro@gmail.com"]);

function projectOrigin(env) {
  try {
    const url = new URL(String(env.SUPABASE_URL || ""));
    return url.protocol === "https:" ? url.origin : "";
  } catch {
    return "";
  }
}

function serviceHeaders(secret) {
  const headers = { apikey: secret, "content-type": "application/json" };
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret)) {
    headers.Authorization = `Bearer ${secret}`;
  }
  return headers;
}

function supabaseRequest(env, path, options = {}) {
  const origin = projectOrigin(env);
  const secret = env.SUPABASE_SECRET_KEY;
  return requestExternal(new URL(path, origin), {
    env,
    expectedOrigin: origin,
    service: "supabase",
    method: options.method || "GET",
    headers: { ...serviceHeaders(secret), ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
    retries: options.retries ?? 0,
    maxBytes: options.maxBytes ?? 8192
  });
}

function firstRow(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

async function countTable(env, table, filter = "") {
  try {
    const separator = filter.includes("?") ? "&" : "?";
    const query = filter ? `${filter}${separator}select=count` : `?select=count`;
    const response = await supabaseRequest(env, `/rest/v1/${safeText(table, 64)}${query}`, {
      method: "GET",
      maxBytes: 4096
    });
    const row = firstRow(response);
    return Number(row?.count) || 0;
  } catch {
    return 0;
  }
}

async function countByKind(env, kind) {
  return countTable(env, "ethone_items", `kind=eq.${encodeURIComponent(kind)}`);
}

export async function adminStatsRoute({ request, env, auth }) {
  if (request.method !== "GET") throw httpError("METHOD_NOT_ALLOWED", 405);
  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);
  if (!ADMIN_EMAILS.has(String(auth.email || "").toLowerCase())) throw httpError("FORBIDDEN", 403);

  const [
    users,
    items,
    notes,
    tasks,
    events,
    files,
    aliases,
    messages,
    threads,
    aiUsage,
    userData,
    teamMembers
  ] = await Promise.all([
    countTable(env, "ethone_profiles"),
    countTable(env, "ethone_items"),
    countByKind(env, "note"),
    countByKind(env, "task"),
    countByKind(env, "event"),
    countTable(env, "ethone_cloud_files"),
    countTable(env, "ethone_mail_aliases"),
    countTable(env, "ethone_mail_messages"),
    countTable(env, "ethone_mail_threads"),
    countTable(env, "ai_usage_logs"),
    countTable(env, "ethone_user_data"),
    countTable(env, "ethone_team_members")
  ]);

  return {
    data: {
      users,
      content: { items, notes, tasks, events, files },
      mail: { aliases, messages, threads },
      activity: { aiUsage, userData, teamMembers },
      generatedAt: new Date().toISOString()
    }
  };
}
