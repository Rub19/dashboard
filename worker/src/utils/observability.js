const REQUEST_ID = /^[A-Za-z0-9_-]{8,80}$/;

export function requestIdFor(request) {
  const supplied = String(request.headers.get("x-request-id") || "");
  return REQUEST_ID.test(supplied) ? supplied : crypto.randomUUID();
}

export function writeRequestLog(context, response, startedAt) {
  const logger = context.env?.__TEST_LOGGER__ || console;
  const record = {
    type: "ethone.worker.request",
    requestId: context.requestId,
    method: context.request.method,
    route: context.route?.id || "unmatched",
    service: context.route?.service || "core",
    status: response.status,
    durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
    cached: context.result?.meta?.cached === true,
    environment: String(context.env?.ENVIRONMENT || "production").slice(0, 24)
  };
  try {
    logger.info(JSON.stringify(record));
  } catch {}
}
