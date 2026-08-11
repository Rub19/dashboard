import { httpError } from "../middleware/errors.js";

const SYSTEM_PROMPT = "Tu es Brain, l'assistant integre au tableau de bord personnel ETHONE. Reponds en francais, de maniere concise et utile.";
const OLLAMA_TIMEOUT_MS = 12000;

function safeUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw httpError("INVALID_PARAMETER", 400, { detail: "invalid_base_url" });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw httpError("INVALID_PARAMETER", 400, { detail: "unsupported_protocol" });
  }
  return url;
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

export async function askLocalLlm(env, { provider, model, messages, context, baseUrl }) {
  const origin = safeUrl(baseUrl);
  const chatMessages = sanitizeMessages(messages);
  if (!chatMessages.length) throw httpError("INVALID_REQUEST", 400);

  const contextText = JSON.stringify(context || {}).slice(0, 4000);
  const systemMessage = { role: "system", content: `${SYSTEM_PROMPT}\n\nContexte : ${contextText}` };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  let response;
  try {
    if (provider === "ollama") {
      const url = new URL("/api/chat", origin);
      response = await (env?.__TEST_FETCH__ || fetch)(url.href, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          model: typeof model === "string" ? model.slice(0, 80) : "local-model",
          messages: [systemMessage, ...chatMessages],
          stream: false,
          options: { temperature: 0.4, num_predict: 700 }
        }),
        redirect: "manual",
        signal: controller.signal
      });
      const data = await response.json().catch(() => null);
      const content = typeof data?.message?.content === "string" ? data.message.content : "";
      if (!content) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
      return Object.freeze({ content, model: data?.model || model });
    }

    if (provider === "lm-studio") {
      const url = new URL("/v1/chat/completions", origin);
      response = await (env?.__TEST_FETCH__ || fetch)(url.href, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          model: typeof model === "string" ? model.slice(0, 80) : "local-model",
          max_tokens: 700,
          temperature: 0.4,
          messages: [systemMessage, ...chatMessages]
        }),
        redirect: "manual",
        signal: controller.signal
      });
      const data = await response.json().catch(() => null);
      const content = typeof data?.choices?.[0]?.message?.content === "string" ? data.choices[0].message.content : "";
      if (!content) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
      return Object.freeze({ content, model });
    }

    throw httpError("SERVICE_NOT_CONFIGURED", 501);
  } catch (error) {
    if (error?.code) throw error;
    if (error?.name === "AbortError") throw httpError("UPSTREAM_TIMEOUT", 504, { retryable: true });
    throw httpError("UPSTREAM_UNAVAILABLE", 503, { retryable: true });
  } finally {
    clearTimeout(timer);
  }
}

export async function pingLocalLlm(env, { provider, baseUrl }) {
  const result = await askLocalLlm(env, { provider, model: "local-model", messages: [{ role: "user", content: "Dis simplement bonjour." }], context: {}, baseUrl });
  return Object.freeze({ ok: true, latencyMs: 0, content: result.content });
}
