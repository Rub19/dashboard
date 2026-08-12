"use client";

import { Provider } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { fetchWorker } from "./api";
import { consumeAuthAttempt, resetAuthAttempt } from "./rate-limiter";

function rateLimitedResult(retryAfterMs: number) {
  const error = new Error(`Trop de tentatives. Patientez quelques instants avant de réessayer.`);
  (error as Error & { status?: string }).status = "rate-limited";
  (error as Error & { retryAfterMs?: number }).retryAfterMs = retryAfterMs;
  return { ok: false, error, retryAfterMs };
}

export async function sendOtp(email: string) {
  const attempt = consumeAuthAttempt("sign-in", email);
  if (!attempt.allowed) return rateLimitedResult(attempt.retryAfterMs);

  const res = await fetchWorker("/api/auth/otp/send", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  if (!res?.data?.sent) return { ok: false, error: new Error(res?.error || "Impossible d'envoyer le code.") };
  return { ok: true, userId: res.data.userId as string, expiresIn: res.data.expiresIn as number, code: res.data.code as string | undefined };
}

export async function verifyOtp(userId: string, email: string, code: string) {
  const attempt = consumeAuthAttempt("sign-in", `${userId}:${email}`);
  if (!attempt.allowed) return rateLimitedResult(attempt.retryAfterMs);

  const res = await fetchWorker("/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ userId, email, code }),
  });
  if (!res?.data?.token) return { ok: false, error: new Error(res?.error || "Code invalide.") };

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: res.data.token as string,
    type: "magiclink",
  });
  if (error) return { ok: false, error };
  return { ok: true, session: data.session };
}

export async function signInWithOtp(email: string) {
  const attempt = consumeAuthAttempt("sign-in", email);
  if (!attempt.allowed) return rateLimitedResult(attempt.retryAfterMs);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (!error) resetAuthAttempt("sign-in", email);
  return { ok: !error, error };
}

export async function signUpWithPassword(email: string, password: string, username: string) {
  const attempt = consumeAuthAttempt("sign-up", email);
  if (!attempt.allowed) return { ...rateLimitedResult(attempt.retryAfterMs), user: null, session: null };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (!error && data.user) resetAuthAttempt("sign-up", email);
  return { ok: !error && !!data.user, user: data.user, session: data.session, error };
}

export async function verifyEmailOtp(email: string, code: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });
  return { ok: !error && !!data.session, session: data.session, error };
}

export async function signInWithPassword(email: string, password: string) {
  const attempt = consumeAuthAttempt("sign-in", email);
  if (!attempt.allowed) return { ...rateLimitedResult(attempt.retryAfterMs), session: null };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error && data.session) resetAuthAttempt("sign-in", email);
  return { ok: !error && !!data.session, session: data.session, error };
}

export async function resetPassword(email: string) {
  const attempt = consumeAuthAttempt("password-reset", email);
  if (!attempt.allowed) return { ...rateLimitedResult(attempt.retryAfterMs) };

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/reset-password/` });
  return { ok: !error, error };
}

export async function updatePassword(password: string) {
  const attempt = consumeAuthAttempt("password-update", "session");
  if (!attempt.allowed) return { ...rateLimitedResult(attempt.retryAfterMs) };

  const { error } = await supabase.auth.updateUser({ password });
  if (!error) resetAuthAttempt("password-update", "session");
  return { ok: !error, error };
}

export async function signInWithOAuth(provider: Provider) {
  const attempt = consumeAuthAttempt("oauth", provider);
  if (!attempt.allowed) return { ...rateLimitedResult(attempt.retryAfterMs), url: null };

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: typeof window !== "undefined" ? window.location.origin + "/" : undefined },
  });
  if (!error && data.url) resetAuthAttempt("oauth", provider);
  return { ok: !error && !!data.url, url: data.url, error };
}

export async function signInWithPasskey(email?: string) {
  const optionsRes = await fetchWorker("/api/auth/passkey/authenticate-options", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  const options = optionsRes?.data;
  if (!options) throw new Error("No authentication options");

  const assertion = (await navigator.credentials.get({
    publicKey: {
      ...options,
      challenge: bufferFromBase64Url(options.challenge),
      allowCredentials: (options.allowCredentials || []).map((c: { id: string; type: string; transports?: string[] }) => ({
        ...c,
        id: bufferFromBase64Url(c.id),
      })),
    },
  })) as PublicKeyCredential | null;

  if (!assertion) throw new Error("Passkey authentication cancelled");
  const response = assertion.response as AuthenticatorAssertionResponse;
  const rawId = arrayBufferToBase64Url(assertion.rawId);

  const authRes = await fetchWorker("/api/auth/passkey/authenticate", {
    method: "POST",
    body: JSON.stringify({
      response: {
        id: rawId,
        rawId,
        type: assertion.type,
        response: {
          clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
          authenticatorData: arrayBufferToBase64Url(response.authenticatorData),
          signature: arrayBufferToBase64Url(response.signature),
          userHandle: response.userHandle ? arrayBufferToBase64Url(response.userHandle) : undefined,
        },
        clientExtensionResults: {},
      },
    }),
  });
  const tokenHash = authRes?.data?.token_hash;
  if (!tokenHash) throw new Error("Passkey authentication failed");

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });
  return { ok: !error && !!data.session, session: data.session, error };
}

export async function signOut() {
  try {
    await fetchWorker("/api/signout", { method: "POST" });
  } catch {
    // Déconnexion locale quand même si le Worker est injoignable.
  }
  await supabase.auth.signOut();
}

function bufferFromBase64Url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
