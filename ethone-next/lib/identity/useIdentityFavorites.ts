"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { IdentityAssetKind, IdentityFavorite } from "./types";

type FavoriteRow = {
  user_id: string;
  asset_id: string;
  kind: string;
  created_at: string;
};

export function useIdentityFavorites(kind?: IdentityAssetKind) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<IdentityFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from("ethone_identity_favorites")
        .select("*")
        .eq("user_id", user.id);

      if (kind) {
        query = query.eq("kind", kind);
      }

      const { data, error: err } = await query.order("created_at", { ascending: false });
      if (err) throw err;
      setFavorites((data as unknown as FavoriteRow[] | null)?.map(mapRow) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [user, kind]);

  const add = useCallback(
    async (assetId: string, assetKind: IdentityAssetKind) => {
      if (!user?.id) return false;

      try {
        setError(null);
        const { error: err } = await supabase.from("ethone_identity_favorites").upsert(
          {
            user_id: user.id,
            asset_id: assetId,
            kind: assetKind,
            created_at: new Date().toISOString(),
          },
          { onConflict: "user_id, asset_id, kind" }
        );

        if (err) throw err;
        await load();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return false;
      }
    },
    [user, load]
  );

  const remove = useCallback(
    async (assetId: string, assetKind: IdentityAssetKind) => {
      if (!user?.id) return false;

      try {
        setError(null);
        const { error: err } = await supabase
          .from("ethone_identity_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("asset_id", assetId)
          .eq("kind", assetKind);

        if (err) throw err;
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

  return { favorites, loading, error, reload: load, add, remove };
}

function mapRow(row: FavoriteRow): IdentityFavorite {
  return {
    user_id: row.user_id ?? "",
    asset_id: row.asset_id ?? "",
    kind: (row.kind as IdentityAssetKind) ?? "avatar",
    created_at: row.created_at ?? new Date().toISOString(),
  };
}
