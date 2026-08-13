"use client";

import { useEffect, useState } from "react";
import { createClockManager, type ClockSnapshot } from "@/lib/clock-manager";

export function useClock(locale?: string) {
  const [snapshot, setSnapshot] = useState<ClockSnapshot | null>(null);

  useEffect(() => {
    const manager = createClockManager({ locale });
    const unsubscribe = manager.subscribe((next) => setSnapshot(next));
    manager.start();
    return () => {
      unsubscribe();
      manager.destroy();
    };
  }, [locale]);

  return snapshot;
}
