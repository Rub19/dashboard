import { httpError } from "../middleware/errors.js";
import { requestExternal } from "../utils/external-request.js";
import { safeText } from "../utils/normalize.js";
import { getUserCredential } from "./ai-credential-vault.js";

const SYSTEM_PROMPT = "Tu es Brain, l'assistant integre au tableau de bord personnel ETHONE. Reponds en francais, de maniere concise et utile.";

function sanitizeMessages(messages, limit = 12, charLimit = 2400) {
  const list = Array.isArray(messages) ? messages.slice(-limit) : [];
  return list
    .map((entry) => ({
      role: entry?.role === "assistant" ? "assistant" : "user",
      content: typeof entry?.content === "string" ? entry.content.slice(0, charLimit) : ""
    }))
    .filter((entry) => entry.content);
}

function safeApiKey(credential) {
  if (!credential || typeof credential !== "object") return null;
  const key = credential.apiKey;
  if (typeof key !== "string" || key.length < 20) return null;
  return key;
}

function buildContext(context) {
  return JSON.stringify(context || {}).slice(0, 4000);
}

function contextReply(messages, context) {
  const last = messages.findLast((m) => m?.role === "user" && m?.content) || { content: "" };
  const text = String(last.content).toLowerCase();
  const persona = String(context?.persona || "");
  const tone = String(context?.tone || "");
  const detail = String(context?.detail || "");

  if (text.includes("bonjour") || text.includes("salut") || text.includes("hello")) {
    return "Salut ! Je suis Brain, ton assistant ETHONE. Comment puis-je t'aider aujourd'hui ?";
  }
  if (text.includes("note")) {
    return "Je peux t'aider à créer ou modifier une note. Veux-tu que je le fasse maintenant ?";
  }
  if (text.includes("tâche") || text.includes("task")) {
    return "Tu veux créer une tâche ? Donne-moi un titre et une priorité.";
  }
  if (text.includes("planning") || text.includes("agenda") || text.includes("calendrier")) {
    return "Je peux t'aider à préparer ton planning. Quelles sont les choses importantes cette semaine ?";
  }
  if (text.includes("météo") || text.includes("weather")) {
    return "Consulte la page Météo pour les prévisions en temps réel.";
  }
  if (text.includes("paramètre") || text.includes("setting")) {
    return "Tu peux modifier tes préférences dans l'onglet Préférences de Brain ou dans Paramètres.";
  }
  if (text.includes("merci")) {
    return "Avec plaisir ! N'hésite pas si tu as besoin d'autre chose.";
  }
  if (text.includes("aide") || text.includes("help")) {
    return "Je peux créer des notes, tâches, événements, analyser tes mails ou te donner un briefing. Que veux-tu faire ?";
  }

  const toneLabel = tone ? ` (ton : ${tone})` : "";
  const detailLabel = detail === "detailed" ? " en détail" : detail === "brief" ? " brièvement" : "";
  return `J'ai bien reçu ton message${toneLabel}. Pour l'instant je tourne en mode local${detailLabel}, donc je réponds avec des règles simples. Configure un provider cloud (Groq, OpenAI...) pour obtenir des réponses plus riches.`;
}

function requireApiKey(env, userId, provider) {
  return getUserCredential(env, userId, provider).then((credential) => {
    const key = safeApiKey(credential);
    if (!key) throw httpError("SERVICE_NOT_CONFIGURED", 501, { detail: `${provider}_api_key_missing` });
    return key;
  });
}

