import { httpError } from "../middleware/errors.js";
import { createForward, deleteForward, listForwards, setForwardActive, verifyForward } from "../services/mail-forwards.js";

const ERRORS = {
  INVALID_EMAIL: ["FORWARD_INVALID_EMAIL", 400],
  SELF_DOMAIN: ["FORWARD_SELF_DOMAIN", 400],
  UNKNOWN_ALIAS: ["FORWARD_UNKNOWN_ALIAS", 404],
  LIMIT: ["FORWARD_LIMIT", 409],
  COOLDOWN: ["FORWARD_COOLDOWN", 429],
  NOT_FOUND: ["FORWARD_NOT_FOUND", 404],
  EXPIRED: ["FORWARD_CODE_EXPIRED", 410],
  TOO_MANY_ATTEMPTS: ["FORWARD_TOO_MANY_ATTEMPTS", 429],
  WRONG_CODE: ["FORWARD_WRONG_CODE", 400],
};

function rethrow(error) {
  const mapped = ERRORS[error?.code];
  if (mapped) throw httpError(mapped[0], mapped[1], { detail: error.remaining !== undefined ? { remaining: error.remaining } : null });
  throw error;
}

async function body(request) {
  if (!String(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) return {};
  const data = await request.json().catch(() => ({}));
  return data && typeof data === "object" && !Array.isArray(data) && Object.keys(data).length <= 5 ? data : {};
}

const id64 = (v) => String(v ?? "").slice(0, 64).replace(/[^a-zA-Z0-9-]/g, "");

/** GET : redirections du compte · POST {destination, aliasId?} : ajoute ou renvoie le code · PATCH {id, active} · DELETE {id}. */
export async function mailForwardsRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  if (request.method === "GET") return { data: await listForwards(env, auth.userId) };
  const b = await body(request);
  if (request.method === "POST") {
    try {
      return { data: await createForward(env, auth.userId, { destination: b.destination, aliasId: b.aliasId ? id64(b.aliasId) : null }) };
    } catch (error) {
      return rethrow(error);
    }
  }
  const id = id64(b.id);
  if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });
  if (request.method === "PATCH") return { data: await setForwardActive(env, auth.userId, id, b.active === true) };
  if (request.method === "DELETE") return { data: await deleteForward(env, auth.userId, id) };
  throw httpError("METHOD_NOT_ALLOWED", 405);
}

/** POST {id, code} : confirme la redirection avec le code reçu sur l'adresse de destination. */
export async function mailForwardsVerifyRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  if (request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);
  const b = await body(request);
  const id = id64(b.id);
  if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: "id" });
  try {
    return { data: await verifyForward(env, auth.userId, id, String(b.code ?? "").replace(/\s/g, "").slice(0, 6)) };
  } catch (error) {
    return rethrow(error);
  }
}
