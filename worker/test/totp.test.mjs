import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearJwksCache } from "../src/middleware/auth.js";
import { clearLocalRateLimits } from "../src/middleware/rate-limit.js";
import { clearCache } from "../src/utils/cache.js";
import { accessToken, invoke, json, payload, testEnv, USER_ID } from "./helpers.mjs";

beforeEach(() => {
  clearCache();
  clearJwksCache();
  clearLocalRateLimits();
});

// A tiny in-memory ethone_user_data store (kind='totp' rows only), stateful
// across requests within one test — mirrors the pattern in
// session-revocation.test.mjs's createDeviceStore, since proving the
// setup -> verify -> disable round trip actually works requires a PATCH
// issued by one call to be visible to the GET a subsequent call makes.
function createTotpStore() {
  const rows = new Map();
  let nextId = 1;
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });

    if (url.pathname === "/rest/v1/ethone_user_data") {
      const method = init?.method || "GET";
      const userId = url.searchParams.get("user_id")?.replace(/^eq\./, "");
      const kind = url.searchParams.get("kind")?.replace(/^eq\./, "");
      const id = url.searchParams.get("id")?.replace(/^eq\./, "");
      const matches = (row) => {
        if (userId && row.user_id !== userId) return false;
        if (kind && row.kind !== kind) return false;
        if (id && row.id !== id) return false;
        return true;
      };

      if (method === "GET") {
        return json([...rows.values()].filter(matches));
      }

      if (method === "POST") {
        const body = JSON.parse(String(init.body || "{}"));
        const row = {
          id: `totp-row-${nextId++}`,
          user_id: body.user_id,
          kind: body.kind,
          slug: body.slug ?? "",
          label: body.label ?? "",
          data: body.data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        rows.set(row.id, row);
        return json([row]);
      }

      if (method === "PATCH") {
        const body = JSON.parse(String(init.body || "{}"));
        const targets = [...rows.values()].filter(matches);
        targets.forEach((row) => Object.assign(row, body));
        return json(targets);
      }

      if (method === "DELETE") {
        const targets = [...rows.values()].filter(matches);
        targets.forEach((row) => rows.delete(row.id));
        return json(targets);
      }
    }

    if (url.pathname === "/rest/v1/ethone_security_events") return json([{}]);
    return json([]);
  };
  return { rows, fetchImpl };
}

