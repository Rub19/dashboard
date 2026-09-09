import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearJwksCache } from "../src/middleware/auth.js";
import { clearLocalRateLimits } from "../src/middleware/rate-limit.js";
import { clearCache } from "../src/utils/cache.js";
import { invoke, json, payload, testEnv, USER_ID } from "./helpers.mjs";

beforeEach(() => {
  clearCache();
  clearJwksCache();
  clearLocalRateLimits();
});

// Regression test for a live, unauthenticated, cross-tenant vulnerability:
// POST /api/connections/disconnect used to accept a client-supplied
// `purgeAll: true` flag that, for provider "discord", deleted every user's
// Discord tokens/credentials database-wide — no auth check at all, since
// the route was `public: true` and userId was never required. The purgeAll
// branch (and its only caller, a dead one-time migration helper) has been
// removed, and the route now requires a verified session.

test("connections disconnect requires authentication", async () => {
  const response = await invoke("/api/connections/disconnect", {
    auth: false,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "discord" }),
  });
  assert.equal(response.status, 401);
});

test("connections disconnect ignores a purgeAll flag and only ever deletes the caller's own rows", async () => {
  const deletedUrls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input, init) => {
      const url = new URL(String(input));
      if (init?.method === "DELETE") deletedUrls.push(url.pathname + url.search);
      return json([]);
    },
  });

  const response = await invoke("/api/connections/disconnect", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "discord", purgeAll: true }),
  });

  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(body.ok, true);
  assert.equal(body.data.success, true);
  // No "purgedAll" outcome exists any more — the field itself is gone.
  assert.equal(body.data.purgedAll, undefined);

  // Every DELETE issued must be scoped to the authenticated caller's own
  // owner_id, never a bare provider-wide filter (the old purgeAll shape).
  assert.ok(deletedUrls.length > 0, "expected at least one scoped delete");
  for (const url of deletedUrls) {
    assert.ok(url.includes(`owner_id=eq.${USER_ID}`), `delete not scoped to caller: ${url}`);
  }
});
