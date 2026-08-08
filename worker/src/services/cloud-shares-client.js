import crypto from "node:crypto";
import { httpError } from "../middleware/errors.js";
import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safePublicUrl, safeText } from "../utils/normalize.js";

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
  const secret = requireSecret(env, "SUPABASE_SECRET_KEY");
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

function generateSlug() {
  return crypto.randomBytes(18).toString("base64url").slice(0, 24);
}

function hashPassword(password) {
  if (!password) return null;
  return crypto.createHash("sha256").update(String(password)).digest("hex").slice(0, 64);
}

function verifyPassword(password, hash) {
  if (!hash) return true;
  return hashPassword(password) === hash;
}

function normalizeShare(row) {
  return Object.freeze({
    id: safeText(row?.id, 128),
    fileId: safeText(row?.file_id, 128),
    driveClientId: safeText(row?.drive_client_id, 120),
    slug: safeText(row?.slug, 64),
    visibility: safeText(row?.visibility, 16),
    expiresAt: safeText(row?.expires_at, 40),
    maxDownloads: Number(row?.max_downloads) || 0,
    downloadCount: Number(row?.download_count) || 0,
    revoked: row?.revoked === true,
    createdAt: safeText(row?.created_at, 40)
  });
}

function normalizeDrop(row) {
  return Object.freeze({
    id: safeText(row?.id, 128),
    userId: safeText(row?.user_id, 128),
    slug: safeText(row?.slug, 64),
    driveClientId: safeText(row?.drive_client_id, 120),
    title: safeText(row?.title, 200, "Drop"),
    description: safeText(row?.description, 1000),
    visibility: safeText(row?.visibility, 16),
    expiresAt: safeText(row?.expires_at, 40),
    maxFiles: Number(row?.max_files) || 0,
    maxSize: Number(row?.max_size) || 0,
    fileCount: Number(row?.file_count) || 0,
    createdAt: safeText(row?.created_at, 40)
  });
}

