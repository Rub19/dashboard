import { httpError } from "../middleware/errors.js";

const pending = new Map();
const RETRYABLE = new Set([408, 425, 429]);

function configuredTimeout(env, requested) {
  const value = Number(requested || env?.OUTBOUND_TIMEOUT_MS || 6500);
  return Math.max(10, Math.min(12000, Number.isFinite(value) ? value : 6500));
}

function fetcher(env) {
  return typeof env?.__TEST_FETCH__ === "function" ? env.__TEST_FETCH__ : fetch;
}

function retryDelay(response, attempt) {
  const retryAfter = Number(response?.headers?.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(2000, retryAfter * 1000);
  return Math.min(1200, 180 * (2 ** attempt));
}

function wait(delay) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

async function readJson(response, maximumBytes) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (!/^application\/(?:[a-z0-9.+-]+\+)?json(?:\s*;|$)/i.test(contentType)) {
    throw httpError("UPSTREAM_INVALID_RESPONSE", 502, {
      retryable: false,
      detail: { contentType, status: response.status, statusText: response.statusText },
    });
  }
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maximumBytes) {
    throw httpError("UPSTREAM_INVALID_RESPONSE", 502, {
      retryable: false,
      detail: { contentType, status: response.status, declared, maximumBytes },
    });
  }
  let bytes;
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        throw httpError("UPSTREAM_INVALID_RESPONSE", 502, {
          retryable: false,
          detail: { contentType, status: response.status, total, maximumBytes },
        });
      }
      chunks.push(value);
    }
    bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
  } else {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maximumBytes) {
      throw httpError("UPSTREAM_INVALID_RESPONSE", 502, {
        retryable: false,
        detail: { contentType, status: response.status, size: buffer.byteLength, maximumBytes },
      });
    }
    bytes = new Uint8Array(buffer);
  }
  const text = new TextDecoder().decode(bytes);
  try {
    return JSON.parse(text);
  } catch {
    throw httpError("UPSTREAM_INVALID_RESPONSE", 502, {
      retryable: false,
      detail: { contentType, status: response.status, preview: text.slice(0, 200) },
    });
  }
}

function assertDestination(input, expectedOrigin) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw httpError("INTERNAL_ERROR", 500, { detail: "invalid_url" });
  }
  if (!expectedOrigin) throw httpError("INTERNAL_ERROR", 500, { detail: "supabase_url_missing" });
  if (url.protocol !== "https:" || url.origin !== expectedOrigin) throw httpError("INTERNAL_ERROR", 500, { detail: "origin_mismatch" });
  return url;
}

function isPostgrestSchemaError(data) {
  const code = data?.code;
  if (typeof code !== "string" || code.length !== 5) return false;
  return data?.message && /(does not exist|n'existe pas|relation|table|column|colonne|schema)/i.test(String(data.message));
}

function providerError(response, data) {
  const detail = data && typeof data === "object" ? data : null;
  if (isPostgrestSchemaError(detail)) {
    return httpError("DB_SCHEMA_ERROR", 500, { retryable: false, detail });
  }
  if (response.status === 404) return httpError("PROVIDER_NOT_FOUND", 404, { detail });
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    return httpError("PROVIDER_REQUEST_REJECTED", 502, { retryable: false, detail });
  }
  return httpError("UPSTREAM_UNAVAILABLE", 503, { retryable: response.status === 429 || response.status >= 500, detail });
}
export function requestExternal(input, options = {}) {
  const env = options.env || {};
  const url = assertDestination(input, options.expectedOrigin);
  const method = String(options.method || "GET").toUpperCase();
  const retries = Math.max(0, Math.min(1, Number(options.retries) || 0));
  const retryAllowed = method === "GET" || options.retryUnsafe === true;
  const dedupeKey = options.dedupeKey ? `${options.service || "external"}:${options.dedupeKey}` : "";
  if (dedupeKey && pending.has(dedupeKey)) return pending.get(dedupeKey);

  const operation = (async () => {
    for (let attempt = 0; attempt <= (retryAllowed ? retries : 0); attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), configuredTimeout(env, options.timeoutMs));
      try {
        const response = await fetcher(env)(url.href, {
          method,
          headers: { accept: "application/json", ...(options.headers || {}) },
          body: options.body,
          redirect: "manual",
          signal: controller.signal
        });
        const retryable = RETRYABLE.has(response.status) || response.status >= 500;
        if (retryable && attempt < retries && retryAllowed) {
          await response.body?.cancel?.();
          await wait(retryDelay(response, attempt));
          continue;
        }
        if (response.status === 204) {
          if (!response.ok) throw providerError(response, null);
          return Object.freeze({ data: null, attempts: attempt + 1, status: response.status });
        }

        const contentType = String(response.headers.get("content-type") || "").toLowerCase();
        const looksLikeJson = /^application\/(?:[a-z0-9.+-]+\+)?json(?:\s*;|$)/i.test(contentType);

        if (!response.ok && !looksLikeJson) {
          await response.body?.cancel?.().catch(() => {});
          throw providerError(
            response,
            { message: `HTTP ${response.status} — ${response.statusText || ""}`.trim() }
          );
        }

        const data = await readJson(response, Math.max(1024, Math.min(4 * 1024 * 1024, Number(options.maxBytes) || 1024 * 1024)));
        if (!response.ok) throw providerError(response, data);
        return Object.freeze({ data, attempts: attempt + 1, status: response.status });
      } catch (error) {
        if (error?.code) throw error;
        if (error?.name === "AbortError") throw httpError("UPSTREAM_TIMEOUT", 504, { retryable: true });
        if (attempt < retries && retryAllowed) {
          await wait(180 * (2 ** attempt));
          continue;
        }
        throw httpError("UPSTREAM_UNAVAILABLE", 503, { retryable: true });
      } finally {
        clearTimeout(timer);
      }
    }
    throw httpError("UPSTREAM_UNAVAILABLE", 503, { retryable: true });
  })();

  if (dedupeKey) pending.set(dedupeKey, operation);
  return operation.finally(() => {
    if (dedupeKey && pending.get(dedupeKey) === operation) pending.delete(dedupeKey);
  });
}

export function externalRequestDiagnostics() {
  return Object.freeze({ pending: pending.size });
}
