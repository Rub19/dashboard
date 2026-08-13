"use client";

import { useEffect } from "react";
import { bindVisibilityRefresh } from "@/lib/live-poll";

export function useLivePoll(poll: () => void, options?: { minGapMs?: number }) {
  const { minGapMs } = options || {};
  useEffect(() => {
    if (typeof window === "undefined") return;
    return bindVisibilityRefresh(window, poll, { minGapMs });
  }, [poll, minGapMs]);
}
