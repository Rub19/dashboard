import assert from "node:assert/strict";
import test from "node:test";
import { invoke, json, payload, testEnv } from "./helpers.mjs";

function aiRun(content = "Bonjour depuis Cloudflare AI", extras = {}) {
  let calls = 0;
  return {
    calls: () => calls,
    binding: {
      run: async (model, input) => {
        calls += 1;
        return {
          response: content,
          model,
          usage: extras.usage || { input_tokens: 10, output_tokens: 5 },
          ...(extras.result || {}),
        };
      },
    },
  };
}

function aiQuotaError() {
  return {
    run: async () => {
      const error = new Error("insufficient neurons");
      error.status = 429;
      throw error;
    },
  };
}

test("AI router uses Cloudflare Workers AI by default and returns usage metadata", async () => {
  const ai = aiRun("Salut depuis Cloudflare");
  const env = testEnv({
    AI_PRIMARY_PROVIDER: "cloudflare",
    AI_PRIMARY_MODEL: "@cf/meta/llama-3.3-70b-instruct-v1",
    AI_CLOUDFLARE_DAILY_BUDGET: "100",
    AI_NEURONS_PER_TOKEN: "0.1",
    AI: ai.binding,
  });

  const response = await invoke("/api/brain/complete", {
    method: "POST",
    env,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Salut" }] }),
  });

  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(body.data.content, "Salut depuis Cloudflare");
  assert.equal(body.data.provider, "cloudflare");
  assert.equal(body.data.fallback, false);
  assert.equal(ai.calls(), 1);
  assert.ok(body.data.quota);
  assert.ok(typeof body.data.quota.used === "number");
  assert.ok(typeof body.data.quota.budget === "number");
});

test("AI router falls back to user provider when Cloudflare quota is exhausted", async () => {
  const env = testEnv({
    AI_PRIMARY_PROVIDER: "cloudflare",
    AI_PRIMARY_MODEL: "@cf/meta/llama-3.3-70b-instruct-v1",
    AI_FALLBACK_PROVIDER: "groq",
    AI_CLOUDFLARE_DAILY_BUDGET: "1",
    AI_NEURONS_PER_TOKEN: "0.1",
    AI: aiQuotaError(),
  });

  const response = await invoke("/api/brain/complete", {
    method: "POST",
    env,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Salut" }] }),
  });

  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(body.data.fallback, true);
  assert.equal(body.data.provider, "groq");
  assert.ok(body.data.fallbackReason);
});

test("AI router returns 501 when no fallback is configured", async () => {
  const env = testEnv({
    AI_PRIMARY_PROVIDER: "cloudflare",
    AI_FALLBACK_PROVIDER: "openai",
    AI_CLOUDFLARE_DAILY_BUDGET: "1",
    AI: aiQuotaError(),
  });

  const response = await invoke("/api/brain/complete", {
    method: "POST",
    env,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Salut" }] }),
  });

  assert.equal(response.status, 501);
});

test("AI router rejects oversized prompts", async () => {
  const env = testEnv({
    AI_PRIMARY_PROVIDER: "cloudflare",
    AI_USER_MAX_PROMPT_CHARS: "5",
    AI: aiRun("OK").binding,
  });

  const response = await invoke("/api/brain/complete", {
    method: "POST",
    env,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Ceci est un message beaucoup trop long" }] }),
  });

  assert.equal(response.status, 413);
});

test("AI router diagnostic reports Cloudflare status", async () => {
  const env = testEnv({
    AI_PRIMARY_PROVIDER: "cloudflare",
    AI: aiRun("pong").binding,
  });

  const response = await invoke("/api/brain/complete", {
    method: "POST",
    env,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "cloudflare", operation: "diagnostic" }),
  });

  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(body.data.ok, true);
  assert.equal(body.data.provider, "cloudflare");
});
