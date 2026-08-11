import { requestExternal } from "../utils/external-request.js";
import { httpError } from "../middleware/errors.js";
import { safeText } from "../utils/normalize.js";

function projectOrigin(env) {
  let url;
  try {
    url = new URL(String(env.SUPABASE_URL || ""));
  } catch {
    return "";
  }
  return url.protocol === "https:" ? url.origin : "";
}

function serviceHeaders(secret) {
  const headers = { apikey: secret, "content-type": "application/json" };
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret)) {
    headers.Authorization = `Bearer ${secret}`;
  }
  return headers;
}

async function supabaseRequest(env, path, options = {}) {
  const origin = projectOrigin(env);
  if (!origin || !env.SUPABASE_SECRET_KEY) throw httpError("SERVICE_NOT_CONFIGURED", 503);
  const response = await requestExternal(new URL(path, origin), {
    env,
    expectedOrigin: origin,
    service: "supabase",
    method: options.method || "GET",
    headers: { ...serviceHeaders(env.SUPABASE_SECRET_KEY), ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
    retries: options.retries ?? 0,
    maxBytes: options.maxBytes ?? 65536,
  });
  return response.data;
}

async function getUserCredential(env, userId, provider) {
  const rows = await supabaseRequest(
    env,
    `/rest/v1/user_provider_credentials?owner_id=eq.${encodeURIComponent(userId)}&provider=eq.${encodeURIComponent(provider)}&select=credential`,
    { maxBytes: 8192 }
  );
  const row = Array.isArray(rows) ? rows[0] : null;
  return row?.credential || null;
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

const SYSTEM_PROMPT = "Tu es Brain, l'assistant integre au tableau de bord personnel ETHONE. Reponds en francais, de maniere concise et utile.";

export async function askOpenAi(env, { model, messages, context }) {
  const credential = await getUserCredential(env, env.__AUTH_USER_ID, "openai");
  const apiKey = credential?.apiKey;
  if (!apiKey || typeof apiKey !== "string" || apiKey.length < 20) throw httpError("SERVICE_NOT_CONFIGURED", 501);

  const chatMessages = sanitizeMessages(messages);
  if (!chatMessages.length) throw httpError("INVALID_REQUEST", 400);

  const contextJson = JSON.stringify(context || {}).slice(0, 4000);
  const response = await requestExternal(new URL("https://api.openai.com/v1/chat/completions"), {
    env,
    expectedOrigin: "https://api.openai.com",
    service: "openai",
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: typeof model === "string" && model.length > 2 ? model : "gpt-4o-mini",
      max_tokens: 700,
      temperature: 0.4,
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\nContexte : ${contextJson}` },
        ...chatMessages
      ]
    }),
    timeoutMs: 12000,
    maxBytes: 512 * 1024
  });
  const content = safeText(response.data?.choices?.[0]?.message?.content, 4000);
  if (!content) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
  return Object.freeze({ content, model: typeof model === "string" ? model : "gpt-4o-mini" });
}

export async function askAnthropic(env, { model, messages, context }) {
  const credential = await getUserCredential(env, env.__AUTH_USER_ID, "anthropic");
  const apiKey = credential?.apiKey;
  if (!apiKey || typeof apiKey !== "string" || apiKey.length < 20) throw httpError("SERVICE_NOT_CONFIGURED", 501);

  const chatMessages = sanitizeMessages(messages);
  if (!chatMessages.length) throw httpError("INVALID_REQUEST", 400);

  const contextJson = JSON.stringify(context || {}).slice(0, 4000);
  const response = await requestExternal(new URL("https://api.anthropic.com/v1/messages"), {
    env,
    expectedOrigin: "https://api.anthropic.com",
    service: "anthropic",
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: typeof model === "string" && model.length > 2 ? model : "claude-3-haiku-20240307",
      max_tokens: 700,
      temperature: 0.4,
      system: `${SYSTEM_PROMPT}\n\nContexte : ${contextJson}`,
      messages: chatMessages
    }),
    timeoutMs: 12000,
    maxBytes: 512 * 1024
  });
  const content = safeText(response.data?.content?.[0]?.text, 4000);
  if (!content) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
  return Object.freeze({ content, model: typeof model === "string" ? model : "claude-3-haiku-20240307" });
}

export async function askGemini(env, { model, messages, context }) {
  const credential = await getUserCredential(env, env.__AUTH_USER_ID, "gemini");
  const apiKey = credential?.apiKey;
  if (!apiKey || typeof apiKey !== "string" || apiKey.length < 20) throw httpError("SERVICE_NOT_CONFIGURED", 501);

  const chatMessages = sanitizeMessages(messages);
  if (!chatMessages.length) throw httpError("INVALID_REQUEST", 400);

  const contextJson = JSON.stringify(context || {}).slice(0, 4000);
  const contents = [
    { role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\nContexte : ${contextJson}` }] },
    ...chatMessages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }))
  ];

  const response = await requestExternal(
    new URL(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(typeof model === "string" && model.length > 2 ? model : "gemini-1.5-flash")}:generateContent?key=${encodeURIComponent(apiKey)}`),
    {
      env,
      expectedOrigin: "https://generativelanguage.googleapis.com",
      service: "gemini",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: 700, temperature: 0.4 }
      }),
      timeoutMs: 12000,
      maxBytes: 512 * 1024
    }
  );
  const content = safeText(response.data?.candidates?.[0]?.content?.parts?.[0]?.text, 4000);
  if (!content) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
  return Object.freeze({ content, model: typeof model === "string" ? model : "gemini-1.5-flash" });
}

export async function pingBrainProvider(env, provider, ask) {
  const result = await ask(env, { model: "", messages: [{ role: "user", content: "Dis simplement bonjour." }], context: {} });
  return Object.freeze({ ok: true, latencyMs: 0, content: result.content });
}
