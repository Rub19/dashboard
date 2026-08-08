import { httpError } from "../middleware/errors.js";
import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeNumber, safePublicUrl, safeText } from "../utils/normalize.js";
import { deleteOAuthToken, getOAuthToken, setOAuthToken } from "./supabase-client.js";

const TOKEN_ORIGIN = "https://oauth2.googleapis.com";
const API_ORIGIN = "https://www.googleapis.com";
const UPLOAD_ORIGIN = "https://www.googleapis.com/upload";
const REDIRECT_URI = "https://ethone.dev/";
const PROVIDER = "google-drive";

const DEFAULT_MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB per Worker request
const DEFAULT_UPLOAD_TIMEOUT_MS = 30000;

const FILE_FIELDS = "id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink,thumbnailLink,iconLink,md5Checksum,trashed";

function fetcher(env) {
  return typeof env?.__TEST_FETCH__ === "function" ? env.__TEST_FETCH__ : fetch;
}

function configuredTimeout(env, requested) {
  const value = Number(requested || env?.OUTBOUND_TIMEOUT_MS || 6500);
  return Math.max(10, Math.min(60000, Number.isFinite(value) ? value : 6500));
}

function configuredMaxUploadBytes(env) {
  const value = Number(env?.GOOGLE_DRIVE_MAX_UPLOAD_BYTES || 0);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 500 * 1024 * 1024) : DEFAULT_MAX_UPLOAD_BYTES;
}

async function tokenRequest(env, params) {
  const response = await requestExternal(new URL("/token", TOKEN_ORIGIN), {
    env,
    expectedOrigin: TOKEN_ORIGIN,
    service: "google-drive",
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
    retries: 0,
    maxBytes: 8192
  });
  return response.data;
}

