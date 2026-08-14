import { requestExternal } from "../utils/external-request.js";
import { httpError } from "../middleware/errors.js";

function safeText(value, limit = 240) {
  const raw = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return raw.slice(0, limit);
}

function safeEmail(value) {
  const email = safeText(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function projectOrigin(env) {
  try {
    const url = new URL(String(env.SUPABASE_URL || ""));
    return url.protocol === "https:" ? url.origin : "";
  } catch {
    return "";
  }
}

function supabaseHeaders(secret) {
  return { apikey: secret, "content-type": "application/json", Authorization: `Bearer ${secret}` };
}

async function supabaseRequest(env, path, options = {}) {
  const origin = projectOrigin(env);
  const secret = env.SUPABASE_SECRET_KEY;
  if (!origin || !secret) throw httpError("SERVICE_UNAVAILABLE", 503);
  const url = new URL(path, `${origin}/`);
  const response = await requestExternal(url, {
    env,
    expectedOrigin: origin,
    service: "supabase",
    method: options.method || "GET",
    headers: supabaseHeaders(secret),
    body: options.body,
    maxBytes: options.maxBytes || 8192
  });
  return response.data;
}

export async function teamMembersRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const method = String(request.method || "GET").toUpperCase();

  if (method === "GET") {
    const data = await supabaseRequest(env, `/rest/v1/ethone_team_members?owner_id=eq.${encodeURIComponent(auth.userId)}&order=invited_at.desc`);
    return { data: Array.isArray(data) ? data : [] };
  }

  if (method === "POST") {
    const body = await request.json().catch(() => ({}));
    const email = safeEmail(body.email);
    const role = safeText(body.role, 20) || "member";
    const displayName = safeText(body.display_name || body.displayName, 80);
    if (!email) throw httpError("INVALID_PARAMETER", 400, { detail: "email" });

    const token = [...Array(32)].map(() => Math.random().toString(36)[2]).join("");
    const inviteUrl = `${env.DASHBOARD_ORIGIN || "https://ethone.dev"}/team/join?token=${token}`;

    const insert = await supabaseRequest(env, "/rest/v1/ethone_team_members", {
      method: "POST",
      body: JSON.stringify({
        owner_id: auth.userId,
        email,
        role,
        status: "pending",
        display_name: displayName,
        invite_token: token
      })
    });

    const sent = await sendInviteEmail(env, email, displayName, inviteUrl);
    return { data: { member: insert?.[0] || insert, sent } };
  }

  if (method === "DELETE") {
    const body = await request.json().catch(() => ({}));
    const id = safeText(body.id, 64);
    if (!id) throw httpError("INVALID_PARAMETER", 400);
    await supabaseRequest(env, `/rest/v1/ethone_team_members?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(auth.userId)}`, { method: "DELETE", maxBytes: 2048 });
    return { data: { deleted: true } };
  }

  if (method === "PATCH") {
    const body = await request.json().catch(() => ({}));
    const id = safeText(body.id, 64);
    const role = safeText(body.role, 20) || "member";
    const status = safeText(body.status, 20);
    if (!id) throw httpError("INVALID_PARAMETER", 400);
    const updates = { role };
    if (status) {
      updates.status = status;
      updates.updated_at = new Date().toISOString();
      if (status === "active") {
        updates.accepted_at = new Date().toISOString();
      }
    }
    const update = await supabaseRequest(env, `/rest/v1/ethone_team_members?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(auth.userId)}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
      maxBytes: 2048
    });
    return { data: { updated: true, member: Array.isArray(update) ? update[0] : update } };
  }

  throw httpError("METHOD_NOT_ALLOWED", 405);
}

async function sendInviteEmail(env, email, displayName, inviteUrl) {
  const resendKey = env.RESEND_API_KEY;
  const from = env.RESEND_FROM || env.SMTP_FROM;
  if (!resendKey || !from) return false;
  try {
    await requestExternal("https://api.resend.com/emails", {
      env,
      method: "POST",
      expectedOrigin: "https://api.resend.com",
      headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: email,
        subject: "Invitation à rejoindre ETHONE",
        text: `Bonjour ${displayName || "collègue"},\n\nVous êtes invité à rejoindre une équipe sur ETHONE.\n\nLien : ${inviteUrl}\n\nCe lien est personnel.\n— ETHONE`,
        html: `<p>Bonjour ${displayName || "collègue"},</p><p>Vous êtes invité à rejoindre une équipe sur ETHONE.</p><p><a href="${inviteUrl}" style="padding:10px 16px;background:#7be5c3;color:#07110e;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Rejoindre l'équipe</a></p><p>Ce lien est personnel.</p><p>— ETHONE</p>`
      })
    });
    return true;
  } catch {
    return false;
  }
}
