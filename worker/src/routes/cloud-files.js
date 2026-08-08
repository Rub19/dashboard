import { httpError } from "../middleware/errors.js";
import { assertAllowedQuery, PATTERNS, queryInteger, queryText } from "../middleware/validation.js";
import {
  getCloudFile,
  listCloudFiles,
  listFavoriteCloudFiles,
  setCloudFileFavorite,
  syncDriveFiles,
  updateCloudFile
} from "../services/cloud-files-client.js";

function readJsonBody(request, maxFields) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw httpError("INVALID_REQUEST", 400);
  return request.json().then((body) => {
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length > maxFields) throw httpError("INVALID_REQUEST", 400);
    return body;
  }).catch(() => {
    throw httpError("INVALID_REQUEST", 400);
  });
}

function safeDriveId(value) {
  const id = String(value || "").trim();
  if (!/^[a-zA-Z0-9_-]{10,128}$/.test(id)) throw httpError("INVALID_PARAMETER", 400);
  return id;
}

function safeTags(value) {
  if (!Array.isArray(value)) return [];
  return value.map((tag) => String(tag || "").trim()).filter(Boolean).slice(0, 20);
}

export async function cloudFilesSyncRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 2);
  const files = Array.isArray(body.files) ? body.files : [];
  const clientId = String(body.clientId || "").trim();
  const result = await syncDriveFiles(env, auth.userId, files, clientId);
  return { data: result };
}

export async function cloudFilesListRoute({ url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, ["parentId", "trashed", "q", "limit", "offset"]);
  const parentId = queryText(url, "parentId", { required: false, pattern: /^[a-zA-Z0-9_-]{10,128}$/ });
  const trashed = String(url.searchParams.get("trashed") || "").toLowerCase() === "true";
  const search = queryText(url, "q", { required: false, max: 100 });
  const limit = queryInteger(url, "limit", { required: false, min: 1, max: 500, fallback: 100 });
  const offset = queryInteger(url, "offset", { required: false, min: 0, fallback: 0 });
  const files = await listCloudFiles(env, auth.userId, { parentId, trashed, search, limit, offset });
  return { data: { files } };
}

export async function cloudFilesFavoritesRoute({ url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, ["limit"]);
  const limit = queryInteger(url, "limit", { required: false, min: 1, max: 500, fallback: 100 });
  const files = await listFavoriteCloudFiles(env, auth.userId, { limit });
  return { data: { files } };
}

export async function cloudFileDetailRoute({ url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, ["driveFileId"]);
  const driveFileId = queryText(url, "driveFileId", { pattern: /^[a-zA-Z0-9_-]{10,128}$/ });
  const file = await getCloudFile(env, auth.userId, driveFileId);
  if (!file) throw httpError("PROVIDER_NOT_FOUND", 404);
  return { data: { file } };
}

export async function cloudFileUpdateRoute({ request, url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, ["driveFileId"]);
  const driveFileId = queryText(url, "driveFileId", { pattern: /^[a-zA-Z0-9_-]{10,128}$/ });
  const body = await readJsonBody(request, 8);
  const patch = {};
  if (body.parentId !== undefined) patch.parentId = body.parentId ? safeDriveId(body.parentId) : null;
  if (body.name !== undefined) patch.name = String(body.name || "").trim().slice(0, 500);
  if (body.trashed !== undefined) patch.trashed = body.trashed === true;
  if (body.tags !== undefined) patch.tags = safeTags(body.tags);
  if (body.brainSummary !== undefined) patch.brainSummary = String(body.brainSummary || "").trim().slice(0, 2000);
  if (body.brainSuggestedFolderId !== undefined) patch.brainSuggestedFolderId = body.brainSuggestedFolderId ? safeDriveId(body.brainSuggestedFolderId) : null;
  const file = await updateCloudFile(env, auth.userId, driveFileId, patch);
  return { data: { file } };
}

export async function cloudFileFavoriteRoute({ request, url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, ["driveFileId"]);
  const driveFileId = queryText(url, "driveFileId", { pattern: /^[a-zA-Z0-9_-]{10,128}$/ });
  const body = await readJsonBody(request, 1).catch(() => ({}));
  const favorite = body.favorite !== false;
  await setCloudFileFavorite(env, auth.userId, driveFileId, favorite);
  return { data: { favorite } };
}
