import { httpError } from "./errors.js";
import { emptyResponse } from "../utils/response.js";

const METHODS = Object.freeze(["GET", "POST", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const HEADERS = Object.freeze([
  "authorization",
  "content-range",
  "content-type",
  "if-none-match",
  "x-ethone-client-id",
  "x-ethone-file-mime",
  "x-ethone-file-name",
  "x-ethone-file-parent",
  "x-ethone-file-size",
  "x-ethone-upload-token",
  "x-request-id"
]);

function isLoopbackOrigin(origin) {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

function configuredOrigins(env) {
  const origins = String(env.ALLOWED_ORIGINS || "https://ethone.dev")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (String(env.ENVIRONMENT || "production") !== "production") {
    origins.push(
      "http://127.0.0.1:4173",
      "http://127.0.0.1:4179",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3002",
      "http://localhost:4173",
      "http://localhost:4179",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002"
    );
  }
  return new Set(origins);
}

export function evaluateCors(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return Object.freeze({ origin: "", allowed: true });
  const allowed = configuredOrigins(env).has(origin) || isLoopbackOrigin(origin);
  return Object.freeze({ origin, allowed });
}

export function assertCors(cors) {
  if (!cors.allowed) throw httpError("CORS_ORIGIN_DENIED", 403);
}

function corsHeaders(cors) {
  const headers = new Headers({ vary: "Origin" });
  if (cors.origin && cors.allowed) {
    headers.set("access-control-allow-origin", cors.origin);
    headers.set("access-control-allow-methods", METHODS.join(", "));
    headers.set("access-control-allow-headers", HEADERS.join(", "));
    headers.set("access-control-expose-headers", "X-Request-Id, Retry-After, X-Ethone-Upload-Token");
    headers.set("access-control-max-age", "600");
  }
  return headers;
}

export function preflightResponse(request, cors) {
  assertCors(cors);
  const requestedMethod = String(request.headers.get("access-control-request-method") || "").toUpperCase();
  if (!METHODS.includes(requestedMethod) || requestedMethod === "OPTIONS") throw httpError("METHOD_NOT_ALLOWED", 405);
  const requestedHeaders = String(request.headers.get("access-control-request-headers") || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (requestedHeaders.some((header) => !HEADERS.includes(header))) throw httpError("INVALID_REQUEST", 400);
  return emptyResponse(204, corsHeaders(cors));
}

export function applyCors(response, cors) {
  const headers = new Headers(response.headers);
  const additions = corsHeaders(cors);
  additions.forEach((value, key) => headers.set(key, value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
