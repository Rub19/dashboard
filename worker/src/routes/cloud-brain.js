import { httpError } from "../middleware/errors.js";
import { assertAllowedQuery } from "../middleware/validation.js";
import { analyzeFile } from "../services/cloud-brain-client.js";

async function readJsonBody(request, maxFields) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) return {};
  return request.json().then((body) => {
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length > maxFields) return {};
    return body;
  }).catch(() => ({}));
}

export async function cloudFileBrainRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 2);
  const driveFileId = String(body.driveFileId || "").trim();
  if (!/^[a-zA-Z0-9_-]{10,128}$/.test(driveFileId)) throw httpError("INVALID_PARAMETER", 400);
  const folders = Array.isArray(body.folders) ? body.folders : [];
  const result = await analyzeFile(env, auth.userId, driveFileId, folders);
  return { data: result };
}
