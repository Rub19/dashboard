import { httpError } from "../middleware/errors.js";
import { stableDigest } from "../utils/crypto.js";
import { aiProviderById, resolveAiConfig, estimateNeurons } from "./ai-config.js";
import { askCloudflareAi } from "./cloudflare-ai-client.js";
import { askUserProvider } from "./ai-provider-clients.js";
import { logAiUsage } from "./ai-usage-logger.js";
import { AiQuotaManager } from "./ai-quota-durable-object.js";

const FEATURES = new Set(["brain", "mail", "marketplace", "planner", "insights", "summary", "recommendations", "cloud"]);
const PRIORITIES = new Set(["critical", "high", "normal", "low"]);
const userRateBuckets = new Map();

function requestIdFor() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayStart() {
  return new Date(Date.now()).toISOString().slice(0, 10);
}

function parseEnvironmentError(error) {
  if (error?.code) return error;
  if (error?.name === "AbortError" || error?.name === "TimeoutError") {
    return httpError("UPSTREAM_TIMEOUT", 504, { retryable: true });
  }
  return httpError("UPSTREAM_UNAVAILABLE", 503, { retryable: true });
}

function isFallbackError(error) {
  if (!error) return false;
  const code = String(error.code || "");
  const status = Number(error.status) || 0;
  const message = String(error.message || "").toLowerCase();
  return (
    code === "AI_QUOTA_EXCEEDED" ||
    code === "UPSTREAM_TIMEOUT" ||
    code === "UPSTREAM_UNAVAILABLE" ||
    code === "SERVICE_NOT_CONFIGURED" ||
    code === "AI_QUOTA_BUDGET" ||
    status === 429 ||
    status === 503 ||
    status === 504 ||
    message.includes("quota") ||
    message.includes("unavailable") ||
    message.includes("timeout") ||
    message.includes("rate limit")
  );
}

function isBadRequest(error) {
  if (!error) return false;
  const status = Number(error.status) || 0;
  return status >= 400 && status < 500 && !isFallbackError(error);
}

function validateInput(input, config) {
  if (!input || typeof input !== "object") throw httpError("INVALID_REQUEST", 400);
  if (!Array.isArray(input.messages) || !input.messages.length) throw httpError("INVALID_REQUEST", 400);

  const promptChars = input.messages.reduce((sum, m) => sum + String(m?.content || "").length, 0);
  const contextChars = String(input.context ? JSON.stringify(input.context) : "").length;
  const total = promptChars + contextChars;

  if (total > config.perUser.maxPromptChars) {
    throw httpError("INVALID_REQUEST", 413, { detail: "prompt_too_large" });
  }

  const feature = FEATURES.has(String(input.feature).toLowerCase()) ? String(input.feature).toLowerCase() : "brain";
  const priority = PRIORITIES.has(String(input.priority).toLowerCase()) ? String(input.priority).toLowerCase() : "normal";

  return {
    messages: input.messages,
    context: input.context || {},
    provider: String(input.provider || "").toLowerCase() || config.primaryProvider,
    model: input.model || "",
    feature,
    priority,
    baseUrl: input.baseUrl,
    operation: input.operation,
    forceProvider: input.forceProvider === true,
  };
}

function shouldUseCloudflare(config, validated) {
  if (validated.forceProvider) return false;
  if (config.primaryProvider === "cloudflare" && !validated.provider) return true;
  if (validated.provider === "cloudflare") return true;
  return false;
}

