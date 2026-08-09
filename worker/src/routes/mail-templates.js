import { httpError } from "../middleware/errors.js";
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  setDefaultTemplate,
  updateTemplate
} from "../services/mail-templates.js";

function safeText(value, limit = 320) {
  const raw = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return raw.slice(0, limit);
}

function readJsonBody(request, maxFields = 20) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw httpError("INVALID_REQUEST", 400);
  return request.json().then((body) => {
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length > maxFields) {
      throw httpError("INVALID_REQUEST", 400);
    }
    return body;
  }).catch(() => {
    throw httpError("INVALID_REQUEST", 400);
  });
}

export async function mailTemplatesRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const method = request.method;
  if (!["GET", "POST", "PATCH", "DELETE"].includes(method)) {
    throw httpError("METHOD_NOT_ALLOWED", 405);
  }

  if (method === "GET") {
    const limit = Math.min(100, Math.max(1, Number(request.url.searchParams.get("limit")) || 50));
    const offset = Math.max(0, Number(request.url.searchParams.get("offset")) || 0);
    const templates = await listTemplates(env, auth.userId, { limit, offset });
    return { data: templates, meta: { limit, offset } };
  }

  const body = await readJsonBody(request, 12);

  if (method === "DELETE") {
    const id = safeText(body.id, 64);
    if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });
    const deleted = await deleteTemplate(env, auth.userId, id);
    return { data: { deleted } };
  }

  if (method === "POST") {
    const name = safeText(body.name, 80);
    const subject = safeText(body.subject, 998);
    const content = safeText(body.content, 20000);
    if (!name) throw httpError("INVALID_PARAMETER", 400, { detail: "name" });
    const template = await createTemplate(env, auth.userId, {
      name,
      subject,
      content,
      is_default: body.is_default === true
    });
    if (!template) throw httpError("SERVICE_ERROR", 500, { detail: "template" });
    if (body.is_default === true) {
      const defaultTemplate = await setDefaultTemplate(env, auth.userId, template.id).catch(() => template);
      return { data: defaultTemplate || template };
    }
    return { data: template };
  }

  // PATCH
  const id = safeText(body.id, 64);
  if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });

  const patch = {};
  if (body.name !== undefined) patch.name = safeText(body.name, 80);
  if (body.subject !== undefined) patch.subject = safeText(body.subject, 998);
  if (body.content !== undefined) patch.content = safeText(body.content, 20000);
  if (body.is_default !== undefined) patch.is_default = body.is_default === true;

  if (Object.keys(patch).length) {
    await updateTemplate(env, auth.userId, id, patch);
  }

  if (body.is_default === true) {
    const template = await setDefaultTemplate(env, auth.userId, id);
    return { data: template };
  }

  const template = await getTemplate(env, auth.userId, id);
  return { data: template };
}
