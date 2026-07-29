import assert from "node:assert/strict";
import test from "node:test";
import { invoke, json, payload, providerFetch, testEnv } from "./helpers.mjs";

test("Brain complete requires authentication", async () => {
  const response = await invoke("/api/brain/complete", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ provider: "groq", messages: [{ role: "user", content: "Salut" }] })
  });
  assert.equal(response.status, 401);
});

test("Brain complete rejects providers without a backend implementation", async () => {
  const response = await invoke("/api/brain/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "openai", messages: [{ role: "user", content: "Salut" }] })
  });
  assert.equal(response.status, 501);
});

test("Brain complete returns 501 when the Groq key is not configured", async () => {
  const env = testEnv({ GROQ_API_KEY: undefined });
  const response = await invoke("/api/brain/complete", {
    method: "POST",
    env,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "groq", messages: [{ role: "user", content: "Salut" }] })
  });
  assert.equal(response.status, 501);
});

test("Brain complete rejects an empty messages array", async () => {
  const response = await invoke("/api/brain/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "groq", messages: [] })
  });
  assert.equal(response.status, 400);
});

test("Brain complete calls Groq with the sanitized messages and context, and returns the reply", async () => {
  const calls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "api.groq.com") {
        calls.push(JSON.parse(init.body));
        return json({ choices: [{ message: { role: "assistant", content: "Bonjour depuis Groq" } }] });
      }
      return providerFetch()(input, init);
    }
  });
  const response = await invoke("/api/brain/complete", {
    method: "POST",
    env,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      provider: "groq",
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: "Quelles sont mes taches ?" }],
      context: { route: "brain", tasks: [{ title: "Payer la facture" }] }
    })
  });
  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(body.data.content, "Bonjour depuis Groq");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, "llama-3.1-8b-instant");
  assert.ok(calls[0].messages.some((message) => message.role === "system" && message.content.includes("Payer la facture")));
  assert.ok(calls[0].messages.some((message) => message.role === "user" && message.content === "Quelles sont mes taches ?"));
});

test("Brain complete falls back to the default model for an unrecognized model id", async () => {
  const calls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "api.groq.com") {
        calls.push(JSON.parse(init.body));
        return json({ choices: [{ message: { role: "assistant", content: "OK" } }] });
      }
      return providerFetch()(input, init);
    }
  });
  await invoke("/api/brain/complete", {
    method: "POST",
    env,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "groq", model: "not-a-real-model", messages: [{ role: "user", content: "Salut" }] })
  });
  assert.equal(calls[0].model, "llama-3.1-8b-instant");
});

test("Brain complete diagnostic operation pings Groq without requiring messages", async () => {
  const calls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "api.groq.com") {
        calls.push(1);
        return json({ choices: [{ message: { role: "assistant", content: "pong" } }] });
      }
      return providerFetch()(input, init);
    }
  });
  const response = await invoke("/api/brain/complete", {
    method: "POST",
    env,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "groq", operation: "diagnostic" })
  });
  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(body.data.ok, true);
  assert.equal(calls.length, 1);
});