function expiryFrom(expiresInSeconds) {
  const seconds = Math.max(60, Math.min(86400, safeNumber(expiresInSeconds, 3600)));
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function exchangeGoogleDriveCode(env, userId, { code, clientId }) {
  const clientSecret = requireSecret(env, "GOOGLE_CLIENT_SECRET");
  const data = await tokenRequest(env, {
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    client_secret: clientSecret
  });
  if (!data?.access_token || !data?.refresh_token) throw httpError("PROVIDER_REQUEST_REJECTED", 502, { retryable: false });
  await setOAuthToken(env, userId, PROVIDER, {
    accessToken: safeText(data.access_token, 4000),
    refreshToken: safeText(data.refresh_token, 4000),
    scope: safeText(data.scope, 500),
    expiresAt: expiryFrom(data.expires_in)
  });
  return true;
}

async function refreshGoogleDriveToken(env, userId, stored, clientId) {
  const clientSecret = requireSecret(env, "GOOGLE_CLIENT_SECRET");
  const data = await tokenRequest(env, {
    grant_type: "refresh_token",
    refresh_token: stored.refreshToken,
    client_id: clientId,
    client_secret: clientSecret
  });
  if (!data?.access_token) throw httpError("AUTH_EXPIRED", 401, { retryable: false });
  const next = {
    accessToken: safeText(data.access_token, 4000),
    refreshToken: safeText(data.refresh_token, 4000) || stored.refreshToken,
    scope: safeText(data.scope, 500) || stored.scope,
    expiresAt: expiryFrom(data.expires_in)
  };
  await setOAuthToken(env, userId, PROVIDER, next);
  return next;
}

async function validAccessToken(env, userId, clientId) {
  const stored = await getOAuthToken(env, userId, PROVIDER);
  if (!stored) throw httpError("AUTH_REQUIRED", 401, { retryable: false });
  const expiresAt = Date.parse(stored.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > 30000) return stored.accessToken;
  const refreshed = await refreshGoogleDriveToken(env, userId, stored, clientId);
  return refreshed.accessToken;
}

export function normalizeFile(item) {
  const parents = Array.isArray(item?.parents) ? item.parents.filter((id) => typeof id === "string") : [];
  return Object.freeze({
    id: safeText(item?.id, 128),
    name: safeText(item?.name, 500) || "(Sans titre)",
    mimeType: safeText(item?.mimeType, 120),
    isFolder: item?.mimeType === "application/vnd.google-apps.folder",
    size: safeNumber(item?.size, 0, Number.MAX_SAFE_INTEGER),
    modifiedTime: safeText(item?.modifiedTime, 40),
    createdTime: safeText(item?.createdTime, 40),
    parents: Object.freeze(parents),
    webViewLink: safePublicUrl(item?.webViewLink, ["drive.google.com", "docs.google.com"]),
    thumbnailLink: safePublicUrl(item?.thumbnailLink, ["googleusercontent.com", "ggpht.com", "gstatic.com"]),
    iconUrl: safePublicUrl(item?.iconLink, ["gstatic.com"]),
    md5Checksum: safeText(item?.md5Checksum, 64),
    trashed: item?.trashed === true
  });
}

function driveJsonRequest(url, env, accessToken, { method = "GET", body, maxBytes = 1024 * 1024 } = {}) {
  const options = {
    env,
    expectedOrigin: API_ORIGIN,
    service: "google-drive",
    method,
    headers: { authorization: `Bearer ${accessToken}` },
    retries: 1,
    maxBytes
  };
  if (body !== undefined) {
    options.headers["content-type"] = "application/json; charset=UTF-8";
    options.body = JSON.stringify(body);
  }
  return requestExternal(url, options);
}

function validateDriveId(value) {
  const id = safeText(value, 128);
  if (!/^[a-zA-Z0-9_-]{10,128}$/.test(id)) throw httpError("INVALID_PARAMETER", 400);
  return id;
}

function escapeDriveQuery(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function getRecentFiles(env, userId, clientId) {
  const accessToken = await validAccessToken(env, userId, clientId);
  const url = new URL("/drive/v3/files", API_ORIGIN);
  url.searchParams.set("orderBy", "modifiedTime desc");
  url.searchParams.set("pageSize", "5");
  url.searchParams.set("fields", `files(${FILE_FIELDS})`);
  url.searchParams.set("q", "trashed = false");
  let response;
  try {
    response = await driveJsonRequest(url, env, accessToken, { maxBytes: 512 * 1024 });
  } catch (error) {
    if (error?.status === 502) throw httpError("AUTH_EXPIRED", 401, { retryable: false });
    throw error;
  }
  const items = Array.isArray(response.data?.files) ? response.data.files : [];
  return items.slice(0, 5).map(normalizeFile);
}

export async function listFiles(env, userId, clientId, { parentId = null, pageSize = 50, pageToken = "", orderBy = "folder,name", query = "" } = {}) {
  const accessToken = await validAccessToken(env, userId, clientId);
  const url = new URL("/drive/v3/files", API_ORIGIN);
  const safePageSize = safeNumber(pageSize, 1, 1000);
  url.searchParams.set("pageSize", String(safePageSize));
  url.searchParams.set("fields", `nextPageToken,files(${FILE_FIELDS})`);
  url.searchParams.set("orderBy", String(orderBy || "folder,name").slice(0, 80));

  const conditions = ["trashed = false"];
  if (parentId) {
    conditions.push(`'${escapeDriveQuery(validateDriveId(parentId))}' in parents`);
  } else {
    conditions.push("'root' in parents");
  }
  if (query) {
    conditions.push(`name contains '${escapeDriveQuery(safeText(query, 200))}'`);
  }
  url.searchParams.set("q", conditions.join(" and "));
  if (pageToken) url.searchParams.set("pageToken", safeText(pageToken, 200));

  try {
    const response = await driveJsonRequest(url, env, accessToken, { maxBytes: 2 * 1024 * 1024 });
    const items = Array.isArray(response.data?.files) ? response.data.files : [];
    return Object.freeze({
      files: Object.freeze(items.map(normalizeFile)),
      nextPageToken: safeText(response.data?.nextPageToken, 200, "")
    });
  } catch (error) {
    if (error?.status === 502) throw httpError("AUTH_EXPIRED", 401, { retryable: false });
    throw error;
  }
}

export async function getFile(env, userId, clientId, fileId) {
  const accessToken = await validAccessToken(env, userId, clientId);
  const id = validateDriveId(fileId);
  const url = new URL(`/drive/v3/files/${id}`, API_ORIGIN);
  url.searchParams.set("fields", FILE_FIELDS);
  try {
    const response = await driveJsonRequest(url, env, accessToken, { maxBytes: 128 * 1024 });
    return normalizeFile(response.data);
  } catch (error) {
    if (error?.status === 502) throw httpError("AUTH_EXPIRED", 401, { retryable: false });
    if (error?.code === "PROVIDER_NOT_FOUND") throw httpError("PROVIDER_NOT_FOUND", 404);
    throw error;
  }
}

export async function searchFiles(env, userId, clientId, query) {
  const safeQuery = safeText(query, 200);
  if (!safeQuery) throw httpError("INVALID_PARAMETER", 400);
  return listFiles(env, userId, clientId, { pageSize: 50, query: safeQuery });
}

export async function createFolder(env, userId, clientId, { name, parentId = null }) {
  const accessToken = await validAccessToken(env, userId, clientId);
  const folderName = safeText(name, 500);
  if (!folderName) throw httpError("INVALID_PARAMETER", 400);
  const body = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder"
  };
  if (parentId) body.parents = [validateDriveId(parentId)];
  const response = await driveJsonRequest(new URL("/drive/v3/files", API_ORIGIN), env, accessToken, { method: "POST", body });
  return normalizeFile(response.data);
}

export async function updateFile(env, userId, clientId, fileId, { name = null, addParents = [], removeParents = [] } = {}) {
  const accessToken = await validAccessToken(env, userId, clientId);
  const id = validateDriveId(fileId);
  const url = new URL(`/drive/v3/files/${id}`, API_ORIGIN);
  const body = {};
  if (name) body.name = safeText(name, 500);
  if (addParents.length) url.searchParams.set("addParents", addParents.map(validateDriveId).join(","));
  if (removeParents.length) url.searchParams.set("removeParents", removeParents.map(validateDriveId).join(","));
  const hasBody = Object.keys(body).length > 0;
  const response = await driveJsonRequest(url, env, accessToken, {
    method: "PATCH",
    body: hasBody ? body : undefined,
    maxBytes: 128 * 1024
  });
  return normalizeFile(response.data);
}

export async function trashFile(env, userId, clientId, fileId) {
  const accessToken = await validAccessToken(env, userId, clientId);
  const id = validateDriveId(fileId);
  const response = await driveJsonRequest(new URL(`/drive/v3/files/${id}`, API_ORIGIN), env, accessToken, {
    method: "PATCH",
    body: { trashed: true },
    maxBytes: 128 * 1024
  });
  return normalizeFile(response.data);
}

export async function deleteFile(env, userId, clientId, fileId) {
  const accessToken = await validAccessToken(env, userId, clientId);
  const id = validateDriveId(fileId);
  await driveJsonRequest(new URL(`/drive/v3/files/${id}`, API_ORIGIN), env, accessToken, {
    method: "DELETE",
    maxBytes: 1024
  });
  return true;
}

export async function getStorageQuota(env, userId, clientId) {
  const accessToken = await validAccessToken(env, userId, clientId);
  const url = new URL("/drive/v3/about", API_ORIGIN);
  url.searchParams.set("fields", "storageQuota");
  const response = await driveJsonRequest(url, env, accessToken, { maxBytes: 32 * 1024 });
  const quota = response.data?.storageQuota || {};
  return Object.freeze({
    usage: safeNumber(quota.usage, 0, Number.MAX_SAFE_INTEGER),
    limit: safeNumber(quota.limit, 0, Number.MAX_SAFE_INTEGER),
    usageInDrive: safeNumber(quota.usageInDrive, 0, Number.MAX_SAFE_INTEGER),
    usageInDriveTrash: safeNumber(quota.usageInDriveTrash, 0, Number.MAX_SAFE_INTEGER)
  });
}

async function initResumableUpload(env, accessToken, { name, mimeType, size, parentId }) {
  const url = new URL("/upload/drive/v3/files", UPLOAD_ORIGIN);
  url.searchParams.set("uploadType", "resumable");
  const safeMime = safeText(mimeType, 120) || "application/octet-stream";
  const body = {
    name: safeText(name, 500),
    mimeType: safeMime
  };
  if (parentId) body.parents = [validateDriveId(parentId)];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), configuredTimeout(env, DEFAULT_UPLOAD_TIMEOUT_MS));
  try {
    const response = await fetcher(env)(url.href, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json; charset=UTF-8",
        "x-upload-content-type": safeMime,
        "x-upload-content-length": String(Math.max(0, safeNumber(size, 0, Number.MAX_SAFE_INTEGER)))
      },
      body: JSON.stringify(body),
      redirect: "manual",
      signal: controller.signal
    });
    if (!response.ok) {
      await response.body?.cancel?.().catch(() => {});
      if (response.status === 401 || response.status === 403) throw httpError("PROVIDER_REQUEST_REJECTED", 502, { retryable: false });
      throw httpError("UPSTREAM_UNAVAILABLE", 503, { retryable: response.status >= 500 || response.status === 429 });
    }
    const sessionUrl = response.headers.get("location");
    if (!sessionUrl) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
    return sessionUrl;
  } catch (error) {
    if (error?.name === "AbortError") throw httpError("UPSTREAM_TIMEOUT", 504, { retryable: true });
    if (error?.code) throw error;
    throw httpError("UPSTREAM_UNAVAILABLE", 503, { retryable: true });
  } finally {
    clearTimeout(timer);
  }
}

