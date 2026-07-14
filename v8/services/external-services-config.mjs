export const WORKER_API_BASE_URL = "https://raspy-fog-bf5b.rub19-mailpro.workers.dev";

const ENVIRONMENT_URLS = Object.freeze({
  production: WORKER_API_BASE_URL,
  staging: WORKER_API_BASE_URL,
  development: "http://127.0.0.1:8787"
});

function environmentFor(runtime) {
  const hostname = String(runtime?.location?.hostname || "").toLowerCase();
  if (hostname === "127.0.0.1" || hostname === "localhost") return "development";
  if (hostname.startsWith("staging.") || hostname.startsWith("deploy.")) return "staging";
  return "production";
}

export function externalServicesConfig(runtime = globalThis, options = {}) {
  const environment = options.environment || environmentFor(runtime);
  const baseUrl = ENVIRONMENT_URLS[environment] || WORKER_API_BASE_URL;
  return Object.freeze({ environment, baseUrl });
}
