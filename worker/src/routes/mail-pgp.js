import { httpError } from "../middleware/errors.js";
import {
  createKey,
  decryptBody,
  deleteKey,
  encryptBody,
  generateKeyPair,
  listKeys
} from "../services/mail-pgp.js";

function safeText(value, limit = 320) {
  const raw = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return raw.slice(0, limit);
}

function requireId(body, field = "id") {
  const id = safeText(body?.[field], 64);
  if (!id) throw httpError("INVALID_PARAMETER", 400, { detail: field });
  return id;
}

export async function mailPgpRoute({ request, env, auth }) {
  if (!["GET", "POST", "DELETE"].includes(request.method)) throw httpError("METHOD_NOT_ALLOWED", 405);
  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const url = new URL(request.url);

  if (url.pathname.endsWith("/encrypt")) {
    if (request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);
    const body = await request.json().catch(() => ({}));
    const text = safeText(body.body, 50000);
    const publicKey = safeText(body.public_key, 8192);
    if (!text || !publicKey) throw httpError("INVALID_PARAMETER", 400, { detail: "body or public_key" });
    const result = await encryptBody(text, publicKey);
    return { data: result };
  }

  if (url.pathname.endsWith("/decrypt")) {
    if (request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);
    const body = await request.json().catch(() => ({}));
    const encryptedBody = safeText(body.encrypted_body, 50000);
    const wrappedKey = safeText(body.wrapped_key, 8192);
    const iv = safeText(body.iv, 64);
    const privateKey = safeText(body.private_key, 16384);
    const passphrase = safeText(body.passphrase, 256);
    if (!encryptedBody || !wrappedKey || !iv || !privateKey || !passphrase) {
      throw httpError("INVALID_PARAMETER", 400, { detail: "missing decryption input" });
    }
    const result = await decryptBody(encryptedBody, wrappedKey, iv, privateKey, passphrase);
    return { data: { body: result } };
  }

  if (url.pathname.endsWith("/generate")) {
    if (request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);
    const body = await request.json().catch(() => ({}));
    const passphrase = safeText(body.passphrase, 256);
    if (!passphrase) throw httpError("INVALID_PARAMETER", 400, { detail: "passphrase" });
    const result = await generateKeyPair(passphrase);
    return { data: result };
  }

  if (request.method === "GET") {
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
    const keys = await listKeys(env, auth.userId, limit);
    return { data: keys };
  }

  const body = await request.json().catch(() => ({}));

  if (request.method === "DELETE") {
    const id = requireId(body);
    await deleteKey(env, auth.userId, id);
    return { data: { deleted: true } };
  }

  // POST: create or import a key.
  const key = await createKey(env, auth.userId, body);
  return { data: key };
}
