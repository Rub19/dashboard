"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { IdentityAsset, IdentityAssetKind } from "./types";
import { DRIVE_AVATARS } from "./avatarDriveManifest";

export type AssetFilters = {
  kind?: IdentityAssetKind;
  category?: string;
  status?: string;
};

type AssetRow = {
  id: string;
  name: string;
  category: string;
  kind: string;
  rarity: string;
  description: string;
  tags: unknown;
  asset_url: string;
  thumbnail_url: string;
  accent: string;
  status: string;
  added_at: string;
};

export function useIdentityAssets(filters: AssetFilters = {}) {
  const [assets, setAssets] = useState<IdentityAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("ethone_identity_assets")
        .select("*")
        .order("added_at", { ascending: false });

      if (err) throw err;
      const dbAssets = (data as unknown as AssetRow[] | null)?.map(mapRow) ?? [];
      setAssets(dbAssets.length > 0 ? dbAssets : DRIVE_AVATARS.map(mapManifest));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return assets.filter((asset) => {
      if (filters.kind && asset.kind !== filters.kind) return false;
      if (filters.category && asset.category !== filters.category) return false;
      if (filters.status && asset.status !== filters.status) return false;
      return true;
    });
  }, [assets, filters]);

  return { assets: filtered, allAssets: assets, loading, error, reload: load };
}

type ManifestAsset = {
  id: string;
  name: string;
  series: string;
  category: string;
  kind: string;
  rarity: string;
  asset_url: string;
  thumbnail_url: string;
  tags: unknown;
  status: string;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function mapRow(row: AssetRow): IdentityAsset {
  return {
    id: row.id ?? "",
    name: row.name ?? "",
    category: row.category ?? "",
    kind: (row.kind as IdentityAsset["kind"]) ?? "avatar",
    rarity: (row.rarity as IdentityAsset["rarity"]) ?? "common",
    description: row.description ?? "",
    tags: isStringArray(row.tags) ? row.tags : [],
    asset_url: row.asset_url ?? "",
    thumbnail_url: row.thumbnail_url ?? "",
    accent: row.accent ?? "",
    status: (row.status as IdentityAsset["status"]) ?? "active",
    added_at: row.added_at ?? new Date().toISOString(),
  };
}

function mapManifest(row: ManifestAsset): IdentityAsset {
  return {
    id: row.id ?? "",
    name: row.name ?? "",
    category: row.category ?? "",
    kind: (row.kind as IdentityAsset["kind"]) ?? "avatar",
    rarity: (row.rarity as IdentityAsset["rarity"]) ?? "common",
    description: `Avatar from ${row.series ?? ""}`,
    tags: isStringArray(row.tags) ? row.tags : [],
    asset_url: row.asset_url ?? "",
    thumbnail_url: row.thumbnail_url ?? "",
    accent: "",
    status: (row.status as IdentityAsset["status"]) ?? "active",
    added_at: new Date().toISOString(),
  };
}
