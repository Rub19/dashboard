import { httpError } from "../middleware/errors.js";
import { listSubscriptions, notifyUser, processWebhookMail, sendPush, subscribe, unsubscribe } from "../services/mail-push.js";

function safeText(value, limit = 320) {
  const raw = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return raw.slice(0, limit);
}

export async function mailPushRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("UNAUTHORIZED", 401);

  const url = new URL(request.url);

  if (url.pathname.endsWith("/subscriptions")) {
    if (request.method === "GET") {
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
      const subscriptions = await listSubscriptions(env, auth.userId, limit);
      return { data: subscriptions };
    }
    throw httpError("METHOD_NOT_ALLOWED", 405);
  }

  if (url.pathname.endsWith("/subscribe")) {
    const body = await request.json().catch(() => ({}));
    if (request.method === "POST") {
      const result = await subscribe(env, auth.userId, {
        endpoint: body.endpoint,
        p256dh: body.p256dh,
        auth: body.auth,
        user_agent: body.user_agent
      });
      return { data: result };
    }
    if (request.method === "DELETE") {
      const result = await unsubscribe(env, auth.userId, { endpoint: body.endpoint });
      return { data: result };
    }
    throw httpError("METHOD_NOT_ALLOWED", 405);
  }

  if (url.pathname.endsWith("/send")) {
    if (request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);
    const body = await request.json().catch(() => ({}));
    const subscriptions = await listSubscriptions(env, auth.userId);

    const payload = {
      title: safeText(body.title, 200) || "Test notification",
      body: safeText(body.body, 500) || "This is a test push notification.",
      tag: safeText(body.tag, 64) || "ethone-test"
    };

    const results = [];
    for (const subscription of subscriptions) {
      try {
        const result = await sendPush(env, subscription, payload);
        results.push(result);
      } catch (error) {
        results.push({ sent: false, error: error.message });
      }
    }

    return { data: { sent: results.filter((r) => r.sent).length, total: results.length, results } };
  }

  throw httpError("ROUTE_NOT_FOUND", 404);
}

export async function webhookMailRoute({ request, env }) {
  if (request.method !== "POST") throw httpError("METHOD_NOT_ALLOWED", 405);

  const rawBody = new Uint8Array(await request.arrayBuffer());
  const signature = request.headers.get("X-Mail-Signature") || "";

  try {
    const result = await processWebhookMail(env, rawBody, signature);
    return { data: result };
  } catch (error) {
    throw httpError("INVALID_PARAMETER", 400, { detail: error.message });
  }
}
