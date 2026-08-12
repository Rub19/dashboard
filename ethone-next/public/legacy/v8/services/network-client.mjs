const RETRYABLE_STATUS = new Set([408, 425, 429]);
const RETRYABLE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const DEFAULT_MAX_RESPONSE_BYTES = 1024 * 1024;

function abortError(signal) {
  if (signal?.reason instanceof Error) return signal.reason;
  return new DOMException("Request aborted", "AbortError");
}

function wait(runtime, delay, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError(signal));
      return;
    }
    let timer = 0;
    const cleanup = () => {
      runtime.clearTimeout(timer);
      signal?.removeEventListener?.("abort", handleAbort);
    };
    const handleAbort = () => {
      cleanup();
      reject(abortError(signal));
    };
    timer = runtime.setTimeout(() => {
      cleanup();
      resolve();
    }, delay);
    signal?.addEventListener?.("abort", handleAbort, { once: true });
  });
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
      url.searchParams.set(key, "[redacted]");
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

async function responseTextWithinLimit(response, maxBytes) {
  const declared = Number(response.headers?.get?.("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error("JSON response is too large.");
  if (!response.body?.getReader) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) throw new Error("JSON response is too large.");
    return new TextDecoder().decode(buffer);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("JSON response is too large.");
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return new TextDecoder().decode(merged);
}

export function createNetworkClient(options = {}) {
  const runtime = options.runtime || globalThis;
  const fetcher = options.fetch || runtime.fetch?.bind(runtime);
  if (typeof fetcher !== "function") throw new TypeError("Network client requires fetch");
  const pending = new Map();
  const jsonPending = new Map();
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
    const requestedRetries = Math.max(0, Math.min(3, Number.isFinite(Number(requestOptions.retries)) ? Number(requestOptions.retries) : (RETRYABLE_METHODS.has(method) ? 1 : 0)));
    const retries = RETRYABLE_METHODS.has(method) ? requestedRetries : 0;
    const baseDelay = Math.max(100, Number(requestOptions.backoffMs) || 450);
    const callerSignal = requestOptions.signal || null;
    const dedupe = requestOptions.dedupe !== false && method === "GET";
    const publicUrl = safeUrl(input, runtime.location?.href);
    const dedupeKey = String(requestOptions.dedupeKey || `${method}:${String(input)}`);
    const throwHttp = requestOptions.throwHttp === true;
    delete requestOptions.timeoutMs;
    delete requestOptions.retries;
    delete requestOptions.backoffMs;
    delete requestOptions.dedupe;
    delete requestOptions.dedupeKey;
    delete requestOptions.throwHttp;
    delete requestOptions.signal;
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
            await wait(runtime, retryDelay(response, attempt, baseDelay), callerSignal);
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
            await wait(runtime, baseDelay * (2 ** attempt), callerSignal);
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
    const method = String(requestOptions.method || "GET").toUpperCase();
    const allowDedupe = requestOptions.dedupe !== false && method === "GET";
    const dedupeKey = String(requestOptions.dedupeKey || `${method}:${String(input)}`);
    if (allowDedupe && jsonPending.has(dedupeKey)) return jsonPending.get(dedupeKey);

    const maxResponseBytes = Math.max(1, Math.min(10 * 1024 * 1024, Number(requestOptions.maxResponseBytes) || DEFAULT_MAX_RESPONSE_BYTES));
    const networkOptions = { ...requestOptions };
    delete networkOptions.maxResponseBytes;
    delete networkOptions.dedupe;
    delete networkOptions.dedupeKey;

    const operation = (async () => {
      const response = await request(input, { ...networkOptions, dedupe: false, throwHttp: false });
      const contentType = String(response.headers?.get?.("content-type") || "").toLowerCase();
      if (!/^application\/(?:[a-z0-9.+-]+\+)?json(?:\s*;|$)/i.test(contentType)) {
        throw new TypeError("Invalid JSON content type.");
      }
      const source = await responseTextWithinLimit(response, maxResponseBytes);
      let payload;
      try {
        payload = JSON.parse(source);
      } catch {
        throw new SyntaxError("Invalid JSON response.");
      }
      if (!response.ok) {
        const error = new Error(safeMessage(payload?.error?.message || `HTTP ${response.status}`));
        error.name = "NetworkHttpError";
        error.status = response.status;
        error.code = String(payload?.error?.code || "HTTP_ERROR").slice(0, 80);
        error.retryable = payload?.error?.retryable === true;
        error.requestId = String(payload?.error?.requestId || "").slice(0, 80);
        error.retryAfter = Number(response.headers?.get?.("retry-after")) || 0;
        error.detail = payload?.error?.detail ?? null;
        throw error;
      }
      return payload;
    })();

    if (allowDedupe) {
      jsonPending.set(dedupeKey, operation);
      operation.finally(() => { if (jsonPending.get(dedupeKey) === operation) jsonPending.delete(dedupeKey); });
    }
    return operation;
  }

  return Object.freeze({
    request,
    requestJSON,
    diagnostics: () => Object.freeze({ online: runtime.navigator?.onLine !== false, pending: pending.size, recent: Object.freeze(records.slice()) }),
    redactUrl: (value) => safeUrl(value, runtime.location?.href),
    redactMessage: safeMessage
  });
}
