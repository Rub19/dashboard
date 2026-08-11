"use client";

import { Provider } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { fetchWorker } from "./api";

export async function signInWithOtp(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  return { ok: !error, error };
}

export async function verifyEmailOtp(email: string, code: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });
  return { ok: !error && !!data.session, session: data.session, error };
}

export async function signInWithOAuth(provider: Provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: typeof window !== "undefined" ? window.location.origin + "/" : undefined },
  });
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
