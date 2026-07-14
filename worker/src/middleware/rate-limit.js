import { stableDigest } from "../utils/crypto.js";
import { httpError } from "./errors.js";

const POLICIES = Object.freeze({
  edge: Object.freeze({ binding: "RATE_LIMIT_EDGE", period: 60, limit: 120 }),
  standard: Object.freeze({ binding: "RATE_LIMIT_STANDARD", period: 60, limit: 60 }),
  strict: Object.freeze({ binding: "RATE_LIMIT_STRICT", period: 60, limit: 10 })
});
const localCounters = new Map();

function localLimit(key, policy) {
  const now = Date.now();
  const previous = localCounters.get(key);
  const entry = !previous || previous.expiresAt <= now
    ? { count: 0, expiresAt: now + policy.period * 1000 }
    : previous;
  entry.count += 1;
  localCounters.set(key, entry);
  if (localCounters.size > 5000) {
    for (const [candidate, value] of localCounters) {
      if (value.expiresAt <= now) localCounters.delete(candidate);
      if (localCounters.size <= 4000) break;
    }
  }
  return Object.freeze({ success: entry.count <= policy.limit, remaining: Math.max(0, policy.limit - entry.count) });
}

async function consume(env, policyName, identity, routeId) {
  const policy = POLICIES[policyName];
  if (!policy) return Object.freeze({ policy: "none", remaining: null });
  const key = await stableDigest(`${policyName}:${identity}:${routeId}`);
  const binding = env?.[policy.binding];
  let outcome;
  if (binding && typeof binding.limit === "function") {
    outcome = await binding.limit({ key });
  } else if (String(env?.ENVIRONMENT || "production") !== "production") {
    outcome = localLimit(key, policy);
  } else {
    throw httpError("RATE_LIMIT_UNAVAILABLE", 503, { retryable: true });
  }
  if (!outcome?.success) {
    throw httpError("RATE_LIMITED", 429, {
      retryable: true,
      headers: { "retry-after": String(policy.period), "x-ratelimit-policy": policyName }
    });
  }
  return Object.freeze({ policy: policyName, remaining: Number.isFinite(outcome.remaining) ? outcome.remaining : null });
}

export async function applyEdgeRateLimit(context) {
  if (context.route.rateLimit === "none") return Object.freeze({ policy: "none", remaining: null });
  const ip = String(context.request.headers.get("cf-connecting-ip") || "unknown").slice(0, 80);
  return consume(context.env, "edge", ip, context.route.id);
}

export async function applyUserRateLimit(context) {
  if (!context.auth || context.route.rateLimit === "none") return Object.freeze({ policy: "none", remaining: null });
  const integration = context.route.service || "core";
  return consume(context.env, context.route.rateLimit || "standard", context.auth.userId, `${integration}:${context.route.id}`);
}

export function clearLocalRateLimits() {
  localCounters.clear();
}
