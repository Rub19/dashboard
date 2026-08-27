import { listConnections } from "../services/connections-client.js";

export async function connectionsListRoute({ env, auth }) {
  if (!auth?.userId) {
    return { data: [] };
  }
  const data = await listConnections(env, auth.userId);
  return { data };
}
