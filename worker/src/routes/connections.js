import { httpError } from "../middleware/errors.js";
import { listConnections, disconnectProvider } from "../services/connections-client.js";

export async function connectionsListRoute({ env, auth }) {
  if (!auth?.userId) {
    return { data: [] };
  }
  const data = await listConnections(env, auth.userId);
  return { data };
}

export async function connectionsDisconnectRoute({ request, env, auth }) {
  // Previously public with a client-supplied `purgeAll` flag that, for
  // provider "discord", deleted every user's Discord tokens/credentials
  // database-wide with no auth check at all — the route trusted a boolean
  // from the request body over verifying who was asking. That flag (and its
  // only caller, a dead one-time migration helper) has been removed; this
  // route now hard-requires a verified session for the one operation it's
  // meant to do: a user disconnecting their own provider.
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  let body = {};
  try {
    body = await request.json();
  } catch {}
  const provider = String(body.provider || "");
  const result = await disconnectProvider(env, auth.userId, provider);
  return { data: result };
}

