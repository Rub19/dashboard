"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "ethone:version";
const DISMISS_KEY = "ethone:update-dismissed";
const CHECK_INTERVAL = 5 * 60_000; // 5 minutes
const COOLDOWN = 5_000; // 5 seconds
const DISMISS_COOLDOWN = 60 * 60_000; // 1 hour

export type VersionData = {
  version: string;
  commit?: string | null;
  buildAt?: string;
};

export type UseVersionChecker = {
  hasUpdate: boolean;
  currentVersion: string | null;
  newVersion: string | null;
  currentData: VersionData | null;
  newData: VersionData | null;
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

function parseBuildAt(value?: string): number {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function isNewerBuild(current: VersionData, remote: VersionData): boolean {
  if (current.version !== remote.version) return true;

  const currentCommit = current.commit ?? null;
  const remoteCommit = remote.commit ?? null;
  if (currentCommit !== remoteCommit) return true;

  const currentAt = parseBuildAt(current.buildAt);
  const remoteAt = parseBuildAt(remote.buildAt);

  if (currentAt === 0 || remoteAt === 0) {
    // cannot compare timestamps, fallback to string comparison to avoid false negatives
    if (current.buildAt !== remote.buildAt) return true;
  }

  return remoteAt > currentAt;
}

function loadStored(): VersionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && "version" in parsed && typeof (parsed as VersionData).version === "string") {
      return parsed as VersionData;
    }
    // legacy: a plain version string
    return { version: raw };
  } catch {
    return null;
  }
}

function saveStored(data: VersionData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function useVersionChecker(): UseVersionChecker {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [currentData, setCurrentData] = useState<VersionData | null>(null);
  const [newData, setNewData] = useState<VersionData | null>(null);

  const lastDataRef = useRef<VersionData | null>(null);
  const newDataRef = useRef<VersionData | null>(null);
  const checkingRef = useRef(false);
  const lastCheckRef = useRef(0);

  const dismiss = useCallback(() => {
    setHasUpdate(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {}
  }, []);

  const setAsCurrent = useCallback((data: VersionData) => {
    lastDataRef.current = data;
    setCurrentData(data);
    saveStored(data);
  }, []);

  const setAsNew = useCallback((data: VersionData) => {
    newDataRef.current = data;
    setNewData(data);
    setHasUpdate(true);
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

      const current = lastDataRef.current;
      if (!current) {
        setAsCurrent(remote);
        return;
      }

      if (isNewerBuild(current, remote)) {
        if (
          newDataRef.current &&
          newDataRef.current.version === remote.version &&
          newDataRef.current.commit === remote.commit &&
          newDataRef.current.buildAt === remote.buildAt
        ) {
          // same pending update already surfaced
          return;
        }

        const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || "0");
        if (now - dismissedAt > DISMISS_COOLDOWN) {
          setAsNew(remote);
        }
      }
    } finally {
      checkingRef.current = false;
    }
  }, [setAsCurrent, setAsNew]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = loadStored();
    if (stored) {
      lastDataRef.current = stored;
      setCurrentData(stored);
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

  return {
    hasUpdate,
    currentVersion: currentData?.version ?? null,
    newVersion: newData?.version ?? null,
    currentData,
    newData,
    dismiss,
    check,
  };
}
