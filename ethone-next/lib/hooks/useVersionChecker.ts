"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "ethone:version";
const DISMISS_KEY = "ethone:update-dismissed";
const CHECK_INTERVAL = 5 * 60_000; // 5 minutes
const COOLDOWN = 5_000; // 5 seconds

export type VersionData = {
  version: string;
  buildAt?: string;
};

export type UseVersionChecker = {
  hasUpdate: boolean;
  newVersion: string | null;
  dismiss: () => void;
  check: () => void;
};

async function fetchVersion(): Promise<VersionData | null> {
  const tryFetch = async (path: string) => {
    try {
      const res = await fetch(`${path}?t=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as unknown;
      if (data && typeof data === "object" && "version" in data && typeof (data as VersionData).version === "string") {
        return data as VersionData;
      }
      return null;
    } catch {
      return null;
    }
  };

  return (await tryFetch("/api/version")) ?? (await tryFetch("/version.json"));
}

export function useVersionChecker(): UseVersionChecker {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);

  const initialVersionRef = useRef<string | null>(null);
  const checkingRef = useRef(false);
  const lastCheckRef = useRef(0);

  const dismiss = useCallback(() => {
    setHasUpdate(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {}
  }, []);

  const check = useCallback(async () => {
    if (checkingRef.current) return;
    if (typeof window === "undefined") return;

    const now = Date.now();
    if (now - lastCheckRef.current < COOLDOWN) return;
    lastCheckRef.current = now;

    checkingRef.current = true;
    try {
      const remote = await fetchVersion();
      if (!remote?.version) return;

      if (!initialVersionRef.current) {
        initialVersionRef.current = remote.version;
        try {
          localStorage.setItem(STORAGE_KEY, remote.version);
        } catch {}
        return;
      }

      if (remote.version !== initialVersionRef.current && remote.version !== newVersion) {
        try {
          const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || "0");
          if (now - dismissedAt > 60 * 60_000) {
            // dismissed more than 1 hour ago
            setNewVersion(remote.version);
            setHasUpdate(true);
          }
        } catch {
          setNewVersion(remote.version);
          setHasUpdate(true);
        }
      }
    } finally {
      checkingRef.current = false;
    }
  }, [newVersion]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) initialVersionRef.current = stored;
    } catch {
      initialVersionRef.current = null;
    }

    const run = () => check();
    run();
    const interval = setInterval(run, CHECK_INTERVAL);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") run();
    }

    function onWindowFocus() {
      run();
    }

    function onPageShow() {
      run();
    }

    function onOnline() {
      run();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onWindowFocus);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("online", onOnline);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onWindowFocus);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("online", onOnline);
    };
  }, [check]);

  return { hasUpdate, newVersion, dismiss, check };
}
