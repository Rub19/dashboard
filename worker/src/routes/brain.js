import { httpError } from "../middleware/errors.js";
import { aiComplete, aiDiagnostic } from "../services/ai-router.js";
import { aiProviderById } from "../services/ai-config.js";

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

function normalizeProvider(provider, env) {
  const normalized = String(provider || env.AI_PRIMARY_PROVIDER || "cloudflare").toLowerCase();
  if (!PROVIDER_RE.test(normalized)) throw httpError("INVALID_PARAMETER", 400, { detail: "provider" });
  if (!aiProviderById(normalized)) throw httpError("SERVICE_NOT_CONFIGURED", 501, { detail: `provider:${normalized}` });
  return normalized;
}

export async function brainCompleteRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 8);
  const requestedProvider = normalizeProvider(body.provider, env);

  const envWithUser = { ...env, __AUTH_USER_ID: auth.userId };

  if (body.operation === "diagnostic") {
    const result = await aiDiagnostic(envWithUser, { provider: requestedProvider, baseUrl: body.baseUrl });
    return { data: result };
  }

  if (!Array.isArray(body.messages) || !body.messages.length) throw httpError("INVALID_REQUEST", 400);

  const forceProvider = requestedProvider !== "cloudflare";
  const targetProvider = forceProvider ? requestedProvider : (body.fallbackProvider || undefined);

  const result = await aiComplete(envWithUser, {
    messages: body.messages,
    context: body.context,
    provider: targetProvider,
    model: body.model,
    feature: "brain",
    priority: "normal",
    baseUrl: body.baseUrl,
    forceProvider,
    requestId: body.requestId,
  });

  return { data: result };
}
