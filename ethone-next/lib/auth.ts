"use client";

import { supabase } from "./supabase";

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

export async function signOut() {
  await supabase.auth.signOut();
}
