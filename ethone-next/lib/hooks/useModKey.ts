"use client";

import { useEffect, useState } from "react";

/**
 * The platform's primary command modifier for display: "⌘" on macOS/iOS,
 * "Ctrl" everywhere else. Resolved after mount so SSR and the first client
 * render match (defaults to "Ctrl", the more common case).
 */
export function useModKey(): "⌘" | "Ctrl" {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    try {
      const p =
        (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform ||
        navigator.platform ||
        navigator.userAgent;
      setIsMac(/mac|iphone|ipad|ipod/i.test(p));
    } catch {
      /* keep default */
    }
  }, []);
  return isMac ? "⌘" : "Ctrl";
}

/** Rewrites a "⌘"-authored shortcut string/array for the current platform. */
export function applyModKey(shortcut: string, mod: "⌘" | "Ctrl"): string {
  if (mod === "⌘") return shortcut;
  return shortcut.replace(/⌘/g, "Ctrl ").replace(/\s+/g, " ").trim();
}