async function uploadToSession(env, sessionUrl, { size, mimeType, body }) {
  const safeMime = safeText(mimeType, 120) || "application/octet-stream";
  const contentLength = Math.max(0, safeNumber(size, 0, Number.MAX_SAFE_INTEGER));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), configuredTimeout(env, DEFAULT_UPLOAD_TIMEOUT_MS * 2));
  try {
    const response = await fetcher(env)(sessionUrl, {
      method: "PUT",
      headers: {
        "content-type": safeMime,
        "content-length": String(contentLength)
      },
      body,
      redirect: "manual",
      signal: controller.signal,
      duplex: "half"
    });
    if (!response.ok) {
      await response.body?.cancel?.().catch(() => {});
      if (response.status === 401 || response.status === 403) throw httpError("PROVIDER_REQUEST_REJECTED", 502, { retryable: false });
      throw httpError("UPSTREAM_UNAVAILABLE", 503, { retryable: response.status >= 500 || response.status === 429 });
    }
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("application/json")) {
      await response.body?.cancel?.().catch(() => {});
      throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return normalizeFile(data);
  } catch (error) {
    if (error?.name === "AbortError") throw httpError("UPSTREAM_TIMEOUT", 504, { retryable: true });
    if (error?.code) throw error;
    throw httpError("UPSTREAM_UNAVAILABLE", 503, { retryable: true });
  } finally {
    clearTimeout(timer);
  }
}

