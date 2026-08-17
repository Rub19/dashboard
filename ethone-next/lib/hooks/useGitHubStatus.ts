"use client";

import { useCallback, useEffect, useState } from "react";

const STATUS_URL = "https://www.githubstatus.com/api/v2/status.json";
const REFRESH_INTERVAL = 60 * 1000; // 1 minute

type GitHubStatusInfo = {
  indicator: "none" | "minor" | "major" | "critical";
  description: string;
};

type GitHubStatus = GitHubStatusInfo | null;

export function useGitHubStatus(enabled = true): GitHubStatus {
  const [status, setStatus] = useState<GitHubStatus>(null);

  const fetchStatus = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch(`${STATUS_URL}?t=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { status?: { indicator?: string; description?: string } };
      if (data?.status) {
        setStatus({
          indicator: (data.status.indicator as GitHubStatusInfo["indicator"]) || "none",
          description: data.status.description || "",
        });
      }
    } catch {
      // If status API is unreachable, treat as no data
    }
  }, [enabled]);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchStatus]);

  return status;
}
