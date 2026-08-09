import { httpError } from "../middleware/errors.js";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  syncAccount,
  updateAccount
} from "../services/mail-accounts.js";

function safeText(value, limit = 320) {
  const raw = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return raw.slice(0, limit);
}

function safeEmail(value) {
  const email = safeText(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function requireId(body, field = "id") {
  const id = safeText(body?.[field], 64);
  if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: field });
  return id;
}

export async function mailAccountsRoute({ request, env, auth }) {
  if (request.method !== "GET" && request.method !== "POST" && request.method !== "PATCH" && request.method !== "DELETE") {
    throw httpError("METHOD_NOT_ALLOWED", 405);
  }

  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const url = new URL(request.url);

  if (request.method === "GET") {
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
    const accounts = await listAccounts(env, auth.userId, limit);
    return { data: accounts };
  }

  const body = await request.json().catch(() => ({}));

  if (url.pathname.endsWith("/sync")) {
    if (request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);
    const id = requireId(body);
    const result = await syncAccount(env, auth.userId, id);
    return { data: result };
  }

  if (request.method === "DELETE") {
    const id = requireId(body);
    const result = await deleteAccount(env, auth.userId, id);
    return { data: result };
  }

  if (request.method === "PATCH") {
    const id = requireId(body);
    const result = await updateAccount(env, auth.userId, id, body);
    return { data: result };
  }

  // POST: create account.
  const payload = {
    provider: safeText(body.provider, 40),
    email: safeEmail(body.email),
    name: body.name,
    is_enabled: body.is_enabled,
    credentials: body.credentials
  };

  if (payload.provider === "imap") {
    payload.imap_host = body.imap_host;
    payload.imap_port = body.imap_port;
    payload.imap_username = body.imap_username;
    payload.imap_password = body.imap_password;
    payload.imap_secure = body.imap_secure;
    payload.smtp_host = body.smtp_host;
    payload.smtp_port = body.smtp_port;
    payload.smtp_username = body.smtp_username;
    payload.smtp_password = body.smtp_password;
    payload.smtp_secure = body.smtp_secure;
  } else {
    payload.access_token = body.access_token;
    payload.refresh_token = body.refresh_token;
    payload.expires_at = body.expires_at;
    payload.scope = body.scope;
  }

  const account = await createAccount(env, auth.userId, payload);
  return { data: account };
}
