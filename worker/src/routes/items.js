import { httpError } from "../middleware/errors.js";
import { createItem, deleteItem, listItems, updateItem } from "../services/items-client.js";

function readJsonBody(request, maxFields) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) return {};
  return request.json().then((body) => {
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length > maxFields) return {};
    return body;
  }).catch(() => ({}));
}

const ACTIONS = new Set(["note", "task", "event"]);

export default async function itemsRoute({ request, env, auth, route }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const kind = route?.action;
  if (!ACTIONS.has(kind)) throw httpError("INVALID_PARAMETER", 400);

  const method = String(request.method || "GET").toUpperCase();

  if (method === "GET") {
    const data = await listItems(env, auth.userId, kind);
    return { data };
  }

  if (method === "POST") {
    const body = await readJsonBody(request, 8);
    const result = await createItem(env, auth.userId, kind, body);
    return { data: result };
  }

  if (method === "PATCH") {
    const body = await readJsonBody(request, 9);
    if (!body.id) throw httpError("INVALID_PARAMETER", 400);
    const { id, ...input } = body;
    const result = await updateItem(env, auth.userId, id, input);
    return { data: result };
  }

  if (method === "DELETE") {
    const body = await readJsonBody(request, 2);
    if (!body.id) throw httpError("INVALID_PARAMETER", 400);
    const result = await deleteItem(env, auth.userId, body.id);
    return { data: result };
  }

  throw httpError("METHOD_NOT_ALLOWED", 405);
}
