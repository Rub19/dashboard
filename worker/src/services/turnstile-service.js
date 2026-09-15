import { requestExternal } from "../utils/external-request.js";
import { httpError } from "../middleware/errors.js";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SITEVERIFY_ORIGIN = "https://challenges.cloudflare.com";

// Canonical server-side Turnstile check: every failure mode (missing secret,
// malformed token, network error, non-2xx, non-JSON body, action/hostname
// mismatch) fails closed to the same 403 — the caller never learns why, and
// the request this gates never reaches Supabase/OTP below it.
export async function verifyTurnstileToken(env, token, expectedAction, remoteip) {
  if (!env.TURNSTILE_SECRET) {
    throw httpError("TURNSTILE_FAILED", 403);
  }
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    throw httpError("TURNSTILE_FAILED", 403);
  }

  const expectedHostnames = new Set(
    String(env.TURNSTILE_HOSTNAMES || "")
      .split(",")
      .map((hostname) => hostname.trim())
      .filter(Boolean)
  );
  if (expectedHostnames.size === 0) {
    throw httpError("TURNSTILE_FAILED", 403);
  }

  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
  if (remoteip) body.set("remoteip", remoteip);

  let result;
  try {
    const { data } = await requestExternal(SITEVERIFY_URL, {
      env,
      method: "POST",
      expectedOrigin: SITEVERIFY_ORIGIN,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    result = data;
  } catch {
    throw httpError("TURNSTILE_FAILED", 403);
  }

  if (
    !result?.success ||
    result.action !== expectedAction ||
    !expectedHostnames.has(result.hostname)
  ) {
    throw httpError("TURNSTILE_FAILED", 403);
  }

  return result;
}
