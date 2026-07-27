import assert from "node:assert/strict";
import test from "node:test";

import { createNetworkClient } from "../v8/services/network-client.mjs";
import { createExternalServicesClient } from "../v8/services/external-services-client.mjs";
import { WORKER_API_BASE_URL, externalServicesConfig } from "../v8/services/external-services-config.mjs";
import { mergeWorkerDiagnostic, workerServiceForConnection } from "../v8/pages/connections-model.mjs";

function runtimeFor(fetcher, hostname = "ethone.dev") {
  return {
    crypto: globalThis.crypto,
    fetch: fetcher,
    location: { href: `https://${hostname}/`, origin: `https://${hostname}`, hostname },
    navigator: { onLine: true },
    setTimeout,
    clearTimeout
  };
}

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers }
  });
}

test("network client preserves structured Worker HTTP errors", async () => {
  const runtime = runtimeFor(async () => jsonResponse({
    ok: false,
    error: { code: "RATE_LIMITED", message: "Reessayez plus tard.", retryable: true, requestId: "request-safe" }
  }, 429, { "retry-after": "60" }));
  const network = createNetworkClient({ runtime });
  await assert.rejects(network.requestJSON(`${WORKER_API_BASE_URL}/api/diagnostic`, { retries: 0 }), (error) => {
    assert.equal(error.name, "NetworkHttpError");
    assert.equal(error.status, 429);
    assert.equal(error.code, "RATE_LIMITED");
    assert.equal(error.retryable, true);
    assert.equal(error.retryAfter, 60);
    assert.equal(error.requestId, "request-safe");
    return true;
  });
});

test("ExternalServicesClient authenticates private routes and keeps health public", async () => {
  const calls = [];
  const runtime = runtimeFor(async (url, options = {}) => {
    calls.push({ url: String(url), authorization: options.headers?.get?.("authorization") || "" });
    const path = new URL(url).pathname;
    if (path === "/health") {
      return jsonResponse({ ok: true, data: { status: "ok" }, meta: { source: "ethone-worker", cached: false, requestId: "health-request" } });
    }
    return jsonResponse({
      ok: true,
      data: { services: [{ id: "steam", available: true, routeEnabled: true }], cache: { entries: 1 }, rateLimit: { remaining: null } },
      meta: { source: "ethone-worker", cached: false, requestId: "diagnostic-request" }
    });
  });
  const network = createNetworkClient({ runtime });
  let sessionReads = 0;
  const mockAccessToken = ["signed", "supabase", "session-token"].join(".");
  const auth = {
    getClient: async () => ({
      auth: {
        getSession: async () => {
          sessionReads += 1;
          return { data: { session: { access_token: mockAccessToken } }, error: null };
        }
      }
    })
  };
  const client = createExternalServicesClient({ network, auth, runtime, config: { environment: "production", baseUrl: WORKER_API_BASE_URL } });

  await client.health();
  assert.equal(sessionReads, 0);
  assert.equal(calls[0].authorization, "");

  const diagnostic = await client.diagnostic("steam");
  assert.equal(sessionReads, 1);
  assert.match(calls[1].authorization, /^Bearer /);
  assert.equal(new URL(calls[1].url).pathname, "/api/diagnostic");
  assert.equal(new URL(calls[1].url).searchParams.get("service"), "steam");
  assert.equal(diagnostic.data.services[0].available, true);
  assert.equal(client.diagnostics().workerConnected, true);
  assert.equal(client.diagnostics().services[0].id, "steam");
  assert.equal(client.destroy(), true);
});

test("external service configuration is centralized and rejects insecure production origins", () => {
  assert.equal(externalServicesConfig(runtimeFor(() => {}, "ethone.dev")).baseUrl, WORKER_API_BASE_URL);
  assert.equal(externalServicesConfig({ location: { hostname: "127.0.0.1" } }).environment, "development");
  assert.throws(() => createExternalServicesClient({
    network: { requestJSON() {}, redactMessage: String, redactUrl: String },
    auth: { getClient() {} },
    runtime: runtimeFor(() => {}),
    config: { environment: "production", baseUrl: "http://example.test" }
  }), /HTTPS/);
});

test("Connections only claims Worker security after an authenticated diagnostic response", () => {
  const local = Object.freeze({ status: "ready", checks: Object.freeze([]), failed: 0, warnings: 0, ranAt: "2026-07-14T00:00:00.000Z" });
  assert.equal(workerServiceForConnection("steam", "server-connector"), "steam");
  assert.equal(workerServiceForConnection("spotify", "oauth-pkce"), "spotify");
  assert.equal(workerServiceForConnection("spotify", "discord-lanyard"), "lanyard");

  const unverified = mergeWorkerDiagnostic(local, { service: "steam", response: { ok: true, data: { services: [{ id: "steam", available: true, routeEnabled: true }] }, meta: {} } });
  assert.equal(unverified.workerVerified, false);
  assert.equal(unverified.failed, 1);

  const verified = mergeWorkerDiagnostic(local, {
    service: "steam",
    response: { ok: true, data: { services: [{ id: "steam", available: true, routeEnabled: true }] }, meta: { requestId: "verified-request", latencyMs: 12 } }
  });
  assert.equal(verified.workerVerified, true);
  assert.equal(verified.workerAvailable, true);
  assert.equal(verified.checks.at(-1).status, "pass");

  const missingSecret = mergeWorkerDiagnostic(local, {
    service: "steam",
    response: { ok: true, data: { services: [{ id: "steam", available: false, routeEnabled: true }] }, meta: { requestId: "verified-request" } }
  });
  assert.equal(missingSecret.workerVerified, true);
  assert.equal(missingSecret.workerAvailable, false);
  assert.equal(missingSecret.warnings, 1);
});
