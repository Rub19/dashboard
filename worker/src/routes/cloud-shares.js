import { httpError } from "../middleware/errors.js";
import { assertAllowedQuery, PATTERNS, queryText } from "../middleware/validation.js";
import { routeResult } from "../utils/response.js";
import { downloadFile, uploadFile } from "../services/google-drive-oauth-client.js";
import {
  createDrop,
  createShare,
  getDropBySlug,
  getShareBySlug,
  incrementDropFileCount,
  incrementShareDownload,
  listDrops,
  listShares,
  recordActivity,
  revokeDrop,
  revokeShare
} from "../services/cloud-shares-client.js";

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

function validateVisibility(value, allowed = ["public", "private", "password"]) {
  const v = String(value || "public");
  if (!allowed.includes(v)) throw httpError("INVALID_PARAMETER", 400);
  return v;
}

function validateDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw httpError("INVALID_PARAMETER", 400);
  return date.toISOString();
}

function safeSlug(value) {
  const slug = String(value || "").trim();
  if (!/^[a-zA-Z0-9_-]{12,64}$/.test(slug)) throw httpError("INVALID_PARAMETER", 400);
  return slug;
}

export async function cloudSharesCreateRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 5);
  const share = await createShare(env, auth.userId, {
    fileId: body.fileId,
    visibility: validateVisibility(body.visibility),
    password: body.password,
    expiresAt: validateDate(body.expiresAt),
    maxDownloads: Number(body.maxDownloads) || 0
  });
  await recordActivity(env, { userId: auth.userId, fileId: share.fileId, shareId: share.id, eventType: "link_created", details: { visibility: share.visibility } });
  return { data: { share } };
}

export async function cloudSharesListRoute({ url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, ["fileId", "limit"]);
  const fileId = queryText(url, "fileId", { required: false, pattern: /^[a-f0-9-]{36}$/i });
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit")) || 100));
  const shares = await listShares(env, auth.userId, { fileId, limit });
  return { data: { shares } };
}

export async function cloudShareResolveRoute({ url, env }) {
  assertAllowedQuery(url, ["slug", "password"]);
  const slug = queryText(url, "slug", { pattern: /^[a-zA-Z0-9_-]{12,64}$/ });
  const password = queryText(url, "password", { required: false, max: 200 });
  const { share, file } = await getShareBySlug(env, slug, password);
  return { data: { share: { ...share, fileId: undefined }, file } };
}

export async function cloudShareDownloadRoute({ url, env }) {
  assertAllowedQuery(url, ["slug", "password"]);
  const slug = queryText(url, "slug", { pattern: /^[a-zA-Z0-9_-]{12,64}$/ });
  const password = queryText(url, "password", { required: false, max: 200 });
  const { share, file } = await getShareBySlug(env, slug, password);
  if (!share.driveClientId) throw httpError("SHARE_NOT_READY", 503);
  const { stream, headers } = await downloadFile(env, file.user_id, share.driveClientId, file.drive_file_id);
  await incrementShareDownload(env, slug);
  await recordActivity(env, { userId: file.user_id, fileId: share.fileId, shareId: share.id, eventType: "downloaded", details: { slug } });
  const responseHeaders = new Headers();
  if (headers["content-type"]) responseHeaders.set("content-type", headers["content-type"]);
  if (headers["content-length"]) responseHeaders.set("content-length", headers["content-length"]);
  responseHeaders.set("content-disposition", "attachment");
  return routeResult(null, {}, {
    raw: true,
    response: new Response(stream, { status: 200, headers: responseHeaders })
  });
}

export async function cloudShareRevokeRoute({ request, url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, ["slug"]);
  const slug = queryText(url, "slug", { pattern: /^[a-zA-Z0-9_-]{12,64}$/ });
  const body = await readJsonBody(request, 1).catch(() => ({}));
  await revokeShare(env, auth.userId, slug);
  await recordActivity(env, { userId: auth.userId, shareId: body.shareId, eventType: "link_revoked", details: { slug } });
  return { data: { revoked: true } };
}

export async function cloudDropsCreateRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 6);
  const drop = await createDrop(env, auth.userId, {
    title: body.title,
    description: body.description,
    visibility: validateVisibility(body.visibility, ["public", "password"]),
    password: body.password,
    expiresAt: validateDate(body.expiresAt),
    maxFiles: Number(body.maxFiles) || 0,
    maxSize: Number(body.maxSize) || 0
  });
  await recordActivity(env, { userId: auth.userId, dropId: drop.id, eventType: "drop_received", details: { title: drop.title } });
  return { data: { drop } };
}

export async function cloudDropsListRoute({ url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, ["limit"]);
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit")) || 100));
  const drops = await listDrops(env, auth.userId, { limit });
  return { data: { drops } };
}

export async function cloudDropResolveRoute({ url, env }) {
  assertAllowedQuery(url, ["slug", "password"]);
  const slug = queryText(url, "slug", { pattern: /^[a-zA-Z0-9_-]{12,64}$/ });
  const password = queryText(url, "password", { required: false, max: 200 });
  const drop = await getDropBySlug(env, slug, password);
  return { data: { drop } };
}

export async function cloudDropRevokeRoute({ url, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  assertAllowedQuery(url, ["slug"]);
  const slug = queryText(url, "slug", { pattern: /^[a-zA-Z0-9_-]{12,64}$/ });
  await revokeDrop(env, auth.userId, slug);
  await recordActivity(env, { userId: auth.userId, eventType: "drop_revoked", details: { slug } });
  return { data: { revoked: true } };
}

export async function cloudDropUploadRoute({ request, url, env }) {
  assertAllowedQuery(url, ["slug", "password"]);
  const slug = queryText(url, "slug", { pattern: /^[a-zA-Z0-9_-]{12,64}$/ });
  const password = queryText(url, "password", { required: false, max: 200 });
  const drop = await getDropBySlug(env, slug, password);
  if (drop.maxFiles > 0 && drop.fileCount >= drop.maxFiles) throw httpError("DROP_LIMIT_REACHED", 410);
  if (!drop.driveClientId) throw httpError("DROP_NOT_READY", 503);
  const file = await uploadFile(env, drop.userId, drop.driveClientId, request);
  await incrementDropFileCount(env, slug);
  await recordActivity(env, { userId: drop.userId, dropId: drop.id, eventType: "drop_received", details: { fileId: file.id, name: file.name } });
  return { data: { file } };
}
