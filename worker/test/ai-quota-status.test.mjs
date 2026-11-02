import assert from "node:assert/strict";
import test from "node:test";
import { AiQuotaManager } from "../src/services/ai-quota-durable-object.js";

test("quota status never exposes Cloudflare credentials", async () => {
  const state = { storage: { get: async () => undefined } };
  const env = { CLOUDFLARE_API_TOKEN: "secret-token", CLOUDFLARE_ACCOUNT_ID: "secret-account" };
  const status = await new AiQuotaManager(state, env).getStatus();
  const body = JSON.stringify(status);
  assert.equal(body.includes("secret-token"), false);
  assert.equal(body.includes("secret-account"), false);
  assert.equal(typeof status.budget, "number");
});
