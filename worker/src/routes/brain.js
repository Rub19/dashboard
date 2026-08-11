import { httpError } from "../middleware/errors.js";
import { askGroq, pingGroq } from "../services/groq-client.js";
import { askLocalLlm, pingLocalLlm } from "../services/local-llm-client.js";
import { askOpenAi, askAnthropic, askGemini, pingBrainProvider } from "../services/brain-provider-clients.js";

const PROVIDER_RE = /^[a-z-]{2,32}$/;

async function readJsonBody(request, maxFields) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw httpError("INVALID_REQUEST", 400);
  let body;
  try {
    body = await request.json();
  } catch {
    throw httpError("INVALID_REQUEST", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length > maxFields) throw httpError("INVALID_REQUEST", 400);
  return body;
}

export async function brainCompleteRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 5);
  const provider = String(body.provider || "");
  if (!PROVIDER_RE.test(provider)) throw httpError("INVALID_PARAMETER", 400);
  if (!["groq", "openai", "anthropic", "gemini", "ollama", "lm-studio"].includes(provider)) throw httpError("SERVICE_NOT_CONFIGURED", 501);

  const envWithUser = { ...env, __AUTH_USER_ID: auth.userId };

  if (body.operation === "diagnostic") {
    if (provider === "groq") {
      const result = await pingGroq(envWithUser);
      return { data: result };
    }
    if (["openai", "anthropic", "gemini"].includes(provider)) {
      const ask = provider === "openai" ? askOpenAi : provider === "anthropic" ? askAnthropic : askGemini;
      const result = await pingBrainProvider(envWithUser, provider, ask);
      return { data: result };
    }
    if (!body.baseUrl) throw httpError("INVALID_REQUEST", 400, { detail: "base_url_required" });
    const result = await pingLocalLlm(envWithUser, { provider, baseUrl: body.baseUrl });
    return { data: result };
  }

  if (!Array.isArray(body.messages) || !body.messages.length) throw httpError("INVALID_REQUEST", 400);

  if (provider === "groq") {
    const result = await askGroq(envWithUser, { model: body.model, messages: body.messages, context: body.context });
    return { data: result };
  }

  if (provider === "openai") {
    const result = await askOpenAi(envWithUser, { model: body.model, messages: body.messages, context: body.context });
    return { data: result };
  }

  if (provider === "anthropic") {
    const result = await askAnthropic(envWithUser, { model: body.model, messages: body.messages, context: body.context });
    return { data: result };
  }

  if (provider === "gemini") {
    const result = await askGemini(envWithUser, { model: body.model, messages: body.messages, context: body.context });
    return { data: result };
  }

  if (!body.baseUrl) throw httpError("INVALID_REQUEST", 400, { detail: "base_url_required" });
  const result = await askLocalLlm(envWithUser, {
    provider,
    model: body.model,
    messages: body.messages,
    context: body.context,
    baseUrl: body.baseUrl
  });
  return { data: result };
}
