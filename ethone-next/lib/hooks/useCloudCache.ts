"use client";

import { useEffect, useMemo, useState } from "react";
import { createCloudCache, type CloudCache } from "@/lib/cloud-cache";

export function useCloudCache() {
  const cache = useMemo<CloudCache>(() => createCloudCache(), []);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => {
      const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
      setOnline(isOnline);
      cache.setOnline(isOnline);
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [cache]);

  return {
    cache,
    online,
  };
}
