"use client";

import { supabase } from "./supabase";
import { fetchWorker } from "./api";

export type AuthState = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user?: { id: string; email: string; name?: string };
};

const AUTH_KEY = "ethone-auth";

export function getAuth(): AuthState | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
  } catch {
    return null;
  }
}

export function setAuth(state: AuthState | null) {
  if (typeof window === "undefined") return;
  if (state) localStorage.setItem(AUTH_KEY, JSON.stringify(state));
  else localStorage.removeItem(AUTH_KEY);
}

export async function signInWithOtp(email: string) {
  return fetchWorker("/api/auth/otp/send", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyOtp(email: string, code: string) {
  const res = await fetchWorker("/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
  if (res?.access_token) {
    setAuth({
      access_token: res.access_token,
      refresh_token: res.refresh_token,
      user: res.user,
    });
  }
  return res;
}

export async function signOut() {
  await supabase.auth.signOut().catch(() => {});
  setAuth(null);
}
