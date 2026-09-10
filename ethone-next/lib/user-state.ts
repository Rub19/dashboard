"use client";

import { supabase } from "@/lib/supabase";

const TABLE = "ethone_user_state";

// getUserState(key) is called once per key by many components on mount, but it
// always fetches the SAME single row (payload is one JSON blob keyed by many
// keys). Share one fetch of that row across all concurrent/near-concurrent
// callers instead of N identical SELECTs.
type Payload = Record<string, unknown>;
let _rowInFlight: Promise<Payload> | null = null;
let _rowCache: { at: number; userId: string; payload: Payload } | null = null;
const ROW_TTL = 3000;

async function loadPayload(userId: string): Promise<Payload> {
  if (_rowCache && _rowCache.userId === userId && Date.now() - _rowCache.at < ROW_TTL) {
    return _rowCache.payload;
  }
  if (_rowInFlight) return _rowInFlight;
  _rowInFlight = (async () => {
    try {
      const { data: row, error } = await supabase
        .from(TABLE)
        .select("payload")
        .eq("user_id", userId)
        .single();
      const payload = (error || !row ? {} : (row.payload || {})) as Payload;
      _rowCache = { at: Date.now(), userId, payload };
      return payload;
    } finally {
      _rowInFlight = null;
    }
  })();
  return _rowInFlight;
}

/** Drop the shared row cache (call after setUserState or on sign-out). */
export function invalidateUserStateCache() {
  _rowCache = null;
}

export async function getUserState<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) return fallback;
  const payload = await loadPayload(userId);
  return (payload[key] as T | undefined) ?? fallback;
}

export async function setUserState<T>(key: string, value: T): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) return;

  const existing = await loadPayload(userId).catch(() => ({} as Payload));
  const payload = { ...existing, [key]: value };

  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { user_id: userId, payload, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) throw error;
  // Keep the shared cache coherent so a following getUserState sees the write.
  _rowCache = { at: Date.now(), userId, payload };
}
