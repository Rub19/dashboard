import { httpError } from "../middleware/errors.js";
import { listConnections } from "../services/connections-client.js";

export async function connectionsListRoute({ env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const data = await listConnections(env, auth.userId);
  return { data };
}
