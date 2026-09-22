"use client";

import { useEffect } from "react";

export default function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => { if (process.env.NODE_ENV !== "production") console.log("SW registered:", reg.scope); })
        .catch((err) => console.error("SW registration failed:", err));
    }
  }, []);

  return null;
}
