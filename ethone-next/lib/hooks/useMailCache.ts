"use client";

import { useEffect, useMemo, useState } from "react";
import { createMailCache, type MailCache } from "@/lib/mail-cache";

export function useMailCache() {
  const cache = useMemo<MailCache>(() => createMailCache(), []);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => {
      setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return {
    cache,
    online,
  };
}
