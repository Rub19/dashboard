import { requestExternal } from "../utils/external-request.js";

const ALLOWED_RESULTS = new Set(["pass", "fail", "neutral", "none"]);
const RESULT_KEYWORDS = ["pass", "fail", "neutral", "softfail", "none", "permerror", "temperror"];

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

function getHeader(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === "function") {
    return headers.get(name) || headers.get(name.toLowerCase()) || null;
  }
  return headers[name] || headers[name.toLowerCase()] || null;
}

function mailDomain(email) {
  return String(email || "").split("@")[1] || "";
}

function normalizeResult(value) {
  const v = String(value || "").toLowerCase();
  if (v === "pass") return "pass";
  if (v === "fail" || v === "softfail" || v === "permerror" || v === "temperror") return "fail";
  if (v === "neutral") return "neutral";
  if (v === "none") return "none";
  return null;
}

export function parseAuthResults(headers) {
  const auth = String(getHeader(headers, "Authentication-Results") || "");
  const spfReceived = String(getHeader(headers, "Received-SPF") || "");
  const combined = `${auth}\n${spfReceived}`;
  const result = { spf: "none", dkim: "none", dmarc: "none" };

  for (const key of ["spf", "dkim", "dmarc"]) {
    const regex = new RegExp(`\\b${key}=(${RESULT_KEYWORDS.join("|")})`, "gi");
    const matches = [...combined.matchAll(regex)].map((m) => normalizeResult(m[1]));
    if (!matches.length) continue;
    if (matches.includes("pass")) result[key] = "pass";
    else if (matches.includes("fail")) result[key] = "fail";
    else if (matches.includes("neutral")) result[key] = "neutral";
    else result[key] = "none";
  }

  if (result.spf === "none" && spfReceived) {
    const first = normalizeResult(spfReceived.trim().split(/\s+/)[0]);
    if (first) result.spf = first;
  }

  return result;
}

export function extractSourceIp(message) {
  if (message?.source_ip) return String(message.source_ip);
  const headers = message?.headers;
  if (!headers) return "";

  const get = (name) => String(getHeader(headers, name) || "").trim();
  const forwarded = get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }

  for (const name of ["cf-connecting-ip", "x-real-ip", "x-originating-ip", "remote-addr", "x-client-ip"]) {
    const value = get(name);
    if (value) return value;
  }

  const received = get("received");
  if (received) {
    const bracket = received.match(/\[([0-9a-fA-F:.]+)\]/);
    if (bracket) return bracket[1];
    const client = received.match(/client-ip=([0-9a-fA-F:.]+)/i);
    if (client) return client[1];
  }

  return "";
}

async function findMatch(env, userId, table, email, domain) {
  const orParts = [];
  if (email) orParts.push(`email.eq.${encodeURIComponent(email)}`);
  if (domain) orParts.push(`domain.eq.${encodeURIComponent(domain)}`);
  if (!orParts.length) return null;

  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_${table}?user_id=eq.${userId}&or=(${orParts.join(",")})&limit=1`, {
    method: "GET",
    headers: { "Accept": "application/vnd.pgrst.object+json" },
    maxBytes: 4096
  });
  return firstRow(response);
}

export async function isBlocked(env, userId, from) {
  const email = safeEmail(from);
  const domain = email ? mailDomain(email) : "";
  const rule = await findMatch(env, userId, "blocked_senders", email, domain);
  return { blocked: !!rule, rule };
}

export async function isTrusted(env, userId, from) {
  const email = safeEmail(from);
  const domain = email ? mailDomain(email) : "";
  const rule = await findMatch(env, userId, "trusted_senders", email, domain);
  return { trusted: !!rule, rule };
}

export async function blockSender(env, userId, { email, domain, reason }) {
  const safe = safeEmail(email) || null;
  const dom = (domain ? safeText(domain, 120).toLowerCase() : "").replace(/[^a-z0-9.-]/g, "") || null;
  if (!safe && !dom) throw new TypeError("Email or domain required.");

  const response = await supabaseRequest(env, "/rest/v1/ethone_mail_blocked_senders", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: {
      user_id: userId,
      email: safe,
      domain: dom,
      reason: safeText(reason, 80) || "manual"
    },
    maxBytes: 4096
  });
  return firstRow(response);
}

export async function unblockSender(env, userId, id) {
  await supabaseRequest(env, `/rest/v1/ethone_mail_blocked_senders?id=eq.${encodeURIComponent(id)}&user_id=eq.${userId}`, {
    method: "DELETE",
    maxBytes: 2048
  });
  return { deleted: true };
}

export async function trustSender(env, userId, { email, domain }) {
  const safe = safeEmail(email) || null;
  const dom = (domain ? safeText(domain, 120).toLowerCase() : "").replace(/[^a-z0-9.-]/g, "") || null;
  if (!safe && !dom) throw new TypeError("Email or domain required.");

  const response = await supabaseRequest(env, "/rest/v1/ethone_mail_trusted_senders", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: {
      user_id: userId,
      email: safe,
      domain: dom
    },
    maxBytes: 4096
  });
  return firstRow(response);
}

export async function untrustSender(env, userId, id) {
  await supabaseRequest(env, `/rest/v1/ethone_mail_trusted_senders?id=eq.${encodeURIComponent(id)}&user_id=eq.${userId}`, {
    method: "DELETE",
    maxBytes: 2048
  });
  return { deleted: true };
}

export async function listBlocked(env, userId, limit = 50) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_blocked_senders?user_id=eq.${userId}&order=created_at.desc&limit=${safeLimit}`, {
    method: "GET",
    maxBytes: 8192
  });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function listTrusted(env, userId, limit = 50) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const response = await supabaseRequest(env, `/rest/v1/ethone_mail_trusted_senders?user_id=eq.${userId}&order=created_at.desc&limit=${safeLimit}`, {
    method: "GET",
    maxBytes: 8192
  });
  return Array.isArray(response?.data) ? response.data : [];
}
