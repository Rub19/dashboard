const SENSITIVE_QUERY = /^(?:access_token|refresh_token|token|api[_-]?key|key|secret|code|password|authorization)$/i;
const RETRYABLE_STATUS = new Set([408, 425, 429]);

function wait(runtime, delay) {
  return new Promise((resolve) => runtime.setTimeout(resolve, delay));
}

function safeMessage(value) {
  return String(value || "External request failed")
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [redacted]")
    .replace(/(access_token|refresh_token|api[_-]?key|token|secret|code)=([^\s&]+)/gi, "$1=[redacted]")
    .slice(0, 320);
}

function safeUrl(value, baseUrl) {
  try {
    const url = new URL(String(value || ""), baseUrl || "https://ethone.invalid/");
    [...url.searchParams.keys()].forEach((key) => {
      if (SENSITIVE_QUERY.test(key)) url.searchParams.set(key, "[redacted]");
    });
    url.hash = "";
    return url.href;
  } catch {
    return "invalid-url";
  }
}

function retryDelay(response, attempt, baseDelay) {
  const seconds = Number(response?.headers?.get?.("retry-after"));
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(15000, seconds * 1000);
  return Math.min(8000, baseDelay * (2 ** attempt));
}

export function createNetworkClient(options = {}) {
  const runtime = options.runtime || globalThis;
  const fetcher = options.fetch || runtime.fetch?.bind(runtime);
  if (typeof fetcher !== "function") throw new TypeError("Network client requires fetch");
  const pending = new Map();
  const records = [];
  const maxRecords = Math.max(20, Number(options.maxRecords) || 80);

  function record(entry) {
    records.push(Object.freeze(entry));
    if (records.length > maxRecords) records.splice(0, records.length - maxRecords);
  }

  function request(input, customOptions = {}) {
    const requestOptions = { ...customOptions };
    const method = String(requestOptions.method || "GET").toUpperCase();
    const timeoutMs = Math.max(250, Number(requestOptions.timeoutMs) || 12000);
    const retries = Math.max(0, Math.min(3, Number.isFinite(Number(requestOptions.retries)) ? Number(requestOptions.retries) : (method === "GET" ? 1 : 0)));
    const baseDelay = Math.max(100, Number(requestOptions.backoffMs) || 450);
    const callerSignal = requestOptions.signal || null;
    const dedupe = requestOptions.dedupe !== false && method === "GET";
    const publicUrl = safeUrl(input, runtime.location?.href);
    const dedupeKey = String(requestOptions.dedupeKey || `${method}:${publicUrl}`);
    const throwHttp = requestOptions.throwHttp === true;
    delete requestOptions.timeoutMs;
    delete requestOptions.retries;
    delete requestOptions.backoffMs;
    delete requestOptions.dedupe;
    delete requestOptions.dedupeKey;
    delete requestOptions.throwHttp;
    if (!requestOptions.credentials) {
      try { requestOptions.credentials = new URL(String(input), runtime.location?.href).origin === runtime.location?.origin ? "same-origin" : "omit"; }
      catch { requestOptions.credentials = "omit"; }
    }
    if (dedupe && pending.has(dedupeKey)) return pending.get(dedupeKey);

    const startedAt = Date.now();
    const operation = (async () => {
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        if (callerSignal?.aborted) throw callerSignal.reason || new Error("Request aborted");
        const controller = new AbortController();
        let timedOut = false;
        const abortFromCaller = () => controller.abort(callerSignal.reason);
        callerSignal?.addEventListener?.("abort", abortFromCaller, { once: true });
        const timer = runtime.setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
        try {
          const response = await fetcher(input, { ...requestOptions, signal: controller.signal });
          const retryable = RETRYABLE_STATUS.has(response.status) || response.status >= 500;
          if (retryable && attempt < retries) {
            await wait(runtime, retryDelay(response, attempt, baseDelay));
            continue;
          }
          if (throwHttp && !response.ok) {
            const error = new Error(`HTTP ${response.status}`);
            error.status = response.status;
            throw error;
          }
          record({ url: publicUrl, method, status: response.status, ok: response.ok, attempts: attempt + 1, durationMs: Date.now() - startedAt, at: new Date().toISOString() });
          return response;
        } catch (error) {
          if (!callerSignal?.aborted && attempt < retries) {
            await wait(runtime, baseDelay * (2 ** attempt));
            continue;
          }
          const wrapped = new Error(timedOut ? "External request timed out." : safeMessage(error?.message));
          wrapped.name = timedOut ? "TimeoutError" : error?.name || "NetworkError";
          record({ url: publicUrl, method, status: Number(error?.status) || 0, ok: false, attempts: attempt + 1, durationMs: Date.now() - startedAt, error: wrapped.message, at: new Date().toISOString() });
          throw wrapped;
        } finally {
          runtime.clearTimeout(timer);
          callerSignal?.removeEventListener?.("abort", abortFromCaller);
        }
      }
      throw new Error("External request failed");
    })();

    if (dedupe) pending.set(dedupeKey, operation);
    return operation.finally(() => {
      if (dedupe && pending.get(dedupeKey) === operation) pending.delete(dedupeKey);
    });
  }

  async function requestJSON(input, requestOptions = {}) {
    const response = await request(input, { ...requestOptions, throwHttp: true });
    return response.json();
  }

  async function execute(handler, executeOptions = {}) {
    const retries = Math.max(0, Math.min(3, Number(executeOptions.retries) || 0));
    const timeoutMs = Math.max(250, Number(executeOptions.timeoutMs) || 12000);
    const baseDelay = Math.max(100, Number(executeOptions.backoffMs) || 450);
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      let timer = 0;
      try {
        const timeout = new Promise((_, reject) => {
          timer = runtime.setTimeout(() => reject(new Error("Operation timed out.")), timeoutMs);
        });
        return await Promise.race([Promise.resolve().then(() => handler(attempt)), timeout]);
      } catch (error) {
        lastError = error;
        if (attempt >= retries) throw error;
        await wait(runtime, baseDelay * (2 ** attempt));
      } finally {
        runtime.clearTimeout(timer);
      }
    }
    throw lastError || new Error("Operation failed");
  }

  return Object.freeze({
    request,
    requestJSON,
    execute,
    diagnostics: () => Object.freeze({ online: runtime.navigator?.onLine !== false, pending: pending.size, recent: Object.freeze(records.slice()) }),
    redactUrl: (value) => safeUrl(value, runtime.location?.href),
    redactMessage: safeMessage
  });
}
