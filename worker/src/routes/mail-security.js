import { httpError } from "../middleware/errors.js";
import {
  blockSender,
  listBlocked,
  listTrusted,
  trustSender,
  unblockSender,
  untrustSender
} from "../services/mail-security.js";

function safeText(value, limit = 320) {
  const raw = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return raw.slice(0, limit);
}

function safeEmail(value) {
  const email = safeText(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

async function readJsonBody(request, maxFields = 20) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) return {};
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length > maxFields) return {};
    return body;
  } catch {
    return {};
  }
}

function parseLimit(url) {
  const raw = url?.searchParams?.get("limit");
  return Math.min(100, Math.max(1, Number(raw) || 50));
}

export async function mailBlockedRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);
  const method = request.method;

  if (method === "GET") {
    const url = new URL(request.url);
    const limit = parseLimit(url);
    const data = await listBlocked(env, auth.userId, limit);
    return { data, meta: { limit } };
  }

  if (method === "DELETE") {
    const body = await readJsonBody(request, 2);
    const id = safeText(body.id, 64);
    if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });
    const result = await unblockSender(env, auth.userId, id);
    return { data: result };
  }

  if (method === "POST") {
    const body = await readJsonBody(request, 4);
    const email = safeEmail(body.email);
    const domain = safeText(body.domain, 120).toLowerCase();
    const reason = safeText(body.reason, 80);
    if (!email && !domain) throw httpError("INVALID_PARAMETER", 400, { detail: "email or domain" });
    try {
      const data = await blockSender(env, auth.userId, { email, domain, reason });
      return { data };
    } catch (error) {
      if (error?.message?.includes("Email or domain required")) {
        throw httpError("INVALID_PARAMETER", 400, { detail: "email or domain" });
      }
      throw error;
    }
  }

  throw httpError("METHOD_NOT_ALLOWED", 405);
}

export async function mailTrustedRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);
  const method = request.method;

  if (method === "GET") {
    const url = new URL(request.url);
    const limit = parseLimit(url);
    const data = await listTrusted(env, auth.userId, limit);
    return { data, meta: { limit } };
  }

  if (method === "DELETE") {
    const body = await readJsonBody(request, 2);
    const id = safeText(body.id, 64);
    if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });
    const result = await untrustSender(env, auth.userId, id);
    return { data: result };
  }

  if (method === "POST") {
    const body = await readJsonBody(request, 3);
    const email = safeEmail(body.email);
    const domain = safeText(body.domain, 120).toLowerCase();
    if (!email && !domain) throw httpError("INVALID_PARAMETER", 400, { detail: "email or domain" });
    try {
      const data = await trustSender(env, auth.userId, { email, domain });
      return { data };
    } catch (error) {
      if (error?.message?.includes("Email or domain required")) {
        throw httpError("INVALID_PARAMETER", 400, { detail: "email or domain" });
      }
      throw error;
    }
  }

  throw httpError("METHOD_NOT_ALLOWED", 405);
}
