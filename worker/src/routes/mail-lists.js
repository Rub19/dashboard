import { httpError } from "../middleware/errors.js";
import { addMember, createList, deleteList, forwardToList, getListById, listLists, listMembers, removeMember, updateList } from "../services/mail-lists.js";

function safeText(value, limit = 320) {
  const raw = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return raw.slice(0, limit);
}

function requireId(body, field = "id") {
  const id = safeText(body?.[field], 64);
  if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: field });
  return id;
}

export async function mailListsRoute({ request, env, auth }) {
  if (!["GET", "POST", "PATCH", "DELETE"].includes(request.method)) {
    throw httpError("METHOD_NOT_ALLOWED", 405);
  }

  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const url = new URL(request.url);

  if (url.pathname.endsWith("/members")) {
    if (request.method === "GET") {
      const listId = safeText(url.searchParams.get("list_id"), 64);
      if (!listId) throw httpError("INVALID_PARAMETER", 400, { detail: "list_id" });
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
      const members = await listMembers(env, auth.userId, listId, limit);
      return { data: members };
    }

    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const listId = requireId(body, "list_id");
      const result = await addMember(env, auth.userId, listId, {
        email: body.email,
        name: body.name
      });
      return { data: result };
    }

    if (request.method === "DELETE") {
      const body = await request.json().catch(() => ({}));
      const listId = requireId(body, "list_id");
      const memberId = requireId(body, "member_id");
      const result = await removeMember(env, auth.userId, listId, memberId);
      return { data: result };
    }

    throw httpError("METHOD_NOT_ALLOWED", 405);
  }

  if (url.pathname.endsWith("/send")) {
    if (request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);
    const body = await request.json().catch(() => ({}));
    const listId = requireId(body, "list_id");
    const list = await getListById(env, auth.userId, listId);
    if (!list) throw httpError("NOT_FOUND", 404, { detail: "list" });
    const result = await forwardToList(env, auth.userId, list, body.message, body.resend_api_key || env.RESEND_API_KEY);
    return { data: result };
  }

  if (request.method === "GET") {
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
    const lists = await listLists(env, auth.userId, limit);
    return { data: lists };
  }

  const body = await request.json().catch(() => ({}));

  if (request.method === "DELETE") {
    const id = requireId(body);
    const result = await deleteList(env, auth.userId, id);
    return { data: result };
  }

  if (request.method === "PATCH") {
    const id = requireId(body);
    const result = await updateList(env, auth.userId, id, body);
    return { data: result };
  }

  // POST: create list.
  const result = await createList(env, auth.userId, {
    alias_address: body.alias_address,
    name: body.name,
    description: body.description,
    is_public: body.is_public,
    reply_to_list: body.reply_to_list
  });
  return { data: result };
}
