"use client";

import { useMemo } from "react";
import {
  useIslandQueueStore,
  type IslandEvent,
  type IslandView,
} from "@/lib/stores/dynamic-island-queue";

export function useDynamicIslandQueue() {
  const queue = useIslandQueueStore((s) => s.queue);
  const top = useIslandQueueStore((s) => s.top);
  const register = useIslandQueueStore((s) => s.register);
  const unregister = useIslandQueueStore((s) => s.unregister);
  const clear = useIslandQueueStore((s) => s.clear);

  const activeViews = useMemo(
    () =>
      [...queue]
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
        .map((e) => e.type),
    [queue],
  );

  return { queue, activeViews, top, register, unregister, clear };
}

export type { IslandEvent, IslandView };
