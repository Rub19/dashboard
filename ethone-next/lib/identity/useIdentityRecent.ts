"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { IdentityAssetKind, IdentityRecent } from "./types";

const MAX_RECENT = 10;

type RecentRow = {
  user_id: string;
  asset_id: string;
  kind: string;
  used_at: string;
};

export function useIdentityRecent(kind?: IdentityAssetKind) {
  const { user } = useAuth();
  const [recent, setRecent] = useState<IdentityRecent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setRecent([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from("ethone_identity_recent")
        .select("*")
        .eq("user_id", user.id);

      if (kind) {
        query = query.eq("kind", kind);
      }

      const { data, error: err } = await query
        .order("used_at", { ascending: false })
        .limit(MAX_RECENT);

      if (err) throw err;
      setRecent((data as unknown as RecentRow[] | null)?.map(mapRow) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [user, kind]);

  const record = useCallback(
    async (assetId: string, assetKind: IdentityAssetKind) => {
      if (!user?.id) return false;

      try {
        setError(null);

        // Insert or update the used item
        const { error: err } = await supabase.from("ethone_identity_recent").upsert(
          {
            user_id: user.id,
            asset_id: assetId,
            kind: assetKind,
            used_at: new Date().toISOString(),
          },
          { onConflict: "user_id, asset_id, kind" }
        );

        if (err) throw err;

        // Trim to MAX_RECENT per kind
        const { data: all } = await supabase
          .from("ethone_identity_recent")
          .select("asset_id")
          .eq("user_id", user.id)
          .eq("kind", assetKind)
          .order("used_at", { ascending: false })
          .limit(MAX_RECENT + 1);

        if (all && all.length > MAX_RECENT) {
          const toRemove = all.slice(MAX_RECENT).map((r) => (r as { asset_id: string }).asset_id);
          if (toRemove.length > 0) {
            await supabase
              .from("ethone_identity_recent")
              .delete()
              .eq("user_id", user.id)
              .eq("kind", assetKind)
              .in("asset_id", toRemove);
          }
        }

        await load();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return false;
      }
    },
    [user, load]
  );

  useEffect(() => {
    load();
  }, [load]);

  return { recent, loading, error, reload: load, record };
}

function mapRow(row: RecentRow): IdentityRecent {
  return {
    user_id: row.user_id ?? "",
    asset_id: row.asset_id ?? "",
    kind: (row.kind as IdentityAssetKind) ?? "avatar",
    used_at: row.used_at ?? new Date().toISOString(),
  };
}
