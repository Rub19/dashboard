"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "ethone:version";
const CHECK_INTERVAL = 5 * 60_000; // 5 minutes
const COOLDOWN = 5_000; // 5 seconds

type VersionData = {
  version: string;
  buildAt?: string;
};

export type UseVersionChecker = {
  hasUpdate: boolean;
  newVersion: string | null;
  dismiss: () => void;
};

async function fetchVersionJson(): Promise<VersionData | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
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
}

async function fetchVersionApi(): Promise<VersionData | null> {
  try {
    const res = await fetch(`/api/version?t=${Date.now()}`, {
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
}

async function fetchVersion(): Promise<VersionData | null> {
  return (await fetchVersionApi()) ?? (await fetchVersionJson());
}

export function useVersionChecker(): UseVersionChecker {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);

  const initialVersionRef = useRef<string | null>(null);
  const checkingRef = useRef(false);
  const lastCheckRef = useRef(0);

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
        localStorage.setItem(STORAGE_KEY, remote.version);
        return;
      }

      if (remote.version !== initialVersionRef.current && remote.version !== newVersion) {
        setNewVersion(remote.version);
        setHasUpdate(true);
      }
    } finally {
      checkingRef.current = false;
    }
  }, [newVersion]);

  const dismiss = useCallback(() => {
    setHasUpdate(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      initialVersionRef.current = localStorage.getItem(STORAGE_KEY);
    } catch {
      initialVersionRef.current = null;
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") check();
    }

    function onWindowFocus() {
      check();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onWindowFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [check]);

  return { hasUpdate, newVersion, dismiss };
}
