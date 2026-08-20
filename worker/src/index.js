import { authenticateRequest } from "./middleware/auth.js";
import { applyCors, assertCors, evaluateCors, preflightResponse } from "./middleware/cors.js";
import { httpError, normalizeError } from "./middleware/errors.js";
import { applyEdgeRateLimit, applyUserRateLimit } from "./middleware/rate-limit.js";
import { findRoute, routesForPath } from "./router.js";
import { requestIdFor, writeRequestLog } from "./utils/observability.js";
import { errorResponse, routeResult, successResponse } from "./utils/response.js";
import { mailReceiveHandler } from "./routes/mail.js";
import { sendScheduledMessages } from "./services/mail-client.js";
import { processOutbox } from "./services/mail-outbox.js";
import { AiQuotaManager } from "./services/ai-quota-durable-object.js";

function securityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("content-security-policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("x-frame-options", "DENY");
  headers.set("cross-origin-resource-policy", "same-site");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function isUploadRoute(route) {
  return route && (route.id === "google-drive.upload" || route.id === "google-drive.upload.chunk");
}

function validateRequestShape(request, url, route) {
  if (url.href.length > 4096) throw httpError("INVALID_REQUEST", 414);
  if (isUploadRoute(route)) return;
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > 16384) throw httpError("INVALID_REQUEST", 413);
}

async function handleRequest(request, env, executionCtx) {
  const startedAt = performance.now();
  const requestId = requestIdFor(request);
  const url = new URL(request.url);
  const cors = evaluateCors(request, env);
  const context = { request, env, executionCtx, requestId, url, cors, route: null, auth: null, result: null };
  let response;
  try {
    assertCors(cors);
    if (request.method === "OPTIONS") {
      const requestedMethod = String(request.headers.get("access-control-request-method") || "").toUpperCase();
      context.route = findRoute(requestedMethod, url.pathname);
      if (!context.route) {
        if (routesForPath(url.pathname).length) throw httpError("METHOD_NOT_ALLOWED", 405);
        throw httpError("ROUTE_NOT_FOUND", 404);
      }
      response = preflightResponse(request, cors);
    } else {
      context.route = findRoute(request.method, url.pathname);
      if (!context.route) {
        if (routesForPath(url.pathname).length) throw httpError("METHOD_NOT_ALLOWED", 405);
        throw httpError("ROUTE_NOT_FOUND", 404);
      }
      validateRequestShape(request, url, context.route);
      const edgeRate = await applyEdgeRateLimit(context);
      if (!context.route.public) context.auth = await authenticateRequest(request, env);
      const userRate = await applyUserRateLimit(context);
      const routeResponse = await context.route.handler(context);
      if (routeResponse?.raw === true) {
        response = routeResponse.response;
      } else {
        context.result = routeResult(routeResponse?.data, {
          ...(routeResponse?.meta || {}),
          rateLimit: Object.freeze({
            policy: userRate.policy === "none" ? edgeRate.policy : userRate.policy,
            remaining: userRate.remaining ?? edgeRate.remaining ?? null
          })
        }, { status: routeResponse?.status, headers: routeResponse?.headers });
        response = successResponse(context.result, { requestId, source: context.route.service, method: request.method, public: context.route?.public === true });
      }
    }
  } catch (error) {
    response = errorResponse(normalizeError(error), { requestId });
  }
  if (request.method === "HEAD") {
    response = new Response(null, { status: response.status, statusText: response.statusText, headers: response.headers });
  }
  response = securityHeaders(applyCors(response, cors));
  writeRequestLog(context, response, startedAt);
  return response;
}

async function handleEmail(message, env, executionCtx) {
  try {
    await mailReceiveHandler(message, env, executionCtx);
  } catch (error) {
    if (env.ENVIRONMENT !== "production") {
      console.error("Mail receive error:", error);
    }
  }
  return null;
}

async function handleScheduled(event, env, executionCtx) {
  try {
    await processOutbox(env);
    await sendScheduledMessages(env);
  } catch (error) {
    if (env.ENVIRONMENT !== "production") {
      console.error("Scheduled mail error:", error);
    }
  }
}

export { AiQuotaManager } from "./services/ai-quota-durable-object.js";

export default Object.freeze({
  fetch: handleRequest,
  email: handleEmail,
  scheduled: handleScheduled,
  AiQuotaManager
});
