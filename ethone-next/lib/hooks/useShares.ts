"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWorker } from "../api";

export type Share = {
  id: string;
  slug: string;
  fileId: string;
  visibility: "public" | "private" | "password";
  expiresAt?: string;
  maxDownloads?: number;
  downloadCount?: number;
  createdAt?: string;
};

export function useShares(fileId?: string) {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (fileId) params.set("fileId", fileId);
      const res = await fetchWorker(`/api/cloud/shares?${params.toString()}`);
      setShares(Array.isArray(res?.data?.shares) ? res.data.shares : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function create(input: { fileId: string; visibility?: string; password?: string; expiresAt?: string; maxDownloads?: number }) {
    const res = await fetchWorker("/api/cloud/shares", {
      method: "POST",
      body: JSON.stringify(input),
    });
    await reload();
    return res?.data?.share as Share | undefined;
  }

  async function revoke(slug: string) {
    await fetchWorker(`/api/cloud/shares/revoke?slug=${encodeURIComponent(slug)}`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    await reload();
  }

  return { shares, loading, error, reload, create, revoke };
}