export async function askOpenAi(env, { model, messages, context }) {
  const apiKey = await requireApiKey(env, env.__AUTH_USER_ID, "openai");
  const chatMessages = sanitizeMessages(messages);
  if (!chatMessages.length) throw httpError("INVALID_REQUEST", 400);

  const contextJson = buildContext(context);
  const response = await requestExternal(new URL("https://api.openai.com/v1/chat/completions"), {
    env,
    expectedOrigin: "https://api.openai.com",
    service: "openai",
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: safeText(model, 80) || "gpt-4o-mini",
      max_tokens: 1024,
      temperature: 0.4,
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\nContexte : ${contextJson}` },
        ...chatMessages
      ]
    }),
    timeoutMs: 15000,
    maxBytes: 512 * 1024,
    retries: 0,
  });
  const content = safeText(response.data?.choices?.[0]?.message?.content, 4000);
  if (!content) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
  return Object.freeze({ content, model: response.data?.model || safeText(model, 80) || "gpt-4o-mini", provider: "openai" });
}

export async function askAnthropic(env, { model, messages, context }) {
  const apiKey = await requireApiKey(env, env.__AUTH_USER_ID, "anthropic");
  const chatMessages = sanitizeMessages(messages);
  if (!chatMessages.length) throw httpError("INVALID_REQUEST", 400);

  const contextJson = buildContext(context);
  const response = await requestExternal(new URL("https://api.anthropic.com/v1/messages"), {
    env,
    expectedOrigin: "https://api.anthropic.com",
    service: "anthropic",
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: safeText(model, 80) || "claude-3-haiku-20240307",
      max_tokens: 1024,
      temperature: 0.4,
      system: `${SYSTEM_PROMPT}\n\nContexte : ${contextJson}`,
      messages: chatMessages
    }),
    timeoutMs: 15000,
    maxBytes: 512 * 1024,
    retries: 0,
  });
  const content = safeText(response.data?.content?.[0]?.text, 4000);
  if (!content) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
  return Object.freeze({ content, model: response.data?.model || safeText(model, 80) || "claude-3-haiku-20240307", provider: "anthropic" });
}

export async function askGemini(env, { model, messages, context }) {
  const apiKey = await requireApiKey(env, env.__AUTH_USER_ID, "gemini");
  const chatMessages = sanitizeMessages(messages);
  if (!chatMessages.length) throw httpError("INVALID_REQUEST", 400);

  const contextJson = buildContext(context);
  const contents = [
    { role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\nContexte : ${contextJson}` }] },
    ...chatMessages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }))
  ];

  const selectedModel = safeText(model, 80) || "gemini-1.5-flash";
  const response = await requestExternal(
    new URL(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(apiKey)}`),
    {
      env,
      expectedOrigin: "https://generativelanguage.googleapis.com",
      service: "gemini",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.4 }
      }),
      timeoutMs: 15000,
      maxBytes: 512 * 1024,
      retries: 0,
    }
  );
  const content = safeText(response.data?.candidates?.[0]?.content?.parts?.[0]?.text, 4000);
  if (!content) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
  return Object.freeze({ content, model: selectedModel, provider: "gemini" });
}

export async function askGroq(env, { model, messages, context }) {
  const apiKey = env.GROQ_API_KEY || await requireApiKey(env, env.__AUTH_USER_ID, "groq");
  if (!apiKey) throw httpError("SERVICE_NOT_CONFIGURED", 501, { detail: "groq_api_key_missing" });

  const ALLOWED_MODELS = new Set(["llama-3.1-8b-instant", "llama-3.3-70b-versatile"]);
  const resolved = ALLOWED_MODELS.has(safeText(model, 80)) ? safeText(model, 80) : "llama-3.1-8b-instant";
  const chatMessages = sanitizeMessages(messages, 8, 1200);
  if (!chatMessages.length) throw httpError("INVALID_REQUEST", 400);

  const contextJson = buildContext(context);
  const response = await requestExternal(new URL("https://api.groq.com/openai/v1/chat/completions"), {
    env,
    expectedOrigin: "https://api.groq.com",
    service: "groq",
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: resolved,
      max_tokens: 1024,
      temperature: 0.4,
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\nContexte : ${contextJson}` },
        ...chatMessages
      ]
    }),
    timeoutMs: 15000,
    maxBytes: 512 * 1024,
    retries: 0,
  });
  const content = safeText(response.data?.choices?.[0]?.message?.content, 4000);
  if (!content) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
  return Object.freeze({ content, model: resolved, provider: "groq" });
}

