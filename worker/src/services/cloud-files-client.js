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

function safeTags(value) {
  if (!Array.isArray(value)) return [];
  return value.map((tag) => safeText(tag, 80)).filter(Boolean).slice(0, 20);
}

function safeValue(value, max, fallback = "") {
  const result = safeText(value, max);
  return result || fallback;
}

function normalizeDriveFile(input = {}) {
  return Object.freeze({
    id: safeValue(input.id, 128),
    parentId: safeValue(input.parent_id, 128),
    driveFileId: safeValue(input.drive_file_id, 128),
    driveParentId: safeValue(input.drive_parent_id, 128),
    name: safeValue(input.name, 500, "(Sans titre)"),
    mimeType: safeValue(input.mime_type, 120, "application/octet-stream"),
    isFolder: input.is_folder === true,
    size: Math.max(0, Number(input.size) || 0),
    webViewLink: safePublicUrl(input.web_view_link, []),
    thumbnailLink: safePublicUrl(input.thumbnail_link, []),
    iconUrl: safePublicUrl(input.icon_url, []),
    md5Checksum: safeValue(input.md5_checksum, 64),
    trashed: input.trashed === true,
    tags: safeTags(input.tags),
    brainSummary: safeValue(input.brain_summary, 2000),
    brainSuggestedFolderId: safeValue(input.brain_suggested_folder, 128),
    brainAnalyzedAt: safeValue(input.brain_analyzed_at, 40),
    driveCreatedAt: safeValue(input.drive_created_at, 40),
    driveModifiedAt: safeValue(input.drive_modified_at, 40),
    createdAt: safeValue(input.created_at, 40),
    updatedAt: safeValue(input.updated_at, 40)
  });
}

function buildFileRecord(userId, file, clientId = "") {
  return Object.freeze({
    user_id: userId,
    drive_file_id: safeText(file.driveFileId || file.id, "", 128),
    drive_parent_id: safeText(file.driveParentId || file.parentId, "", 128) || null,
    drive_client_id: safeText(clientId, "", 120),
    name: safeText(file.name, "(Sans titre)", 500),
    mime_type: safeText(file.mimeType || "application/octet-stream", 120),
    is_folder: file.type === "folder" || file.mimeType === "application/vnd.google-apps.folder",
    size: Math.max(0, Number(file.size) || 0),
    web_view_link: safePublicUrl(file.webViewLink, []),
    thumbnail_link: safePublicUrl(file.thumbnailLink, []),
    icon_url: safePublicUrl(file.iconUrl, []),
    md5_checksum: safeText(file.md5Checksum, "", 64),
    trashed: file.trashed === true,
    drive_created_at: safeText(file.createdAt, "", 40) || null,
    drive_modified_at: safeText(file.date, "", 40) || null
  });
}

export async function syncDriveFiles(env, userId, files = [], clientId = "") {
  const origin = projectOrigin(env);
  if (!origin || !userId || !Array.isArray(files) || !files.length) return { synced: 0 };
  const records = files.map((file) => buildFileRecord(userId, file, clientId));
  await supabaseRequest(env, "/rest/v1/ethone_files", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: records,
    maxBytes: 1024 * 1024
  });
  return { synced: records.length };
}

export async function listCloudFiles(env, userId, { parentId = null, trashed = false, search = "", limit = 100, offset = 0 } = {}) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return [];
  const params = new URLSearchParams();
  params.set("user_id", `eq.${userId}`);
  params.set("trashed", `eq.${trashed === true}`);
  if (parentId) {
    params.set("drive_parent_id", `eq.${safeText(parentId, "", 128)}`);
  } else {
    params.set("drive_parent_id", "in.(null,root)");
  }
  const safeSearch = safeText(search, 100);
  if (safeSearch) {
    const term = encodeURIComponent(safeSearch.replace(/%/g, "\\%").replace(/_/g, "\\_"));
    params.set("or", `(name.ilike.*${term}*,brain_summary.ilike.*${term}*,tags.cs.{${term}})`);
  }
  params.set("order", "is_folder.desc,name.asc");
  params.set("limit", String(Math.max(1, Math.min(500, Number(limit) || 100))));
  params.set("offset", String(Math.max(0, Number(offset) || 0)));
  params.set("select", "*,ethone_file_favorites!left(file_id)");
  const response = await supabaseRequest(env, `/rest/v1/ethone_files?${params.toString()}`, { maxBytes: 2 * 1024 * 1024 });
  const items = Array.isArray(response.data) ? response.data : [];
  return items.map((row) => ({
    ...normalizeDriveFile(row),
    isFavorite: Array.isArray(row.ethone_file_favorites) && row.ethone_file_favorites.length > 0
  }));
}

