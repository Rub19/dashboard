import { requestExternal } from "../utils/external-request.js";

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

export async function logAiUsage(env, record) {
  if (env.AI_USAGE_LOGGING_ENABLED === "false") return;
  const origin = projectOrigin(env);
  if (!origin || !env.SUPABASE_SECRET_KEY) return;

  const body = {
    request_id: record.requestId,
    user_id: record.userId || null,
    provider: record.provider,
    model: record.model,
    feature: record.feature || "brain",
    priority: record.priority || "normal",
    estimated_neurons: record.estimatedNeurons ?? null,
    actual_neurons: record.actualNeurons ?? null,
    success: record.success === true,
    fallback_used: record.fallback === true,
    fallback_reason: record.fallbackReason || null,
    error_code: record.errorCode || null,
    latency_ms: record.latencyMs ?? null,
    quota_used: record.quotaUsed ?? null,
    quota_budget: record.quotaBudget ?? null,
    metadata: record.metadata || {},
  };

  try {
    await requestExternal(new URL("/rest/v1/ai_usage_logs", origin), {
      env,
      expectedOrigin: origin,
      service: "supabase",
      method: "POST",
      headers: { ...serviceHeaders(env.SUPABASE_SECRET_KEY), Prefer: "return=minimal" },
      body,
      maxBytes: 8192,
      retries: 0,
    });
  } catch (error) {
    if (env.ENVIRONMENT !== "production") {
      console.error("AI usage log failed:", error);
    }
  }
}
