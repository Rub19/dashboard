import { httpError } from "../middleware/errors.js";
import { assertAllowedQuery, PATTERNS, queryInteger, queryText } from "../middleware/validation.js";
import { routeResult } from "../utils/response.js";
import {
  createFolder,
  deleteFile,
  disconnectGoogleDrive,
  downloadFile,
  exchangeGoogleDriveCode,
  getFile,
  getRecentFiles,
  getStorageQuota,
  listFiles,
  searchFiles,
  trashFile,
  updateFile,
  uploadFile
} from "../services/google-drive-oauth-client.js";

const CODE_RE = /^[A-Za-z0-9_/\.-]{10,512}$/;

async function readJsonBody(request, maxFields) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw httpError("INVALID_REQUEST", 400);
  let body;
  try {
    body = await request.json();
  } catch {
    throw httpError("INVALID_REQUEST", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length > maxFields) throw httpError("INVALID_REQUEST", 400);
  return body;
}

function requireField(body, key, pattern) {
  const value = String(body[key] || "");
  if (!pattern.test(value)) throw httpError("INVALID_PARAMETER", 400);
  return value;
}

function optionalField(body, key, pattern, fallback = "") {
  const value = String(body[key] || fallback);
  if (value && !pattern.test(value)) throw httpError("INVALID_PARAMETER", 400);
  return value;
}

export async function googleDriveOAuthExchangeRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 2);
  const code = requireField(body, "code", CODE_RE);
  const clientId = requireField(body, "clientId", PATTERNS.googleClientId);
  await exchangeGoogleDriveCode(env, auth.userId, { code, clientId });
  return { data: { connected: true } };
}

export async function googleDriveFilesRoute({ url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, ["clientId", "parentId", "q", "pageToken", "pageSize", "orderBy"]);
  const clientId = queryText(url, "clientId", { pattern: PATTERNS.googleClientId });
  const parentId = queryText(url, "parentId", { pattern: /^[a-zA-Z0-9_-]{10,128}$/, required: false });
  const searchQuery = queryText(url, "q", { required: false, max: 200 });
  const pageToken = queryText(url, "pageToken", { required: false, max: 200 });
  const orderBy = queryText(url, "orderBy", { required: false, max: 80 });
  const pageSize = queryInteger(url, "pageSize", { required: false, min: 1, max: 1000, fallback: 50 });

  try {
    if (searchQuery) {
      const result = await searchFiles(env, auth.userId, clientId, searchQuery);
      return { data: result };
    }

    if (!parentId && !searchQuery && !pageToken && !orderBy) {
      const files = await getRecentFiles(env, auth.userId, clientId);
      return { data: { files, nextPageToken: "" } };
    }

    const result = await listFiles(env, auth.userId, clientId, {
      parentId,
      pageSize,
      pageToken,
      orderBy: orderBy || "folder,name"
    });
    return { data: result };
  } catch (error) {
    if (error?.code === "AUTH_REQUIRED" || error?.code === "AUTH_EXPIRED") {
      return { data: { files: [], nextPageToken: "" } };
    }
    if (error?.status >= 500 && error?.status < 600) {
      return { data: { files: [], nextPageToken: "" } };
    }
    throw error;
  }
}

export async function googleDriveFileRoute({ url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, ["clientId", "id"]);
  const clientId = queryText(url, "clientId", { pattern: PATTERNS.googleClientId });
  const fileId = queryText(url, "id", { pattern: /^[a-zA-Z0-9_-]{10,128}$/ });
  const file = await getFile(env, auth.userId, clientId, fileId);
  return { data: { file } };
}

export async function googleDriveFolderCreateRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 2);
  const name = requireField(body, "name", /^[\p{L}\p{N} _.,!?\-()[\]{}]{1,500}$/u);
  const parentId = optionalField(body, "parentId", /^[a-zA-Z0-9_-]{10,128}$/);
  const clientId = requireField(body, "clientId", PATTERNS.googleClientId);
  const folder = await createFolder(env, auth.userId, clientId, { name, parentId: parentId || null });
  return { data: { folder } };
}

export async function googleDriveFileUpdateRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 5);
  const fileId = requireField(body, "fileId", /^[a-zA-Z0-9_-]{10,128}$/);
  const name = body.name ? safeFileName(body.name) : null;
  const clientId = requireField(body, "clientId", PATTERNS.googleClientId);
  const addParents = Array.isArray(body.addParents) ? body.addParents.filter((id) => /^[a-zA-Z0-9_-]{10,128}$/.test(id)) : [];
  const removeParents = Array.isArray(body.removeParents) ? body.removeParents.filter((id) => /^[a-zA-Z0-9_-]{10,128}$/.test(id)) : [];
  const file = await updateFile(env, auth.userId, clientId, fileId, { name, addParents, removeParents });
  return { data: { file } };
}

export async function googleDriveFileTrashRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 2);
  const fileId = requireField(body, "fileId", /^[a-zA-Z0-9_-]{10,128}$/);
  const clientId = requireField(body, "clientId", PATTERNS.googleClientId);
  const file = await trashFile(env, auth.userId, clientId, fileId);
  return { data: { file } };
}

export async function googleDriveFileDeleteRoute({ url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, ["clientId", "fileId"]);
  const clientId = queryText(url, "clientId", { pattern: PATTERNS.googleClientId });
  const fileId = queryText(url, "fileId", { pattern: /^[a-zA-Z0-9_-]{10,128}$/ });
  await deleteFile(env, auth.userId, clientId, fileId);
  return { data: { deleted: true } };
}

export async function googleDriveQuotaRoute({ url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, ["clientId"]);
  const clientId = queryText(url, "clientId", { pattern: PATTERNS.googleClientId });
  const quota = await getStorageQuota(env, auth.userId, clientId);
  return { data: quota };
}

export async function googleDriveUploadRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const clientId = safeText(request.headers.get("x-ethone-client-id"), 100);
  if (!PATTERNS.googleClientId.test(clientId)) throw httpError("INVALID_PARAMETER", 400);
  const file = await uploadFile(env, auth.userId, clientId, request);
  return { data: { file } };
}

export async function googleDriveDownloadRoute({ url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, ["clientId", "fileId"]);
  const clientId = queryText(url, "clientId", { pattern: PATTERNS.googleClientId });
  const fileId = queryText(url, "fileId", { pattern: /^[a-zA-Z0-9_-]{10,128}$/ });
  const { stream, headers } = await downloadFile(env, auth.userId, clientId, fileId);
  const responseHeaders = new Headers();
  if (headers["content-type"]) responseHeaders.set("content-type", headers["content-type"]);
  if (headers["content-length"]) responseHeaders.set("content-length", headers["content-length"]);
  responseHeaders.set("content-disposition", "attachment");
  return routeResult(null, {}, {
    raw: true,
    response: new Response(stream, { status: 200, headers: responseHeaders })
  });
}

export async function googleDriveOAuthDisconnectRoute({ env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  await disconnectGoogleDrive(env, auth.userId);
  return { data: { connected: false } };
}

function safeFileName(value) {
  const name = String(value || "").trim();
  if (!name || name.length > 500 || /[\u0000-\u001f\u007f<>:"/\\|?*]/.test(name)) throw httpError("INVALID_PARAMETER", 400);
  return name;
}

function safeText(value, max = 200) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
