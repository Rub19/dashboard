import { httpError } from "../middleware/errors.js";
import { AI_PROVIDER_LIST, aiProviderById, resolveAiConfig, quotaStatus } from "../services/ai-config.js";
import { aiDiagnostic, aiQuotaStatus } from "../services/ai-router.js";

function safeText(value, limit = 200) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
}

export async function aiStatusRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);

  const config = resolveAiConfig(env);
  const providers = AI_PROVIDER_LIST.map((provider) => ({
    id: provider.id,
    label: provider.label,
    kind: provider.kind,
    isPrimary: provider.id === config.primaryProvider,
    isFallback: provider.id === config.fallbackProvider,
    defaultModel: provider.defaultModel,
  }));

  let cloudflareHealth = { ok: false, error: "not_tested" };
  try {
    const primary = await aiDiagnostic(env, { provider: "cloudflare" });
    cloudflareHealth = { ok: primary.ok, model: primary.model, error: primary.error || null };
  } catch (error) {
    cloudflareHealth = { ok: false, error: error?.code || "UNAVAILABLE" };
  }

  return {
    data: {
      providers,
      primary: config.primaryProvider,
      fallback: config.fallbackProvider,
      cloudflare: {
        health: cloudflareHealth,
        model: config.primaryModel,
        budget: config.cloudflare.budget,
        allocation: config.cloudflare.allocation,
        emergencyBuffer: config.cloudflare.emergencyBuffer,
      },
    }
  };
}

export async function aiQuotaRoute({ env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const status = await aiQuotaStatus(env);
  const config = resolveAiConfig(env);
  return { data: { ...status, status: quotaStatus(status.used, config.cloudflare) } };
}

export async function aiPreferencesRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const method = String(request.method || "GET").toUpperCase();

  if (method === "GET") {
    const config = resolveAiConfig(env);
    return {
      data: {
        primary: { provider: config.primaryProvider, model: config.primaryModel },
        fallback: { provider: config.fallbackProvider, model: config.fallbackModel },
        cloudflare: {
          allocation: config.cloudflare.allocation,
          budget: config.cloudflare.budget,
          emergencyBuffer: config.cloudflare.emergencyBuffer,
          warningThreshold: config.cloudflare.warningThreshold,
          prepareThreshold: config.cloudflare.prepareThreshold,
          hardStopThreshold: config.cloudflare.hardStopThreshold,
        },
        perUser: config.perUser,
      }
    };
  }

  if (method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      throw httpError("INVALID_REQUEST", 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw httpError("INVALID_REQUEST", 400);

    const provider = safeText(body.provider, 32);
    const model = safeText(body.model, 80);
    const fallback = safeText(body.fallback, 32);

    if (provider && !aiProviderById(provider)) throw httpError("INVALID_PARAMETER", 400, { detail: "provider" });
    if (fallback && !aiProviderById(fallback)) throw httpError("INVALID_PARAMETER", 400, { detail: "fallback" });

    return {
      data: {
        primary: { provider: provider || resolveAiConfig(env).primaryProvider, model: model || resolveAiConfig(env).primaryModel },
        fallback: { provider: fallback || resolveAiConfig(env).fallbackProvider, model: resolveAiConfig(env).fallbackModel },
        saved: false,
        note: "Preferences are currently derived from worker configuration and per-user credentials.",
      }
    };
  }

  throw httpError("METHOD_NOT_ALLOWED", 405);
}
