import { httpError } from "../middleware/errors.js";
import { requestExternal } from "../utils/external-request.js";
import { safeText } from "../utils/normalize.js";

import { AI_PROVIDERS } from "./ai-config.js";

const API_ORIGIN = "https://api.groq.com";
const DEFAULT_MODEL = AI_PROVIDERS.groq.defaultModel;
const ALLOWED_MODELS = AI_PROVIDERS.groq.allowedModels;
const FALLBACK_MODELS = AI_PROVIDERS.groq.fallbackModels;
const SYSTEM_PROMPT = "Tu es Brain, l'assistant integre au tableau de bord personnel ETHONE. Reponds en francais, de maniere concise et utile. Tu recois un contexte JSON restreint (taches, notes, agenda, etc.) : utilise-le si pertinent, ignore-le sinon. Ne revele jamais de secrets ou de jetons, tu n'y as de toute facon pas acces.";

function resolveModelList(requested) {
  const value = safeText(requested, 80);
  const first = ALLOWED_MODELS.has(value) ? value : DEFAULT_MODEL;
  const list = [first];
  for (const m of FALLBACK_MODELS) {
    if (m !== first) list.push(m);
  }
  return list;
}

function isModelNotFound(error) {
  if (!error) return false;
  if (error.code !== "PROVIDER_NOT_FOUND") return false;
  const groqCode = error.detail?.code || error.detail?.error?.code;
  if (groqCode === "model_not_found") return true;
  const detail = String(error.detail?.message || error.detail?.error?.message || "").toLowerCase();
  return detail.includes("does not exist or you do not have access");
}

function sanitizeMessages(messages) {
  const list = Array.isArray(messages) ? messages.slice(-8) : [];
  return list
    .map((entry) => ({
      role: entry?.role === "assistant" ? "assistant" : "user",
      content: safeText(entry?.content, 1200)
    }))
    .filter((entry) => entry.content);
}

export async function askGroq(env, { model, messages, context } = {}) {
  if (!env?.GROQ_API_KEY) throw httpError("SERVICE_NOT_CONFIGURED", 501);
  const chatMessages = sanitizeMessages(messages);
  if (!chatMessages.length) throw httpError("INVALID_REQUEST", 400);
  const contextJson = JSON.stringify(context || {}).slice(0, 6000);
  const models = resolveModelList(model);
  let lastError;

  for (const selected of models) {
    try {
      const response = await requestExternal(new URL("/openai/v1/chat/completions", API_ORIGIN), {
        env,
        expectedOrigin: API_ORIGIN,
        service: "groq",
        method: "POST",
        headers: {
          authorization: `Bearer ${env.GROQ_API_KEY}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: selected,
          max_tokens: 700,
          temperature: 0.4,
          messages: [
            { role: "system", content: `${SYSTEM_PROMPT}\n\nContexte : ${contextJson}` },
            ...chatMessages
          ]
        }),
        retries: 0,
        timeoutMs: 12000,
        maxBytes: 512 * 1024
      });
      const content = safeText(response.data?.choices?.[0]?.message?.content, 4000);
      if (!content) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
      return Object.freeze({ content, model: selected });
    } catch (error) {
      if (isModelNotFound(error)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError || httpError("UPSTREAM_UNAVAILABLE", 503, { retryable: true });
}

export async function pingGroq(env) {
  if (!env?.GROQ_API_KEY) throw httpError("SERVICE_NOT_CONFIGURED", 501);
  await askGroq(env, { model: DEFAULT_MODEL, messages: [{ role: "user", content: "Dis simplement bonjour." }], context: {} });
  return Object.freeze({ ok: true });
}
