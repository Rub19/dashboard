function item(service, status, message, details = {}) {
  return Object.freeze({ service, status, message: String(message || "").slice(0, 240), ...details });
}

export function createExternalDiagnostics(options = {}) {
  const network = options.network;
  const auth = options.auth;
  const serviceWorker = options.serviceWorker;
  const config = options.config || {};
  const runtime = options.runtime || globalThis;
  if (!network) throw new TypeError("External diagnostics require a network client");

  async function probe(service, url, requestOptions = {}) {
    const startedAt = Date.now();
    try {
      const response = await network.request(url, { method: requestOptions.method || "GET", headers: requestOptions.headers, timeoutMs: 6500, retries: 0, dedupe: false });
      return item(service, response.ok ? "ok" : "warning", response.ok ? "Reachable" : `HTTP ${response.status}`, {
        statusCode: response.status,
        latencyMs: Date.now() - startedAt,
        provider: response.headers?.get?.("server") || response.headers?.get?.("cf-ray") ? "edge" : "unknown"
      });
    } catch (error) {
      return item(service, runtime.navigator?.onLine === false ? "offline" : "critical", network.redactMessage(error?.message), { latencyMs: Date.now() - startedAt });
    }
  }

  async function run() {
    const report = [
      item("network", runtime.navigator?.onLine === false ? "offline" : "ok", runtime.navigator?.onLine === false ? "Browser offline" : "Browser online"),
      item("auth", auth?.status?.().status === "error" ? "critical" : "ok", auth?.status?.().status || "unknown"),
      item("service-worker", serviceWorker?.status?.().registered ? "ok" : "warning", serviceWorker?.status?.().registered ? "Registered" : "Not registered")
    ];
    if (runtime.navigator?.onLine === false) return Object.freeze({ generatedAt: new Date().toISOString(), report: Object.freeze(report) });
    const probes = await Promise.all([
      probe("application-origin", new URL("./", runtime.location.href).href, { method: "HEAD" }),
      probe("supabase-auth", `${String(config.supabaseUrl || "").replace(/\/$/, "")}/auth/v1/health`, { headers: { apikey: config.supabaseAnonKey || "" } }),
      probe("cloudflare-worker", `${String(config.workerUrl || "").replace(/\/$/, "")}/health`)
    ]);
    report.push(...probes);
    return Object.freeze({ generatedAt: new Date().toISOString(), report: Object.freeze(report), network: network.diagnostics() });
  }

  return Object.freeze({ run });
}
