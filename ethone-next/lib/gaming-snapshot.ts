import { supabase } from "@/lib/supabase";
import type { GamingAnalyticsSummary } from "@/lib/hooks/useGamingAnalytics";

// Re-scoped version of the gaming-history idea deferred from Analytics
// Phase 2: no new server-side Riot-API calls or Cron trigger, just a daily
// upsert of the win rates useGamingAnalytics() already computed from the
// tracker pages' local cache. Real history builds forward from whenever
// this is first called, once per day (idempotent -- opening Analytics
// twice the same day just overwrites today's row with the latest numbers).
export async function syncCurrentDaySnapshot(summary: GamingAnalyticsSummary): Promise<void> {
  if (!summary.configured) return;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    // Local calendar day, not UTC -- toISOString() would shift the date
    // across midnight for any non-UTC timezone.
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    await supabase.from("ethone_gaming_snapshots").upsert(
      {
        user_id: userId,
        day,
        lol_games: summary.lol.totalGames,
        lol_win_rate: summary.lol.winRate,
        valorant_games: summary.valorant.totalGames,
        valorant_win_rate: summary.valorant.winRate,
        tft_games: summary.tft.totalGames,
        tft_top4_rate: summary.tft.top4Rate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,day" },
    );
  } catch {
    // Best-effort; the current-session view in AnalyticsClient.tsx already
    // computes the same numbers live from the local tracker cache regardless.
  }
}

export type GamingSnapshotRow = {
  day: string;
  lol_win_rate: number | null;
  valorant_win_rate: number | null;
  tft_top4_rate: number | null;
};

export async function loadGamingSnapshots(): Promise<GamingSnapshotRow[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("ethone_gaming_snapshots")
    .select("day, lol_win_rate, valorant_win_rate, tft_top4_rate")
    .eq("user_id", userId)
    .order("day", { ascending: true });

  if (error) return [];
  return (data as GamingSnapshotRow[]) || [];
}
