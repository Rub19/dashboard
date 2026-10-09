import { requestExternal } from "../utils/external-request.js";

/**
 * Redirections : les mails reçus sur une adresse ETHONE (@ethone.dev) sont recopiés vers des boîtes externes
 * (Gmail, iCloud…). Une destination ne reçoit rien tant que son propriétaire n'a pas saisi le code à 6 chiffres
 * qu'on lui a envoyé : impossible de rediriger vers une boîte qu'on ne possède pas, ni de s'en servir pour spammer.
 */

export const MAX_FORWARDS = 5;
const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_ATTACHMENTS_BYTES = 10 * 1024 * 1024;
const PUBLIC_COLUMNS = "id,alias_id,destination,verified_at,is_active,last_sent_at,created_at";

export function safeEmail(value) {
  const email = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320 ? email : "";
}

function origin(env) {
  try {
    const url = new URL(String(env.SUPABASE_URL || ""));
    return url.protocol === "https:" ? url.origin : "";
  } catch {
    return "";
  }
}

function db(env, path, options = {}) {
  const base = origin(env);
  const secret = env.SUPABASE_SECRET_KEY;
  const headers = { apikey: secret, "content-type": "application/json", ...(options.headers || {}) };
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret)) headers.Authorization = `Bearer ${secret}`;
  return requestExternal(new URL(path, base), {
    env,
    expectedOrigin: base,
    service: "supabase",
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    maxBytes: options.maxBytes ?? 16384
  });
}

const rows = (response) => (Array.isArray(response?.data) ? response.data : response?.data ? [response.data] : []);

async function sendEmail(env, { from, to, subject, html, text, replyTo, attachments }) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Email service not configured");
  const resend = "https://api.resend.com";
  return requestExternal(new URL("/emails", resend), {
    env,
    expectedOrigin: resend,
    service: "resend",
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}), ...(attachments?.length ? { attachments } : {}) }),
    retries: 1,
    timeoutMs: 15000,
    maxBytes: 8192
  });
}

function randomCode() {
  const out = [];
  while (out.length < 6) {
    const buf = new Uint8Array(8);
    crypto.getRandomValues(buf);
    for (const b of buf) if (b < 250 && out.length < 6) out.push(b % 10);
  }
  return out.join("");
}

/** Empreinte HMAC du code, liée à la redirection : inutilisable ailleurs et non inversible sans le secret. */
export async function codeHash(secret, forwardId, code) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(secret)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${forwardId}:${String(code).trim()}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameHash(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const hmacSecret = (env) => env.MAIL_FORWARD_SECRET || env.OAUTH_STATE_SECRET || env.SUPABASE_JWT_SECRET;

export async function listForwards(env, userId) {
  return rows(await db(env, `/rest/v1/ethone_mail_forwards?user_id=eq.${userId}&select=${PUBLIC_COLUMNS}&order=created_at.asc`));
}

async function loadForward(env, userId, id) {
  return rows(await db(env, `/rest/v1/ethone_mail_forwards?id=eq.${encodeURIComponent(id)}&user_id=eq.${userId}&limit=1`))[0] || null;
}

async function aliasAddress(env, userId, aliasId) {
  const query = aliasId ? `id=eq.${encodeURIComponent(aliasId)}&` : "is_primary=eq.true&";
  const alias = rows(await db(env, `/rest/v1/ethone_mail_aliases?${query}user_id=eq.${userId}&select=id,alias&limit=1`))[0];
  return alias || null;
}

async function sendCode(env, forward, aliasLabel) {
  const code = randomCode();
  const hash = await codeHash(hmacSecret(env), forward.id, code);
  const now = Date.now();
  await db(env, `/rest/v1/ethone_mail_forwards?id=eq.${forward.id}`, {
    method: "PATCH",
    body: { code_hash: hash, code_expires_at: new Date(now + CODE_TTL_MS).toISOString(), attempts: 0, last_sent_at: new Date(now).toISOString() }
  });
  const text = `Code de confirmation ETHONE : ${code}

Le compte ETHONE de ${aliasLabel} demande à recevoir ses mails sur cette adresse (${forward.destination}).
Saisis ce code dans ETHONE › Mail › Redirections pour confirmer. Il expire dans 15 minutes.

Si tu n'es pas à l'origine de cette demande, ignore ce message : rien ne sera transféré.`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;color:#111">
<p>Le compte ETHONE de <b>${escapeHtml(aliasLabel)}</b> demande à recevoir ses mails sur cette adresse (${escapeHtml(forward.destination)}).</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:20px 0">${code}</p>
<p>Saisis ce code dans ETHONE › Mail › Redirections. Il expire dans 15 minutes.</p>
<p style="color:#666;font-size:13px">Si tu n'es pas à l'origine de cette demande, ignore ce message : rien ne sera transféré.</p>
</div>`;
  await sendEmail(env, {
    from: env.RESEND_FROM || "ETHONE <no-reply@ethone.dev>",
    to: forward.destination,
    subject: `${code} est ton code de confirmation ETHONE`,
    html,
    text
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/**
 * Ajoute une redirection (ou renvoie un code si elle attend déjà sa confirmation). Erreurs lisibles :
 * INVALID_EMAIL, SELF_DOMAIN, UNKNOWN_ALIAS, LIMIT, COOLDOWN.
 */
export async function createForward(env, userId, { destination, aliasId }) {
  const dest = safeEmail(destination);
  if (!dest) throw Object.assign(new Error("INVALID_EMAIL"), { code: "INVALID_EMAIL" });
  if (dest.endsWith("@ethone.dev")) throw Object.assign(new Error("SELF_DOMAIN"), { code: "SELF_DOMAIN" });
  const alias = await aliasAddress(env, userId, aliasId || null);
  if (aliasId && !alias) throw Object.assign(new Error("UNKNOWN_ALIAS"), { code: "UNKNOWN_ALIAS" });

  const existing = (await listForwards(env, userId)).find((f) => f.destination === dest && (f.alias_id || null) === (aliasId || null));
  if (existing?.verified_at) return existing;
  if (existing) {
    if (existing.last_sent_at && Date.now() - new Date(existing.last_sent_at).getTime() < RESEND_COOLDOWN_MS) {
      throw Object.assign(new Error("COOLDOWN"), { code: "COOLDOWN" });
    }
    await sendCode(env, existing, alias?.alias || "ton adresse ETHONE");
    return { ...existing, last_sent_at: new Date().toISOString() };
  }
  const count = (await listForwards(env, userId)).length;
  if (count >= MAX_FORWARDS) throw Object.assign(new Error("LIMIT"), { code: "LIMIT" });

  const created = rows(
    await db(env, `/rest/v1/ethone_mail_forwards?select=${PUBLIC_COLUMNS}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: { user_id: userId, alias_id: aliasId || null, destination: dest }
    })
  )[0];
  if (!created) throw new Error("Insert failed");
  try {
    await sendCode(env, created, alias?.alias || "ton adresse ETHONE");
  } catch (error) {
    await db(env, `/rest/v1/ethone_mail_forwards?id=eq.${created.id}`, { method: "DELETE" }).catch(() => null);
    throw error;
  }
  return created;
}

