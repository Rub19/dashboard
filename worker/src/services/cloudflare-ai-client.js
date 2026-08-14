import { httpError } from "../middleware/errors.js";
import { requestExternal } from "../utils/external-request.js";
import { aiProviderById, estimateNeurons } from "./ai-config.js";
import { safeText } from "./../utils/normalize.js";

const SYSTEM_PROMPT = "Tu es Brain, l'assistant integre au tableau de bord personnel ETHONE. Reponds en francais, de maniere concise et utile.";

function fetcher(env) {
  return typeof env?.__TEST_FETCH__ === "function" ? env.__TEST_FETCH__ : fetch;
}

function resolveModel(requested) {
  const cloudflare = aiProviderById("cloudflare");
  const value = safeText(requested, 80);
  if (value && (cloudflare.fallbackModels.includes(value) || value === cloudflare.defaultModel)) return value;
  return cloudflare.defaultModel;
}

function sanitizeMessages(messages) {
  const list = Array.isArray(messages) ? messages.slice(-12) : [];
  return list
    .map((entry) => ({
      role: entry?.role === "assistant" ? "assistant" : "user",
      content: typeof entry?.content === "string" ? entry.content.slice(0, 2400) : ""
    }))
    .filter((entry) => entry.content);
}

function normalizeWorkersAiMessages(messages, contextJson) {
  const system = { role: "system", content: `${SYSTEM_PROMPT}\n\nContexte : ${contextJson}` };
  return [system, ...messages];
}

function parseWorkersAiResponse(data, requestedModel) {
  const content = safeText(data?.response, 4000)
    || safeText(data?.choices?.[0]?.message?.content, 4000)
    || safeText(data?.result?.response, 4000);
  if (!content) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
  return Object.freeze({
    content,
    model: safeText(data?.model || requestedModel, 80) || resolveModel(requestedModel),
    usage: data?.usage || data?.usage || null,
  });
}

function detectQuotaError(data, status) {
  const message = String(data?.message || data?.error?.message || "").toLowerCase();
  return status === 429
    || message.includes("quota")
    || message.includes("rate limit")
    || message.includes("too many requests")
    || message.includes("exceeded")
    || message.includes("insufficient neurons");
}

async function callWorkersAiBinding(env, { model, messages }) {
  const binding = env.AI;
  if (!binding || typeof binding.run !== "function") {
    throw httpError("SERVICE_NOT_CONFIGURED", 501, { detail: "AI binding unavailable" });
  }
  const result = await binding.run(model, { messages });
  return parseWorkersAiResponse(result, model);
}

async function callWorkersAiRest(env, { model, messages }) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw httpError("SERVICE_NOT_CONFIGURED", 501, { detail: "Cloudflare AI credentials missing" });
  }

  const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${encodeURIComponent(model)}`);
  const response = await requestExternal(url, {
    env,
    expectedOrigin: "https://api.cloudflare.com",
    service: "cloudflare-ai",
    method: "POST",
    headers: {
      authorization: `Bearer ${apiToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ messages }),
    timeoutMs: 15000,
    maxBytes: 512 * 1024,
    retries: 0,
  });

  const data = response?.data;
  if (data?.success === false) {
    const status = data?.errors?.[0]?.code === 10000 ? 429 : 502;
    const retryable = status === 429 || status >= 500;
    throw httpError(detectQuotaError(data, status) ? "AI_QUOTA_EXCEEDED" : "UPSTREAM_UNAVAILABLE", status, { retryable, detail: data });
  }

  return parseWorkersAiResponse(data?.result || data, model);
}

export async function askCloudflareAi(env, { model, messages, context } = {}) {
  const resolvedModel = resolveModel(model);
  const chatMessages = sanitizeMessages(messages);
  if (!chatMessages.length) throw httpError("INVALID_REQUEST", 400);

  const contextJson = JSON.stringify(context || {}).slice(0, 4000);
  const payload = normalizeWorkersAiMessages(chatMessages, contextJson);

  let result;
  let lastError = null;

  if (env.AI && typeof env.AI.run === "function") {
    result = await callWorkersAiBinding(env, { model: resolvedModel, messages: payload });
  } else {
    result = await callWorkersAiRest(env, { model: resolvedModel, messages: payload });
  }

  const estimated = estimateNeurons(
    payload.map((m) => m.content).join(" "),
    result.content,
    Number(env.AI_NEURONS_PER_TOKEN || 0.1)
  );

  return Object.freeze({
    ...result,
    estimatedNeurons: estimated,
    actualNeurons: result.usage?.neurons ?? result.usage?.input_neurons ?? null,
    provider: "cloudflare",
  });
}

export async function pingCloudflareAi(env) {
  const result = await askCloudflareAi(env, {
    model: undefined,
    messages: [{ role: "user", content: "Dis simplement bonjour." }],
    context: {},
  });
  return Object.freeze({ ok: true, content: result.content, model: result.model });
}
