"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { FocusHistoryEntry } from "@/lib/analytics";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return String(err);
}

type FocusSessionRow = {
  id: string;
  duration: number;
  preset: string;
  goal: string | null;
  completed_at: string;
};

// Read-only, cross-device history from ethone_focus_sessions — for the
// Analytics page specifically. components/focus/FocusHistoryView.tsx stays
// on the 100-entry localStorage cache; this hook is a different, additive
// data source, not a replacement.
export function useFocusSessionHistory() {
  const [items, setItems] = useState<FocusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("ethone_focus_sessions")
        .select("id, duration, preset, goal, completed_at")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false });

      if (fetchError) throw fetchError;
      const rows = (data as FocusSessionRow[]) || [];
      setItems(
        rows.map((row) => ({
          id: row.id,
          duration: row.duration,
          preset: row.preset,
          goal: row.goal || undefined,
          completedAt: row.completed_at,
        })),
      );
    } catch (err) {
      setError(new Error(errorMessage(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, reload: load };
}
