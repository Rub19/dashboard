import { httpError } from "../middleware/errors.js";
import { getCloudDashboard } from "../services/cloud-dashboard-client.js";

export async function cloudDashboardRoute({ env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const result = await getCloudDashboard(env, auth.userId);
  return { data: result };
}
