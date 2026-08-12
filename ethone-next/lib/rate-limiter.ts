const DEFAULT_POLICY = Object.freeze({ limit: 5, windowMs: 60_000, blockMs: 60_000 });

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function normalizePolicy(input: Partial<RateLimitPolicy> = {}) {
  return {
    limit: boundedInteger(input.limit, DEFAULT_POLICY.limit, 1, 100),
    windowMs: boundedInteger(input.windowMs, DEFAULT_POLICY.windowMs, 100, 86_400_000),
    blockMs: boundedInteger(input.blockMs, DEFAULT_POLICY.blockMs, 100, 86_400_000),
  };
}

type RateLimitPolicy = { limit: number; windowMs: number; blockMs: number };

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

export function createRateLimiter(options: { now?: () => number } = {}) {
  const now = typeof options.now === "function" ? options.now : Date.now;
  const buckets = new Map<string, { count: number; windowStartedAt: number; blockedUntil: number }>();

  function consume(keyInput: string, policyInput: Partial<RateLimitPolicy> = {}): RateLimitResult {
    const key = String(keyInput || "global").slice(0, 320);
    const policy = normalizePolicy(policyInput);
    const timestamp = Number(now()) || 0;
    let bucket = buckets.get(key);

    if (bucket && bucket.blockedUntil > timestamp) {
      return { allowed: false, remaining: 0, retryAfterMs: bucket.blockedUntil - timestamp };
    }

    if (!bucket || timestamp - bucket.windowStartedAt >= policy.windowMs || bucket.blockedUntil) {
      bucket = { count: 0, windowStartedAt: timestamp, blockedUntil: 0 };
    }

    if (bucket.count >= policy.limit) {
      bucket.blockedUntil = timestamp + policy.blockMs;
      buckets.set(key, bucket);
      return { allowed: false, remaining: 0, retryAfterMs: policy.blockMs };
    }

    bucket.count += 1;
    buckets.set(key, bucket);
    return { allowed: true, remaining: Math.max(0, policy.limit - bucket.count), retryAfterMs: 0 };
  }

  function reset(keyInput: string) {
    return buckets.delete(String(keyInput || "global").slice(0, 320));
  }

  function destroy() {
    buckets.clear();
  }

  return { consume, reset, destroy, size: () => buckets.size };
}

const authRateLimiter = createRateLimiter();

const ATTEMPT_POLICIES: Record<string, RateLimitPolicy> = {
  signIn: { limit: 5, windowMs: 60_000, blockMs: 60_000 },
  signUp: { limit: 3, windowMs: 600_000, blockMs: 600_000 },
  resetPassword: { limit: 3, windowMs: 900_000, blockMs: 900_000 },
  oauth: { limit: 6, windowMs: 60_000, blockMs: 60_000 },
  updatePassword: { limit: 5, windowMs: 300_000, blockMs: 300_000 },
};

export function consumeAuthAttempt(scope: string, identity: string): RateLimitResult & { key: string } {
  const key = `${scope}:${String(identity || "anonymous").slice(0, 240).toLowerCase()}`;
  const policy = ATTEMPT_POLICIES[scope] || DEFAULT_POLICY;
  const attempt = authRateLimiter.consume(key, policy);
  return { key, ...attempt };
}

export function resetAuthAttempt(scope: string, identity: string) {
  const key = `${scope}:${String(identity || "anonymous").slice(0, 240).toLowerCase()}`;
  return authRateLimiter.reset(key);
}

export { authRateLimiter };