async function findFileById(env, userId, fileId) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_files?user_id=eq.${encodeURIComponent(userId)}&id=eq.${encodeURIComponent(safeText(fileId, "", 128))}&select=*`, { maxBytes: 64 * 1024 });
  return firstRow(response);
}

export async function createShare(env, userId, { fileId, visibility = "public", password = "", expiresAt = "", maxDownloads = 0 } = {}) {
  const origin = projectOrigin(env);
  if (!origin || !userId) throw httpError("AUTH_REQUIRED", 401);
  const fileRecord = await findFileById(env, userId, fileId);
  if (!fileRecord) throw httpError("PROVIDER_NOT_FOUND", 404);
  const safeVisibility = ["public", "private", "password"].includes(visibility) ? visibility : "public";
  const body = {
    user_id: userId,
    file_id: fileId,
    drive_client_id: safeText(fileRecord.drive_client_id, "", 120),
    slug: generateSlug(),
    visibility: safeVisibility,
    password_hash: safeVisibility === "password" ? hashPassword(password) : null,
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    max_downloads: Math.max(0, Math.min(10000, Number(maxDownloads) || 0))
  };
  const response = await supabaseRequest(env, "/rest/v1/ethone_file_shares", {
    method: "POST",
    body,
    headers: { Prefer: "return=representation" },
    maxBytes: 64 * 1024
  });
  return normalizeShare(firstRow(response));
}

export async function listShares(env, userId, { fileId = null, limit = 100 } = {}) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return [];
  let path = `/rest/v1/ethone_file_shares?user_id=eq.${encodeURIComponent(userId)}&revoked=eq.false&order=created_at.desc&limit=${Math.max(1, Math.min(500, Number(limit) || 100))}&select=*`;
  if (fileId) path += `&file_id=eq.${encodeURIComponent(safeText(fileId, "", 128))}`;
  const response = await supabaseRequest(env, path, { maxBytes: 512 * 1024 });
  return Array.isArray(response.data) ? response.data.map(normalizeShare) : [];
}

export async function getShareBySlug(env, slug, password = "") {
  const origin = projectOrigin(env);
  if (!origin || !slug) throw httpError("PROVIDER_NOT_FOUND", 404);
  const response = await supabaseRequest(env, `/rest/v1/ethone_file_shares?slug=eq.${encodeURIComponent(safeText(slug, "", 64))}&revoked=eq.false&select=*,ethone_files!inner(*)`);
  const row = firstRow(response);
  if (!row) throw httpError("PROVIDER_NOT_FOUND", 404);
  if (row.expires_at && new Date(row.expires_at) < new Date()) throw httpError("SHARE_EXPIRED", 410);
  if (row.max_downloads > 0 && row.download_count >= row.max_downloads) throw httpError("SHARE_LIMIT_REACHED", 410);
  if (row.visibility === "private") throw httpError("SHARE_FORBIDDEN", 403);
  if (row.visibility === "password" && !verifyPassword(password, row.password_hash)) throw httpError("SHARE_PASSWORD_REQUIRED", 401);
  return { share: normalizeShare(row), file: row.ethone_files };
}

export async function incrementShareDownload(env, slug) {
  const origin = projectOrigin(env);
  if (!origin || !slug) return null;
  const response = await supabaseRequest(env, `/rest/v1/ethone_file_shares?slug=eq.${encodeURIComponent(safeText(slug, "", 64))}`, {
    method: "PATCH",
    body: { download_count: { "+": 1 } },
    maxBytes: 64 * 1024
  });
  return firstRow(response);
}

export async function revokeShare(env, userId, slug) {
  const origin = projectOrigin(env);
  if (!origin || !userId) throw httpError("AUTH_REQUIRED", 401);
  const response = await supabaseRequest(env, `/rest/v1/ethone_file_shares?user_id=eq.${encodeURIComponent(userId)}&slug=eq.${encodeURIComponent(safeText(slug, "", 64))}`, {
    method: "PATCH",
    body: { revoked: true },
    maxBytes: 64 * 1024
  });
  return firstRow(response);
}

export async function createDrop(env, userId, { title, description = "", visibility = "public", password = "", expiresAt = "", maxFiles = 0, maxSize = 0, driveClientId = "" } = {}) {
  const origin = projectOrigin(env);
  if (!origin || !userId) throw httpError("AUTH_REQUIRED", 401);
  const safeVisibility = ["public", "password"].includes(visibility) ? visibility : "public";
  const body = {
    user_id: userId,
    slug: generateSlug(),
    drive_client_id: safeText(driveClientId, "", 120),
    title: safeText(title, 200),
    description: safeText(description, 1000),
    visibility: safeVisibility,
    password_hash: safeVisibility === "password" ? hashPassword(password) : null,
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    max_files: Math.max(0, Math.min(1000, Number(maxFiles) || 0)),
    max_size: Math.max(0, Math.min(10737418240, Number(maxSize) || 0))
  };
  if (!body.title) throw httpError("INVALID_PARAMETER", 400);
  const response = await supabaseRequest(env, "/rest/v1/ethone_file_drops", {
    method: "POST",
    body,
    headers: { Prefer: "return=representation" },
    maxBytes: 64 * 1024
  });
  return normalizeDrop(firstRow(response));
}

export async function listDrops(env, userId, { limit = 100 } = {}) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return [];
  const response = await supabaseRequest(env, `/rest/v1/ethone_file_drops?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=${Math.max(1, Math.min(500, Number(limit) || 100))}&select=*`);
  return Array.isArray(response.data) ? response.data.map(normalizeDrop) : [];
}

export async function getDropBySlug(env, slug, password = "") {
  const origin = projectOrigin(env);
  if (!origin || !slug) throw httpError("PROVIDER_NOT_FOUND", 404);
  const response = await supabaseRequest(env, `/rest/v1/ethone_file_drops?slug=eq.${encodeURIComponent(safeText(slug, "", 64))}&select=*`);
  const row = firstRow(response);
  if (!row) throw httpError("PROVIDER_NOT_FOUND", 404);
  if (row.expires_at && new Date(row.expires_at) < new Date()) throw httpError("DROP_EXPIRED", 410);
  if (row.visibility === "password" && !verifyPassword(password, row.password_hash)) throw httpError("DROP_PASSWORD_REQUIRED", 401);
  return normalizeDrop(row);
}

export async function incrementDropFileCount(env, slug) {
  const origin = projectOrigin(env);
  if (!origin || !slug) return null;
  const response = await supabaseRequest(env, `/rest/v1/ethone_file_drops?slug=eq.${encodeURIComponent(safeText(slug, "", 64))}`, {
    method: "PATCH",
    body: { file_count: { "+": 1 } },
    maxBytes: 64 * 1024
  });
  return firstRow(response);
}

export async function revokeDrop(env, userId, slug) {
  const origin = projectOrigin(env);
  if (!origin || !userId) throw httpError("AUTH_REQUIRED", 401);
  const response = await supabaseRequest(env, `/rest/v1/ethone_file_drops?user_id=eq.${encodeURIComponent(userId)}&slug=eq.${encodeURIComponent(safeText(slug, "", 64))}`, {
    method: "DELETE",
    maxBytes: 64 * 1024
  });
  return firstRow(response);
}

export async function recordActivity(env, { userId = null, fileId = null, shareId = null, dropId = null, eventType = "downloaded", details = {}, ipHash = "" } = {}) {
  const origin = projectOrigin(env);
  if (!origin) return null;
  const body = {
    user_id: userId,
    file_id: fileId,
    share_id: shareId,
    drop_id: dropId,
    event_type: safeText(eventType, 32),
    details,
    ip_hash: safeText(ipHash, 128)
  };
  await supabaseRequest(env, "/rest/v1/ethone_file_activity", { method: "POST", body });
  return true;
}
