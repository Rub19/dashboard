import { listConnections, disconnectProvider } from "../services/connections-client.js";

export async function connectionsListRoute({ env, auth }) {
  if (!auth?.userId) {
    return { data: [] };
  }
  const data = await listConnections(env, auth.userId);
  return { data };
}

export async function connectionsDisconnectRoute({ request, env, auth }) {
  let body = {};
  try {
    body = await request.json();
  } catch {}
  const provider = String(body.provider || "");
  const purgeAll = Boolean(body.purgeAll);
  const result = await disconnectProvider(env, auth?.userId, provider, purgeAll);
  return { data: result };
}

