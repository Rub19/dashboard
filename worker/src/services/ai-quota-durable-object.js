import { resolveAiConfig } from "./ai-config.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDayStart(timestamp = Date.now()) {
  return Math.floor(timestamp / DAY_MS) * DAY_MS;
}

function buildKey(dateMs) {
  return `quota:${dateMs}`;
}

export class AiQuotaManager {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.config = resolveAiConfig(env);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const method = String(request.method || "GET").toUpperCase();

    if (method === "GET" && url.pathname === "/status") {
      const status = await this.getStatus();
      return new Response(JSON.stringify(status), { headers: { "content-type": "application/json" } });
    }

    if (method === "POST" && url.pathname === "/reserve") {
      const body = await request.json().catch(() => ({}));
      const estimated = Math.max(0, Number(body.estimated) || 0);
      const force = body.force === true;
      const result = await this.reserve(estimated, force);
      return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
    }

    if (method === "POST" && url.pathname === "/commit") {
      const body = await request.json().catch(() => ({}));
      const result = await this.commitUsage(body);
      return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
    }

    return new Response("Not found", { status: 404 });
  }

  async getStatus() {
    const todayMs = utcDayStart();
    const storage = this.state.storage;
    const stored = await storage.get(buildKey(todayMs));
    const used = typeof stored?.used === "number" ? stored.used : 0;
    const requests = typeof stored?.requests === "number" ? stored.requests : 0;
    const fallbacks = typeof stored?.fallbacks === "number" ? stored.fallbacks : 0;
    const errors = typeof stored?.errors === "number" ? stored.errors : 0;
    return Object.freeze({
      date: new Date(todayMs).toISOString(),
      used,
      requests,
      fallbacks,
      errors,
      status: this.config.cloudflare.budget > 0 ? used / this.config.cloudflare.budget : 0,
      ...this.config.cloudflare,
    });
  }

  async reserve(estimated, force = false) {
    const todayMs = utcDayStart();
    const storage = this.state.storage;
    const budget = this.config.cloudflare.budget;

    return this.state.blockConcurrencyWhile(async () => {
      const key = buildKey(todayMs);
      let stored = await storage.get(key);
      if (!stored || stored.date !== todayMs) {
        stored = { date: todayMs, used: 0, requests: 0, fallbacks: 0, errors: 0 };
      }

      const projected = stored.used + estimated;
      const allowed = force || estimated <= 0 ? true : projected <= budget;
      const status = budget > 0 ? stored.used / budget : 0;
      const warning = status >= this.config.cloudflare.warningThreshold && status < this.config.cloudflare.prepareThreshold;
      const prepare = status >= this.config.cloudflare.prepareThreshold && status < this.config.cloudflare.hardStopThreshold;
      const exhausted = status >= this.config.cloudflare.hardStopThreshold;

      if (!allowed) {
        return Object.freeze({
          allowed: false,
          reason: "QUOTA_EXHAUSTED",
          used: stored.used,
          budget,
          projected,
          warning,
          prepare,
          exhausted,
        });
      }

      stored.used = projected;
      stored.requests += 1;
      await storage.put(key, stored);

      return Object.freeze({
        allowed: true,
        reserved: estimated,
        used: stored.used,
        budget,
        remaining: Math.max(0, budget - stored.used),
        warning,
        prepare,
        exhausted,
      });
    });
  }

  async commitUsage({ estimated, actual, fallback = false, error = false }) {
    const todayMs = utcDayStart();
    const storage = this.state.storage;
    const budget = this.config.cloudflare.budget;

    return this.state.blockConcurrencyWhile(async () => {
      const key = buildKey(todayMs);
      let stored = await storage.get(key);
      if (!stored || stored.date !== todayMs) {
        stored = { date: todayMs, used: 0, requests: 0, fallbacks: 0, errors: 0 };
      }

      const delta = (typeof actual === "number" ? actual : estimated || 0) - (typeof estimated === "number" ? estimated : 0);
      stored.used = Math.max(0, stored.used + delta);
      if (fallback) stored.fallbacks += 1;
      if (error) stored.errors += 1;
      await storage.put(key, stored);

      return Object.freeze({
        used: stored.used,
        budget,
        remaining: Math.max(0, budget - stored.used),
        requests: stored.requests,
        fallbacks: stored.fallbacks,
        errors: stored.errors,
      });
    });
  }
}
