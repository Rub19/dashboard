import { cacheDiagnostics } from "../utils/cache.js";
import { externalRequestDiagnostics } from "../utils/external-request.js";
import { routeResult } from "../utils/response.js";

export async function healthRoute({ env }) {
  return routeResult({
    status: "ok",
    version: String(env.WORKER_VERSION || "1.0.0").slice(0, 32),
    environment: String(env.ENVIRONMENT || "production").slice(0, 24),
    date: new Date().toISOString(),
    services: "available-on-demand"
  }, {
    source: "ethone-worker",
    cached: false,
    runtime: Object.freeze({ cache: cacheDiagnostics(), outbound: externalRequestDiagnostics() })
  }, {
    headers: { "Cross-Origin-Resource-Policy": "cross-origin" }
  });
}