function createRemoteQuotaManager(stub) {
  async function call(path, body) {
    const res = await stub.fetch(`https://do.internal${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`DO ${res.status}: ${text}`);
    }
    return res.json();
  }
  return {
    reserve: (estimated, force = false) => call("/reserve", { estimated, force }),
    commitUsage: (record) => call("/commit", record),
    getStatus: async () => {
      const res = await stub.fetch("https://do.internal/status");
      if (!res.ok) throw new Error(`DO ${res.status}`);
      return res.json();
    },
  };
}

async function getQuotaManager(env) {
  const binding = env.AI_QUOTA_MANAGER;
  if (binding && typeof binding.idFromName === "function") {
    const id = binding.idFromName("global");
    const stub = binding.get(id);
    return createRemoteQuotaManager(stub);
  }
  // In-memory fallback for tests or DO-unavailable environments
  const manager = new AiQuotaManager(new InMemoryState(), env);
  return {
    reserve: (estimated, force = false) => manager.reserve(estimated, force),
    commitUsage: (record) => manager.commitUsage(record),
    getStatus: () => manager.getStatus(),
  };
}

class InMemoryStorage {
  constructor() {
    this.map = new Map();
  }
  get(key) {
    return Promise.resolve(this.map.get(key));
  }
  put(key, value) {
    this.map.set(key, value);
    return Promise.resolve();
  }
  delete(key) {
    this.map.delete(key);
    return Promise.resolve();
  }
}

class InMemoryState {
  constructor() {
    this.storage = new InMemoryStorage();
  }
  blockConcurrencyWhile(fn) {
    return fn();
  }
  waitUntil() {}
}

async function reserveQuota(quotaManager, estimated, force = false) {
  return quotaManager.reserve(estimated, force);
}

async function commitQuota(quotaManager, record) {
  return quotaManager.commitUsage(record);
}

async function enforceUserRateLimit(env, userId, config) {
  const now = Date.now();
  const hourKey = `${todayStart()}:${userId}:hour`;
  const dayKey = `${todayStart()}:${userId}:day`;

  const hourEntry = userRateBuckets.get(hourKey) || { count: 0, expiresAt: now + 60 * 60 * 1000 };
  const dayEntry = userRateBuckets.get(dayKey) || { count: 0, expiresAt: now + 24 * 60 * 60 * 1000 };

  if (hourEntry.expiresAt <= now) {
    hourEntry.count = 0;
    hourEntry.expiresAt = now + 60 * 60 * 1000;
  }
  if (dayEntry.expiresAt <= now) {
    dayEntry.count = 0;
    dayEntry.expiresAt = now + 24 * 60 * 60 * 1000;
  }

  hourEntry.count += 1;
  dayEntry.count += 1;
  userRateBuckets.set(hourKey, hourEntry);
  userRateBuckets.set(dayKey, dayEntry);

  if (hourEntry.count > config.perUser.requestsPerHour) {
    throw httpError("RATE_LIMITED", 429, { retryable: true, detail: "hourly_ai_limit" });
  }
  if (dayEntry.count > config.perUser.requestsPerDay) {
    throw httpError("RATE_LIMITED", 429, { retryable: true, detail: "daily_ai_limit" });
  }
}

async function tryCloudflare(env, validated, config, quotaManager, requestId) {
  const promptText = validated.messages.map((m) => m.content).join(" ");
  const estimated = estimateNeurons(promptText, "", config.cloudflare.neuronsPerToken);

  const reserve = await reserveQuota(quotaManager, estimated, false);
  if (!reserve.allowed || reserve.exhausted) {
    const error = httpError("AI_QUOTA_BUDGET", 503, { retryable: false, detail: reserve });
    error.quotaState = reserve;
    throw error;
  }

  const startedAt = performance.now();
  try {
    const result = await askCloudflareAi(env, {
      model: config.primaryModel,
      messages: validated.messages,
      context: validated.context,
    });
    const latencyMs = Math.round(performance.now() - startedAt);
    const actual = result.actualNeurons ?? estimateNeurons(promptText, result.content, config.cloudflare.neuronsPerToken);
    await commitQuota(quotaManager, { estimated, actual, fallback: false, error: false });

    await logAiUsage(env, {
      requestId,
      userId: env.__AUTH_USER_ID,
      provider: "cloudflare",
      model: result.model,
      feature: validated.feature,
      priority: validated.priority,
      estimatedNeurons: estimated,
      actualNeurons: actual,
      success: true,
      fallback: false,
      latencyMs,
      quotaUsed: reserve.used,
      quotaBudget: reserve.budget,
      metadata: { warning: reserve.warning, prepare: reserve.prepare },
    });

    return Object.freeze({
      content: result.content,
      model: result.model,
      provider: "cloudflare",
      providerLabel: aiProviderById("cloudflare").label,
      fallback: false,
      requestId,
      latencyMs,
      quota: { used: reserve.used + actual, budget: reserve.budget, warning: reserve.warning, prepare: reserve.prepare },
    });
  } catch (error) {
    await commitQuota(quotaManager, { estimated, actual: 0, fallback: true, error: true });
    const parsed = parseEnvironmentError(error);
    await logAiUsage(env, {
      requestId,
      userId: env.__AUTH_USER_ID,
      provider: "cloudflare",
      model: config.primaryModel,
      feature: validated.feature,
      priority: validated.priority,
      estimatedNeurons: estimated,
      success: false,
      fallback: false,
      fallbackReason: parsed.code,
      errorCode: parsed.code,
      latencyMs: Math.round(performance.now() - startedAt),
      quotaUsed: reserve.used,
      quotaBudget: reserve.budget,
      metadata: { error: parsed.message },
    });
    parsed.quotaState = reserve;
    throw parsed;
  }
}

async function tryUserProvider(env, validated, config, requestId, fallbackReason) {
  const startedAt = performance.now();
  const target = validated.provider && validated.provider !== "cloudflare" ? validated.provider : config.fallbackProvider;
  const targetModel = validated.model || (target === config.fallbackProvider ? config.fallbackModel : aiProviderById(target)?.defaultModel);

  try {
    const result = await askUserProvider(env, {
      provider: target,
      model: targetModel,
      messages: validated.messages,
      context: validated.context,
      baseUrl: validated.baseUrl,
    });
    const latencyMs = Math.round(performance.now() - startedAt);
    await logAiUsage(env, {
      requestId,
      userId: env.__AUTH_USER_ID,
      provider: target,
      model: result.model,
      feature: validated.feature,
      priority: validated.priority,
      success: true,
      fallback: true,
      fallbackReason,
      latencyMs,
      metadata: { originalProvider: "cloudflare" },
    });

    return Object.freeze({
      content: result.content,
      model: result.model,
      provider: target,
      providerLabel: aiProviderById(target)?.label || target,
      fallback: true,
      fallbackReason,
      requestId,
      latencyMs,
    });
  } catch (error) {
    const parsed = parseEnvironmentError(error);
    await logAiUsage(env, {
      requestId,
      userId: env.__AUTH_USER_ID,
      provider: target,
      model: targetModel,
      feature: validated.feature,
      priority: validated.priority,
      success: false,
      fallback: true,
      fallbackReason,
      errorCode: parsed.code,
      latencyMs: Math.round(performance.now() - startedAt),
      metadata: { originalProvider: "cloudflare", error: parsed.message },
    });
    throw parsed;
  }
}

export async function aiComplete(env, input) {
  const config = resolveAiConfig(env);
  const validated = validateInput(input, config);

  if (!env.__AUTH_USER_ID) {
    throw httpError("AUTH_REQUIRED", 401);
  }

  await enforceUserRateLimit(env, env.__AUTH_USER_ID, config);

  const requestId = input.requestId || requestIdFor();
  const useCloudflare = shouldUseCloudflare(config, validated);

  if (!useCloudflare) {
    return tryUserProvider(env, validated, config, requestId, "user_provider_requested");
  }

  const quotaManager = await getQuotaManager(env);

  try {
    return await tryCloudflare(env, validated, config, quotaManager, requestId);
  } catch (error) {
    if (isBadRequest(error)) throw error;
    if (isFallbackError(error)) {
      return tryUserProvider(env, validated, config, requestId, error.code || "fallback");
    }
    throw error;
  }
}

export async function aiDiagnostic(env, { provider, baseUrl }) {
  const config = resolveAiConfig(env);
  const target = String(provider || config.primaryProvider).toLowerCase();
  const requestId = requestIdFor();

  if (target === "cloudflare") {
    try {
      const result = await askCloudflareAi(env, {
        model: config.primaryModel,
        messages: [{ role: "user", content: "Dis simplement bonjour." }],
        context: {},
      });
      return { ok: true, provider: "cloudflare", model: result.model, latencyMs: 0, requestId };
    } catch (error) {
      return { ok: false, provider: "cloudflare", error: error?.code || "UNAVAILABLE", requestId };
    }
  }

  try {
    await askUserProvider(env, {
      provider: target,
      model: "",
      messages: [{ role: "user", content: "Dis simplement bonjour." }],
      context: {},
      baseUrl,
    });
    return { ok: true, provider: target, latencyMs: 0, requestId };
  } catch (error) {
    return { ok: false, provider: target, error: error?.code || "UNAVAILABLE", requestId };
  }
}

export async function aiQuotaStatus(env) {
  const quotaManager = await getQuotaManager(env);
  return quotaManager.getStatus();
}
