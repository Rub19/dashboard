import { httpError } from "../middleware/errors.js";
import { cleanupExpiredSharesAndDrops } from "../services/cloud-cleanup-client.js";

export async function cloudCleanupRoute({ env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const result = await cleanupExpiredSharesAndDrops(env, auth.userId);
  return { data: result };
}