/** Vérifie le code. Erreurs : NOT_FOUND, EXPIRED, TOO_MANY_ATTEMPTS, WRONG_CODE. */
export async function verifyForward(env, userId, id, code) {
  const forward = await loadForward(env, userId, id);
  if (!forward) throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND" });
  if (forward.verified_at) return pick(forward);
  if (!forward.code_hash || !forward.code_expires_at || new Date(forward.code_expires_at).getTime() < Date.now()) {
    throw Object.assign(new Error("EXPIRED"), { code: "EXPIRED" });
  }
  if (forward.attempts >= MAX_ATTEMPTS) throw Object.assign(new Error("TOO_MANY_ATTEMPTS"), { code: "TOO_MANY_ATTEMPTS" });
  const ok = /^\d{6}$/.test(String(code).trim()) && sameHash(await codeHash(hmacSecret(env), forward.id, code), forward.code_hash);
  if (!ok) {
    await db(env, `/rest/v1/ethone_mail_forwards?id=eq.${forward.id}`, { method: "PATCH", body: { attempts: forward.attempts + 1 } });
    throw Object.assign(new Error("WRONG_CODE"), { code: "WRONG_CODE", remaining: Math.max(0, MAX_ATTEMPTS - forward.attempts - 1) });
  }
  const updated = rows(
    await db(env, `/rest/v1/ethone_mail_forwards?id=eq.${forward.id}&select=${PUBLIC_COLUMNS}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: { verified_at: new Date().toISOString(), code_hash: null, code_expires_at: null, attempts: 0, is_active: true }
    })
  )[0];
  return updated || pick(forward);
}

const pick = (f) => Object.fromEntries(PUBLIC_COLUMNS.split(",").map((k) => [k, f[k]]));

export async function setForwardActive(env, userId, id, active) {
  return rows(
    await db(env, `/rest/v1/ethone_mail_forwards?id=eq.${encodeURIComponent(id)}&user_id=eq.${userId}&select=${PUBLIC_COLUMNS}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: { is_active: Boolean(active) }
    })
  )[0] || null;
}

export async function deleteForward(env, userId, id) {
  await db(env, `/rest/v1/ethone_mail_forwards?id=eq.${encodeURIComponent(id)}&user_id=eq.${userId}`, { method: "DELETE" });
  return { deleted: true };
}

/** Redirections actives et confirmées qui s'appliquent à cette adresse ETHONE. */
export function forwardsFor(forwards, aliasId) {
  return forwards.filter((f) => f.verified_at && f.is_active && (!f.alias_id || f.alias_id === aliasId));
}

function toBase64(content) {
  const bytes = content instanceof Uint8Array ? content : new Uint8Array(content);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Recopie un mail reçu vers chaque destination confirmée. Les pièces jointes suivent jusqu'à 10 Mo au total. */
export async function forwardInbound(env, userId, { aliasId, aliasAddress: to, fromAddress, fromName, subject, text, html, attachments }) {
  const targets = forwardsFor(await listForwards(env, userId), aliasId);
  if (!targets.length) return 0;
  let total = 0;
  const files = [];
  let skipped = 0;
  for (const a of attachments || []) {
    const size = a?.content?.byteLength ?? 0;
    if (!size || total + size > MAX_ATTACHMENTS_BYTES) {
      if (size) skipped += 1;
      continue;
    }
    total += size;
    files.push({ filename: a.filename || "piece-jointe", content: toBase64(a.content) });
  }
  const note = `Reçu sur ${to}${skipped ? ` · ${skipped} pièce(s) jointe(s) trop lourde(s), à voir dans ETHONE` : ""}`;
  const sender = String(fromName || fromAddress || "").replace(/["<>\r\n]/g, "").slice(0, 80) || "ETHONE";
  let sent = 0;
  for (const t of targets) {
    try {
      await sendEmail(env, {
        from: `"${sender} via ETHONE" <${to}>`,
        to: t.destination,
        subject: subject || "(Sans objet)",
        replyTo: fromAddress,
        text: `${text || ""}\n\n— ${note}`,
        html: html ? `${html}<p style="color:#888;font-size:12px;margin-top:24px">${escapeHtml(note)}</p>` : undefined,
        attachments: files
      });
      sent += 1;
    } catch {
      // Une destination en échec n'empêche pas les autres.
    }
  }
  return sent;
}