export async function askDeepSeek(env, { model, messages, context }) {
  const apiKey = await requireApiKey(env, env.__AUTH_USER_ID, "deepseek");
  const chatMessages = sanitizeMessages(messages);
  if (!chatMessages.length) throw httpError("INVALID_REQUEST", 400);

  const contextJson = buildContext(context);
  const response = await requestExternal(new URL("https://api.deepseek.com/v1/chat/completions"), {
    env,
    expectedOrigin: "https://api.deepseek.com",
    service: "deepseek",
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: safeText(model, 80) || "deepseek-chat",
      max_tokens: 1024,
      temperature: 0.4,
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\nContexte : ${contextJson}` },
        ...chatMessages
      ]
    }),
    timeoutMs: 15000,
    maxBytes: 512 * 1024,
    retries: 0,
  });
  const content = safeText(response.data?.choices?.[0]?.message?.content, 4000);
  if (!content) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
  return Object.freeze({ content, model: response.data?.model || safeText(model, 80) || "deepseek-chat", provider: "deepseek" });
}

export async function askOpenRouter(env, { model, messages, context }) {
  const apiKey = await requireApiKey(env, env.__AUTH_USER_ID, "openrouter");
  const chatMessages = sanitizeMessages(messages);
  if (!chatMessages.length) throw httpError("INVALID_REQUEST", 400);

  const contextJson = buildContext(context);
  const response = await requestExternal(new URL("https://openrouter.ai/api/v1/chat/completions"), {
    env,
    expectedOrigin: "https://openrouter.ai",
    service: "openrouter",
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "HTTP-Referer": "https://ethone.dev",
      "X-Title": "ETHONE",
    },
    body: JSON.stringify({
      model: safeText(model, 80) || "openai/gpt-4o-mini",
      max_tokens: 1024,
      temperature: 0.4,
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\nContexte : ${contextJson}` },
        ...chatMessages
      ]
    }),
    timeoutMs: 15000,
    maxBytes: 512 * 1024,
    retries: 0,
  });
  const content = safeText(response.data?.choices?.[0]?.message?.content, 4000);
  if (!content) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
  return Object.freeze({ content, model: response.data?.model || safeText(model, 80) || "openai/gpt-4o-mini", provider: "openrouter" });
}

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

export async function askLocalLlm(env, { provider, model, messages, context, baseUrl }) {
  const origin = safeUrl(baseUrl);
  const chatMessages = sanitizeMessages(messages, 12, 2400);
  if (!chatMessages.length) throw httpError("INVALID_REQUEST", 400);

  const contextJson = buildContext(context);
  const systemMessage = { role: "system", content: `${SYSTEM_PROMPT}\n\nContexte : ${contextJson}` };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    if (provider === "ollama") {
      const url = new URL("/api/chat", origin);
      const response = await (env?.__TEST_FETCH__ || fetch)(url.href, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          model: safeText(model, 80) || "local-model",
          messages: [systemMessage, ...chatMessages],
          stream: false,
          options: { temperature: 0.4, num_predict: 1024 }
        }),
        redirect: "manual",
        signal: controller.signal
      });
      const data = await response.json().catch(() => null);
      const content = typeof data?.message?.content === "string" ? data.message.content : "";
      if (!content) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
      return Object.freeze({ content, model: data?.model || model, provider: "ollama" });
    }

    if (provider === "lm-studio") {
      const url = new URL("/v1/chat/completions", origin);
      const response = await (env?.__TEST_FETCH__ || fetch)(url.href, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          model: safeText(model, 80) || "local-model",
          max_tokens: 1024,
          temperature: 0.4,
          messages: [systemMessage, ...chatMessages]
        }),
        redirect: "manual",
        signal: controller.signal
      });
      const data = await response.json().catch(() => null);
      const content = typeof data?.choices?.[0]?.message?.content === "string" ? data.choices[0].message.content : "";
      if (!content) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
      return Object.freeze({ content, model: data?.model || model, provider: "lm-studio" });
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

export async function askUserProvider(env, { provider, model, messages, context, baseUrl }) {
  switch (provider) {
    case "openai":
      return askOpenAi(env, { model, messages, context });
    case "anthropic":
      return askAnthropic(env, { model, messages, context });
    case "gemini":
      return askGemini(env, { model, messages, context });
    case "groq":
      return askGroq(env, { model, messages, context });
    case "deepseek":
      return askDeepSeek(env, { model, messages, context });
    case "openrouter":
      return askOpenRouter(env, { model, messages, context });
    case "ollama":
    case "lm-studio":
      return askLocalLlm(env, { provider, model, messages, context, baseUrl });
    case "context": {
      const chatMessages = sanitizeMessages(messages);
      if (!chatMessages.length) throw httpError("INVALID_REQUEST", 400);
      const content = contextReply(chatMessages, context);
      return Object.freeze({ content, model: "context-v1", provider: "context" });
    }
    default:
      throw httpError("SERVICE_NOT_CONFIGURED", 501, { detail: `unknown_provider:${provider}` });
  }
}
