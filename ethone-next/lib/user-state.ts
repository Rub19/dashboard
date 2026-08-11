"use client";

import { supabase } from "@/lib/supabase";

const TABLE = "ethone_user_state";

export async function getUserState<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) return fallback;
  const { data: row, error } = await supabase
    .from(TABLE)
    .select("payload")
    .eq("user_id", userId)
    .single();
  if (error || !row) return fallback;
  const payload = (row.payload || {}) as Record<string, unknown>;
  return (payload[key] as T | undefined) ?? fallback;
}

export async function setUserState<T>(key: string, value: T): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) return;

  const { data: existing } = await supabase
    .from(TABLE)
    .select("payload")
    .eq("user_id", userId)
    .single();

  const payload = { ...((existing?.payload || {}) as Record<string, unknown>), [key]: value };

  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { user_id: userId, payload, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) throw error;
}
