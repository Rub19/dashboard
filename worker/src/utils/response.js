const JSON_HEADERS = Object.freeze({
  "content-type": "application/json; charset=utf-8",
  "cache-control": "private, no-store, max-age=0",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer"
});

function timestamp() {
  return new Date().toISOString();
}

export function routeResult(data, meta = {}, options = {}) {
  return Object.freeze({
    data: data ?? null,
    meta: Object.freeze({ ...meta }),
    status: Number(options.status) || 200,
    headers: Object.freeze({ ...(options.headers || {}) })
  });
}

export function successResponse(result, context = {}) {
  const body = {
    ok: true,
    data: result?.data ?? null,
    meta: {
      source: result?.meta?.source || context.source || "ethone-worker",
      cached: result?.meta?.cached === true,
      timestamp: timestamp(),
      ...result?.meta,
      requestId: context.requestId
    }
  };
  return new Response(JSON.stringify(body), {
    status: result?.status || 200,
    headers: { ...JSON_HEADERS, ...(result?.headers || {}), "x-request-id": context.requestId }
  });
}

export function errorResponse(error, context = {}) {
  const body = {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable === true,
      requestId: context.requestId
    }
  };
  return new Response(JSON.stringify(body), {
    status: error.status || 500,
    headers: { ...JSON_HEADERS, ...(error.headers || {}), "x-request-id": context.requestId }
  });
}

export function emptyResponse(status = 204, headers = {}) {
  return new Response(null, { status, headers });
}
