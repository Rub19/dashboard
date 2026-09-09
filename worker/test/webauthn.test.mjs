import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearJwksCache } from "../src/middleware/auth.js";
import { clearLocalRateLimits } from "../src/middleware/rate-limit.js";
import { clearCache } from "../src/utils/cache.js";
import { verifyAuthentication } from "../src/services/webauthn-service.js";
import { accessToken, invoke, json, payload, testEnv, USER_ID } from "./helpers.mjs";

beforeEach(() => {
  clearCache();
  clearJwksCache();
  clearLocalRateLimits();
});

function toBase64Url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

function createWebauthnFetch({ passkeys = [], challenges = [] } = {}) {
  const challengeRows = [...challenges];
  return async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });

    if (url.pathname === "/rest/v1/ethone_passkeys") {
      return json(passkeys);
    }

    if (url.pathname === "/rest/v1/ethone_passkey_challenges") {
      const method = init?.method || "GET";
      if (method === "POST") {
        const body = JSON.parse(String(init.body || "{}"));
        const row = { id: `challenge-${challengeRows.length + 1}`, user_id: body.user_id, purpose: body.purpose, challenge: body.challenge, expires_at: body.expires_at, used_at: null };
        challengeRows.push(row);
        return json([row]);
      }
      // GET getActiveChallenge — filters by purpose, used_at=is.null, expires_at=gte.<now>.
      const purpose = url.searchParams.get("purpose")?.replace(/^eq\./, "");
      const matches = challengeRows.filter((row) => !row.used_at && (!purpose || row.purpose === purpose));
      return json(matches);
    }

    if (url.pathname === "/rest/v1/ethone_security_events") return json([{}]);
    return json([]);
  };
}

test("registration options resolve rpId from the actual request origin, not just ALLOWED_ORIGINS[0]", async () => {
  const env = testEnv({
    ALLOWED_ORIGINS: "https://ethone.dev,https://preview.ethone.dev",
    __TEST_FETCH__: createWebauthnFetch()
  });
  const token = await accessToken();

  const primary = await invoke("/api/auth/passkey/register-options", {
    env, token, origin: "https://ethone.dev", method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "qa@ethone.dev" })
  });
  assert.equal(primary.status, 200);
  assert.equal((await payload(primary)).data.rp.id, "ethone.dev");

  // Before the fix, createRegistrationOptions always resolved against
  // origins[0] ("ethone.dev") regardless of which allowed origin actually
  // made the request — breaking registration on any secondary origin (a
  // preview deploy, localhost in dev).
  const secondary = await invoke("/api/auth/passkey/register-options", {
    env, token, origin: "https://preview.ethone.dev", method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "qa@ethone.dev" })
  });
  assert.equal(secondary.status, 200);
  assert.equal((await payload(secondary)).data.rp.id, "preview.ethone.dev");
});

test("registration options exclude the user's existing passkeys", async () => {
  const existingCredentialId = "existing-credential-id-1234";
  const env = testEnv({
    __TEST_FETCH__: createWebauthnFetch({
      passkeys: [{ id: "pk-1", user_id: USER_ID, credential_id: existingCredentialId, public_key: "pub", sign_count: 0, metadata: { transports: ["internal"] }, revoked_at: null }]
    })
  });
  const token = await accessToken();

  const response = await invoke("/api/auth/passkey/register-options", {
    env, token, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "qa@ethone.dev" })
  });
  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(Array.isArray(body.data.excludeCredentials), true);
  assert.equal(body.data.excludeCredentials.length, 1);
  assert.equal(body.data.excludeCredentials[0].id, existingCredentialId);
});

test("registration options have an empty excludeCredentials for a user with no existing passkeys", async () => {
  const env = testEnv({ __TEST_FETCH__: createWebauthnFetch({ passkeys: [] }) });
  const token = await accessToken();

  const response = await invoke("/api/auth/passkey/register-options", {
    env, token, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "qa@ethone.dev" })
  });
  assert.equal(response.status, 200);
  assert.deepEqual((await payload(response)).data.excludeCredentials, []);
});

test("authentication verification is called with the modern top-level credential shape @simplewebauthn/server v13 expects", async () => {
  // Full WebAuthn signature verification needs a real authenticator private
  // key, which can't be meaningfully simulated in a unit test. What CAN be
  // proven without one: @simplewebauthn/server v13's verifyAuthenticationResponse
  // destructures `credential` (id/publicKey/counter) directly off its
  // options object and dereferences `credential.counter` before it ever
  // gets to signature verification (see node_modules/@simplewebauthn/server/esm/
  // authentication/verifyAuthenticationResponse.js). The legacy `authenticator: {...}`
  // shape this code used to pass leaves `credential` undefined, which throws
  // a "Cannot read properties of undefined" TypeError at that line — before
  // any crypto happens. So: build a syntactically valid (but unsigned)
  // assertion response that gets past every earlier format/origin/challenge
  // check, and assert the failure is a legitimate signature/key error from
  // deeper in the library, NOT that TypeError — proving `credential` was
  // populated, i.e. the shape fix is wired correctly end to end.
  const origin = "https://ethone.dev";
  const rpId = "ethone.dev";
  const credentialId = toBase64Url(Buffer.from("test-credential-id"));
  const challengeBytes = new Uint8Array(32).fill(7);
  const challenge = toBase64Url(challengeBytes);

  const rpIdHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rpId)));
  const flags = new Uint8Array([0x01]); // user-present only (requireUserVerification: false)
  const counter = new Uint8Array([0, 0, 0, 1]);
  const authenticatorData = new Uint8Array([...rpIdHash, ...flags, ...counter]); // exactly 37 bytes, no attested cred data

  const clientDataJSON = toBase64Url(Buffer.from(JSON.stringify({ type: "webauthn.get", challenge, origin })));

  const env = testEnv({
    __TEST_FETCH__: createWebauthnFetch({
      passkeys: [{
        id: "pk-1",
        user_id: USER_ID,
        credential_id: credentialId,
        public_key: toBase64Url(new Uint8Array([1, 2, 3, 4])), // not a real COSE key — verification must fail past the shape check, not before it
        sign_count: 0,
        metadata: { transports: [] },
        revoked_at: null
      }],
      challenges: [{ user_id: USER_ID, purpose: "authentication", challenge, expires_at: new Date(Date.now() + 60000).toISOString(), used_at: null }]
    })
  });

  const response = {
    id: credentialId,
    rawId: credentialId,
    type: "public-key",
    response: {
      clientDataJSON,
      authenticatorData: toBase64Url(authenticatorData),
      signature: toBase64Url(Buffer.from("not-a-real-signature")),
      userHandle: undefined
    },
    clientExtensionResults: {}
  };

  await assert.rejects(
    verifyAuthentication(env, origin, response),
    (error) => {
      // The tell-tale symptom of the old `authenticator: {...}` shape:
      // `credential` is undefined, so `credential.counter` throws this
      // specific TypeError before any real verification is attempted.
      assert.doesNotMatch(error.message, /Cannot read propert(y|ies) of undefined/i);
      return true;
    }
  );
});
