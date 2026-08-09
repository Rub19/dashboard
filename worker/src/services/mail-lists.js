import { requestExternal } from "../utils/external-request.js";

function safeText(value, limit = 320) {
  const raw = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return raw.slice(0, limit);
}

function safeEmail(value) {
  const email = safeText(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function projectOrigin(env) {
  let url;
  try {
    url = new URL(String(env.SUPABASE_URL || ""));
  } catch {
    return "";
  }
  return url.protocol === "https:" ? url.origin : "";
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

function normalizeAlias(value) {
  return safeEmail(value);
}

export async function listLists(env, userId, limit = 50) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return [];
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_lists?user_id=eq.${userId}&order=created_at.desc&limit=${safeLimit}`, {
    method: "GET",
    maxBytes: 16384
  });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function createList(env, userId, { alias_address, name, description, is_public, reply_to_list }) {
  const origin = projectOrigin(env);
  if (!origin || !userId) throw new Error("Invalid context.");

  const alias = normalizeAlias(alias_address);
  if (!alias) throw new Error("A valid alias address is required.");
  if (!safeText(name, 80)) throw new Error("List name is required.");

  const response = await supabaseRequest(env, "/rest/v1/ethone_mail_lists", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: {
      user_id: userId,
      alias_address: alias,
      name: safeText(name, 80),
      description: safeText(description, 500),
      is_public: is_public === true,
      reply_to_list: reply_to_list === true
    },
    maxBytes: 4096
  });
  return firstRow(response);
}

export async function updateList(env, userId, id, payload) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !id) throw new Error("Invalid context.");

  const patch = {};
  if (payload?.alias_address !== undefined) {
    const alias = normalizeAlias(payload.alias_address);
    if (alias) patch.alias_address = alias;
  }
  if (payload?.name !== undefined) patch.name = safeText(payload.name, 80);
  if (payload?.description !== undefined) patch.description = safeText(payload.description, 500);
  if (payload?.is_public !== undefined) patch.is_public = payload.is_public === true;
  if (payload?.reply_to_list !== undefined) patch.reply_to_list = payload.reply_to_list === true;

  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_lists?id=eq.${id}&user_id=eq.${userId}`, {
    method: "PATCH",
    headers: { "Prefer": "return=representation" },
    body: patch,
    maxBytes: 4096
  });
  return firstRow(response);
}

export async function deleteList(env, userId, id) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !id) throw new Error("Invalid context.");

  await supabaseRequest(env, `/rest/v1/ethone_mail_list_members?list_id=eq.${id}`, {
    method: "DELETE",
    maxBytes: 2048
  }).catch(() => null);

  await supabaseRequest(env, `/rest/v1/ethone_mail_lists?id=eq.${id}&user_id=eq.${userId}`, {
    method: "DELETE",
    maxBytes: 2048
  });
  return { deleted: true };
}

export async function listMembers(env, userId, listId, limit = 50) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !listId) return [];

  const list = await supabaseRequest(env, `/rest/v1/ethone_mail_lists?id=eq.${listId}&user_id=eq.${userId}&limit=1`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 4096
  }).then(firstRow);

  if (!list) return [];

  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_list_members?list_id=eq.${listId}&order=created_at.desc&limit=${safeLimit}`, {
    method: "GET",
    maxBytes: 16384
  });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function addMember(env, userId, listId, { email, name }) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !listId) throw new Error("Invalid context.");

  const list = await supabaseRequest(env, `/rest/v1/ethone_mail_lists?id=eq.${listId}&user_id=eq.${userId}&limit=1`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 4096
  }).then(firstRow);

  if (!list) throw new Error("List not found.");

  const memberEmail = safeEmail(email);
  if (!memberEmail) throw new Error("A valid email is required.");

  const response = await supabaseRequest(env, "/rest/v1/ethone_mail_list_members", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: {
      list_id: listId,
      email: memberEmail,
      name: safeText(name, 80),
      is_active: true
    },
    maxBytes: 4096
  });
  return firstRow(response);
}

export async function removeMember(env, userId, listId, memberId) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !listId || !memberId) throw new Error("Invalid context.");

  const list = await supabaseRequest(env, `/rest/v1/ethone_mail_lists?id=eq.${listId}&user_id=eq.${userId}&limit=1`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 4096
  }).then(firstRow);

  if (!list) throw new Error("List not found.");

  await supabaseRequest(env, `/rest/v1/ethone_mail_list_members?id=eq.${memberId}&list_id=eq.${listId}`, {
    method: "DELETE",
    maxBytes: 2048
  });
  return { deleted: true };
}

export async function getListByAlias(env, alias) {
  const origin = projectOrigin(env);
  if (!origin || !alias) return null;
  const safe = safeEmail(alias);
  if (!safe) return null;
  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_lists?alias_address=eq.${encodeURIComponent(safe)}&limit=1`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 4096
  });
  return firstRow(response);
}

export async function getListById(env, userId, listId) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !listId) return null;
  return supabaseRequest(env, `/rest/v1/ethone_mail_lists?id=eq.${listId}&user_id=eq.${userId}&limit=1`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 4096
  }).then(firstRow);
}

export async function forwardToList(env, userId, list, message, resendApiKey) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !list?.id) return { forwarded: 0, results: [] };

  const apiKey = resendApiKey || env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Resend API key not configured.");

  const members = await listMembers(env, userId, list.id, 1000);
  const active = members.filter((m) => m.is_active !== false);
  if (!active.length) return { forwarded: 0, results: [] };

  const fromName = list.name || "ETHONE";
  const from = `"${fromName}" <${list.alias_address}>`;
  const subject = `[${list.name}] ${safeText(message?.subject, 998) || "List message"}`;
  const text = safeText(message?.body_text, 50000) || "";
  const html = safeText(message?.body_html, 50000) || `<p>${safeText(text, 50000)}</p>`;
  const replyTo = list.reply_to_list ? list.alias_address : null;

  const results = [];
  for (const member of active) {
    try {
      const response = await requestExternal(new URL("https://api.resend.com/emails"), {
        env,
        expectedOrigin: "https://api.resend.com",
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          from,
          to: [member.email],
          subject,
          text,
          html,
          ...(replyTo ? { reply_to: replyTo } : {})
        }),
        timeoutMs: 12000,
        maxBytes: 16384
      });
      results.push({ email: member.email, sent: true, id: response?.data?.id });
    } catch (error) {
      results.push({ email: member.email, sent: false, error: error.message || error.code });
    }
  }

  return { forwarded: results.filter((r) => r.sent).length, results };
}
