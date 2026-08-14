"use client";

import { useEffect, useState } from "react";
import { aiStatus, aiQuota } from "@/lib/brain/providers";

export type AiQuota = {
  date: string;
  used: number;
  budget: number;
  allocation: number;
  emergencyBuffer: number;
  percent: number;
  warning: boolean;
  prepare: boolean;
  exhausted: boolean;
};

export type AiProvider = {
  id: string;
  label: string;
  kind: string;
  isPrimary: boolean;
  isFallback: boolean;
  defaultModel: string;
};

export type AiStatus = {
  providers: AiProvider[];
  primary: string;
  fallback: string;
  cloudflare: {
    health: { ok: boolean; model?: string; error?: string };
    model: string;
    budget: number;
    allocation: number;
    emergencyBuffer: number;
  };
};

export function useAiStatus() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [quota, setQuota] = useState<AiQuota | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([aiStatus(), aiQuota()])
      .then(([statusRes, quotaRes]) => {
        if (cancelled) return;
        setStatus(statusRes?.data || null);
        setQuota(quotaRes?.data?.status || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, quota, loading, error };
}
