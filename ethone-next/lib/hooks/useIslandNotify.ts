"use client";

import { useCallback } from "react";
import { useIslandQueueStore } from "@/lib/stores/dynamic-island-queue";

export type IslandNotifyContent = {
  icon?: string;
  pack?: string;
  title?: string;
  message?: string;
  variant?: "success" | "warning" | "error" | "info";
};

let notificationId = 0;

export function useIslandNotify() {
  const register = useIslandQueueStore((s) => s.register);
  const unregister = useIslandQueueStore((s) => s.unregister);

  const notify = useCallback(
    (content: IslandNotifyContent, durationMs = 3000, priority = 6) => {
      notificationId += 1;
      const id = `notification:${Date.now()}:${notificationId}`;
      register({
        id,
        type: "notification",
        priority,
        duration: durationMs,
        content,
      });
      return () => unregister(id);
    },
    [register, unregister],
  );

  return { notify };
}