export async function uploadFile(env, userId, clientId, request) {
  const accessToken = await validAccessToken(env, userId, clientId);
  const name = safeText(request.headers.get("x-ethone-file-name"), 500);
  const parentId = safeText(request.headers.get("x-ethone-file-parent"), 128);
  const mimeType = safeText(request.headers.get("x-ethone-file-mime"), 120);
  const size = Number(request.headers.get("x-ethone-file-size"));
  const declared = Number(request.headers.get("content-length"));

  if (!name || !size || !Number.isSafeInteger(size) || size <= 0) throw httpError("INVALID_PARAMETER", 400);
  const maxBytes = configuredMaxUploadBytes(env);
  if (size > maxBytes) throw httpError("FILE_TOO_LARGE", 413, { retryable: false });
  if (Number.isFinite(declared) && declared > size + 1024) throw httpError("INVALID_PARAMETER", 400);
  if (!request.body) throw httpError("INVALID_REQUEST", 400);

  const sessionUrl = await initResumableUpload(env, accessToken, { name, mimeType, size, parentId: parentId || null });
  return uploadToSession(env, sessionUrl, { size, mimeType, body: request.body });
}

export async function downloadFile(env, userId, clientId, fileId) {
  const accessToken = await validAccessToken(env, userId, clientId);
  const id = validateDriveId(fileId);
  const url = new URL(`/drive/v3/files/${id}`, API_ORIGIN);
  url.searchParams.set("alt", "media");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), configuredTimeout(env, DEFAULT_UPLOAD_TIMEOUT_MS * 2));
  try {
    const response = await fetcher(env)(url.href, {
      method: "GET",
      headers: { authorization: `Bearer ${accessToken}` },
      redirect: "follow",
      signal: controller.signal
    });
    if (!response.ok) {
      await response.body?.cancel?.().catch(() => {});
      if (response.status === 404) throw httpError("PROVIDER_NOT_FOUND", 404);
      if (response.status === 401 || response.status === 403) throw httpError("PROVIDER_REQUEST_REJECTED", 502, { retryable: false });
      throw httpError("UPSTREAM_UNAVAILABLE", 503, { retryable: response.status >= 500 || response.status === 429 });
    }
    return Object.freeze({
      stream: response.body,
      headers: Object.freeze({
        "content-type": response.headers.get("content-type") || "application/octet-stream",
        "content-length": response.headers.get("content-length") || ""
      })
    });
  } catch (error) {
    if (error?.name === "AbortError") throw httpError("UPSTREAM_TIMEOUT", 504, { retryable: true });
    if (error?.code) throw error;
    throw httpError("UPSTREAM_UNAVAILABLE", 503, { retryable: true });
  } finally {
    clearTimeout(timer);
  }
}

export async function disconnectGoogleDrive(env, userId) {
  await deleteOAuthToken(env, userId, PROVIDER);
  return true;
}