// Independent, from-scratch re-implementation of RFC 6238 (mirroring
// totp-service.js's own hmacSha1/verifyTotp algorithm: HMAC-SHA1 of an
// 8-byte big-endian time-step counter, dynamic truncation, mod 10^6) so the
// test can produce a code that is actually valid against a given secret,
// without importing server-only generation internals.
function base32Decode(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = String(value).toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let acc = 0;
  const bytes = [];
  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    acc = (acc << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((acc >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

async function computeTotpCode(secret, timestamp = Date.now(), periodOffset = 0) {
  const period = 30;
  const counter = Math.floor(timestamp / 1000 / period) + periodOffset;
  const keyBytes = base32Decode(secret);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const counterBuffer = new ArrayBuffer(8);
  const view = new DataView(counterBuffer);
  view.setUint32(0, Math.floor(counter / 4294967296), false);
  view.setUint32(4, counter % 4294967296, false);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBuffer));
  const offset = signature[signature.length - 1] & 0x0f;
  const code = ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);
  return String(code % 10 ** 6).padStart(6, "0");
}

test("TOTP setup -> verify -> disable round trip actually works end to end", async () => {
  const { rows, fetchImpl } = createTotpStore();
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const token = await accessToken();
  const headers = { "content-type": "application/json" };

  const setup = await invoke("/api/auth/totp/setup", {
    env, token, headers, method: "POST",
    body: JSON.stringify({ email: "qa@ethone.dev" })
  });
  assert.equal(setup.status, 200);
  const setupBody = await payload(setup);
  assert.equal(setupBody.ok, true);
  const { secret, otpauth, backupCodes } = setupBody.data;
  assert.equal(typeof secret, "string");
  assert.match(secret, /^[A-Z2-7]+$/); // base32, not a hex/base64 digest
  assert.match(otpauth, /^otpauth:\/\/totp\//);
  assert.equal(Array.isArray(backupCodes), true);
  assert.equal(backupCodes.length, 8);
  backupCodes.forEach((code) => assert.match(code, /^[A-Z0-9]{8}$/));
  // Backup codes must all be distinct (crypto-random, not just uniformly
  // formatted).
  assert.equal(new Set(backupCodes).size, backupCodes.length);

  // The stored row must hold the actual base32 secret (usable to derive a
  // valid code), not a hash of it — proven below by successfully verifying
  // against it, not by inspecting the stored value directly.
  const storedRow = [...rows.values()].find((r) => r.user_id === USER_ID && r.kind === "totp");
  assert.ok(storedRow);
  assert.equal(storedRow.data.secret, secret);
  assert.equal(storedRow.data.verified, false);
  // Backup codes are stored hashed, never in plaintext.
  assert.equal(Array.isArray(storedRow.data.backup), true);
  storedRow.data.backup.forEach((hash) => assert.equal(backupCodes.includes(hash), false));

  const validCode = await computeTotpCode(secret);
  const wrongCode = validCode === "000000" ? "111111" : "000000";

  const wrongVerify = await invoke("/api/auth/totp/verify", {
    env, token, headers, method: "POST",
    body: JSON.stringify({ code: wrongCode })
  });
  assert.equal(wrongVerify.status, 401);
  assert.equal((await payload(wrongVerify)).error.code, "TOTP_INVALID");
  assert.equal(storedRow.data.verified, false);

  const verify = await invoke("/api/auth/totp/verify", {
    env, token, headers, method: "POST",
    body: JSON.stringify({ code: validCode })
  });
  assert.equal(verify.status, 200);
  const verifyBody = await payload(verify);
  assert.equal(verifyBody.ok, true);
  assert.equal(verifyBody.data.enabled, true);

  // The PATCH actually persisted (this is the "update, not a conflicting
  // insert" fix) — the same row is now marked verified, not a duplicate row.
  assert.equal(rows.size, 1);
  assert.equal(storedRow.data.verified, true);
  assert.equal(storedRow.data.secret, secret);

  // Setting up again while already enabled is rejected.
  const setupAgain = await invoke("/api/auth/totp/setup", {
    env, token, headers, method: "POST",
    body: JSON.stringify({ email: "qa@ethone.dev" })
  });
  assert.equal(setupAgain.status, 409);
  assert.equal((await payload(setupAgain)).error.code, "TOTP_ALREADY_ENABLED");

  const disable = await invoke("/api/auth/totp/disable", { env, token, method: "POST" });
  assert.equal(disable.status, 200);
  assert.equal((await payload(disable)).data.disabled, true);
  assert.equal(rows.size, 0);

  // After disabling, verifying again has nothing to check against.
  const verifyAfterDisable = await invoke("/api/auth/totp/verify", {
    env, token, headers, method: "POST",
    body: JSON.stringify({ code: validCode })
  });
  assert.equal(verifyAfterDisable.status, 400);
  assert.equal((await payload(verifyAfterDisable)).error.code, "TOTP_NOT_SETUP");
});

test("TOTP verify accepts a code from the previous or next 30s time step", async () => {
  const { fetchImpl } = createTotpStore();
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const token = await accessToken();
  const headers = { "content-type": "application/json" };

  const setup = await invoke("/api/auth/totp/setup", {
    env, token, headers, method: "POST",
    body: JSON.stringify({ email: "qa@ethone.dev" })
  });
  const { secret } = (await payload(setup)).data;

  const previousStepCode = await computeTotpCode(secret, Date.now(), -1);
  const verify = await invoke("/api/auth/totp/verify", {
    env, token, headers, method: "POST",
    body: JSON.stringify({ code: previousStepCode })
  });
  assert.equal(verify.status, 200);
  assert.equal((await payload(verify)).data.enabled, true);
});

test("TOTP setup, verify and disable all require authentication", async () => {
  const setup = await invoke("/api/auth/totp/setup", { auth: false, method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "qa@ethone.dev" }) });
  assert.equal(setup.status, 401);
  const verify = await invoke("/api/auth/totp/verify", { auth: false, method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "123456" }) });
  assert.equal(verify.status, 401);
  const disable = await invoke("/api/auth/totp/disable", { auth: false, method: "POST" });
  assert.equal(disable.status, 401);
});