export async function getCloudFile(env, userId, driveFileId) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !driveFileId) return null;
  const response = await supabaseRequest(env, `/rest/v1/ethone_files?user_id=eq.${encodeURIComponent(userId)}&drive_file_id=eq.${encodeURIComponent(safeText(driveFileId, "", 128))}&select=*,ethone_file_favorites!left(file_id)`, { maxBytes: 128 * 1024 });
  const row = firstRow(response);
  if (!row) return null;
  return {
    ...normalizeDriveFile(row),
    isFavorite: Array.isArray(row.ethone_file_favorites) && row.ethone_file_favorites.length > 0
  };
}

export async function updateCloudFile(env, userId, driveFileId, patch = {}) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !driveFileId) return null;
  const body = {};
  if (patch.parentId !== undefined) body.drive_parent_id = patch.parentId ? safeText(patch.parentId, "", 128) : null;
  if (patch.name !== undefined) body.name = safeText(patch.name, "", 500);
  if (patch.trashed !== undefined) body.trashed = patch.trashed === true;
  if (patch.tags !== undefined) body.tags = safeTags(patch.tags);
  if (patch.brainSummary !== undefined) body.brain_summary = safeText(patch.brainSummary, "", 2000);
  if (patch.brainSuggestedFolderId !== undefined) body.brain_suggested_folder = patch.brainSuggestedFolderId ? safeText(patch.brainSuggestedFolderId, "", 128) : null;
  if (patch.brainAnalyzedAt !== undefined) body.brain_analyzed_at = safeText(patch.brainAnalyzedAt, "", 40) || null;
  if (!Object.keys(body).length) return getCloudFile(env, userId, driveFileId);
  const response = await supabaseRequest(env, `/rest/v1/ethone_files?user_id=eq.${encodeURIComponent(userId)}&drive_file_id=eq.${encodeURIComponent(safeText(driveFileId, "", 128))}`, {
    method: "PATCH",
    body,
    maxBytes: 128 * 1024
  });
  const row = firstRow(response);
  return row ? normalizeDriveFile(row) : getCloudFile(env, userId, driveFileId);
}

export async function setCloudFileFavorite(env, userId, driveFileId, favorite = true) {
  const origin = projectOrigin(env);
  if (!origin || !userId || !driveFileId) return false;
  const file = await getCloudFile(env, userId, driveFileId);
  if (!file?.id) return false;
  if (favorite) {
    await supabaseRequest(env, "/rest/v1/ethone_file_favorites", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: { user_id: userId, file_id: file.id }
    });
  } else {
    await supabaseRequest(env, `/rest/v1/ethone_file_favorites?user_id=eq.${encodeURIComponent(userId)}&file_id=eq.${encodeURIComponent(file.id)}`, { method: "DELETE" });
  }
  return true;
}

export async function listFavoriteCloudFiles(env, userId, { limit = 100 } = {}) {
  const origin = projectOrigin(env);
  if (!origin || !userId) return [];
  const response = await supabaseRequest(env, `/rest/v1/ethone_file_favorites?user_id=eq.${encodeURIComponent(userId)}&select=file_id,ethone_files!inner(*)&limit=${Math.max(1, Math.min(500, Number(limit) || 100))}`, { maxBytes: 1024 * 1024 });
  const items = Array.isArray(response.data) ? response.data : [];
  return items.map((entry) => normalizeDriveFile(entry.ethone_files)).filter(Boolean);
}
