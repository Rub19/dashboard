"use client";

import { useEffect } from "react";

export default function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {})
        .catch((err) => console.error("SW registration failed:", err));
    }
  }, []);

  return null;
}
