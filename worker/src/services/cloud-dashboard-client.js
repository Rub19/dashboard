import { httpError } from "../middleware/errors.js";
import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";

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

function normalizeFile(row) {
  return {
    id: row?.id,
    driveFileId: row?.drive_file_id,
    name: row?.name,
    mimeType: row?.mime_type,
    size: Number(row?.size) || 0,
    isFavorite: row?.is_favorite === true,
    tags: Array.isArray(row?.tags) ? row.tags : [],
    brainSummary: row?.brain_summary,
    updatedAt: row?.updated_at
  };
}

export async function getCloudDashboard(env, userId) {
  const origin = projectOrigin(env);
  if (!origin || !userId) throw httpError("AUTH_REQUIRED", 401);
  const now = new Date().toISOString();
  const filesResponse = await supabaseRequest(env, `/rest/v1/ethone_files?user_id=eq.${encodeURIComponent(userId)}&trashed=eq.false&order=size.desc&limit=1000&select=*`, { maxBytes: 2 * 1024 * 1024 });
  const allFiles = Array.isArray(filesResponse.data) ? filesResponse.data : [];
  const files = allFiles.map(normalizeFile);
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const folders = files.filter((file) => file.mimeType === "application/vnd.google-apps.folder").length;
  const favorites = files.filter((file) => file.isFavorite).length;

  const sharesResponse = await supabaseRequest(env, `/rest/v1/ethone_file_shares?user_id=eq.${encodeURIComponent(userId)}&revoked=eq.false&select=*`, { maxBytes: 256 * 1024 });
  const shares = Array.isArray(sharesResponse.data) ? sharesResponse.data : [];
  const activeShares = shares.length;
  const expiredShares = shares.filter((share) => share.expires_at && share.expires_at <= now).length;

  const dropsResponse = await supabaseRequest(env, `/rest/v1/ethone_file_drops?user_id=eq.${encodeURIComponent(userId)}&select=*`, { maxBytes: 256 * 1024 });
  const drops = Array.isArray(dropsResponse.data) ? dropsResponse.data : [];
  const activeDrops = drops.length;
  const expiredDrops = drops.filter((drop) => drop.expires_at && drop.expires_at <= now).length;

  const topFiles = files
    .filter((file) => file.size > 0)
    .slice(0, 10)
    .map((file) => ({ id: file.id, driveFileId: file.driveFileId, name: file.name, size: file.size, mimeType: file.mimeType }));

  return Object.freeze({
    totalFiles: files.length,
    totalSize,
    folders,
    favorites,
    activeShares,
    expiredShares,
    activeDrops,
    expiredDrops,
    topFiles
  });
}
