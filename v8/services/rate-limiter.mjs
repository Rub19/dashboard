const DEFAULT_POLICY = Object.freeze({ limit: 5, windowMs: 60_000, blockMs: 60_000 });

function boundedInteger(value, fallback, minimum, maximum) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function normalizePolicy(input = {}) {
  return Object.freeze({
    limit: boundedInteger(input.limit, DEFAULT_POLICY.limit, 1, 100),
    windowMs: boundedInteger(input.windowMs, DEFAULT_POLICY.windowMs, 100, 86_400_000),
    blockMs: boundedInteger(input.blockMs, DEFAULT_POLICY.blockMs, 100, 86_400_000)
  });
}

export function createRateLimiter(options = {}) {
  const now = typeof options.now === "function" ? options.now : Date.now;
  const buckets = new Map();

  function consume(keyInput, policyInput) {
    const key = String(keyInput || "global").slice(0, 320);
    const policy = normalizePolicy(policyInput);
    const timestamp = Number(now()) || 0;
    let bucket = buckets.get(key);

    if (bucket?.blockedUntil > timestamp) {
      return Object.freeze({ allowed: false, remaining: 0, retryAfterMs: bucket.blockedUntil - timestamp });
    }
    if (!bucket || timestamp - bucket.windowStartedAt >= policy.windowMs || bucket.blockedUntil) {
      bucket = { count: 0, windowStartedAt: timestamp, blockedUntil: 0 };
    }
    if (bucket.count >= policy.limit) {
      bucket.blockedUntil = timestamp + policy.blockMs;
      buckets.set(key, bucket);
      return Object.freeze({ allowed: false, remaining: 0, retryAfterMs: policy.blockMs });
    }

    bucket.count += 1;
    buckets.set(key, bucket);
    return Object.freeze({ allowed: true, remaining: Math.max(0, policy.limit - bucket.count), retryAfterMs: 0 });
  }

  function reset(keyInput) {
    return buckets.delete(String(keyInput || "global").slice(0, 320));
  }

  function destroy() {
    buckets.clear();
  }

  return Object.freeze({ consume, reset, destroy, size: () => buckets.size });
}
